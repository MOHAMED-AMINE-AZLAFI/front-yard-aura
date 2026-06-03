# Pinterest Production Final Report

Generated: 2026-06-03

## Summary

Image production did not run because this workspace has no configured image-generation provider or API key, and the existing production image script uses external stock-image sourcing rather than the manual prompt batches. No placeholder images were created, no pins were published, and no failed manual pins were inserted into the schedule.

## Completed

- Created `manual-image-prompts-batch-04.csv`: 150 prompts
- Created `manual-image-prompts-batch-05.csv`: 150 prompts
- Created `manual-image-prompts-batch-06.csv`: 150 prompts
- Validated Batch 04, Batch 05, and Batch 06 with `scripts/audit-manual-prompts.mjs`
- Ran Pinterest quality audit
- Rebuilt `data/pinterest/pinterest-schedule.csv`
- Ran `npm run build`

## Production Totals

- Approved pins total in `pinterest-pins.csv`: 115
- Rejected pins total in `pinterest-rejected-pins.csv`: 785
- Remaining needed to reach 900 approved pins: 785
- Images produced in this run: 0
- New approved pins inserted in this run: 0
- New rejected pins inserted in this run: 0

## Strict Quality Audit

- Audit ok: false
- Strict audit approved: 14
- Strict audit rejected: 101
- Articles needing manual images: 280

Top strict audit rejection reasons:

- `missing_visible_house_exterior`: 62
- `missing_landscaping_element`: 30
- `missing_visible_front_yard`: 30
- `missing_required_title_element`: 5
- `architecture_dominates_frame`: 1

## Manual Prompt Inventory

- Batch 01: 50 prompts
- Batch 02: 100 prompts
- Batch 03: 50 prompts
- Batch 04: 150 prompts
- Batch 05: 150 prompts
- Batch 06: 150 prompts
- Total manual prompts available: 650

Source signature checks:

- Duplicate `source_signature` values among approved pins: 0
- Duplicate `source_signature` values across manual prompt batches: 0

## Schedule

- Scheduled approved pins: 115
- Schedule days: 18
- Start date: 2026-06-04
- End date: 2026-06-25
- Schedule builder errors: 0
- Schedule builder warnings: 0

## Build

- Build status: complete
- Built pages: 315
- Build errors: 0
- Build warnings: 0
- Build hints: 2

Build hints:

- `scripts/generate-production-pins.mjs:476`: `chooseSource` is declared but its value is never read
- `workers/pinterest-publisher/src/index.js:242`: `scheduleRow` is declared but its value is never read

## Blocker

To move from 115 toward 900 approved pins, the missing step is a real manual-image production backend that can turn the 650 validated prompt rows into image files, then pass those files through `pin-image-quality.mjs` before inserting only passing pins into `pinterest-pins.csv`.
