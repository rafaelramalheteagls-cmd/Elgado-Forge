import {
  ArmorItem,
  DecorationItem,
  MonsterDefinition,
  SkillDefinition,
  WeaponClass,
  WeaponCombo,
  WeaponItem,
} from '../types/sunbreak';
import { ARMOR_DB } from './armorCatalog';
import { getEquipmentRecipe, MATERIALS_CATALOG, SunbreakMaterialMeta } from './materialsCatalog';
import {
  DEFAULT_TALISMAN,
  META_BUILD_TEMPLATES,
  PRESET_TALISMANS,
  STARTER_LOADOUT,
} from './metaTemplates';
import { MONSTERS_DB } from './monsterCatalog';
import { DECORATIONS_DB, SKILLS_DB } from './skillsAndDecos';
import { WEAPONS_DB } from './weaponCatalog';

export {
  ARMOR_DB,
  DECORATIONS_DB,
  DEFAULT_TALISMAN,
  getEquipmentRecipe,
  MATERIALS_CATALOG,
  META_BUILD_TEMPLATES,
  MONSTERS_DB,
  PRESET_TALISMANS,
  SKILLS_DB,
  STARTER_LOADOUT,
  WEAPONS_DB,
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
    description: 'Countered TCS loop with Strongarm 1.35x charge bonus factored in.',
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
    description: 'Full 3-bar Sacred Sheathe release + Spirit Reckoning finisher.',
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
      { moveName: 'Metsu Counter Hit 1', motionValue: 90, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, isAerialOrWirebug: true },
      { moveName: 'Metsu Falling Bash', motionValue: 110, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, isAerialOrWirebug: true },
      { moveName: 'Lateral Slash', motionValue: 26, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Return Stroke', motionValue: 24, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Spinning Reaper', motionValue: 56, elementMod: 1.2, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_db_spiral',
    weaponClass: 'Dual Blades',
    name: 'Spiral Slash + Demon Flurry Rush',
    description: 'High-frequency elemental multi-hit burst on weakspots.',
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
    description: 'Continuous elemental Leaping Thrust + high poke cadence.',
    durationSec: 3.8,
    hits: [
      { moveName: 'Leaping Thrust (x3 hits)', motionValue: 69, elementMod: 2.7, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'High Thrust I', motionValue: 30, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Anchor Rage Counter', motionValue: 85, elementMod: 1.2, sharpnessCost: 1, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_gl_bullet_barrage',
    weaponClass: 'Gunlance',
    name: 'Reverse Blast -> Full Burst Sweep',
    description: 'Slam into Wide Sweep + Full Burst shell discharge.',
    durationSec: 4.4,
    hits: [
      { moveName: 'Overhead Slam', motionValue: 52, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Full Burst Shells (fixed + fire)', motionValue: 115, elementMod: 1.0, sharpnessCost: 2, statusProcChance: 0 },
      { moveName: 'Wide Sweep', motionValue: 68, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_ham_impact_crater',
    weaponClass: 'Hammer',
    name: 'Courage Charge -> Impact Burst',
    description: 'Courage elemental charge chain ending in Impact Crater.',
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
    description: 'Silkbind Shockwave active elemental horn rotation.',
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
    name: 'Rapid Morph Loop (Double Slash -> Morph)',
    description: 'Element Phial amped morph loop with phial ticks.',
    durationSec: 3.9,
    hits: [
      { moveName: 'Sword Double Slash', motionValue: 66, elementMod: 2.0, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Morph Axe Sweep (Rapid Morph)', motionValue: 96, elementMod: 1.8, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Morph Sword Overhead + Phial', motionValue: 74, elementMod: 2.8, sharpnessCost: 1, statusProcChance: 0.33 },
    ],
  },
  {
    id: 'combo_cb_saed',
    weaponClass: 'Charge Blade',
    name: 'Counter Peak -> Element SAED',
    description: 'Full 5-phial elemental Super Amped Element Discharge.',
    durationSec: 4.7,
    hits: [
      { moveName: 'Axe Slam', motionValue: 95, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: 'Shockwave Hit', motionValue: 110, elementMod: 1.0, sharpnessCost: 1, statusProcChance: 0.33 },
      { moveName: '5x Element Phial Bursts', motionValue: 35, elementMod: 18.0, sharpnessCost: 0, statusProcChance: 0 },
    ],
  },
  {
    id: 'combo_ig_tetraseal',
    weaponClass: 'Insect Glaive',
    name: 'Tornado Slash -> Diving Wyvern',
    description: 'Ground triple-up combo into aerial Diving Wyvern finisher.',
    durationSec: 4.5,
    hits: [
      { moveName: 'Rising Slash + Wide Sweep', motionValue: 68, elementMod: 2.0, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Tornado Slash (x2)', motionValue: 72, elementMod: 2.2, sharpnessCost: 2, statusProcChance: 0.33 },
      { moveName: 'Diving Wyvern (Charged)', motionValue: 140, elementMod: 1.6, sharpnessCost: 1, statusProcChance: 0.33, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_lbg_pierce',
    weaponClass: 'Light Bowgun',
    name: 'Rapid Fire Pierce Lv2 Burst',
    description: '5-shot Rapid Fire Pierce 2 magazine volley at critical distance.',
    durationSec: 3.4,
    hits: [
      { moveName: 'RF Pierce 2 Volley (15 ticks)', motionValue: 135, elementMod: 0, sharpnessCost: 0, statusProcChance: 0 },
      { moveName: 'Fanning Maneuver Follow-up', motionValue: 81, elementMod: 0, sharpnessCost: 0, statusProcChance: 0, isAerialOrWirebug: true },
    ],
  },
  {
    id: 'combo_hbg_crouch',
    weaponClass: 'Heavy Bowgun',
    name: 'Crouching Fire Pierce / Spread 3',
    description: 'Sustained crouched heavy shot volley at critical distance.',
    durationSec: 3.5,
    hits: [
      { moveName: 'Spread/Pierce 3 Volley (x4)', motionValue: 192, elementMod: 0, sharpnessCost: 0, statusProcChance: 0 },
      { moveName: 'Wyvernsnipe / Counter', motionValue: 74, elementMod: 0, sharpnessCost: 0, statusProcChance: 0 },
    ],
  },
  {
    id: 'combo_bow_dash_dance',
    weaponClass: 'Bow',
    name: 'Lv4 Dash Dance -> Power Shot -> Absolute Power',
    description: 'Stamina-neutral Berserk+Strife Lv4 rapid/spread dash dance.',
    durationSec: 3.2,
    hits: [
      { moveName: 'Lv4 Charge Shot (4 arrows)', motionValue: 64, elementMod: 4.2, sharpnessCost: 0, statusProcChance: 0 },
      { moveName: 'Power Shot (5 arrows)', motionValue: 78, elementMod: 5.0, sharpnessCost: 0, statusProcChance: 0 },
      { moveName: 'Absolute Power Shot (5 arrows)', motionValue: 82, elementMod: 5.2, sharpnessCost: 0, statusProcChance: 0 },
    ],
  },
];



export function getSkillById(id: string): SkillDefinition | undefined {
  return SKILLS_DB.find((s) => s.id === id);
}

export function getWeaponById(id: string): WeaponItem | undefined {
  return WEAPONS_DB.find((w) => w.id === id);
}

export function getArmorById(id: string): ArmorItem | undefined {
  return ARMOR_DB.find((a) => a.id === id);
}

export function getDecorationById(id: string): DecorationItem | undefined {
  return DECORATIONS_DB.find((d) => d.id === id);
}

export function getMonsterById(id: string): MonsterDefinition | undefined {
  return MONSTERS_DB.find((m) => m.id === id);
}
