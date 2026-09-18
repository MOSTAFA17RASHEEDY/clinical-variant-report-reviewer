---
name: Clinical Diagnostic Document Engine
colors:
  surface: '#f8f9ff'
  surface-dim: '#cddbef'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e4efff'
  surface-container-high: '#dbe9fe'
  surface-container-highest: '#d5e4f8'
  on-surface: '#0e1d2b'
  on-surface-variant: '#44474c'
  inverse-surface: '#243241'
  inverse-on-surface: '#e9f1ff'
  outline: '#75777c'
  outline-variant: '#c5c6cc'
  surface-tint: '#565f6d'
  primary: '#050e1a'
  on-primary: '#ffffff'
  primary-container: '#1b2430'
  on-primary-container: '#828b9a'
  inverse-primary: '#bec7d7'
  secondary: '#29657c'
  on-secondary: '#ffffff'
  secondary-container: '#a9e2fd'
  on-secondary-container: '#2a667d'
  tertiary: '#160c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#322000'
  on-tertiary-container: '#b38221'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae3f4'
  primary-fixed-dim: '#bec7d7'
  on-primary-fixed: '#131c28'
  on-primary-fixed-variant: '#3e4755'
  secondary-fixed: '#bde9ff'
  secondary-fixed-dim: '#96cee9'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#024d64'
  tertiary-fixed: '#ffdeab'
  tertiary-fixed-dim: '#f6bd58'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#5f4100'
  background: '#f8f9ff'
  on-background: '#0e1d2b'
  surface-variant: '#d5e4f8'
typography:
  headline-lg:
    fontFamily: Literata
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Literata
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Literata
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-narrative:
    fontFamily: Literata
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-narrative-bold:
    fontFamily: Literata
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 20px
  ui-body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  ui-body-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  ui-label-bold:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  ui-label-mono:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  code-genomic:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-genomic-sm:
    fontFamily: JetBrains Mono
    fontSize: 10.5px
    fontWeight: '400'
    lineHeight: 14px
  caption:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 13px
spacing:
  gutter: 1rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system serves clinical geneticists, molecular pathologists, and clinical laboratory directors producing diagnostic-grade constitutional and somatic variant reports. The interface establishes uncompromised clinical rigor, evidentiary clarity, and institutional authority. It intentionally diverges from contemporary SaaS platforms, analytics dashboards, and consumer software: there are no playful gradients, floating elevation cards, illustrative iconography, or informal microcopy.

The visual ethos mirrors an archival legal-scientific dossier—specifically, CAP/CLIA-accredited molecular pathology diagnostic outputs. Precision takes precedence over decorative expression. The layout relies on standard publication ratios, strict hairline structural dividers, conservative tabular density, and typographic authority that can translate seamlessly from a regulated review workstation to a certified physical document.

Every interaction conveys finality and regulatory accountability. State indicators reflect diagnostic certainty levels and legal sign-off stages rather than platform status. Elements preserve visual permanence, ensuring that data points such as transcript references, HGVS nomenclature, allele fractions, and interpretive summaries remain immune to ambiguity.

## Colors

The palette simulates archival clinical stationery under controlled luminescent laboratory lighting. Surface values are split strictly between the ambient staging viewport canvas (`#F5F6F8`) and the document paper surface (`#FFFFFF`). Ink tones are calculated for definitive optical contrast and high-resolution black-and-white photocopy fidelity.

### Functional Roles
- **Primary Ink (`#1B2430`)**: Deep slate navy-black applied to document headings, primary findings, HGVS nomenclature, and diagnostic determinations.
- **Secondary / Metadata Ink (`#526071`)**: Neutral slate used for field descriptors, specimen metadata, accessioning numbers, and non-operative table cells.
- **Structural Lines (`#D7DDE5`, `#E2E7ED`)**: Precise 1px hairline rules for grid partitioning, section demarcations, and boundary encasement.
- **Approval & Digital Attestation (`#1D5C73`)**: Deep institutional teal-blue dedicated exclusively to certified electronic signatures, verified CLIA credentials, cryptographic audit hashes, and immutable completed timestamps.
- **Pending Review & Warning (`#A97917`)**: Muted amber-gold restricted strictly to unverified draft watermarks, provisional annotations, and pending director sign-offs.

### 5-Tier ACMG Variant Classification Scale
ACMG classifications use sober, clinically grounded pigments formulated to convey clinical significance without alarming saturation:
- **Pathogenic (`#8C3B2E`)**: Muted crimson, applied to definitive disease-causing variants requiring primary clinical action.
- **Likely Pathogenic (`#A85C32`)**: Deep burnt umber, denoting variants with >90% certainty of pathogenicity.
- **Variant of Uncertain Significance - VUS (`#6B6470`)**: Neutral slate violet, indicating evidentiary equilibrium or conflicting findings.
- **Likely Benign (`#6B8F71`)**: Desaturated clinical sage, indicating high probability of benign polymorphism.
- **Benign (`#3F6B4A`)**: Deep forest green, applied to verified non-pathogenic variants and population baseline controls.

## Typography

The typographic architecture establishes distinct jurisdictions for clinical evidence, structural control, and genomic data:

1. **Document Narrative (Literata)**: All clinical interpretations, diagnostic summaries, test indications, and methodologic limitations are set in Literata. The balanced proportions and crisp editorial serifs afford comfortable reading during prolonged case reviews while conferring the legal gravity of formal medical literature.
2. **Operational UI & Metadata (IBM Plex Sans)**: Interface controls, table column headers, form fields, patient identifiers, and regulatory stamps rely on IBM Plex Sans. Its mechanical, unembellished clarity ensures rapid scanning without visual fatigue.
3. **Genomic Nomenclature & Coordinates (JetBrains Mono)**: Monospace rendering is mandatory for all HGVS nomenclature (`c.`, `p.`), transcript IDs (`NM_`), chromosomal coordinates (`chr:pos`), dbSNP rsIDs, read depths, and cryptographic hash signatures. The uniform horizontal glyph grid prevents character transposition errors and guarantees alignment across tabular datasets.

## Layout & Spacing

The layout model simulates a physical 8.5" × 11" (or international A4) sheet positioned within an ambient review canvas. The document viewport enforces a centered sheet architecture with a fixed width of `816px` (corresponding to standard 96 DPI document sizing) or responsive fluid containment across larger monitors, bordered by a calm, distraction-free neutral backdrop (`#F5F6F8`).

### Document Grid & Page Boundaries
- **Page Margins**: The document paper maintains a strict internal margin of `36px` (`2.25rem`) on all four borders, conforming to standard clinical documentation guidelines.
- **Section Rhythm**: Sections are separated by standardized vertical intervals of `1.25rem` (`space-lg`), each delineated by a solid hairline divider (`#E2E7ED`).
- **Tabular Rhythm**: Variant tables use a compact baseline: cell padding is set strictly to `6px 8px` (`0.375rem 0.5rem`) to maximize vertical information density without compromising touchpoints or visual line continuity.

### Form Factor Adaptations
- **Desktop (≥ 1280px)**: Two-column split layout featuring a fixed tool palette/inspector drawer on the left (280px) and the centered clinical document page container on the right.
- **Standard Clinical Workstation (1024px – 1279px)**: Full-viewport centered paper layout with floating, docked top-bar controls for document validation and signing.
- **Mobile / Tablet (Proofing Mode, < 1024px)**: Responsive fallback converting tables to horizontal scrolling panes while retaining physical point sizes to preserve molecular nomenclature readability.

## Elevation & Depth

This system intentionally avoids dimensional depth metaphors, material layers, and multi-tier shadow stacks. Physical sheets in clinical diagnostics do not float; they rest squarely on the reading surface.

- **Document Paper Sheet**: Grounded on `#F5F6F8` with a flat 1px containment stroke (`#DCE0E6`) and a singular, ultra-low opacity perimeter blur (`0 1px 3px rgba(27, 36, 48, 0.04)`).
- **Surface Elevation**: Modals, drop-down menus, and context popovers rely on sharp hairline borders (`#D7DDE5`) over solid `#FFFFFF` backgrounds, paired with a subtle structural shadow (`0 4px 12px rgba(27, 36, 48, 0.08)`).
- **Z-Index Layering**:
  - `Base`: Viewport canvas (`#F5F6F8`)
  - `Level 0`: Document sheet paper (`#FFFFFF`)
  - `Level 1`: Stationary structural rules, inline callout boxes, and tabular stripes
  - `Level 2`: Fixed review action toolbars and sign-off docks
  - `Level 3`: Cryptographic sign-off modals, 2FA authorization overlays, and audit confirmation dialogs

## Shapes

The design system enforces a sharp geometry (`roundedness: 0`). Curved lines and pill shapes are excluded to maintain the structural discipline of legal, diagnostic, and government-grade documentation.

- **Buttons, Form Inputs, Modals, and Panels**: Absolute 90-degree squared corners (`0px`).
- **Data Tables & Variant Bounding Boxes**: Crisp rectilinear cells with flush border-collapses.
- **Status Badges & ACMG Indicators**: Rectangular tags with 0px corner radii, bounded by 1px solid outlines or solid flat backgrounds. No capsule or pill contours.
- **Rule Lines**: Clean horizontal vectors terminated cleanly at the paper margin boundaries.

## Components

### 1. Institutional Header & Accreditation Lockup
- **Structure**: Two-column header layout at the top of Page 1.
- **Left**: Institution logo, lab division name ("Department of Molecular Pathology & Clinical Genomics"), and medical director credentials.
- **Right**: Institutional certifications aligned flush right in `ui-label-mono` (CLIA ID: `##D#######`, CAP Accredited Number, State Health Department Licensure).
- **Border**: Enclosed by a crisp, 2px top rule and 1px bottom rule in `#1B2430`.

### 2. Patient & Specimen Metadata Block
- **Grid**: 4-column balanced tabular grid displaying Patient Name, MRN, Date of Birth, Biological Sex, Specimen Source, Accession ID, Collection Date, and Report Date.
- **Styling**: Upper labels rendered in `ui-label-bold` with color `#526071`; values rendered in `ui-body-md` with color `#1B2430`.
- **Divider**: `#E2E7ED` 1px solid outline encasing the entire metadata matrix.

### 3. ACMG Variant Classification Chips & Table
- **Header**: High-density table featuring Gene, Transcript, Genomic Change (cDNA), Protein Change (p.), Zygosity, Allele Fraction (VAF), Read Depth, and ACMG Determination.
- **ACMG Chips**:
  - Pathogenic: Solid fill `#8C3B2E`, text `#FFFFFF`, 0px border radius, font `ui-label-bold`.
  - Likely Pathogenic: Solid fill `#A85C32`, text `#FFFFFF`.
  - VUS: Solid fill `#6B6470`, text `#FFFFFF`.
  - Likely Benign: 1px border `#6B8F71`, text `#3F6B4A`, background transparent.
  - Benign: 1px border `#3F6B4A`, text `#3F6B4A`, background transparent.
- **Nomenclature Text**: Rendered strictly in `code-genomic-sm` to maintain character differentiation (`c.1799T>A`, `p.Val600Glu`).

### 4. Watermarks & Document Status Overlays
- **Pending Review Watermark**: Diagonal text spanning the page body: `"PENDING REVIEW — DRAFT REPORT (NOT VALID FOR CLINICAL DECISION-MAKING)"`. Set in Literata SemiBold, 45-degree rotation, color `#A97917`, 12% opacity, pointer-events: none.
- **Corner Seal**: For review viewports, a top-right rectangular stamp in `#A97917` with a 1px border and uppercase label: `"PROVISIONAL COPY — ACCREDITED SIGNATURE REQUIRED"`.

### 5. Digital Signature & Cryptographic Seal Block
- **Layout**: Anchored at the conclusion of the diagnostic interpretation.
- **Visuals**: Displays the approving Pathologist’s full legal name, board certifications (MD, FCAP, FACMG), institutional title, timestamp, and a secondary box containing:
  - Cryptographic Verification Hash (SHA-256 string in `code-genomic-sm`).
  - Validation URI and QR confirmation token.
- **Coloring**: Sealed with the approved primary accent `#1D5C73` along the left structural accent border (3px solid `#1D5C73`).

### 6. Two-Factor Clinical Sign-Off Modal
- **Overlay**: Backdrop `#1B2430` at 60% opacity.
- **Dialog Sheet**: Solid white, 0px border radius, 1px border `#1B2430`.
- **Content**: Summary count of identified Pathogenic/Likely Pathogenic variants, legal affirmation checkbox ("I confirm this report conforms to CAP/CLIA validation protocols and authorize immediate release into the Electronic Health Record"), secondary password/passkey credential entry, and a primary action button styled in solid `#1D5C73` with `#FFFFFF` text.