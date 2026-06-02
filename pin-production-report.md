# Pin Production Report

Final production batch generated directly into `public/pins/`. No new test-v3 folder was created.

## Summary

- Articles: 300
- Pins requested: 900
- Images generated: 900
- Unique image files: 900
- Boards: 8
- Started: 2026-06-02T18:14:30.562Z
- Completed: 2026-06-02T18:24:31.129Z

## Production Rules Applied

- Title font size reduced from v2 by roughly 10-15%: max title size is 64px.
- Title is constrained to the upper third or lower third of the image, with 96px side padding and 808px max width.
- Title uses measured line wrapping and automatic font sizing to prevent overflow.
- The image brightness and light overlay treatment from test-v2 are preserved.
- A/B/C use filtered Unsplash search sources first, plus different crop/zoom transforms: wide exterior, close detail, different angle.

## Validation

- Missing images: 0
- Invalid dimensions: 0
- Duplicate output filenames: 0
- Duplicate pin titles: 0
- Duplicate pin descriptions: 0
- Topic/article match errors: 0
- A/B/C visual diversity errors: 0
- Generation errors: 0
- Total blocking errors: 0

## Distribution

- Variants: A: 300, B: 300, C: 300
- Intents: walkways: 409, budget: 36, flower-beds: 108, rocks: 231, low-maintenance: 28, curb-appeal: 82, small-yards: 6
- Source types: unsplash-search: 900
- Boards: curb-appeal-landscaping-ideas: 147, front-yard-flower-bed-ideas: 117, front-yard-landscaping-on-a-budget: 105, front-yard-landscaping-with-rocks: 105, low-maintenance-front-yard-landscaping: 111, modern-front-yard-landscaping: 105, small-front-yard-landscaping-ideas: 105, walkway-landscaping-ideas: 105

## Final Verification

- `public/pins/` production JPG files: 900
- `dist/pins/` production JPG files after build: 900
- Pinterest schedule rows: 900
- Pinterest schedule days: 94
- `test-v3` folder created: no
- `npm run build`: passed with 0 errors, 0 warnings, 0 hints
- `scripts/production-audit.mjs`: passed

## Samples

| Pin ID | Article | Variant | Intent | Source Type | Source | File |
| --- | --- | --- | --- | --- | --- | --- |
| brick-front-walkway-landscaping-ideas-a | Brick Front Walkway Landscaping Ideas | A | walkways | unsplash-search | premium_photo-1776735388788-491a2966be48 | brick-front-walkway-landscaping-ideas-pin-a-zvf2b.jpg |
| brick-front-walkway-landscaping-ideas-b | Brick Front Walkway Landscaping Ideas | B | walkways | unsplash-search | photo-1768179123387-b9bba0913bfa | brick-front-walkway-landscaping-ideas-pin-b-zlfgm.jpg |
| brick-front-walkway-landscaping-ideas-c | Brick Front Walkway Landscaping Ideas | C | walkways | unsplash-search | photo-1722480419960-39017e2087a6 | brick-front-walkway-landscaping-ideas-pin-c-zbfux.jpg |
| budget-front-yard-curb-appeal-for-renters-a | Budget Front Yard Curb Appeal for Renters | A | budget | unsplash-search | photo-1589321084815-4e5f1740cbc6 | budget-front-yard-curb-appeal-for-renters-pin-a-1jl64.jpg |
| budget-front-yard-curb-appeal-for-renters-b | Budget Front Yard Curb Appeal for Renters | B | budget | unsplash-search | photo-1768179123387-b9bba0913bfa | budget-front-yard-curb-appeal-for-renters-pin-b-1jv5q.jpg |
| budget-front-yard-curb-appeal-for-renters-c | Budget Front Yard Curb Appeal for Renters | C | walkways | unsplash-search | photo-1761258635423-2a5f6cca1a3a | budget-front-yard-curb-appeal-for-renters-pin-c-1k55c.jpg |
| budget-front-yard-flower-bed-makeover-a | Budget Front Yard Flower Bed Makeover Ideas | A | flower-beds | unsplash-search | photo-1778231790451-1943c8c16479 | budget-front-yard-flower-bed-makeover-pin-a-165wf.jpg |
| budget-front-yard-flower-bed-makeover-b | Budget Front Yard Flower Bed Makeover Ideas | B | flower-beds | unsplash-search | photo-1618527383466-ea468c583933 | budget-front-yard-flower-bed-makeover-pin-b-15bxm.jpg |
| budget-front-yard-flower-bed-makeover-c | Budget Front Yard Flower Bed Makeover Ideas | C | walkways | unsplash-search | photo-1724556295094-62d093eddd87 | budget-front-yard-flower-bed-makeover-pin-c-15lx8.jpg |
| budget-front-yard-gravel-path-ideas-a | Budget Front Yard Gravel Path Ideas | A | rocks | unsplash-search | photo-1589321084815-4e5f1740cbc6 | budget-front-yard-gravel-path-ideas-pin-a-1jhz8.jpg |
| budget-front-yard-gravel-path-ideas-b | Budget Front Yard Gravel Path Ideas | B | rocks | unsplash-search | photo-1659528152295-2e9b494a1863 | budget-front-yard-gravel-path-ideas-pin-b-1io0f.jpg |
| budget-front-yard-gravel-path-ideas-c | Budget Front Yard Gravel Path Ideas | C | rocks | unsplash-search | premium_photo-1687960114900-ba66305a6953 | budget-front-yard-gravel-path-ideas-pin-c-1iy01.jpg |
| budget-front-yard-ideas-with-cheap-border-plants-a | Budget Front Yard Ideas With Cheap Border Plants | A | budget | unsplash-search | photo-1768179123387-b9bba0913bfa | budget-front-yard-ideas-with-cheap-border-plants-pin-a-1gh2t.jpg |
| budget-front-yard-ideas-with-cheap-border-plants-b | Budget Front Yard Ideas With Cheap Border Plants | B | budget | unsplash-search | photo-1618527383466-ea468c583933 | budget-front-yard-ideas-with-cheap-border-plants-pin-b-1g738.jpg |
| budget-front-yard-ideas-with-cheap-border-plants-c | Budget Front Yard Ideas With Cheap Border Plants | C | walkways | unsplash-search | photo-1589321084815-4e5f1740cbc6 | budget-front-yard-ideas-with-cheap-border-plants-pin-c-1fx3m.jpg |
| budget-front-yard-ideas-with-divided-perennials-a | Budget Front Yard Ideas With Divided Perennials | A | flower-beds | unsplash-search | photo-1778231790451-1943c8c16479 | budget-front-yard-ideas-with-divided-perennials-pin-a-1ugmm.jpg |
| budget-front-yard-ideas-with-divided-perennials-b | Budget Front Yard Ideas With Divided Perennials | B | flower-beds | unsplash-search | photo-1724556295094-62d093eddd87 | budget-front-yard-ideas-with-divided-perennials-pin-b-1valf.jpg |
| budget-front-yard-ideas-with-divided-perennials-c | Budget Front Yard Ideas With Divided Perennials | C | walkways | unsplash-search | photo-1768179123387-b9bba0913bfa | budget-front-yard-ideas-with-divided-perennials-pin-c-1v0lt.jpg |
| budget-front-yard-ideas-with-diy-mailbox-bed-a | Budget Front Yard Ideas With a DIY Mailbox Bed | A | flower-beds | unsplash-search | photo-1778231790451-1943c8c16479 | budget-front-yard-ideas-with-diy-mailbox-bed-pin-a-1wz3c.jpg |
| budget-front-yard-ideas-with-diy-mailbox-bed-b | Budget Front Yard Ideas With a DIY Mailbox Bed | B | flower-beds | unsplash-search | photo-1724556295094-62d093eddd87 | budget-front-yard-ideas-with-diy-mailbox-bed-pin-b-1wp3q.jpg |
| budget-front-yard-ideas-with-diy-mailbox-bed-c | Budget Front Yard Ideas With a DIY Mailbox Bed | C | walkways | unsplash-search | photo-1768179123387-b9bba0913bfa | budget-front-yard-ideas-with-diy-mailbox-bed-pin-c-1wf45.jpg |
| budget-front-yard-ideas-with-diy-stepping-stones-a | Budget Front Yard Ideas With DIY Stepping Stones | A | rocks | unsplash-search | photo-1589321084815-4e5f1740cbc6 | budget-front-yard-ideas-with-diy-stepping-stones-pin-a-iemn5.jpg |
| budget-front-yard-ideas-with-diy-stepping-stones-b | Budget Front Yard Ideas With DIY Stepping Stones | B | rocks | unsplash-search | photo-1659528152295-2e9b494a1863 | budget-front-yard-ideas-with-diy-stepping-stones-pin-b-iom8u.jpg |
| budget-front-yard-ideas-with-diy-stepping-stones-c | Budget Front Yard Ideas With DIY Stepping Stones | C | rocks | unsplash-search | premium_photo-1687960114900-ba66305a6953 | budget-front-yard-ideas-with-diy-stepping-stones-pin-c-iyluj.jpg |
