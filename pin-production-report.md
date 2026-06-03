# Pin Production Report

Strict quality-filtered production batch generated directly into `public/pins/`.

## Summary

- Candidate articles: 300
- Candidate pins reviewed: 900
- Approved pins: 115
- Rejected pins: 785
- Articles needing manual images: 280
- Images rendered: 115
- Unique image files: 115
- Boards with approved pins: 7
- Started: 2026-06-03T15:51:30.602Z
- Completed: 2026-06-03T15:53:08.999Z

## Production Rules Applied

- Rejected by default unless a clean `images.unsplash.com/photo-*` source has strong metadata match to the article title element.
- Unsplash Plus, premium, preview, watermark-pattern, people-pattern, interior, and weak-context sources are blocked.
- The same source photo is not reused across different articles.
- Articles without enough approved sources are written to `data/pinterest/pinterest-needs-manual-images.csv`.
- Publishing scripts only accept pins with `quality_status=approved`.

## Validation

- Missing images: 0
- Invalid dimensions: 0
- Duplicate output filenames: 0
- Duplicate pin titles: 0
- Duplicate pin descriptions: 0
- Duplicate source/article keys: 0
- Generation errors: 0
- Total blocking errors: 0

## Rejection Reasons

- missing_required_title_element: 1320
- no_approved_image_source: 714
- duplicate_source_used_by:curb-appeal-landscaping-for-craftsman-bungalows: 510
- duplicate_source_used_by:curb-appeal-landscaping-for-farmhouse-exteriors: 336
- weak_front_yard_context: 327
- duplicate_source_used_by:curb-appeal-landscaping-with-clean-foundation-beds: 210
- people_pattern: 138
- vehicle_or_distraction_pattern: 132
- duplicate_source_used_by:curb-appeal-landscaping-for-small-ranch-houses: 114
- duplicate_source_used_by:curb-appeal-landscaping-for-stone-houses: 105
- duplicate_source_used_by:front-yard-annual-flower-ideas: 84
- needs_more_approved_sources: 71
- duplicate_source_used_by:curb-appeal-landscaping-with-front-step-planters: 63
- duplicate_source_used_by:curb-appeal-landscaping-with-front-yard-focal-points: 60
- duplicate_source_used_by:front-yard-minimalist-landscaping-ideas: 51
- duplicate_source_used_by:curb-appeal-landscaping-with-seasonal-containers: 18
- duplicate_source_used_by:budget-front-yard-ideas-with-secondhand-stone: 15
- duplicate_source_used_by:narrow-front-yard-landscaping-ideas: 15
- duplicate_source_used_by:small-front-yard-ideas-for-city-houses: 15
- duplicate_source_used_by:front-yard-flower-bed-ideas-for-brick-walkways: 9
- duplicate_source_used_by:small-front-yard-ideas-with-sidewalk-to-door-flow: 9
- duplicate_source_used_by:brick-front-walkway-landscaping-ideas: 6
- duplicate_source_used_by:curb-appeal-landscaping-ideas-that-look-expensive: 6
- duplicate_source_used_by:modern-front-yard-ornamental-grass-ideas: 6
- duplicate_source_used_by:small-front-yard-landscaping-for-split-level-homes: 6
- duplicate_source_used_by:curb-appeal-landscaping-for-blue-houses: 3
- duplicate_source_used_by:curb-appeal-landscaping-with-a-statement-tree: 3
- duplicate_source_used_by:front-yard-flower-bed-ideas-with-stone-edging: 3
- duplicate_source_used_by:front-yard-luxury-curb-appeal-ideas: 3
- quality_score_below_threshold: 3

## Distribution

- Variants: A: 62, B: 33, C: 20
- Intents: undefined: 115
- Source types: unsplash-search: 115
- Boards: walkway-landscaping-ideas: 16, front-yard-landscaping-on-a-budget: 2, curb-appeal-landscaping-ideas: 31, front-yard-flower-bed-ideas: 29, modern-front-yard-landscaping: 20, front-yard-landscaping-with-rocks: 4, small-front-yard-landscaping-ideas: 13

## Samples

| Pin ID | Article | Variant | Intent | Source Type | Source | File |
| --- | --- | --- | --- | --- | --- | --- |
| brick-front-walkway-landscaping-ideas-a | Brick Front Walkway Landscaping Ideas | A | undefined | unsplash-search | photo-1666040625810-10a88a71892b | brick-front-walkway-landscaping-ideas-pin-a-zvf2b.jpg |
| budget-front-yard-ideas-with-secondhand-stone-a | Budget Front Yard Ideas With Secondhand Stone | A | undefined | unsplash-search | photo-1748785723427-6401d398be88 | budget-front-yard-ideas-with-secondhand-stone-pin-a-14k50.jpg |
| budget-front-yard-ideas-with-secondhand-stone-b | Budget Front Yard Ideas With Secondhand Stone | B | undefined | unsplash-search | photo-1710755790687-e7919d5dfeb3 | budget-front-yard-ideas-with-secondhand-stone-pin-b-14a5e.jpg |
| curb-appeal-landscaping-for-black-houses-a | Curb Appeal Landscaping for Black Houses | A | undefined | unsplash-search | photo-1593297779108-fc0df41cca94 | curb-appeal-landscaping-for-black-houses-pin-a-ubo0t.jpg |
| curb-appeal-landscaping-for-black-houses-b | Curb Appeal Landscaping for Black Houses | B | undefined | unsplash-search | photo-1675747159044-cd54aec604e5 | curb-appeal-landscaping-for-black-houses-pin-b-ulnmi.jpg |
| curb-appeal-landscaping-for-blue-houses-a | Curb Appeal Landscaping for Blue Houses | A | undefined | unsplash-search | photo-1625603736199-775425d2890a | curb-appeal-landscaping-for-blue-houses-pin-a-4zld6.jpg |
| curb-appeal-landscaping-for-colonial-homes-a | Curb Appeal Landscaping for Colonial Homes | A | undefined | unsplash-search | photo-1600791599208-668cd511c69c | curb-appeal-landscaping-for-colonial-homes-pin-a-dnpis.jpg |
| curb-appeal-landscaping-for-colonial-homes-b | Curb Appeal Landscaping for Colonial Homes | B | undefined | unsplash-search | photo-1780245990091-fe12f601fa90 | curb-appeal-landscaping-for-colonial-homes-pin-b-ddpx3.jpg |
| curb-appeal-landscaping-for-colonial-homes-c | Curb Appeal Landscaping for Colonial Homes | C | undefined | unsplash-search | photo-1763909130798-7c38ff5e1c97 | curb-appeal-landscaping-for-colonial-homes-pin-c-d3qbe.jpg |
| curb-appeal-landscaping-for-craftsman-bungalows-a | Curb Appeal Landscaping for Craftsman Bungalows | A | undefined | unsplash-search | photo-1589321084815-4e5f1740cbc6 | curb-appeal-landscaping-for-craftsman-bungalows-pin-a-xf9hn.jpg |
| curb-appeal-landscaping-for-farmhouse-exteriors-a | Curb Appeal Landscaping for Farmhouse Exteriors | A | undefined | unsplash-search | photo-1768179123387-b9bba0913bfa | curb-appeal-landscaping-for-farmhouse-exteriors-pin-a-smuov.jpg |
| curb-appeal-landscaping-for-farmhouse-exteriors-b | Curb Appeal Landscaping for Farmhouse Exteriors | B | undefined | unsplash-search | photo-1778603346141-a73bd5c0209f | curb-appeal-landscaping-for-farmhouse-exteriors-pin-b-tgthy.jpg |
| curb-appeal-landscaping-for-small-ranch-houses-a | Curb Appeal Landscaping for Small Ranch Houses | A | undefined | unsplash-search | photo-1712195855605-31613010d065 | curb-appeal-landscaping-for-small-ranch-houses-pin-a-6qj14.jpg |
| curb-appeal-landscaping-for-stone-houses-a | Curb Appeal Landscaping for Stone Houses | A | undefined | unsplash-search | photo-1653569511862-8a0320ae66cc | curb-appeal-landscaping-for-stone-houses-pin-a-prf3v.jpg |
| curb-appeal-landscaping-ideas-that-look-expensive-a | Curb Appeal Landscaping Ideas That Make a Home Look Expensive | A | undefined | unsplash-search | photo-1753799515926-a498f5e91c49 | curb-appeal-landscaping-ideas-that-look-expensive-pin-a-x2tdk.jpg |
| curb-appeal-landscaping-ideas-that-look-expensive-b | Curb Appeal Landscaping Ideas That Make a Home Look Expensive | B | undefined | unsplash-search | photo-1731259240474-5370d9ca53ba | curb-appeal-landscaping-ideas-that-look-expensive-pin-b-wstrv.jpg |
| curb-appeal-landscaping-ideas-that-look-expensive-c | Curb Appeal Landscaping Ideas That Make a Home Look Expensive | C | undefined | unsplash-search | photo-1750129028051-3b91618d919e | curb-appeal-landscaping-ideas-that-look-expensive-pin-c-wiu66.jpg |
| curb-appeal-landscaping-with-a-statement-tree-a | Curb Appeal Landscaping With a Statement Tree | A | undefined | unsplash-search | photo-1750682916296-71e66f86171d | curb-appeal-landscaping-with-a-statement-tree-pin-a-1v019.jpg |
| curb-appeal-landscaping-with-a-statement-tree-b | Curb Appeal Landscaping With a Statement Tree | B | undefined | unsplash-search | photo-1752450589562-4b221a3fb31a | curb-appeal-landscaping-with-a-statement-tree-pin-b-1u62g.jpg |
| curb-appeal-landscaping-with-clean-foundation-beds-a | Curb Appeal Landscaping With Clean Foundation Beds | A | undefined | unsplash-search | photo-1530079427717-5d72ed352909 | curb-appeal-landscaping-with-clean-foundation-beds-pin-a-e139q.jpg |
| curb-appeal-landscaping-with-clean-foundation-beds-b | Curb Appeal Landscaping With Clean Foundation Beds | B | undefined | unsplash-search | photo-1702315352219-3400c2495b02 | curb-appeal-landscaping-with-clean-foundation-beds-pin-b-eb2vf.jpg |
| curb-appeal-landscaping-with-clean-foundation-beds-c | Curb Appeal Landscaping With Clean Foundation Beds | C | undefined | unsplash-search | photo-1604990304391-0ceb013cc205 | curb-appeal-landscaping-with-clean-foundation-beds-pin-c-el2h4.jpg |
| curb-appeal-landscaping-with-front-step-planters-a | Curb Appeal Landscaping With Front Step Planters | A | undefined | unsplash-search | photo-1757992141341-e2c987139153 | curb-appeal-landscaping-with-front-step-planters-pin-a-1v7od.jpg |
| curb-appeal-landscaping-with-front-step-planters-b | Curb Appeal Landscaping With Front Step Planters | B | undefined | unsplash-search | photo-1745946926024-02d830d63b79 | curb-appeal-landscaping-with-front-step-planters-pin-b-1vhnz.jpg |
