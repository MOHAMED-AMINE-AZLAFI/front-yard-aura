# Pinterest 900 Roadmap Report

Generated: 2026-06-03

## Scope

This audit updates the Pinterest 900 roadmap after adding strict source-signature deduplication. No images were generated, no Pins were published, and the schedule was not changed.

Files inspected or updated:

- `scripts/pin-image-quality.mjs`
- `scripts/generate-production-pins.mjs`
- `scripts/audit-pin-image-quality.mjs`
- `data/pinterest/pinterest-pins.csv`
- `data/pinterest/pinterest-needs-manual-images.csv`
- `data/pinterest/manual-image-production-plan.csv`
- `data/manual-image-prompts/manual-image-prompts-batch-01.csv`
- `data/pinterest/pinterest-schedule.csv`

## Current Position

| Metric | Count |
|---|---:|
| Current approved Pins | 115 |
| Pins still needed to reach 900 | 785 |
| Total target articles | 300 |
| Articles with 3 approved Pins | 20 |
| Articles missing at least one Pin | 280 |
| Approved Pins with source_signature | 115 |

## Duplicate Source Fix

The source system now creates a stable `source_signature` for every Pin source. Unsplash images are signed as `unsplash:photo-*`, and manual placeholders are signed as `manual-required:<pin_id>` or `manual-batch-01:<image_id>`.

The quality evaluator now rejects any candidate whose `source_signature` has already been assigned to another Pin. This applies to all Pins, not only Pins from different articles.

| Duplicate Source Measure | Before Fix | After Fix |
|---|---:|---:|
| Historical duplicate_source_used_by reason occurrences in needs file | 1047 | Automatically rejected by signature rule |
| Articles affected by duplicate_source_used_by in needs file | 278 | Tracked through source_signature |
| Duplicate source signature groups inside current approved Pins | 0 | 0 |
| Duplicate approved Pin instances from duplicated signatures | 0 | 0 |
| Duplicate source signatures in manual production plan | n/a | 0 |
| Duplicate source signatures in batch 01 prompts | n/a | 0 |

Important note: the historical rejection rows preserve `duplicate_source_used_by:<article_slug>` reasons, but they do not preserve the exact rejected source signature for every failed candidate. For that reason, the before-fix duplicate pressure is counted from rejection reason occurrences, while the after-fix duplicate count is measured from explicit signatures.

## Approved Pin Coverage

| Variant | Approved Pins | Missing Pins |
|---|---:|---:|
| Pin A | 62 | 238 |
| Pin B | 33 | 267 |
| Pin C | 20 | 280 |
| Total | 115 | 785 |

## Manual Image Rescue Plan

If unique manual source images are supplied and pass the same quality rules, up to 785 missing Pins can be rescued. Batch 01 currently covers 50 of those Pins.

| Target Approved Pins | Current Approved | Additional Unique Manual Images Needed |
|---:|---:|---:|
| 300 | 115 | 185 |
| 600 | 115 | 485 |
| 900 | 115 | 785 |

The full manual production plan now covers every missing Pin variant.

| Manual Plan Variant | Rows |
|---|---:|
| Pin A | 238 |
| Pin B | 267 |
| Pin C | 280 |
| Total | 785 |

Batch 01 remains a 50-image working batch, not a full 900-image production run.

| Batch 01 Variant | Prompts |
|---|---:|
| Pin A | 16 |
| Pin B | 17 |
| Pin C | 17 |
| Total | 50 |

## Rejection Reasons

| Rank | Rejection Reason | Count |
|---:|---|---:|
| 1 | duplicate_source_used_by | 1047 |
| 2 | missing_required_title_element | 280 |
| 3 | weak_front_yard_context | 275 |
| 4 | quality_score_below_threshold | 270 |
| 5 | no_approved_image_source | 238 |
| 6 | people_pattern | 146 |
| 7 | vehicle_or_distraction_pattern | 81 |
| 8 | needs_more_approved_sources | 42 |

## Guardrails Now Enforced

- Same source image cannot be used for more than one Pin.
- Duplicate candidates are rejected with `duplicate_source_used_by:<pin_id>`.
- Watermark, preview, stock-photo, Unsplash+, and premium-photo patterns are rejected.
- People, vehicles, interior context, and weak front-yard context remain rejection reasons.
- Manual plan and batch prompts now include unique `source_signature` values and explicit no-reuse instructions.

## Schedule Snapshot

Schedule rows inspected: 115. Status distribution: pending: 115. No schedule rows were changed.

