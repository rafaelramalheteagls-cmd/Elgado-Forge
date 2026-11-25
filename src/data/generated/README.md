# Generated MHRice catalogs

- `mhriceCatalog.json` is the full normalized import. It retains raw per-record source data and is intended for auditing and future adapters.
- `mhriceAppCatalog.json` is the compact runtime subset imported by `src/data/mhriceAdapter.ts`. It includes selectable weapons, all valid armor pieces (including explicit unresolved-name fallbacks), skills, ordinary decorations with resolved names/skills, and Rampage decorations.

Do not edit either JSON manually. Rebuild them with `npm run data:import` from the source `mhrice.json`. Validate with `npm run data:validate`.

Attribution: MHRice — https://github.com/wwylele/mhrice
Data download: https://d2d662ws3kt2jd.cloudfront.net/about.html
