import { EMPTY_ARMOR_AUGMENT, EMPTY_Q_WEAPON } from '../data/quriousDefaults';
import { craftingRoute, createCraftingPlanner } from './craftingPlanner';
import { COMMUNITY_ARCHETYPES, HEAVEN_SENT_3_CLASSES } from '../data/communityArchetypes';
import { getEquipmentCraftingZenny } from '../data/mhriceAdapter';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getSkillById,
  getWeaponById,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { bowChargePlusUnlocksLevel, getBowgunAmmoOptions, getBowgunHandling, getChargeBladePhial, getGunlanceShellingLevel, getGunlanceShellingType, getRecommendedShot, type WeaponWithAmmo } from '../data/weaponMechanics';
import {
  ArmorItem,
  ArmorSlot,
  BuildLoadout,
  CalculatedBuildStats,
  DecorationItem,
  HunterProfile,
  InventoryState,
  MetaBuildTemplate,
  RankTier,
  ScrollMode,
  TalismanItem,
  WeaponClass,
  WeaponItem,
} from '../types/sunbreak';
import {
  aggregateBuildSkills,
  getMissingEquipmentProgression,
  calculateBuildCraftingSummary,
  rampageDecorationFits,
  EMPTY_RECOMMENDATION_TALISMAN,
  RECOMMENDATION_TEMPLATES,
  resolveRecommendationInventory,
  resolveDecorationSlots,
  resolveMechanicsWeapon,
  resolveWeaponSharpness,
  preferOwnedArmorVariants,
  calculateBuildStats,
  DEFAULT_SIM_CONFIG,
  simulateTrainingDps,
} from './damageCalculator';

export type OwnedReadiness = 'ready' | 'partial';

export type BuildPreference = 'balanced' | 'comfort';
export type BuildObjective = 'damage' | 'comfort' | 'cost';
export interface BuildSearchConstraints {
  communityArchetypeId?: string;
  weaponId?: string;
  armor?: Partial<Record<ArmorSlot, string>>;
  talismanId?: string;
  skillTargets?: Record<string, number>;
}

const SURVIVAL_WEIGHTS: Readonly<Record<string, number>> = {
  blood_rite: 21,
  divine_blessing: 12,
  stun_resistance: 10,
  intrepid_heart: 15,
  defiance: 7,
  guts: 8,
  quick_breath: 9,
  defense_boost: 3,
  recovery_up: 6,
  speed_eating: 6,
  free_meal: 4,
};

const COMFORT_SKILLS = [
  'power_prolonger',
  ...Object.keys(SURVIVAL_WEIGHTS), 'guard', 'guard_up', 'embolden',
  'evade_extender', 'evade_window', 'constitution', 'stamina_surge',
  'heaven_sent', 'masters_touch', 'razor_sharp', 'protective_polish',
  'redirection', 'reload_speed', 'partbreaker',
];

function getComfortHighlights(skills: Record<string, number>, weights: Record<string, number>): string[] {
  return COMFORT_SKILLS.filter((id) => (skills[id] ?? 0) > 0 && (weights[id] ?? 0) > 0)
    .sort((a, b) => skills[b] * weights[b] - skills[a] * weights[a])
    .slice(0, 4)
    .map((id) => `${getSkillById(id)?.name ?? id} ${skills[id]}`);
}

type GlaiveStyle = 'extracts' | 'elemental';

type SkillPriority = { name: string; level: number; target: number };

export interface OwnedTemplateMatch {
  template: MetaBuildTemplate & { omittedDecorations: string[] };
  templateStats: CalculatedBuildStats;
  adaptedWeapon: WeaponItem;
  weaponOwnedInBox: boolean;
  substitutedWeapon: boolean;
  adaptedLoadout: BuildLoadout;
  adaptedStats: CalculatedBuildStats;
  bestOwnedTalisman: TalismanItem | null;
  readiness: OwnedReadiness;
  rankEligible: boolean;
  progressionUnverified: boolean;
  ownedGearCount: number;
  totalGearCount: number;
  gearOwnershipPercent: number;
  ownedDecoCount: number;
  totalDecoCount: number;
  decoOwnershipPercent: number;
  missingGearNames: string[];
  missingDecoNames: string[];
  prioritySkills: SkillPriority[];
  comfortHighlights: string[];
}

export interface SynthesizedBoxBuild {
  craftingCost?: number;
  objectiveDps?: number;
  objectiveMagazineDamage?: number;
  craftableItems?: string[];
  craftableWeapon?: boolean;
  weaponCraftingSteps?: string[];
  id: string;
  title: string;
  weaponClass: WeaponClass;
  weapon: WeaponItem;
  loadout: BuildLoadout;
  stats: CalculatedBuildStats;
  score: number;
  talismanUsed: TalismanItem;
  decoSlotsFilled: number;
  decoSlotsTotal: number;
  missingSkillHighlights: string[];
  prioritySkills: SkillPriority[];
  comfortHighlights: string[];
}

export interface SynthesizeBoxResult {
  builds: SynthesizedBoxBuild[];
  missingArmorSlots: ArmorSlot[];
  ownedWeaponCount: number;
  ownedArmorCount: number;
  ownedDecoCount: number;
  ownedTalismanCount: number;
  blockedArmorSlots: ArmorSlot[];
}


const EMPTY_DECORATIONS: BuildLoadout['decorations'] = {
  weapon: [],
  helm: [],
  chest: [],
  arms: [],
  waist: [],
  legs: [],
  talisman: [],
};

const TRUE_ELEMENTS = new Set(['Fire', 'Water', 'Thunder', 'Ice', 'Dragon']);
const STATUS_ELEMENTS = new Set(['Poison', 'Paralysis', 'Sleep', 'Blast']);
const HEALTH_DRAIN_SKILLS = ['berserk', 'bloodlust', 'dereliction'];

function heavenSentBreakpoint(weapon: WeaponItem, skills: Record<string, number>, preference: BuildPreference): number {
  if ((skills.heaven_sent ?? 0) < 3 || !HEAVEN_SENT_3_CLASSES.includes(weapon.weaponClass)) return 0;
  return preference === 'comfort' ? 300 : 240;
}

function hasHealthDrain(skills: Record<string, number>): boolean {
  return HEALTH_DRAIN_SKILLS.some((id) => (skills[id] ?? 0) > 0);
}

function canGenerateHellfire(skills: Record<string, number>): boolean {
  return (skills.hellfire_cloak ?? 0) >= 3;
}

const CLASS_SKILL_TARGETS: Partial<Record<WeaponClass, ReadonlyArray<readonly [string, number]>>> = {
  'Long Sword': [['quick_sheathe', 3]],
  'Gunlance': [['artillery', 3], ['load_shells', 2]],
  'Hunting Horn': [['horn_maestro', 1]],
  'Switch Axe': [['rapid_morph', 3]],
  'Charge Blade': [['load_shells', 2]],
};

function prioritySkillTargets(weapon: WeaponItem, style?: GlaiveStyle): ReadonlyArray<readonly [string, number]> {
  const elementSkill = style === 'elemental' ? matchingElementSkill(weapon) : undefined;
  if (elementSkill) return [[elementSkill, getSkillById(elementSkill)?.maxLevel ?? 5]];
  if (bowChargePlusUnlocksLevel(weapon)) return [['bow_charge_plus', 1]];
  const handling = getBowgunHandling(weapon);
  if (handling) {
    return Object.entries(handling.usefulLevels).filter(([, level]) => level > 0);
  }
  return CLASS_SKILL_TARGETS[weapon.weaponClass] ?? [];
}

function prioritySkillCoverage(skills: Record<string, number>, targets: ReturnType<typeof prioritySkillTargets>): number {
  return targets.reduce((coverage, [id, target]) => coverage + Math.min(skills[id] ?? 0, target), 0);
}

function usefulSkillCap(weapon: WeaponItem, id: string): number {
  if (id === 'recoil_down' || id === 'reload_speed') {
    const handling = getBowgunHandling(weapon);
    if (handling) return handling.usefulLevels[id];
  }
  if (weapon.weaponClass === 'Bow' && id === 'reload_speed') return 2;
  if (weapon.weaponClass === 'Gunlance' && id === 'evade_extender') return 2;
  return getSkillById(id)?.maxLevel ?? 7;
}

function matchingElementSkill(weapon: WeaponItem): string | undefined {
  return TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0
    ? `${weapon.elementType.toLowerCase()}_attack`
    : undefined;
}

function getSkillPriorities(weapon: WeaponItem, skills: Record<string, number>, style?: GlaiveStyle): SkillPriority[] {
  const targets = [...prioritySkillTargets(weapon, style)];
  const elementSkill = matchingElementSkill(weapon);
  const elementDefinition = elementSkill && getSkillById(elementSkill);
  if (elementDefinition && !targets.some(([id]) => id === elementDefinition.id)) targets.push([elementDefinition.id, elementDefinition.maxLevel]);
  return targets.map(([id, target]) => ({
    name: getSkillById(id)?.name ?? id,
    level: skills[id] ?? 0,
    target,
  }));
}

export function getSkillWeightsForWeapon(weapon: WeaponItem, style?: GlaiveStyle, preference: BuildPreference = 'balanced'): Record<string, number> {
  const isShot = weapon.damageType === 'Shot';
  const isBow = weapon.weaponClass === 'Bow';
  const isBowgun =
    weapon.weaponClass === 'Light Bowgun' || weapon.weaponClass === 'Heavy Bowgun';
  const hasTrueElem = TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0;
  const hasStatus = STATUS_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0;
  const recommendedShot = getRecommendedShot(weapon);
  const phial = getChargeBladePhial(weapon);

  // Core universal skills (every weapon benefits from affinity/crit/raw unless overridden below)
  const weights: Record<string, number> = {
    weakness_exploit: 18,
    critical_boost: 16,
    attack_boost: 14,
    critical_eye: 13,
    agitator: 11,
    burst: hasTrueElem ? 15 : 11,
    mail_of_hellfire: 14,
    bloodlust: 13,
    coalescence: 9,
    blood_awakening: 13,
    powder_mantle: 11,
    dereliction: 12,
    resentment: 7,
    peak_performance: 7,
    resuscitate: 6,
    wirebug_whisperer: isBowgun ? 4 : 9,
    wind_mantle: isBowgun ? 0 : 9,
    frenzied_bloodlust: isBowgun ? 3 : 8,
    flinch_free: 2,
    spiribirds_call: 3,
    evade_extender: 5,
    evade_window: 4,
  };

  // Sharpness & Melee-only skills (0 on all Gunners!)
  if (!isShot) {
    weights.heaven_sent = 12;
    const extendsGauge = weapon.sourceHandicraftExtension?.some(points => points > 0);
    weights.handicraft = resolveWeaponSharpness(weapon, 5).tier !== weapon.sharpness ? 13
      : extendsGauge || !weapon.sourceHandicraftExtension ? 6 : 0;
    weights.masters_touch = 11;
    weights.protective_polish = 9;
    weights.razor_sharp = 8;
    weights.speed_sharpening = 5;
    weights.minds_eye = 3;
    weights.bladescale_hone = 5;
    if (weapon.sharpness === 'Green' || weapon.sharpness === 'Yellow') {
      weights.bludgeoner = 12;
    }
    if (weapon.sharpness !== 'Purple') {
      weights.grinder_s = 7;
    }
  }
  if (isBow) weights.heaven_sent = 15;

  // Elemental Attack & Boosters (STRICTLY matching weapon.elementType!)
  const elemSkill = matchingElementSkill(weapon);
  if (elemSkill) {
    weights[elemSkill] = ['Dual Blades', 'Insect Glaive', 'Bow'].includes(weapon.weaponClass) || phial === 'element' ? 30 : 22;
    weights.element_exploit = 15;
    weights.critical_element = 12;
    weights.strife = 12;

    if (!isShot) {
      weights.dragon_conversion = 14;
      weights.furious = 10;
    }
    if (weapon.elementType === 'Fire') {
      weights.teostra_blessing = 9;
    } else if (weapon.elementType === 'Water' || weapon.elementType === 'Ice') {
      weights.kushala_blessing = 9;
    }
    if (
      weapon.weaponClass === 'Great Sword' ||
      weapon.weaponClass === 'Hammer' ||
      weapon.weaponClass === 'Bow'
    ) {
      weights.charge_master = 10;
    }
    // Dragonheart inflicts Dragonblight and zeroes non-Dragon elements
    if (weapon.elementType === 'Dragon') {
      weights.dragonheart = 9;
    }
  } else {
    // Raw / Status weapons can use Dragonheart comfortably
    if (!hasStatus) {
      weights.dragonheart = 8;
    }
  }

  // Status Skills (STRICTLY matching weapon status!)
  if (hasStatus) {
    weights.buildup_boost = 16;
    weights.status_trigger = 10;
    if (weapon.elementType === 'Poison') {
      weights.poison_attack = 9;
      weights.foray = 14;
      weights.chameleos_blessing = 8;
    } else if (weapon.elementType === 'Paralysis') {
      weights.paralysis_attack = 9;
      weights.foray = 14;
    } else if (weapon.elementType === 'Sleep') {
      weights.sleep_attack = 8;
    } else if (weapon.elementType === 'Blast') {
      weights.blast_attack = 9;
      weights.teostra_blessing = 8;
    }
  }

  // Weapon-Class Specific Specialization
  switch (weapon.weaponClass) {
    case 'Great Sword':
      weights.focus = 16;
      weights.offensive_guard = 15;
      weights.frostcraft = 18;
      weights.wirebug_whisperer = 13;
      weights.critical_draw = 7;
      weights.maximum_might = 8;
      break;
    case 'Long Sword':
      weights.quick_sheathe = 24;
      weights.wirebug_whisperer = 14;
      weights.wind_mantle = 14;
      weights.frostcraft = 15;
      weights.maximum_might = 9;
      break;
    case 'Sword & Shield':
      weights.offensive_guard = 15;
      weights.wirebug_whisperer = 12;
      weights.embolden = 9;
      weights.frostcraft = 11;
      weights.slugger = 6;
      break;
    case 'Dual Blades':
      weights.berserk = 18;
      weights.strife = 18;
      weights.stamina_surge = 10;
      weights.constitution = 8;
      weights.marathon_runner = 7;
      weights.heaven_sent = 15;
      break;
    case 'Lance':
      weights.offensive_guard = 18;
      weights.guard = 14;
      weights.guard_up = 10;
      weights.embolden = 12;
      break;
    case 'Gunlance':
      weights.artillery = 24;
      weights.load_shells = 20;
      weights.wirebug_whisperer = 15;
      weights.evade_extender = 12;
      weights.guard = 11;
      weights.guard_up = 8;
      weights.offensive_guard = 7;
      weights.razor_sharp = 12;
      weights.heaven_sent = 16;
      weights.sneak_attack = 13;
      // The Game8 shelling builds also use scroll-swap defense.
      weights.redirection = preference === 'comfort' ? 12 : 6;
      break;
    case 'Hammer':
      weights.focus = 14;
      weights.slugger = 11;
      weights.stamina_thief = 5;
      weights.wirebug_whisperer = 13;
      weights.frostcraft = 11;
      break;
    case 'Hunting Horn':
      weights.horn_maestro = 24;
      weights.wirebug_whisperer = 15;
      weights.evade_extender = 9;
      weights.slugger = 7;
      weights.attack_boost = 17;
      weights.maximum_might = 8;
      break;
    case 'Switch Axe':
      weights.rapid_morph = 24;
      weights.power_prolonger = 10;
      weights.focus = 5;
      weights.wirebug_whisperer = 12;
      weights.evade_extender = 10;
      weights.maximum_might = 8;
      break;
    case 'Charge Blade':
      weights.rapid_morph = 20;
      weights.load_shells = 19;
      weights.guard = 13;
      weights.guard_up = 9;
      weights.offensive_guard = 12;
      weights.focus = 5;
      if (phial === 'impact') {
        weights.artillery = 18;
        weights.slugger = 6;
      } else if (phial === 'element') {
        weights.burst = 17;
        weights.element_exploit = 16;
      }
      break;
    case 'Insect Glaive':
      // Elemental glaives still benefit from keeping their extracts active.
      weights.power_prolonger = style === 'extracts' ? 13 : 10;
      weights.wirebug_whisperer = 13;
      weights.evade_extender = 9;
      weights.heaven_sent = 15;
      weights.constitution = 5;
      break;
    case 'Light Bowgun': {
      weights.recoil_down = 8;
      weights.reload_speed = 8;
      weights.spare_shot = 14;
      weights.ammo_up = 13;
      weights.ballistics = 9;
      weights.steadiness = 6;
      weights.maximum_might = 10;
      break;
    }
    case 'Heavy Bowgun': {
      weights.recoil_down = 8;
      weights.reload_speed = 8;
      weights.spare_shot = 15;
      weights.ammo_up = 15;
      weights.ballistics = 9;
      weights.steadiness = 6;
      weights.tune_up = 8;
      weights.evade_extender = 10;
      weights.guard = 7;
      weights.guard_up = 5;
      weights.maximum_might = 10;
      break;
    }
    case 'Bow': {
      if (bowChargePlusUnlocksLevel(weapon)) weights.bow_charge_plus = 24;
      weights.constitution = 17;
      weights.stamina_surge = 16;
      weights.berserk = 18;
      weights.strife = 18;
      weights.ballistics = 8;
      weights.reload_speed = preference === 'comfort' ? 12 : 7;
      break;
    }
  }

  if (recommendedShot) {
    weights[recommendedShot.skillId] = 20;
    if (recommendedShot.rapidFire) weights.rapid_fire_up = 20;
  }
  const nativeBowShot = isBow ? getRecommendedShot(weapon, false) : undefined;
  if (nativeBowShot) weights[nativeBowShot.skillId] = 20;
  for (const [skillId] of prioritySkillTargets(weapon, style)) {
    weights[skillId] = Math.max(weights[skillId] ?? 0, 55);
  }

  const comfortScale = preference === 'comfort' ? 1.8 : 1;
  for (const [id, weight] of Object.entries(SURVIVAL_WEIGHTS)) {
    weights[id] = weight * comfortScale;
  }
  // Healing from Blood Rite needs a broken part that the player can keep hitting.
  if (weapon.weaponClass === 'Great Sword' || weapon.weaponClass === 'Hammer') {
    weights.partbreaker = 5 * comfortScale;
  }
  if (['Insect Glaive', 'Switch Axe', 'Gunlance', 'Heavy Bowgun'].includes(weapon.weaponClass)) {
    weights.evade_extender += 3 * comfortScale;
  }
  if (preference === 'comfort') {
    for (const id of COMFORT_SKILLS) {
      if (!(id in SURVIVAL_WEIGHTS) && weights[id]) weights[id] *= 1.35;
    }
    weights.dereliction = 0;
    weights.berserk = 0;
  }

  return weights;
}

/**
 * Adjusts skill weights for the active skill totals
 * to prevent dead conditional skills or conflicting synergies.
 */
function refineWeightsForContext(
  baseWeights: Record<string, number>,
  weapon: WeaponItem,
  skillTotals: Record<string, number>,
  preference: BuildPreference,
  cache?: Map<number, Record<string, number>>
): Record<string, number> {
  const totalOf = (sk: string) => skillTotals[sk] ?? 0;

  const hasBerserk = totalOf('berserk') > 0;
  const hasDereliction = totalOf('dereliction') > 0;
  const hasBloodlust = totalOf('bloodlust') > 0;
  const hasRedHealth = hasBerserk || hasDereliction || hasBloodlust;
  const hasHellfire = canGenerateHellfire(skillTotals);
  const hasBloodRite = totalOf('blood_rite') > 0;
  const hasDragonConversion = totalOf('dragon_conversion') > 0;
  const hasInfiniteStamina = hasBerserk && totalOf('strife') >= 3;
  const hasHeavenSent3 = totalOf('heaven_sent') >= 3;
  const enablesCoalescence = hasBloodlust || hasHellfire;
  const convertsResistances = hasDragonConversion && !hasBerserk && TRUE_ELEMENTS.has(weapon.elementType);
  // The caller scopes the cache to a single weapon and preference.
  const key = Number(hasRedHealth) | (Number(hasBerserk) << 1) | (Number(hasInfiniteStamina) << 2)
    | (Number(enablesCoalescence) << 3) | (Number(hasBloodRite) << 4) | (Number(convertsResistances) << 5)
    | (Number(hasHeavenSent3) << 6);
  const cached = cache?.get(key);
  if (cached) return cached;
  const w = { ...baseWeights };

  // Anti-synergy: Peak Performance has ~0 uptime with Berserk / Dereliction / Bloodlust
  if (hasRedHealth) {
    w.peak_performance = 0;
  } else {
    // Without red health drain, Resentment and Strife have minimal/0 uptime
    w.resentment = 0;
    w.strife = Math.min(w.strife ?? 0, 2);
  }

  if (hasBerserk) {
    // Berserk drains HP on Blue Scroll -> Recovery Speed helps & infinite stamina with Strife
    w.recovery_speed = 6;
    if (hasInfiniteStamina) {
      w.constitution = Math.min(w.constitution ?? 0, 8);
      w.stamina_surge = Math.min(w.stamina_surge ?? 0, 8);
    }
  }

  if (hasHeavenSent3) {
    // These skills can still help while Heaven-Sent is inactive.
    for (const id of ['speed_sharpening', 'masters_touch', 'razor_sharp', 'protective_polish', 'bladescale_hone',
      'constitution', 'stamina_surge', 'marathon_runner']) {
      if (w[id]) w[id] *= 0.2;
    }
  }

  // Coalescence & Resuscitate require Bloodlust, Hellfire Cloak, or regular blights
  if (!enablesCoalescence) {
    w.coalescence = 0;
    w.resuscitate = 0;
  }

  // Blood Awakening needs Blood Rite (or Anomaly Bloodblight)
  if (!hasBloodRite) {
    w.blood_awakening = Math.min(w.blood_awakening ?? 0, 7);
  } else {
    // Breaking parts opens healing opportunities; Recovery Up extends their value.
    w.partbreaker = Math.max(w.partbreaker ?? 0, preference === 'comfort' ? 9 : 4);
    w.recovery_up = (w.recovery_up ?? 0) + (preference === 'comfort' ? 4 : 2);
  }

  // Dragon Conversion converts elemental resistances on Red Scroll
  if (convertsResistances) {
    w.dragon_resistance = 3;
    w.thunder_resistance = 3;
  }

  cache?.set(key, w);
  return w;
}

function scoreTalismanForWeights(
  talisman: TalismanItem,
  weights: Record<string, number>,
  weapon: WeaponItem,
  armorSkills: Record<string, number>
): number {
  let score = 0;
  const skillLevels = [
    [talisman.skill1Id, talisman.skill1Level],
    [talisman.skill2Id, talisman.skill2Level],
  ] as const;
  for (const [id, level] of skillLevels) {
    if (!id || level <= 0) continue;
    const remaining = Math.max(0, usefulSkillCap(weapon, id) - (armorSkills[id] ?? 0));
    score += (weights[id] ?? 0) * Math.min(level, remaining);
  }
  for (const s of talisman.slots) {
    if (s >= 4) score += 14;
    else if (s === 3) score += 10;
    else if (s === 2) score += 8;
    else if (s === 1) score += 3;
  }
  return score;
}

function pickTalismanForArmorSearch(
  talismans: TalismanItem[],
  weapon: WeaponItem,
  armorSkills: Record<string, number> = {},
  style?: GlaiveStyle,
  preference: BuildPreference = 'balanced'
): TalismanItem | null {
  const ownedTalismans = talismans.filter((t) => t.source !== 'Preset');
  if (ownedTalismans.length === 0) return null;
  const weights = getSkillWeightsForWeapon(weapon, style, preference);
  const targets = prioritySkillTargets(weapon, style);
  for (const [id, target] of targets) {
    if ((armorSkills[id] ?? 0) >= target) weights[id] = 0;
  }
  let best = ownedTalismans[0];
  let bestScore = -1;
  for (const t of ownedTalismans) {
    const priorityGain = targets.reduce((gain, [id, target]) => {
      const points = (t.skill1Id === id ? t.skill1Level : 0) + (t.skill2Id === id ? t.skill2Level : 0);
      return gain + Math.min(points, Math.max(0, target - (armorSkills[id] ?? 0)));
    }, 0);
    const s = priorityGain * 1000 + scoreTalismanForWeights(t, weights, weapon, armorSkills);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return best;
}

/**
 * Greedily fills weapon, 5 armor pieces, and talisman slots using ONLY strictly relevant,
 * allowed decorations, respecting minimum slot levels, owned decoration quantities, and max skill caps.
 */
interface DecoSearchOptions {
  damageObjective?: boolean;
  skillTargets?: ReadonlyArray<readonly [string, number]>;
  preferredDecoIds?: string[];
  glaiveStyle?: GlaiveStyle;
  ownedDecoCounts?: Record<string, number>;
  fixedDecorations?: BuildLoadout['decorations'];
  crafting?: {
    planner: ReturnType<typeof createCraftingPlanner>;
    used: Map<string, number>;
    ownedCopies: Record<string, number>;
  };
}

interface DecorationCandidate {
  deco: DecorationItem;
  cap: number;
  copies: number;
  priorityTarget: number;
  preferredBonus: number;
}

interface DecorationSearch {
  bySlot: DecorationCandidate[][];
  priorityBySlot: DecorationCandidate[][];
  availableCopies: Record<string, number>;
}

function slotOptimalDecorations(
  weapon: WeaponItem,
  baseSkills: Record<string, number>,
  slots: ReturnType<typeof resolveDecorationSlots>,
  talisman: TalismanItem,
  search: DecorationSearch,
  weights: Record<string, number>,
  preference: BuildPreference,
  options: DecoSearchOptions
) {
  const skillTotals = { ...baseSkills };
  const addPts = (id: string, pts: number) => {
    if (!id || pts <= 0) return;
    skillTotals[id] = (skillTotals[id] ?? 0) + pts;
  };

  if (talisman.skill1Id) addPts(talisman.skill1Id, talisman.skill1Level);
  if (talisman.skill2Id) addPts(talisman.skill2Id, talisman.skill2Level);

  let effectiveWeights = refineWeightsForContext(weights, weapon, skillTotals, preference);

  const remainingCopies = { ...search.availableCopies };
  const crafting = options.crafting;
  let usedMaterials = crafting?.used;

  const result: BuildLoadout['decorations'] = options.fixedDecorations ? {
    ...options.fixedDecorations,
    talisman: [],
  } : {
    weapon: [],
    helm: [],
    chest: [],
    arms: [],
    waist: [],
    legs: [],
    talisman: [],
  };

  const slotEntries: Array<{
    key: keyof BuildLoadout['decorations'];
    idx: number;
    level: number;
  }> = [];

  for (const key of Object.keys(slots) as Array<keyof typeof slots>) {
    if (options.fixedDecorations && key !== 'talisman') {
      for (const id of result[key]) {
        if (remainingCopies[id] > 0) remainingCopies[id]--;
      }
      continue;
    }
    (key === 'talisman' ? talisman.slots : slots[key]).forEach((lvl, idx) => {
      if (lvl > 0) {
        slotEntries.push({ key, idx, level: lvl });
      }
    });
  }

  // Sort smallest slot level first (1 -> 2 -> 3 -> 4) so Lv1 slots handle Lv1 utility/elem decos
  // before larger slots pick multi-point Lv4/Lv2 decos.
  slotEntries.sort((a, b) => a.level - b.level);
  const nativeBowShot = weapon.weaponClass === 'Bow' ? getRecommendedShot(weapon, false)?.skillId : undefined;
  const unlockedBowShot = weapon.weaponClass === 'Bow' ? getRecommendedShot(weapon, true)?.skillId : undefined;

  // Reserve slots for class priorities before filling damage and comfort skills.
  for (const bySlot of [search.priorityBySlot, search.bySlot]) {
    for (const entry of slotEntries) {
      if (result[entry.key][entry.idx]) continue;
      let bestDeco: DecorationItem | null = null;
      let bestValue = 0;
      let bestMaterials = usedMaterials;
      const activeBowShot = (skillTotals.bow_charge_plus ?? 0) > 0 ? unlockedBowShot : nativeBowShot;

      for (const { deco: d, cap, priorityTarget, preferredBonus } of bySlot[entry.level] ?? []) {
        if (remainingCopies[d.id] <= 0) continue;

        if (weapon.weaponClass === 'Bow' && ['normal_rapid_up', 'pierce_up', 'spread_up'].includes(d.skillId)
            && d.skillId !== activeBowShot) continue;
        const weight = effectiveWeights[d.skillId] ?? 0;
        // CRITICAL: Never slot any decoration whose skill has zero relevance to this weapon/set!
        if (weight <= 0 && priorityTarget <= 0) continue;

        const currentLv = skillTotals[d.skillId] ?? 0;
        const usablePoints = Math.min(d.points, cap - currentLv);
        if (usablePoints <= 0) continue;

        const slotEfficiencyBonus = d.slotLevel === entry.level ? 1.08 : Math.pow(0.9, entry.level - d.slotLevel);
        const priorityGain = Math.min(usablePoints, Math.max(0, priorityTarget - currentLv));
        if (bySlot === search.priorityBySlot && priorityGain === 0) continue;
        const completesGunlanceUtility = weapon.weaponClass === 'Gunlance'
          && (d.skillId === 'guard' || d.skillId === 'wirebug_whisperer')
          && currentLv > 0 && currentLv + usablePoints === cap;
        const completionBonus = completesGunlanceUtility ? weight : 0;
        const value = priorityGain * 1000 + (usablePoints * weight + completionBonus) * slotEfficiencyBonus * preferredBonus;

        if (value > bestValue) {
          const alreadySlotted = search.availableCopies[d.id] - remainingCopies[d.id];
          let nextMaterials = usedMaterials;
          if (crafting && alreadySlotted >= (crafting.ownedCopies[d.id] ?? 0)) {
            const reservation = crafting.planner.reserve(d.id, 'decoration', 1, usedMaterials);
            if (!reservation) continue;
            nextMaterials = reservation.used;
          }
          bestValue = value;
          bestDeco = d;
          bestMaterials = nextMaterials;
        }
      }

      if (bestDeco) {
        usedMaterials = bestMaterials;
        while (result[entry.key].length <= entry.idx) {
          result[entry.key].push('');
        }
        result[entry.key][entry.idx] = bestDeco.id;
        for (const skill of bestDeco.sourceSkills ?? [{ skillId: bestDeco.skillId, level: bestDeco.points }]) {
          addPts(skill.skillId, skill.level);
        }
        if (bestDeco.skillId === 'blood_rite' || bestDeco.skillId === 'strife') {
          effectiveWeights = refineWeightsForContext(weights, weapon, skillTotals, preference);
        }
        remainingCopies[bestDeco.id]--;
      }
    }
  }

  return { decorations: result, skillTotals };
}

function chooseBestScrollMode(
  weapon: WeaponItem,
  armorSkills: Record<string, number>,
  talisman?: TalismanItem
): ScrollMode {
  const totalOf = (id: string) =>
    (armorSkills[id] ?? 0) +
    (talisman?.skill1Id === id ? talisman.skill1Level : 0) +
    (talisman?.skill2Id === id ? talisman.skill2Level : 0);

  if (totalOf('berserk') > 0) {
    return 'Blue';
  }
  if (totalOf('dragon_conversion') > 0 || totalOf('furious') > 0) {
    return 'Red';
  }
  if (totalOf('dereliction') > 0) {
    return TRUE_ELEMENTS.has(weapon.elementType) ? 'Red' : 'Blue';
  }
  if (totalOf('mail_of_hellfire') > 0) {
    return TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue >= 40
      ? 'Blue'
      : 'Red';
  }
  return 'Red';
}

function chooseBestRampageDeco(
  weapon: WeaponItem,
  allowedDecoSet: Set<string>
): string {
  if (weapon.rampageSlot <= 0) return '';
  const isAvailable = (id: string) => allowedDecoSet.has(id) && rampageDecorationFits(id, weapon);
  const hasElement = TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0;
  if (hasElement && weapon.elementValue >= 25 && isAvailable('ramp_elembane')) return 'ramp_elembane';

  const speciesDeco = ['ramp_anti_wyvern', 'ramp_anti_aerial', 'ramp_anti_aquatic', 'rampage-deco:27'].find(isAvailable);
  if (speciesDeco) return speciesDeco;

  const ownedRamp = DECORATIONS_DB.find((deco) =>
    deco.isRampage && isAvailable(deco.id) &&
    (deco.id !== 'ramp_elembane' || hasElement) &&
    (deco.skillName !== 'Brutal Strike' || weapon.affinity < 0)
  );
  return ownedRamp?.id ?? '';
}

function scoreWeaponSubstitutionCandidate(
  candidate: WeaponItem,
  targetWeapon: WeaponItem
): number {
  let bonus = 0;
  const targetTrueElem = TRUE_ELEMENTS.has(targetWeapon.elementType);
  const candTrueElem = TRUE_ELEMENTS.has(candidate.elementType);
  const targetStatus = STATUS_ELEMENTS.has(targetWeapon.elementType);
  const candStatus = STATUS_ELEMENTS.has(candidate.elementType);

  if (candidate.elementType === targetWeapon.elementType) {
    bonus += 1000;
  } else if (targetTrueElem && candTrueElem) {
    bonus += 300;
  } else if (targetStatus && candStatus) {
    bonus += 300;
  } else if (!targetTrueElem && !targetStatus && !candTrueElem) {
    bonus += 400;
  }

  if (candidate.damageType === 'Shot' && targetWeapon.damageType === 'Shot') {
    const tShot = getRecommendedShot(targetWeapon);
    const cShot = getRecommendedShot(candidate);
    if (tShot && cShot && tShot.skillId === cShot.skillId) {
      bonus += 500;
    }
  }

  return bonus + scoreWeaponForSelection(candidate);
}

function preservesTemplateWeapon(candidate: WeaponItem, target: WeaponItem): boolean {
  if (candidate.weaponClass !== target.weaponClass) return false;
  if (matchingElementSkill(target) && candidate.elementType !== target.elementType) return false;
  if (STATUS_ELEMENTS.has(target.elementType) && candidate.elementType !== target.elementType) return false;
  if (target.weaponClass === 'Gunlance') {
    const shelling = getGunlanceShellingType(target);
    return shelling !== undefined && getGunlanceShellingType(candidate) === shelling;
  }
  const phial = getChargeBladePhial(target);
  if (phial && getChargeBladePhial(candidate) !== phial) return false;
  const targetShot = getRecommendedShot(target);
  if (!targetShot) return true;
  const candidateShot = getRecommendedShot(candidate);
  return candidateShot?.skillId === targetShot.skillId && candidateShot.rapidFire === targetShot.rapidFire;
}

export function evaluateOwnedBuildMatches(
  profile: HunterProfile,
  inventory: InventoryState,
  options?: {
    weaponFilter?: string;
    stageFilter?: RankTier | 'All';
    preference?: BuildPreference;
  }
): OwnedTemplateMatch[] {
  const weaponFilter = options?.weaponFilter ?? 'All';
  const stageFilter = options?.stageFilter ?? 'All';
  const preference = options?.preference ?? 'balanced';

  inventory = resolveRecommendationInventory(inventory);
  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedDecoCounts = inventory.ownedDecoCounts ?? {};
  const ownedDecoSet = new Set(inventory.ownedDecoIds.filter((id) => (ownedDecoCounts[id] ?? 1) > 0));
  const ownedRampageOrNormalDecos = DECORATIONS_DB.filter((d) =>
    ownedDecoSet.has(d.id)
  );

  const templates = RECOMMENDATION_TEMPLATES.filter((t) => {
    if (weaponFilter !== 'All' && t.weaponClass !== weaponFilter) return false;
    if (stageFilter !== 'All' && t.rankTier !== stageFilter) return false;
    return true;
  });

  return templates
    .flatMap((template) => {
      const weapon = getWeaponById(template.loadout.weaponId);
      const helm = getArmorById(template.loadout.helmId);
      const chest = getArmorById(template.loadout.chestId);
      const arms = getArmorById(template.loadout.armsId);
      const waist = getArmorById(template.loadout.waistId);
      const legs = getArmorById(template.loadout.legsId);
      if (!weapon || !helm || !chest || !arms || !waist || !legs) return [];
      const templateTitle = weapon.weaponClass === 'Gunlance'
        ? template.title.replace(/\b(Normal|Long|Wide) Lv\d+\s*/i, '')
        : template.title;
      const templateForBox = preferOwnedArmorVariants({
        ...template.loadout,
        id: template.id,
        updatedAt: new Date().toISOString(),
      }, inventory.ownedArmorIds);
      const fullTemplateLoadout = optimizeTemplateTalisman(templateForBox, weapon, inventory, preference);
      const templateStats = calculateBuildStats(fullTemplateLoadout);

      // Pull synced weapon: use template weapon if owned, otherwise substitute best matching owned weapon
      let adaptedWeapon = weapon;
      let weaponOwnedInBox = ownedWeaponSet.has(weapon.id);
      let substitutedWeapon = false;

      if (!weaponOwnedInBox) {
        const classOwnedWeapons = WEAPONS_DB.filter(
          (w) => ownedWeaponSet.has(w.id) && preservesTemplateWeapon(w, weapon)
        ).sort(
          (a, b) =>
            (weapon.weaponClass === 'Gunlance' ? getGunlanceShellingLevel(b) - getGunlanceShellingLevel(a) : 0) ||
            scoreWeaponSubstitutionCandidate(b, weapon) -
            scoreWeaponSubstitutionCandidate(a, weapon)
        );

        if (classOwnedWeapons.length > 0) {
          adaptedWeapon = classOwnedWeapons[0];
          weaponOwnedInBox = true;
          substitutedWeapon = true;
        }
      }

      const gearChecks = [
        { owned: weaponOwnedInBox, name: adaptedWeapon.name },
        { owned: ownedArmorSet.has(templateForBox.helmId), name: helm.name },
        { owned: ownedArmorSet.has(templateForBox.chestId), name: chest.name },
        { owned: ownedArmorSet.has(templateForBox.armsId), name: arms.name },
        { owned: ownedArmorSet.has(templateForBox.waistId), name: waist.name },
        { owned: ownedArmorSet.has(templateForBox.legsId), name: legs.name },
      ];

      const ownedGearCount = gearChecks.filter((g) => g.owned).length;
      const totalGearCount = 6;
      const gearOwnershipPercent = Math.round((ownedGearCount / totalGearCount) * 100);
      const missingGearNames = gearChecks.filter((g) => !g.owned).map((g) => g.name);

      // Count decorations slotted in template vs ownedDecoIds + ownedDecoCounts
      const templateDecoIds: string[] = [];
      Object.values(template.loadout.decorations).forEach((group) => {
        group.forEach((dId) => {
          if (dId) templateDecoIds.push(dId);
        });
      });
      if (template.loadout.rampageDecoId) {
        templateDecoIds.push(template.loadout.rampageDecoId);
      }

      const totalDecoCount = templateDecoIds.length;
      let ownedDecoCount = 0;
      const missingDecoSet = new Set<string>();
      const remainingTemplateCounts = Object.fromEntries([...ownedDecoSet].map((id) => [id, ownedDecoCounts[id] ?? 1]));

      for (const id of templateDecoIds) {
        if ((remainingTemplateCounts[id] ?? 0) > 0) {
          ownedDecoCount++;
          remainingTemplateCounts[id]--;
        } else {
          missingDecoSet.add(getDecorationById(id)?.name ?? id);
        }
      }

      const decoOwnershipPercent =
        totalDecoCount === 0 ? 100 : Math.round((ownedDecoCount / totalDecoCount) * 100);
      const missingDecoNames = Array.from(missingDecoSet);

      const weights = getSkillWeightsForWeapon(adaptedWeapon, undefined, preference);
      const adaptedRampage = ownedDecoSet.has(template.loadout.rampageDecoId)
        && rampageDecorationFits(template.loadout.rampageDecoId, adaptedWeapon)
        ? template.loadout.rampageDecoId
        : chooseBestRampageDeco(adaptedWeapon, ownedDecoSet);

      const { loadout: adaptedLoadout, stats: adaptedStats } = optimizeLoadoutTalisman({
        ...templateForBox,
        id: `owned_${template.id}_${adaptedWeapon.id}`,
        name: `${templateTitle} (Your Box)`,
        weaponId: adaptedWeapon.id,
        talisman: EMPTY_RECOMMENDATION_TALISMAN,
        rampageDecoId: adaptedRampage,
        quriousWeapon: { ...EMPTY_Q_WEAPON },
        quriousArmor: {
          Helm: { ...EMPTY_ARMOR_AUGMENT },
          Chest: { ...EMPTY_ARMOR_AUGMENT },
          Arms: { ...EMPTY_ARMOR_AUGMENT },
          Waist: { ...EMPTY_ARMOR_AUGMENT },
          Legs: { ...EMPTY_ARMOR_AUGMENT },
        },
        decorations: EMPTY_DECORATIONS,
        updatedAt: new Date().toISOString(),
      }, adaptedWeapon, inventory.talismans, ownedRampageOrNormalDecos, weights, preference, {
        preferredDecoIds: templateDecoIds,
        ownedDecoCounts,
      });
      const bestOwnedTalisman = adaptedLoadout.talisman === EMPTY_RECOMMENDATION_TALISMAN ? null : adaptedLoadout.talisman;

      const readiness: OwnedReadiness = ownedGearCount === 6 ? 'ready' : 'partial';
      const missingPieces = calculateBuildCraftingSummary(adaptedLoadout, inventory).pieceBreakdowns;
      const progression = getMissingEquipmentProgression(missingPieces, inventory, profile.mr, profile.ar);
      const rankEligible = profile.mr >= template.minMr && profile.ar >= template.minAr && progression !== 'locked';

      return [{
        template: {
          ...template,
          title: templateTitle,
          loadout: fullTemplateLoadout,
        },
        templateStats,
        adaptedWeapon,
        weaponOwnedInBox,
        substitutedWeapon,
        adaptedLoadout,
        adaptedStats,
        bestOwnedTalisman,
        readiness,
        rankEligible,
        progressionUnverified: rankEligible && progression === 'unverified',
        ownedGearCount,
        totalGearCount,
        gearOwnershipPercent,
        ownedDecoCount,
        totalDecoCount,
        decoOwnershipPercent,
        missingGearNames,
        missingDecoNames,
        prioritySkills: getSkillPriorities(adaptedWeapon, adaptedStats.skills),
        comfortHighlights: getComfortHighlights(
          adaptedStats.skills,
          refineWeightsForContext(weights, adaptedWeapon, adaptedStats.skills, preference)
        ),
      }];
    })
    .sort((a, b) => {
      const order: Record<OwnedReadiness, number> = {
        ready: 0,
        partial: 2,
      };
      if (order[a.readiness] !== order[b.readiness]) {
        return order[a.readiness] - order[b.readiness];
      }
      if (a.weaponOwnedInBox !== b.weaponOwnedInBox) {
        return a.weaponOwnedInBox ? -1 : 1;
      }
      if (b.gearOwnershipPercent !== a.gearOwnershipPercent) {
        return b.gearOwnershipPercent - a.gearOwnershipPercent;
      }
      if (b.decoOwnershipPercent !== a.decoOwnershipPercent) {
        return b.decoOwnershipPercent - a.decoOwnershipPercent;
      }
      return b.adaptedStats.effectiveRaw - a.adaptedStats.effectiveRaw;
    });
}

function scoreArmorPieceForWeapon(
  piece: ArmorItem,
  weapon: WeaponItem,
  weights: Record<string, number>
): number {
  let score = 0;
  for (const [sk, pts] of Object.entries(piece.skills)) {
    const w = weights[sk] ?? 0;
    if (w) score += w * Math.min(pts, usefulSkillCap(weapon, sk));
  }

  // Penalize pieces that conflict with non-Dragon elemental weapons (Dragonheart clears element)
  if (
    (piece.skills.dragonheart ?? 0) > 0 &&
    TRUE_ELEMENTS.has(weapon.elementType) &&
    weapon.elementType !== 'Dragon'
  ) {
    score -= 60;
  }

  for (const slotLvl of piece.slots) {
    if (slotLvl === 4) score += 16;
    else if (slotLvl === 3) score += 11;
    else if (slotLvl === 2) score += 9;
    else if (slotLvl === 1) score += 4;
  }
  score += piece.defense * 0.04;
  return score;
}

function pruneEquivalentArmor(pieces: ArmorItem[]): ArmorItem[] {
  // Keep every skill and exact slot order. Both conditional skills and the greedy
  // decoration pass can change the outcome of a looser dominance comparison.
  const bestByEquipmentStats = new Map<string, ArmorItem>();
  for (const piece of pieces) {
    const { fire, water, thunder, ice, dragon } = piece.resistances;
    const key = JSON.stringify([Object.entries(piece.skills).sort(), piece.slots, fire, water, thunder, ice, dragon]);
    const previous = bestByEquipmentStats.get(key);
    if (!previous || piece.defense > previous.defense) bestByEquipmentStats.set(key, piece);
  }
  return [...bestByEquipmentStats.values()];
}

function scoreWeaponForSelection(weapon: WeaponItem): number {
  const elemVal = TRUE_ELEMENTS.has(weapon.elementType)
    ? weapon.elementValue * 1.4
    : weapon.elementValue * 0.5;
  const sharpBonus =
    weapon.sharpness === 'Purple'
      ? 55
      : weapon.sharpness === 'White'
      ? 35
      : weapon.sharpness === 'Blue'
      ? 15
      : 0;
  const slotSum = weapon.slots.reduce((acc, s) => acc + s * 6, 0);
  return (
    weapon.raw * (1 + Math.max(-0.2, weapon.affinity / 100) * 0.25) +
    elemVal +
    sharpBonus +
    getGunlanceShellingLevel(weapon) * 20 +
    slotSum
  );
}

function computeFunctionalUtilityBonus(
  weapon: WeaponItem,
  skills: Record<string, number>,
  weights: Record<string, number>,
  preference: BuildPreference
): number {
  let bonus = 0;
  const utilityKeys = [
    'quick_sheathe',
    'rapid_morph',
    'horn_maestro',
    'artillery',
    'load_shells',
    'focus',
    'guard',
    'guard_up',
    'offensive_guard',
    'wirebug_whisperer',
    'wind_mantle',
    'heaven_sent',
    'masters_touch',
    'protective_polish',
    'razor_sharp',
    'handicraft',
    'recoil_down',
    'reload_speed',
    'spare_shot',
    'ammo_up',
    'bow_charge_plus',
    'constitution',
    'stamina_surge',
    'evade_extender',
    'evade_window',
    ...Object.keys(SURVIVAL_WEIGHTS),
    'power_prolonger',
    'slugger',
    'embolden',
    'berserk',
    'redirection',
    'partbreaker',
  ];
  for (const sk of utilityKeys) {
    const lv = skills[sk] ?? 0;
    const w = weights[sk] ?? 0;
    if (lv > 0 && w > 0) {
      bonus += Math.min(lv, usefulSkillCap(weapon, sk)) * w * 1.4;
    }
  }
  // Extra reward for Gunlance / CB artillery + load shells synergy
  if (weapon.weaponClass === 'Gunlance') {
    bonus += (skills.artillery ?? 0) * 18 + (skills.load_shells ?? 0) * 15;
  }
  if ((skills.stun_resistance ?? 0) >= 3) bonus += 18;
  if ((skills.blood_rite ?? 0) > 0 && (skills.partbreaker ?? 0) > 0) bonus += 10;
  if (preference === 'comfort') {
    if (weapon.weaponClass === 'Lance' && (skills.guard ?? 0) >= 3) bonus += 18;
    if (weapon.weaponClass === 'Lance' && (skills.guard_up ?? 0) >= 1) bonus += 12;
    if ((skills.dereliction ?? 0) > 0) bonus -= 100;
    if ((skills.berserk ?? 0) > 0) bonus -= 65;
  }
  return bonus;
}

interface EvaluatedTalismanBuild {
  objectiveDps?: number;
  loadout: BuildLoadout;
  stats: CalculatedBuildStats;
  score: number;
  priorityCoverage: number;
}

function isBetterTalismanBuild(candidate: EvaluatedTalismanBuild, best?: EvaluatedTalismanBuild): boolean {
  if (!best || candidate.priorityCoverage !== best.priorityCoverage) {
    return !best || candidate.priorityCoverage > best.priorityCoverage;
  }
  if (candidate.score !== best.score) return candidate.score > best.score;
  return candidate.stats.overcappedSkills.length < best.stats.overcappedSkills.length;
}

function optimizeLoadoutTalisman(
  base: BuildLoadout,
  weapon: WeaponItem,
  talismans: TalismanItem[],
  allowedDecos: DecorationItem[],
  weights: Record<string, number>,
  preference: BuildPreference,
  options: DecoSearchOptions
): EvaluatedTalismanBuild {
  const baseSkills = aggregateBuildSkills(base).skills;
  const slots = resolveDecorationSlots(base);
  const targets = options.skillTargets ?? prioritySkillTargets(weapon, options.glaiveStyle);
  const targetLevels = new Map(targets);
  const preferredDecos = new Set(options.preferredDecoIds);
  const decoCandidates = allowedDecos.filter((deco) => !deco.isRampage).map((deco) => ({
    deco,
    cap: deco.skillId === 'flinch_free' ? 1 : usefulSkillCap(weapon, deco.skillId),
    copies: options.ownedDecoCounts?.[deco.id] ?? 1,
    priorityTarget: targetLevels.get(deco.skillId) ?? 0,
    preferredBonus: preferredDecos.has(deco.id) ? 1.12 : 1,
  }));
  // Slot level is capacity: a level 4 slot can take level 2 and 3 jewels.
  const bySlot = Array.from({ length: 5 }, (_, level) => decoCandidates.filter(({ deco }) => deco.slotLevel <= level));
  const decorationSearch = {
    bySlot,
    priorityBySlot: bySlot.map((decos) => decos.filter(({ priorityTarget }) => priorityTarget > 0)),
    availableCopies: Object.fromEntries(decoCandidates.map(({ deco, copies }) => [deco.id, copies])),
  };
  const elementSkill = matchingElementSkill(weapon);
  const elemFactor = ['Dual Blades', 'Bow', 'Insect Glaive'].includes(weapon.weaponClass)
    || getChargeBladePhial(weapon) === 'element' ? 2.15 : 1.15;
  // Inventory has already been resolved, including removal of preset talismans.
  const candidates = talismans.length > 0 ? talismans : [EMPTY_RECOMMENDATION_TALISMAN];
  let best: EvaluatedTalismanBuild | undefined;
  for (const talisman of candidates) {
    const { decorations, skillTotals } = slotOptimalDecorations(
      weapon, baseSkills, slots, talisman, decorationSearch, weights, preference, options
    );
    const loadout: BuildLoadout = {
      ...base,
      talisman,
      decorations,
      scrollMode: options.fixedDecorations ? base.scrollMode : chooseBestScrollMode(weapon, baseSkills, talisman),
    };
    const stats = calculateBuildStats(loadout, { coalescenceActive: canGenerateHellfire(skillTotals) });
    const contextWeights = refineWeightsForContext(weights, weapon, stats.skills, preference);
    const utilityBonus = computeFunctionalUtilityBonus(weapon, stats.skills, contextWeights, preference);
    const elementSkillBonus = elementSkill ? (stats.skills[elementSkill] ?? 0) * 12 : 0;
    const training = options.damageObjective ? simulateTrainingDps(loadout, DEFAULT_SIM_CONFIG) : undefined;
    const damageScore = training?.dps ?? (training?.isBowgunMagazine ? training.comboDamage : undefined);
    const candidate = {
      loadout,
      stats,
      objectiveDps: training?.dps,
      score: damageScore ?? (stats.effectiveRaw + stats.effectiveElement * elemFactor + utilityBonus * 0.45
        + elementSkillBonus + heavenSentBreakpoint(weapon, stats.skills, preference)),
      priorityCoverage: prioritySkillCoverage(stats.skills, targets),
    };
    if (isBetterTalismanBuild(candidate, best)) best = candidate;
  }
  return best!;
}

export function optimizeTemplateTalisman(
  loadout: BuildLoadout,
  weapon: WeaponItem,
  inventory: InventoryState,
  preference: BuildPreference = 'balanced'
): BuildLoadout {
  const mechanicsWeapon = loadout.bowgunAmmo
    ? { ...resolveMechanicsWeapon(weapon), selectedBowgunAmmo: loadout.bowgunAmmo }
    : weapon;
  const ownedDecoCounts = inventory.ownedDecoCounts ?? {};
  const ownedDecoIds = new Set(inventory.ownedDecoIds);
  const allowedDecos = DECORATIONS_DB.filter((deco) => ownedDecoIds.has(deco.id) && (ownedDecoCounts[deco.id] ?? 1) > 0);
  return optimizeLoadoutTalisman(
    loadout, mechanicsWeapon, inventory.talismans, allowedDecos, getSkillWeightsForWeapon(mechanicsWeapon, undefined, preference), preference,
    { fixedDecorations: loadout.decorations, ownedDecoCounts }
  ).loadout;
}

export function synthesizeOwnedBoxBuilds(
  inventory: InventoryState,
  options?: {
    weaponClassFilter?: string;
    maxBuilds?: number;
    preference?: BuildPreference;
    allowHealthDrain?: boolean;
    craftingMr?: number;
    craftingAr?: number;
    constraints?: BuildSearchConstraints;
    objective?: BuildObjective;
  }
): SynthesizeBoxResult {
  const weaponClassFilter = options?.weaponClassFilter ?? 'All';
  const maxBuilds = options?.maxBuilds ?? 48;
  const preference = options?.preference ?? 'balanced';
  const allowHealthDrain = options?.allowHealthDrain ?? false;

  inventory = resolveRecommendationInventory(inventory);
  const constraints = options?.constraints;
  const archetype = COMMUNITY_ARCHETYPES.find(profile => profile.id === constraints?.communityArchetypeId);
  const requiresHeavenSent3 = archetype?.requiresHeavenSent3 === true;
  const locked = constraints?.weaponId ? getWeaponById(constraints.weaponId) : undefined;
  const lockedWeapon = locked && resolveMechanicsWeapon(locked).id;
  const lockedArmorIds = new Set(resolveRecommendationInventory({
    ...inventory, ownedArmorIds: Object.values(constraints?.armor ?? {}).filter(Boolean),
  }).ownedArmorIds);
  const requestedSkills = Object.entries(constraints?.skillTargets ?? {});
  const planner = options?.craftingMr === undefined
    ? undefined
    : createCraftingPlanner(inventory, options.craftingMr, options.craftingAr);
  const objective = options?.objective;
  const costOf = (loadout: BuildLoadout) => {
    const pieces = calculateBuildCraftingSummary(loadout, inventory).pieceBreakdowns;
    if (!pieces.length) return 0;
    const plan = planner?.plan(pieces);
    if (!plan) return undefined;
    let cost = 0;
    for (const piece of pieces) {
      const step = plan.get(piece.itemId);
      if (!step) return undefined;
      for (const routeStep of craftingRoute(step)) {
        if (routeStep.recipe.zenny === undefined) return undefined;
        cost += routeStep.recipe.zenny * (routeStep === step ? piece.missingCopies : 1);
      }
    }
    return cost;
  };
  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedDecoCounts = { ...inventory.ownedDecoCounts };
  const ownedDecoSet = new Set(inventory.ownedDecoIds.filter((id) => (ownedDecoCounts[id] ?? 1) > 0));
  const availableDecoCounts = { ...ownedDecoCounts };
  const ownedCopies = Object.fromEntries([...ownedDecoSet].map(id => [id, ownedDecoCounts[id] ?? 1]));
  const craftableDecoIds = new Set<string>();
  if (planner) {
    for (const deco of DECORATIONS_DB) {
      const owned = ownedDecoSet.has(deco.id) ? ownedDecoCounts[deco.id] ?? 1 : 0;
      const maxMissing = Math.max(0, (deco.isRampage ? 1 : 24) - owned);
      let low = 0;
      let high = maxMissing;
      while (low < high) {
        const count = Math.ceil((low + high) / 2);
        if (planner.reserve(deco.id, 'decoration', count)) low = count;
        else high = count - 1;
      }
      if (low) {
        craftableDecoIds.add(deco.id);
        availableDecoCounts[deco.id] = owned + low;
      }
    }
  }

  const candidateWeapons = WEAPONS_DB.filter((w) => {
    if (archetype && w.weaponClass !== archetype.weaponClass) return false;
    if (archetype?.elementRequired && !matchingElementSkill(w)) return false;
    if (archetype?.bowShotSkill && getRecommendedShot(w)?.skillId !== archetype.bowShotSkill) return false;
    if (archetype?.style === 'normal-shelling' && getGunlanceShellingType(w) !== 'Normal') return false;
    if (archetype?.style === 'elemental-phials' && (getChargeBladePhial(w) !== 'element' || !matchingElementSkill(w))) return false;
    if (archetype?.style === 'elemental-glaive' && !matchingElementSkill(w)) return false;
    if (constraints?.weaponId && w.id !== lockedWeapon) return false;
    if (weaponClassFilter !== 'All' && w.weaponClass !== weaponClassFilter) {
      return false;
    }
    return ownedWeaponSet.has(w.id) || Boolean(planner?.reserve(w.id, 'weapon'));
  }).flatMap((weapon): WeaponWithAmmo[] => {
    if (!archetype?.bowgunPierceLevel) return [weapon];
    const ammo = getBowgunAmmoOptions(weapon).find(option => option.pierce
      && option.level === archetype.bowgunPierceLevel
      && (weapon.weaponClass !== 'Light Bowgun' || option.rapidFire));
    return ammo ? [{ ...weapon, selectedBowgunAmmo: ammo.id }] : [];
  });

  const armorBySlot: Record<ArmorSlot, ArmorItem[]> = {
    Helm: [],
    Chest: [],
    Arms: [],
    Waist: [],
    Legs: [],
  };

  for (const a of ARMOR_DB) {
    const lockedArmor = constraints?.armor?.[a.slot];
    if ((!lockedArmor || lockedArmorIds.has(a.id)) && a.isSelectable !== false
      && (ownedArmorSet.has(a.id) || planner?.reserve(a.id, 'armor'))) {
      armorBySlot[a.slot].push(a);
    }
  }

  const armorSlots = Object.keys(armorBySlot) as ArmorSlot[];
  const missingArmorSlots = armorSlots.filter((slot) => armorBySlot[slot].length === 0);
  const blockedArmorSlots: ArmorSlot[] = [];
  if (!allowHealthDrain) {
    for (const slot of armorSlots) {
      const pieces = armorBySlot[slot].filter((piece) => !hasHealthDrain(piece.skills));
      if (armorBySlot[slot].length > 0 && pieces.length === 0) blockedArmorSlots.push(slot);
      armorBySlot[slot] = pieces;
    }
  }
  const compatibleTalismans = constraints?.talismanId
    ? inventory.talismans.filter(talisman => talisman.id === constraints.talismanId)
    : inventory.talismans;
  const eligibleTalismans = allowHealthDrain ? compatibleTalismans : compatibleTalismans.filter((talisman) =>
    !HEALTH_DRAIN_SKILLS.some((id) =>
      (talisman.skill1Id === id && talisman.skill1Level > 0) || (talisman.skill2Id === id && talisman.skill2Level > 0)
    )
  );

  const allowedDecos = DECORATIONS_DB.filter((d) => (ownedDecoSet.has(d.id) || craftableDecoIds.has(d.id)) && (
    allowHealthDrain || (!HEALTH_DRAIN_SKILLS.includes(d.skillId)
      && !d.sourceSkills?.some(({ skillId, level }) => level > 0 && HEALTH_DRAIN_SKILLS.includes(skillId)))
  ));
  const allowedDecoSet = new Set(allowedDecos.map((d) => d.id));
  const ownedAllowedDecos = planner ? allowedDecos.filter(d => ownedDecoSet.has(d.id)) : allowedDecos;
  const ownedAllowedDecoSet = new Set(ownedAllowedDecos.map(d => d.id));

  if (candidateWeapons.length === 0 || missingArmorSlots.length > 0 || blockedArmorSlots.length > 0
    || (constraints?.talismanId && !eligibleTalismans.length)) {
    return {
      builds: [],
      missingArmorSlots,
      blockedArmorSlots,
      ownedWeaponCount: inventory.ownedWeaponIds.length,
      ownedArmorCount: inventory.ownedArmorIds.length,
      ownedDecoCount: inventory.ownedDecoIds.length,
      ownedTalismanCount: inventory.talismans.length,
    };
  }

  const byClass = new Map<WeaponClass, WeaponWithAmmo[]>();
  for (const w of candidateWeapons) {
    const arr = byClass.get(w.weaponClass) ?? [];
    arr.push(w);
    byClass.set(w.weaponClass, arr);
  }

  const selectedWeapons: WeaponWithAmmo[] = [];
  const perClassLimit = weaponClassFilter === 'All' ? 4 : 24;
  for (const [, list] of byClass) {
    const sorted = [...list].sort(
      (a, b) => scoreWeaponForSelection(b) - scoreWeaponForSelection(a)
    );
    selectedWeapons.push(...sorted.slice(0, perClassLimit));
  }

  const builds: SynthesizedBoxBuild[] = [];
  for (const slot of armorSlots) armorBySlot[slot] = pruneEquivalentArmor(armorBySlot[slot]);

  const plans = selectedWeapons.flatMap((weapon): Array<{ weapon: WeaponWithAmmo; style?: GlaiveStyle }> => {
    if (weapon.weaponClass !== 'Insect Glaive') return [{ weapon }];
    if (archetype?.style === 'elemental-glaive') return [{ weapon, style: 'elemental' }];
    if (!matchingElementSkill(weapon)) return [{ weapon, style: 'extracts' }];
    return [{ weapon, style: 'extracts' }, { weapon, style: 'elemental' }];
  });

  for (const { weapon, style } of plans) {
    const weights = getSkillWeightsForWeapon(weapon, style, preference);
    for (const id of archetype?.comfort ?? []) weights[id] = Math.max(weights[id] ?? 0, 10) + 3;
    const guidedSkills = { ...archetype?.priorities };
    const element = matchingElementSkill(weapon);
    if (element && (archetype?.elementRequired || archetype?.style === 'elemental-phials' || archetype?.style === 'elemental-glaive')) {
      guidedSkills[element] = getSkillById(element)?.maxLevel ?? 5;
    }
    const profileTargets = Object.entries({ ...guidedSkills, ...constraints?.skillTargets,
      ...(requiresHeavenSent3 ? { heaven_sent: 3 } : {}),
    });
    const targetsById = new Map(prioritySkillTargets(weapon, style));
    for (const [id, level] of profileTargets) targetsById.set(id, Math.max(level, targetsById.get(id) ?? 0));
    const targets = [...targetsById];
    const bestTalisman =
      pickTalismanForArmorSearch(eligibleTalismans, weapon, {}, style, preference) ?? EMPTY_RECOMMENDATION_TALISMAN;

    const valuesHeavenSent = HEAVEN_SENT_3_CLASSES.includes(weapon.weaponClass);
    // Preserve set skill pieces through the per-slot cutoff, even if their standalone score is low.
    const topSlotPieces = Object.fromEntries(armorSlots.map((slot) => {
      const ranked = armorBySlot[slot]
        .map((piece) => ({ piece, score: scoreArmorPieceForWeapon(piece, weapon, weights)
          + prioritySkillCoverage(piece.skills, profileTargets) * 1000 }))
        .sort((a, b) => (objective === 'cost'
          ? (ownedArmorSet.has(a.piece.id) ? 0 : getEquipmentCraftingZenny(a.piece.id) ?? Infinity)
            - (ownedArmorSet.has(b.piece.id) ? 0 : getEquipmentCraftingZenny(b.piece.id) ?? Infinity)
          : 0) || b.score - a.score);
      return [slot, ranked
        .filter(({ piece }, index) => index < 5 || (valuesHeavenSent && (piece.skills.heaven_sent ?? 0) > 0))
        .map(({ piece }) => piece)];
    })) as Record<ArmorSlot, ArmorItem[]>;

    // Evaluate combinations and collect top 6 candidates to verify with full stats & decos
    type ComboCandidate = {
      combo: Record<ArmorSlot, ArmorItem>;
      heuristicScore: number;
    };
    const topCombos: ComboCandidate[] = [];
    const heavenSentCombos: ComboCandidate[] = [];
    const contextCache = new Map<number, Record<string, number>>();

    for (const helm of topSlotPieces.Helm) {
      for (const chest of topSlotPieces.Chest) {
        for (const arms of topSlotPieces.Arms) {
          for (const waist of topSlotPieces.Waist) {
            for (const legs of topSlotPieces.Legs) {
              const pieces = [helm, chest, arms, waist, legs];
              const armorHeavenSent = valuesHeavenSent && pieces.reduce((sum, piece) => sum + (piece.skills.heaven_sent ?? 0), 0) >= 3;
              if (requiresHeavenSent3 && !armorHeavenSent) continue;
              const skillTotals: Record<string, number> = {};
              let slotScore = 0;

              for (const p of pieces) {
                for (const [sk, pts] of Object.entries(p.skills)) {
                  skillTotals[sk] = (skillTotals[sk] ?? 0) + pts;
                }
                for (const sl of p.slots) {
                  slotScore += sl === 4 ? 15 : sl === 3 ? 10 : sl === 2 ? 8 : sl === 1 ? 3 : 0;
                }
              }
              if (bestTalisman.skill1Id) {
                skillTotals[bestTalisman.skill1Id] =
                  (skillTotals[bestTalisman.skill1Id] ?? 0) + bestTalisman.skill1Level;
              }
              if (bestTalisman.skill2Id) {
                skillTotals[bestTalisman.skill2Id] =
                  (skillTotals[bestTalisman.skill2Id] ?? 0) + bestTalisman.skill2Level;
              }

              const ctxWeights = refineWeightsForContext(weights, weapon, skillTotals, preference, contextCache);

              let skillScore = heavenSentBreakpoint(weapon, skillTotals, preference);
              for (const [sk, rawPts] of Object.entries(skillTotals)) {
                const maxLv = usefulSkillCap(weapon, sk);
                const cappedPts = Math.min(rawPts, maxLv);
                const overcapPenalty = Math.max(0, rawPts - maxLv) * 4;
                skillScore += cappedPts * (ctxWeights[sk] ?? 0) - overcapPenalty;
              }

              // Anti-synergy penalties
              if ((skillTotals.berserk ?? 0) > 0 && (skillTotals.dragon_conversion ?? 0) > 0) {
                skillScore -= 140;
              }
              if (
                (skillTotals.dragonheart ?? 0) > 0 &&
                TRUE_ELEMENTS.has(weapon.elementType) &&
                weapon.elementType !== 'Dragon'
              ) {
                skillScore -= 140;
              }
              if (
                (skillTotals.blood_awakening ?? 0) > 0 &&
                (skillTotals.blood_rite ?? 0) === 0
              ) {
                skillScore -= skillTotals.blood_awakening * 8;
              }

              const armorCost = objective === 'cost' ? pieces.reduce((cost, piece) =>
                cost + (ownedArmorSet.has(piece.id) ? 0 : getEquipmentCraftingZenny(piece.id) ?? 1e9), 0) : 0;
              const total = objective === 'cost' ? -armorCost * 1e8 + skillScore + slotScore
                : prioritySkillCoverage(skillTotals, profileTargets) * 10000
                + prioritySkillCoverage(skillTotals, targets) * 1000 + skillScore + slotScore;
              // Evaluate complete Heaven-Sent sets with decorations even if armor alone misses class targets.
              const shortlist = armorHeavenSent ? heavenSentCombos : topCombos;
              if (
                shortlist.length < 6 ||
                total > shortlist[shortlist.length - 1].heuristicScore
              ) {
                shortlist.push({
                  combo: { Helm: helm, Chest: chest, Arms: arms, Waist: waist, Legs: legs },
                  heuristicScore: total,
                });
                shortlist.sort((a, b) => b.heuristicScore - a.heuristicScore);
                if (shortlist.length > 6) shortlist.pop();
              }
            }
          }
        }
      }
    }

    const rampageDecoId = chooseBestRampageDeco(weapon, allowedDecoSet);
    let bestEvaluated: (EvaluatedTalismanBuild & { combo: Record<ArmorSlot, ArmorItem>; craftingCost?: number }) | undefined;

    for (const candidate of [...topCombos, ...heavenSentCombos]) {
      const base: BuildLoadout = {
        id: `box_opt_${weapon.id}${style ? `_${style}` : ''}${weapon.selectedBowgunAmmo ? `_${weapon.selectedBowgunAmmo}` : ''}${requiresHeavenSent3 ? '_heaven_sent_3' : ''}`,
        name: `${weapon.name} (${[requiresHeavenSent3 ? 'Heaven-Sent 3' : '',
          style === 'extracts' ? 'Extract Uptime' : style === 'elemental' ? 'Elemental Damage' : '',
        ].filter(Boolean).join(' · ') || 'Box Optimized'})`,
        weaponClass: weapon.weaponClass,
        weaponId: weapon.id,
        bowgunAmmo: weapon.selectedBowgunAmmo,
        helmId: candidate.combo.Helm.id,
        chestId: candidate.combo.Chest.id,
        armsId: candidate.combo.Arms.id,
        waistId: candidate.combo.Waist.id,
        legsId: candidate.combo.Legs.id,
        talisman: EMPTY_RECOMMENDATION_TALISMAN,
        rampageDecoId: objective === 'cost' ? chooseBestRampageDeco(weapon, ownedAllowedDecoSet) : rampageDecoId,
        decorations: EMPTY_DECORATIONS,
        quriousWeapon: { ...EMPTY_Q_WEAPON },
        quriousArmor: {
          Helm: { ...EMPTY_ARMOR_AUGMENT },
          Chest: { ...EMPTY_ARMOR_AUGMENT },
          Arms: { ...EMPTY_ARMOR_AUGMENT },
          Waist: { ...EMPTY_ARMOR_AUGMENT },
          Legs: { ...EMPTY_ARMOR_AUGMENT },
        },
        scrollMode: 'Red',
        updatedAt: new Date().toISOString(),
      };
      let crafting: DecoSearchOptions['crafting'];
      if (planner) {
        let plan = planner.plan(calculateBuildCraftingSummary(base, inventory).pieceBreakdowns);
        if (!plan && base.rampageDecoId && !ownedDecoSet.has(base.rampageDecoId)) {
          base.rampageDecoId = chooseBestRampageDeco(weapon, ownedAllowedDecoSet);
          plan = planner.plan(calculateBuildCraftingSummary(base, inventory).pieceBreakdowns);
        }
        if (!plan) continue;
        const last = [...plan.values()].at(-1);
        crafting = { planner, used: last?.used ?? new Map(), ownedCopies };
      }
      // The low-cost pass starts with owned decorations, so filling empty slots cannot add expense.
      const cheapest = objective === 'cost';
      let evaluated = optimizeLoadoutTalisman(base, weapon, eligibleTalismans, cheapest ? ownedAllowedDecos : allowedDecos, weights, preference, {
        ownedDecoCounts: cheapest ? ownedDecoCounts : availableDecoCounts, glaiveStyle: style, crafting, skillTargets: targets,
        damageObjective: objective === 'damage',
      });
      if (planner && !planner.plan(calculateBuildCraftingSummary(evaluated.loadout, inventory).pieceBreakdowns)) {
        evaluated = optimizeLoadoutTalisman(
          { ...base, rampageDecoId: chooseBestRampageDeco(weapon, ownedAllowedDecoSet) },
          weapon, eligibleTalismans, ownedAllowedDecos, weights, preference, {
            ownedDecoCounts, glaiveStyle: style, skillTargets: targets, damageObjective: objective === 'damage',
          },
        );
        if (!planner.plan(calculateBuildCraftingSummary(evaluated.loadout, inventory).pieceBreakdowns)) continue;
      }
      const craftingCost = objective ? costOf(evaluated.loadout) : undefined;
      if (archetype?.bowShotSkill && getRecommendedShot(weapon, (evaluated.stats.skills.bow_charge_plus ?? 0) > 0)?.skillId
        !== archetype.bowShotSkill) continue;
      const cost = craftingCost ?? Infinity;
      const bestCost = bestEvaluated?.craftingCost ?? Infinity;
      if ((objective === 'cost' && cost !== bestCost) ? cost < bestCost : isBetterTalismanBuild(evaluated, bestEvaluated)) {
        bestEvaluated = { ...evaluated, combo: candidate.combo, craftingCost };
      }
    }

    if (!bestEvaluated) continue;

    const { combo: bestCombo, loadout, stats, score } = bestEvaluated;
    const { decorations } = loadout;
    if (style === 'elemental') {
      const extracts = builds[builds.length - 1]?.loadout;
      if (extracts?.weaponId === weapon.id
        && extracts.helmId === loadout.helmId && extracts.chestId === loadout.chestId
        && extracts.armsId === loadout.armsId && extracts.waistId === loadout.waistId
        && extracts.legsId === loadout.legsId && extracts.talisman.id === loadout.talisman.id
        && extracts.scrollMode === loadout.scrollMode
        && JSON.stringify(extracts.decorations) === JSON.stringify(decorations)) continue;
    }

    const allSlots = [
      ...weapon.slots,
      ...bestCombo.Helm.slots,
      ...bestCombo.Chest.slots,
      ...bestCombo.Arms.slots,
      ...bestCombo.Waist.slots,
      ...bestCombo.Legs.slots,
      ...loadout.talisman.slots,
    ].filter((s) => s > 0);
    const decoSlotsTotal = allSlots.length;
    const decoSlotsFilled = Object.values(decorations)
      .flat()
      .filter((id) => Boolean(id)).length;

    const topSkills = Object.entries(stats.skills)
      .filter(([sk]) => (weights[sk] ?? 0) > 0)
      .sort((a, b) => (weights[b[0]] ?? 0) * b[1] - (weights[a[0]] ?? 0) * a[1])
      .slice(0, 6)
      .map(([sk, lv]) => `${getSkillById(sk)?.name ?? sk} ${lv}`);

    const missingPieces = planner ? calculateBuildCraftingSummary(loadout, inventory).pieceBreakdowns : undefined;
    const weaponStep = missingPieces && !ownedWeaponSet.has(weapon.id)
      ? planner?.plan(missingPieces)?.get(weapon.id)
      : undefined;
    builds.push({
      craftingCost: objective ? bestEvaluated.craftingCost : planner ? costOf(loadout) : undefined,
      objectiveDps: bestEvaluated.objectiveDps,
      craftableWeapon: Boolean(planner && !ownedWeaponSet.has(weapon.id)),
      craftableItems: missingPieces?.map(piece => `${piece.itemName} ×${piece.missingCopies}`),
      weaponCraftingSteps: weaponStep && craftingRoute(weaponStep).map(step => getWeaponById(step.itemId)?.name ?? step.itemId),
      id: loadout.id,
      title: loadout.name,
      weaponClass: weapon.weaponClass,
      weapon,
      loadout,
      stats,
      score: Math.round(score),
      talismanUsed: loadout.talisman,
      decoSlotsFilled,
      decoSlotsTotal,
      missingSkillHighlights: topSkills,
      prioritySkills: [
        ...profileTargets.map(([id, target]) => ({ name: getSkillById(id)?.name ?? id, level: stats.skills[id] ?? 0, target })),
        ...getSkillPriorities(weapon, stats.skills, style).filter(skill =>
          !profileTargets.some(([id]) => getSkillById(id)?.name === skill.name)),
      ],
      comfortHighlights: getComfortHighlights(
        stats.skills,
        refineWeightsForContext(weights, weapon, stats.skills, preference)
      ),
    });
  }

  builds.sort((a, b) => (objective === 'cost' ? (a.craftingCost ?? Infinity) - (b.craftingCost ?? Infinity) : 0)
    || prioritySkillCoverage(b.stats.skills, requestedSkills) - prioritySkillCoverage(a.stats.skills, requestedSkills)
    || b.score - a.score || b.stats.effectiveRaw - a.stats.effectiveRaw);

  return {
    builds: builds.slice(0, maxBuilds),
    missingArmorSlots: [],
    blockedArmorSlots,
    ownedWeaponCount: inventory.ownedWeaponIds.length,
    ownedArmorCount: inventory.ownedArmorIds.length,
    ownedDecoCount: inventory.ownedDecoIds.length,
    ownedTalismanCount: inventory.talismans.length,
  };
}
