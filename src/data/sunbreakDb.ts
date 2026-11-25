import {
  ArmorItem,
  DecorationItem,
  MonsterDefinition,
  SkillDefinition,
  WeaponClass,
  WeaponCombo,
  WeaponItem,
} from '../types/sunbreak';
import { MHRICE_ARMOR_DB, MHRICE_DECORATIONS_DB, MHRICE_SKILLS_DB, MHRICE_WEAPONS_DB, LEGACY_CATALOGS } from './mhriceAdapter';
import { MATERIALS_CATALOG, SunbreakMaterialMeta } from './materialsCatalog';
import {
  DEFAULT_TALISMAN,
  META_BUILD_TEMPLATES,
  PRESET_TALISMANS,
  STARTER_LOADOUT,
} from './metaTemplates';
import { MONSTERS_DB } from './monsterCatalog';


export const ARMOR_DB = MHRICE_ARMOR_DB;
export const DECORATIONS_DB = MHRICE_DECORATIONS_DB;
export const SKILLS_DB = MHRICE_SKILLS_DB;
export const WEAPONS_DB = MHRICE_WEAPONS_DB;

export {
  DEFAULT_TALISMAN,
  MATERIALS_CATALOG,
  META_BUILD_TEMPLATES,
  MONSTERS_DB,
  PRESET_TALISMANS,
  STARTER_LOADOUT,
};
export type { SunbreakMaterialMeta };

export const WEAPON_CLASSES: WeaponClass[] = [
  'Great Sword',
  'Long Sword',
  'Sword & Shield',
  'Dual Blades',
  'Lance',
  'Gunlance',
  'Hammer',
  'Hunting Horn',
  'Switch Axe',
  'Charge Blade',
  'Insect Glaive',
  'Light Bowgun',
  'Heavy Bowgun',
  'Bow',
];

export const WEAPON_COMBOS_DB: WeaponCombo[] = [
  {
    id: 'combo_gs_strongarm',
    weaponClass: 'Great Sword',
    name: 'Strongarm Stance -> True Charged Slash',
    description: 'Approximate Strongarm TCS. Assumes both slashes connect.',
    durationSec: 4.8,
    hits: [
      { moveName: 'TCS First Hit', motionValue: 22, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'TCS Power Hit (Strongarm)', motionValue: 356, elementMod: 1.7, sharpnessCost: 1, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_ls_harvest',
    weaponClass: 'Long Sword',
    name: 'Harvest Moon -> Sacred Sheathe Combo',
    description: 'Approximate Sacred Sheathe and Harvest Moon preview. Spirit gauge and counter timing are assumed.',
    durationSec: 5.2,
    hits: [
      { moveName: 'Sacred Sheathe Hit 1', motionValue: 40, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Sacred Sheathe Hit 2', motionValue: 75, elementMod: 1.2, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Sacred Sheathe Finisher', motionValue: 185, elementMod: 1.5, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Harvest Moon Counter Tick', motionValue: 55, elementMod: 1.0, sharpnessCost: 0, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_sns_metsu',
    weaponClass: 'Sword & Shield',
    name: 'Metsu Shoryugeki + Lateral Loop',
    description: 'Shield counter uppercut followed by fast elemental lateral slash sequence.',
    durationSec: 4.5,
    hits: [
      { moveName: 'Metsu Counter', motionValue: 80, damageType: 'Blunt', elementMod: 0, sharpnessCost: 0, statusProcChance: 0, isAerialOrWirebug: true },
      { moveName: 'Metsu Counter Follow-up (3 hits)', motionValue: 90, damageType: 'Blunt', elementMod: 0, sharpnessCost: 0, statusProcChance: 0, isAerialOrWirebug: true },
      { moveName: 'Lateral Slash', motionValue: 26, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Return Stroke', motionValue: 26, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Spinning Reaper', motionValue: 65, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_db_spiral',
    weaponClass: 'Dual Blades',
    name: 'Spiral Slash + Demon Flurry Rush',
    description: 'Approximate elemental sequence. Assumes Spiral Slash connects on a valid hitzone.',
    durationSec: 4.2,
    hits: [
      { moveName: 'Spiral Slash Drill (x6)', motionValue: 120, elementMod: 6.0, sharpnessCost: 3, statusProcChance: 0.33, isAerialOrWirebug: true },
      { moveName: 'Demon Flurry Left/Right (x4)', motionValue: 64, elementMod: 3.6, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Sixfold Demon Slash Finisher', motionValue: 78, elementMod: 3.2, sharpnessCost: 2, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_lance_leaping',
    weaponClass: 'Lance',
    name: 'Leaping Thrust -> Anchor Rage Loop',
    description: 'Leaping Thrust, High Thrust I and a successful Anchor Rage counter. Aura uptime is excluded.',
    durationSec: 3.8,
    hits: [
      { moveName: 'Leaping Thrust (3 hits)', motionValue: 64, elementMod: 3.5, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'High Thrust I', motionValue: 27, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Anchor Rage Counter', motionValue: 70, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_gl_bullet_barrage',
    weaponClass: 'Gunlance',
    name: 'Overhead Slam -> Full Burst -> Wide Sweep',
    description: 'Starts with a fully loaded Gunlance. Full Burst fires every loaded shell.',
    durationSec: 4.4,
    hits: [
      { moveName: 'Overhead Slam', motionValue: 48, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Full Burst Shells', motionValue: 0, elementMod: 0, sharpnessCost: 2, statusProcChance: 0, gunlanceFullBurst: true },
      { moveName: 'Wide Sweep', motionValue: 68, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_ham_impact_crater',
    weaponClass: 'Hammer',
    name: 'Courage Charge Sequence',
    description: 'Approximate Courage sequence without separately simulated Impact Burst follow-ups.',
    durationSec: 4.6,
    hits: [
      { moveName: 'Courage Lv1 Smash', motionValue: 45, elementMod: 1.4, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Courage Lv2 Uppercut', motionValue: 60, elementMod: 1.6, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Courage Lv3 Brutal Slam', motionValue: 135, elementMod: 2.2, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_hh_magnificent_trio',
    weaponClass: 'Hunting Horn',
    name: 'Crush -> Multi-Crush -> Shockwave',
    description: 'Approximate Silkbind Shockwave preview. Weapon hits and shockwaves are grouped.',
    durationSec: 4.1,
    hits: [
      { moveName: 'Crush + Shockwave', motionValue: 58, elementMod: 2.5, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Multi-Crush + Shockwave', motionValue: 84, elementMod: 3.2, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Perform + Shockwave', motionValue: 62, elementMod: 2.5, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_sa_morph_loop',
    weaponClass: 'Switch Axe',
    name: 'Double Slash -> Axe Morph -> Sword Morph',
    description: 'Weapon hits from the morph loop. Phial damage and amp-state effects are excluded.',
    durationSec: 3.9,
    hits: [
      { moveName: 'Sword Double Slash', motionValue: 64, elementMod: 2.0, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Axe Morph Double Slash', motionValue: 55, elementMod: 2.0, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Sword Morph Slash', motionValue: 23, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_cb_saed',
    weaponClass: 'Charge Blade',
    name: 'Charged Shield SAED',
    description: 'Ground SAED with five full phials and a charged shield. Phials are evaluated on the selected part.',
    durationSec: 4.7,
    hits: [
      { moveName: 'SAED First Swing', motionValue: 15 * 1.1, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'SAED Axe Slam', motionValue: 90 * 1.1, elementMod: 2.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'SAED Third Hit', motionValue: 72, elementMod: 1.0, sharpnessCost: 0, statusProcChance: 0.33 },
      { moveName: 'SAED Phials', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, chargeBladeSaedPhials: true },
    ],
  },
  {
    id: 'combo_ig_tetraseal',
    weaponClass: 'Insect Glaive',
    name: 'Tornado Slash -> Vault -> Diving Wyvern',
    description: 'Weapon hits without kinsect damage, extract bonuses or aerial bounce multipliers.',
    durationSec: 4.5,
    hits: [
      { moveName: 'Tornado Slash (2 hits)', motionValue: 66, elementMod: 2.0, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Diving Wyvern', motionValue: 80, elementMod: 3.0, sharpnessCost: 1, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_lbg_pierce',
    weaponClass: 'Light Bowgun',
    name: 'Physical Ammo Magazine',
    description: 'Estimates damage per base magazine at critical distance. Pierce uses the selected tick count.',
    hits: [
      { moveName: 'Physical Ammo Magazine', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, rangedAttack: 'bowgun-magazine' },
    ],
  },
  {
    id: 'combo_hbg_crouch',
    weaponClass: 'Heavy Bowgun',
    name: 'Physical Ammo Magazine',
    description: 'Uses the base magazine at critical distance. Supported ammo uses an estimated uncharged fire-and-reload cycle.',
    hits: [
      { moveName: 'Physical Ammo Magazine', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, rangedAttack: 'bowgun-magazine' },
    ],
  },
  {
    id: 'combo_bow_dash_dance',
    weaponClass: 'Bow',
    name: 'Dash Dance -> Power Shot -> Power Volley',
    description: 'Starts at the highest unlocked charge, at critical distance and with no coating. Pierce counts the first tick per arrow.',
    durationSec: 3.2,
    hits: [
      { moveName: 'Charged Shot', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, rangedAttack: 'bow-shot' },
      { moveName: 'Power Shot', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, rangedAttack: 'bow-shot' },
      { moveName: 'Power Volley', motionValue: 0, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, rangedAttack: 'bow-shot' },
    ],
  },
];



function indexById<T extends { id: string }>(catalog: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of catalog) {
    if (!index.has(item.id)) index.set(item.id, item);
  }
  return index;
}

const skillsById = indexById(SKILLS_DB);
const weaponsById = indexById(WEAPONS_DB);
const armorById = indexById(ARMOR_DB);
const decorationsById = indexById(DECORATIONS_DB);

export function getSkillById(id: string): SkillDefinition | undefined {
  return skillsById.get(id) ?? LEGACY_CATALOGS.skills.find((s) => s.id === id);
}

export function getWeaponById(id: string): WeaponItem | undefined {
  return weaponsById.get(id) ?? LEGACY_CATALOGS.weapons.find((w) => w.id === id);
}

export function getArmorById(id: string): ArmorItem | undefined {
  const directMatch = armorById.get(id);
  if (directMatch) return directMatch;
  const sourceMatch = /^armor:(head|chest|arm|waist|leg):(\d+)$/.exec(id);
  if (sourceMatch) {
    const slots = { head: 'Helm', chest: 'Chest', arm: 'Arms', waist: 'Waist', leg: 'Legs' };
    const slot = slots[sourceMatch[1] as keyof typeof slots];
    return ARMOR_DB.find((a) => a.slot === slot && a.sourceId === Number(sourceMatch[2]));
  }
  return LEGACY_CATALOGS.armor.find((a) => a.id === id);
}

export function getDecorationById(id: string): DecorationItem | undefined {
  return decorationsById.get(id) ?? LEGACY_CATALOGS.decorations.find((d) => d.id === id);
}

export function getMonsterById(id: string): MonsterDefinition | undefined {
  return MONSTERS_DB.find((m) => m.id === id);
}

// Exposed for development diagnostics and automated catalog checks.
export { CATALOG_COUNTS, validateCatalogs } from './catalogValidation';
