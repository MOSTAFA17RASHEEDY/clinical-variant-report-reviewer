import { config } from "./config.js";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

// NCBI asks for max 3 req/sec without a key, 10/sec with one.
const MIN_INTERVAL_MS = config.ncbiApiKey ? 100 : 334;
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${EUTILS_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("tool", config.ncbiToolName);
  url.searchParams.set("email", config.ncbiContactEmail);
  if (config.ncbiApiKey) url.searchParams.set("api_key", config.ncbiApiKey);
  return url.toString();
}

async function fetchJson<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    const res = await fetch(buildUrl(endpoint, { ...params, retmode: "json" }));
    if (res.status === 429) {
      // NCBI's public rate limit is bursty in practice even under the
      // documented 3/sec — back off and retry rather than failing the lookup.
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`NCBI ${endpoint} failed: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }
  throw new Error(`NCBI ${endpoint} failed: exceeded retries after repeated 429 Too Many Requests`);
}

export type ClinVarRecord = {
  uid: string;
  accession: string;
  title: string;
  objType: string;
  geneSymbol: string | null;
  clinicalSignificance: string;
  reviewStatus: string;
  starRating: 0 | 1 | 2 | 3 | 4;
  lastEvaluated: string | null;
  conditions: string[];
  isConflicting: boolean;
  url: string;
};

function computeStarRating(reviewStatus: string): 0 | 1 | 2 | 3 | 4 {
  const s = reviewStatus.toLowerCase();
  if (s.includes("practice guideline")) return 4;
  if (s.includes("reviewed by expert panel")) return 3;
  if (s.includes("criteria provided") && s.includes("no conflict")) return 2;
  if (s.includes("criteria provided")) return 1;
  return 0;
}

type EsearchResponse = { esearchresult: { idlist: string[] } };

type EsummaryResponse = {
  result: { uids: string[]; [uid: string]: any };
};

type ElinkResponse = {
  linksets: { linksetdbs?: { linkname: string; links: string[] }[] }[];
};

// ClinVar records that represent a combination of variants rather than the
// single one we're cross-referencing (found by testing against a real
// multi-allelic locus, rs334/HBB, which linked to several of these).
const COMPOUND_OBJ_TYPES = new Set(["Haplotype", "Genotype", "Diplotype", "Phase unknown"]);

function parseEsummaryRecord(uid: string, doc: any): ClinVarRecord {
  // NCBI's current ClinVar esummary schema nests classification under
  // `germline_classification` (somatic/oncogenic variants use sibling keys
  // `clinical_impact_classification` / `oncogenicity_classification`, not
  // handled here since this project targets constitutional/germline calls).
  const classification = doc.germline_classification ?? {};
  const reviewStatus: string = classification.review_status ?? "unknown";
  const clinicalSignificance: string = classification.description ?? "not provided";
  const rawConditions: string[] = (classification.trait_set ?? [])
    .map((t: any) => t.trait_name as string)
    .filter(Boolean);
  const conditions: string[] = [...new Set(rawConditions)];
  const geneSymbol: string | null = doc.genes?.[0]?.symbol ?? null;
  const accession: string = doc.accession ?? uid;

  return {
    uid,
    accession,
    title: doc.title ?? "",
    objType: doc.obj_type ?? "",
    geneSymbol,
    clinicalSignificance,
    reviewStatus,
    starRating: computeStarRating(reviewStatus),
    lastEvaluated: classification.last_evaluated ?? null,
    conditions,
    isConflicting: clinicalSignificance.toLowerCase().includes("conflicting"),
    url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${uid}/`,
  };
}

async function esummaryClinVar(uids: string[]): Promise<ClinVarRecord[]> {
  if (uids.length === 0) return [];
  const data = await fetchJson<EsummaryResponse>("esummary.fcgi", {
    db: "clinvar",
    id: uids.join(","),
  });
  return data.result.uids.map((uid) => parseEsummaryRecord(uid, data.result[uid]));
}

async function esearchClinVar(term: string, retmax = 5): Promise<string[]> {
  const data = await fetchJson<EsearchResponse>("esearch.fcgi", {
    db: "clinvar",
    term,
    retmax: String(retmax),
  });
  return data.esearchresult.idlist;
}

/**
 * Looks up a variant in ClinVar by its dbSNP rsID (most reliable match —
 * VEP's --check_existing gives us rsIDs from the cache's colocated variants).
 *
 * Uses elink dbSNP->ClinVar rather than a free-text esearch on "rs<n>":
 * ClinVar has no dedicated rsID search field, and free text matches too
 * broadly (found by testing against rs334/HBB — it pulled back unrelated
 * multi-variant haplotype records that merely contain matching substrings).
 * elink returns exactly the ClinVar records dbSNP itself cross-references,
 * then compound haplotype/genotype records are filtered out below since
 * they describe a combination of variants, not the single one being checked.
 */
export async function clinvarLookupByRsId(rsId: string): Promise<ClinVarRecord[]> {
  const snpUid = rsId.replace(/^rs/i, "");
  const data = await fetchJson<ElinkResponse>("elink.fcgi", {
    dbfrom: "snp",
    db: "clinvar",
    id: snpUid,
  });
  const uids = data.linksets[0]?.linksetdbs?.[0]?.links ?? [];
  const records = await esummaryClinVar(uids);
  return records.filter((r) => !COMPOUND_OBJ_TYPES.has(r.objType));
}

/**
 * Fallback lookup for variants with no rsID: genomic coordinate + client-side
 * HGVSc match.
 *
 * Tried gene[gene] AND "<hgvsc>" free text first — abandoned after finding a
 * real, confirmed NCBI parser bug: ClinVar's query parser rewrites the period
 * in HGVS notation into a literal "0x2e" token before matching (visible in
 * esearch's own `querytranslation` field), so e.g. "c.5266dupC" silently
 * turns into "c0x2e5266dupC" and matches ~20 unrelated records by accident —
 * confidently wrong, not just empty, which is worse than it looks and unsafe
 * for a tool whose whole point is not overstating what's confirmed.
 *
 * Fixed by never trusting the server-side text match at all: query ClinVar's
 * indexed CHR/CPOS fields (chromosome + base position — always exact, no
 * tokenizer involved) to get the small set of records at that exact genomic
 * position, then confirm the specific allele ourselves by checking VEP's
 * HGVSc substring against each candidate's own title client-side.
 */
// HGVS 2016+ recommendations drop the duplicated/deleted base letters when
// they're redundant with the position range (e.g. "c.5266dup"), but VEP and
// ClinVar don't always agree on which style they emit for the same variant
// (one may say "c.5266dupC", the other "c.5266dup") — normalize both sides
// to the same core token before comparing, so a real match isn't missed over
// a formatting difference.
function coreHgvsC(s: string): string {
  return s.replace(/(dup|del)[ACGTacgt]+$/, "$1");
}

export async function clinvarLookupByCoordinate(
  chrom: string,
  pos: number,
  hgvsc: string | null,
  gene: string | null,
): Promise<{ records: ClinVarRecord[]; exactMatch: boolean }> {
  const chromNum = chrom.replace(/^chr/i, "");
  const uids = await esearchClinVar(`${chromNum}[CHR] AND ${pos}[CPOS]`, 20);
  const candidates = (await esummaryClinVar(uids)).filter(
    (r) => !COMPOUND_OBJ_TYPES.has(r.objType),
  );

  if (hgvsc) {
    // VEP gives "NM_000518.5:c.20A>T" — ClinVar titles carry just the
    // "c.20A>T" part, so pull that token out of the title to compare.
    const queryCore = coreHgvsC(hgvsc.includes(":") ? hgvsc.split(":").pop()! : hgvsc);
    const exact = candidates.filter((r) => {
      const titleMatch = r.title.match(/c\.[A-Za-z0-9_*+>-]+/);
      return (
        !!titleMatch &&
        coreHgvsC(titleMatch[0]) === queryCore &&
        (!gene || r.geneSymbol === gene)
      );
    });
    if (exact.length > 0) return { records: exact, exactMatch: true };
  }
  return { records: candidates, exactMatch: false };
}
