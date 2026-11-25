# Elgado Forge — database reconstruction and integration

## Scope

The live equipment/skill catalogs are now connected to the MHRice import. The existing React UI and existing saved-build IDs remain compatible through legacy lookup fallbacks. The original source import is kept separately from the compact runtime catalog.

## Primary source imported

- Project: [MHRice](https://github.com/wwylele/mhrice)
- Data download page: https://d2d662ws3kt2jd.cloudfront.net/about.html
- Locale: English (`content[1]`)
- MHRice source SHA values: `2aa568168bf7806c46a0e956ee0912a011a39eb70fc69ff07949022a43cfc9fd`, `798e61b8ee88d9104d317034d3155283d5a02423faa5691a4aad0debb817e05d`
- Uploaded source JSON SHA-256: `3818fdef73f9d4d83c4f75a3c6286ccbdcf4555425c5c3547f4489cb887d466f`
- Importer: `scripts/import-mhrice.py`
- Full normalized source catalog: `src/data/generated/mhriceCatalog.json`
- Compact runtime catalog: `src/data/generated/mhriceAppCatalog.json`
- Runtime adapter: `src/data/mhriceAdapter.ts`
- Machine-readable import report: `src/data/generated/mhriceCatalog.report.json`

The MHRice project requests attribution. Keep this attribution with distributed data and review the upstream license before publishing derivatives.

## Integrated catalog

| Runtime catalog | Records |
|---|---:|
| Selectable weapons | 3,925 |
| Weapon classes | 14 |
| Armor pieces | 1,639 |
| Hunter skills | 147, plus legacy-only compatibility entries if any |
| Ordinary decorations | 244 |
| Rampage decorations | 34 |

The 253 weapon rows without a tree node and usable attack value remain in the full normalized source catalog for provenance and are not selectable in the app. The app includes the 79 armor rows whose English localization is unresolved, with explicit fallback labels and `nameResolved: false`; they are not silently presented as verified translations. One ordinary decoration row has an unresolved/rejected localization and is excluded from the runtime catalog. All included armor and decoration skill references resolve to the imported skill table. The importer was corrected to resolve decoration names by their source decoration ID rather than by `sort_id`.

The adapter maps source skill references to the existing app skill IDs when the English skill name matches, preserving formulas and older builds. Existing legacy weapon/armor/decoration records remain available through lookup fallbacks so old saved builds, presets and shared build URLs can still resolve their old IDs. Imported weapons use their source IDs, including when an English name matches a legacy record.

Weapon names are matched by source weapon ID within each class. Tree indices repeat across branches and are used for progression data. Same-name armor records keep their individual IDs and stats. The armor selector shows upgrade state, equipment restriction, or source ID alongside these variants when the source provides enough information.

## What is preserved beyond the current UI model

The compact runtime weapon records retain source-specific details and crafting recipe paths (`sourceDetails`, `sourceCrafting`), tree progression flags, source sharpness gauge, original slot-count arrays, and Rampage slot counts. Armor records retain source series, rank group, full resistance values, original slot counts and all skill references. Decorations retain every source skill reference in `sourceSkills`; Rampage decorations retain their separate Rampage skill names.

Handicraft extends the source gauge by up to 10 points per level, following the weapon's extension segments. The simulator still simplifies sharpness depletion, skill uptime and cycle timing.

Equipment filters use the catalog's LR, HR and MR bands. Progression checks consider tree and recipe requirements. Rank alone leaves quest clears, key monsters, key items and NPC conditions unverified when the app has no evidence for them.

### Build and combat references

- Use the [Sunbreak Endgame Meta Builds Compilation](https://www.reddit.com/r/MonsterHunterMeta/comments/w0d4tf/mhsunbreak_endgame_meta_builds_compilation/) for endgame playstyle and skill priorities. Its linked [Gunlance guide](https://docs.google.com/document/d/1OxTWdWoR-nxzKQfYzlXJp65rpzwMGfUAxd-cuNue5oA/edit) targets the bonus update. Use the [Game8 build index](https://game8.co/games/Monster-Hunter-Rise/archives/325380) for progression examples and validate all equipment and decorations against MHRice.
- Gunlance Full Burst uses the [v15+ shelling tables](https://kuroyonhon.com/mhrisesb/memo/9.php) and [Artillery, Load Shells and Sneak Attack effects](https://kuroyonhon.com/mhrisesb/program/skill.php). MHRice supplies the weapon's base shelling type and level. The simulated sequence starts with a full magazine and uses the simulator's existing estimated Sneak Attack uptime and combo duration. It has no controls for Ground Splitter, Dango Bombardier or shelling-level augments. [CaoSlayer's early Normal versus Long benchmarks](https://www.youtube.com/watch?v=hOXwk1uaqoI) predate the v15 shelling changes.
- [mhchargeblade.net progression and phial guide](https://mhchargeblade.net/mhr/sunbreak-builds/) is labeled TU3 and links to the authors' [TU5 + Bonus Update builds](https://docs.google.com/document/d/1wKmsGNC5NhlGGiywnLiJYC6Z3uVA6AoeYrBgetNegNA/edit). The endgame index links to the [final update Bow builds](https://imgur.com/a/Y4qOVV4) and the [TU5 Light Bowgun guide](https://monsterhunterbuilds.wordpress.com/lbg-tu5-meta/) for future validation.

### Weapon audit

Telemetry applies Weakness Exploit on physical hitzones of 45 or higher and Element Exploit on elemental hitzones of 20 or higher. A successful template weapon substitution preserves the original element or status and the applicable shelling, phial or recommended shot family. Bowgun substitutions also preserve whether the recommended shot has Rapid Fire. [Skill and hitzone thresholds](https://kuroyonhon.com/mhrisesb/program/skill.php)

| Class | Owned-build checks | Telemetry coverage and remaining calibration |
|---|---|---|
| Great Sword | Focus, Frostcraft and Offensive Guard have dedicated weights. | Strongarm TCS remains a preset estimate. Counter timing, charge and the first-hit condition need individual controls. [Strongarm and charge data](https://kuroyonhon.com/mhrisesb/memo/2.php) |
| Long Sword | Quick Sheathe 3 is the priority for the default recommendations. | The Sacred Sheathe and Harvest Moon preview needs separate spirit gauge and counter states. [Spirit and counter data](https://kuroyonhon.com/mhrisesb/memo/3.php) |
| Sword & Shield | Offensive Guard and shield comfort are weighted. | Metsu uses blunt hitzones and no weapon element. Lateral Slash, Return Stroke and Spinning Reaper use sever hitzones. [Metsu and sword data](https://kuroyonhon.com/mhrisesb/memo/4.php) |
| Dual Blades | Matching element and stamina skills receive extra weight. | Spiral Slash is an approximate preset. Demon modes, the hitzone requirement and individual drill hits are pending. [Demon mode data](https://kuroyonhon.com/mhrisesb/memo/5.php) |
| Hammer | Focus and Slugger have dedicated weights. | The Courage sequence remains an estimate. Charge stages and Impact Burst follow-ups need separate modeling. [Hammer charge data](https://kuroyonhon.com/mhrisesb/memo/6.php) |
| Hunting Horn | Horn Maestro 1 is a priority. | The combined attack and shockwave rows are approximate. Melodies and sound attacks need independent models. [Melodies and shockwave data](https://kuroyonhon.com/mhrisesb/memo/7.php) |
| Lance | Guard, Guard Up and Offensive Guard have dedicated weights. | Leaping Thrust, High Thrust I and the Anchor Rage counter use their listed values. Anchor Rage aura uptime is excluded. [Lance motion values](https://kuroyonhon.com/mhrisesb/memo/8.php) |
| Switch Axe | Rapid Morph 3 is a priority. | The morph loop uses the weapon hits and the raw Rapid Morph multiplier. Phial and amp-state damage are pending. [Switch Axe motion values](https://kuroyonhon.com/mhrisesb/memo/10.php) |
| Charge Blade | Load Shells 2 is a priority. Artillery has weight for Impact Phial. | Charged-shield ground SAED uses separate Impact and Element phial equations and assumes five phials hit the selected part. Counter Morph Slash, food bonuses and spinning axe remain unmodeled. [SAED and phial data](https://kuroyonhon.com/mhrisesb/memo/11.php) |
| Insect Glaive | Extract uptime prioritizes Power Prolonger. Elemental builds favor the matching element. | Tornado Slash and base Diving Wyvern use listed values. Kinsect, extracts and bounce multipliers are excluded. [Insect Glaive motion values](https://kuroyonhon.com/mhrisesb/memo/12.php) |
| Light Bowgun | The app favors the suggested physical ammo and only weights Rapid Fire Up for a supported ammo. | The physical magazine uses source capacity and actual Rapid Fire. Pierce totals use only the first tick per projectile. Recoil, reload and elemental ammo still need separate modeling. [Light Bowgun ammo data](https://kuroyonhon.com/mhrisesb/memo/13.php) |
| Heavy Bowgun | The app favors the suggested physical ammo and weights recoil, reload and ammunition skills. | The benchmark uses an uncharged magazine. Pierce totals use only the first tick per projectile. Crouching Fire, elemental ammo and actual cycle times are pending. [Heavy Bowgun ammo data](https://kuroyonhon.com/mhrisesb/memo/14.php) |
| Bow | Bow Charge Plus is a priority when it unlocks a charge. Shot skills follow the selected charge. | The preset uses actual charge and arrow type with no coating. Pierce totals use only the first tick per arrow. Stamina and coating effects are pending. [Bow motion and charge data](https://kuroyonhon.com/mhrisesb/memo/15.php) |

## Re-run the import

Place the downloaded `mhrice.json` in the project root, then run:

```bash
npm run data:import
npm run data:validate
```

`data:import` rebuilds both the full normalized source catalog and the compact runtime catalog. `data:validate` checks source IDs, selectable weapon completeness and armor/decoration skill references.

## Validation and remaining work

- Source validation passed with `errors: []`.
- TypeScript checks passed for the adapter, database module, catalog validator, damage calculator, owned-build optimizer and storage/share utilities.
- A full application `npm run lint` and production build were not completed in this environment because dependencies were not installed; the npm install attempt timed out. Re-run `npm install`, `npm run lint` and `npm run build` in the project environment before publishing.
- 79 armor names remain explicitly unresolved in the supplied English localization; verify these against an additional trusted source before replacing fallback labels.
- Add regression tests for exact weapon progression, full sharpness calculations, weapon-specific ammo/phials/shelling/melodies/kinsect behavior, and saved-build/import/export compatibility.

## Secondary cross-check

Use Kiranico as a visual/coverage cross-check for public-facing values, but do not use it as the source of internal IDs or as a substitute for MHRice game data: https://mhrise.kiranico.com/
