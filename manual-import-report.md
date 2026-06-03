# Manual Image Import Report

Generated: 2026-06-03T21:14:01.889Z

## Summary

- Dry run: yes
- Template rows: 0
- Approved imports: 0
- Rejected imports: 0
- Rendered final images: 0
- Approved pins total after run: 115
- Rejected pins total after run: 785
- Schedule rebuilt: no

## Paths

- Import folder: `public/pins/manual-import/`
- Template: `manual-image-import-template.csv`
- Approved pins: `data/pinterest/pinterest-pins.csv`
- Rejected pins: `data/pinterest/pinterest-rejected-pins.csv`
- Schedule: `data/pinterest/pinterest-schedule.csv`

## Rejection Reasons

- None

## Schedule

- Status: ok
- Exit code: 0

## Notes

The import script only accepts source images that already exist under `public/pins/manual-import/` and are exactly 1000x1500. It writes the final overlayed JPEG to `public/pins/`, then only approved rows are eligible for scheduling.
