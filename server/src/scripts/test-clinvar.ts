import { clinvarLookupByRsId, clinvarLookupByCoordinate } from "../lib/ncbi.js";

async function main() {
  console.log("--- rs334 (HBB, sickle cell) ---");
  const byRs = await clinvarLookupByRsId("rs334");
  console.log(byRs.slice(0, 2));

  console.log(
    "\n--- BRCA1 c.5266dupC by coordinate (GRCh38 chr17:43057062, matches the stitch mockup's example variant) ---",
  );
  const byCoord = await clinvarLookupByCoordinate("chr17", 43057062, "NM_007294.4:c.5266dupC", "BRCA1");
  console.log("exactMatch:", byCoord.exactMatch);
  console.log(byCoord.records.slice(0, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
