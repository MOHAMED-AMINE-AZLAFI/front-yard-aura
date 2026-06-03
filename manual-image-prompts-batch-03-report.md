# Manual Image Prompts Batch 03 Report

Generated: 2026-06-03

## Scope

Created `data/manual-image-prompts/manual-image-prompts-batch-03.csv` for manual image prompts only. No images were generated, no Pins were published, and `data/pinterest/pinterest-pins.csv` was not modified.

## Selection

- Source file: `data/pinterest/manual-image-production-plan.csv`
- Excluded existing Batch 01 and Batch 02 `pin_id` values.
- Batch 03 size: 50 prompts.
- Selection rule: next missing Pins after Batch 01 and Batch 02, distributed by remaining shortage priority: Pin C, then Pin B, then Pin A.

Remaining missing Pins after Batch 01 and Batch 02:

| Pin Variant | Remaining |
|---|---:|
| C | 227 |
| B | 216 |
| A | 192 |

Batch 03 distribution:

| Pin Variant | Prompts |
|---|---:|
| C | 18 |
| B | 17 |
| A | 15 |
| Total | 50 |

## Prompt Requirements

Each prompt includes `article_title`, `article_slug`, `category`, `pin_variant`, and `required_visual_element`, plus the required visual guardrails: realistic professional photography, USA suburban front yard, visible house exterior, landscaping as the main subject, front yard at least 40% of the scene, lawn or flower beds or shrubs or mulch or rocks or walkway, no people, no vehicles, no interiors, no watermark, no text, no logo, and Pinterest vertical 1000x1500.

## Validation

Command run:

```bash
node scripts/audit-manual-prompts.mjs
```

Result:

- ok: true
- prompts: 50
- errors: []
