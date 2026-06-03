# Manual Image Prompts Batch 02 Report

Generated: 2026-06-03

## Scope

Created `data/manual-image-prompts/manual-image-prompts-batch-02.csv` only for manual image production prompts. No images were generated, no Pins were published, and `data/pinterest/pinterest-pins.csv` was not modified.

## Selection

- Source file: `data/pinterest/manual-image-production-plan.csv`
- Excluded existing Batch 01 `pin_id` values: 50
- Batch 02 size: 100 prompts
- Selection rule: remaining missing Pins after Batch 01, distributed by remaining shortage priority: Pin C, then Pin B, then Pin A.

Remaining missing Pins after Batch 01:

| Pin Type | Remaining |
|---|---:|
| C | 263 |
| B | 250 |
| A | 222 |

Batch 02 distribution:

| Pin Type | Prompts |
|---|---:|
| C | 36 |
| B | 34 |
| A | 30 |
| Total | 100 |

## Guardrails

Each prompt includes:

- exact article title
- matching `pin_type` A/B/C
- unique `source_signature`
- realistic professional photography
- USA suburban front yard
- visible house exterior
- landscaping as the main subject
- front yard occupying at least 40% of the scene
- Pinterest vertical 1000x1500
- no people, vehicles, interiors, watermark, text, logo, signage, CGI, illustration, Unsplash+, or premium stock source

## Validation

Command run:

```bash
node scripts/audit-manual-prompts.mjs
```

Result:

- ok: true
- prompts: 100
- duplicate `source_signature`: 0
- errors: 0
