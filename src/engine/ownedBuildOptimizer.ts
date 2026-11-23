import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getEquipmentRecipe,
  getSkillById,
  getWeaponById,
  META_BUILD_TEMPLATES,
  WEAPONS_DB,
} from '../data/sunbreakDb';
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
  calculateBuildCraftingSummary,
  calculateBuildStats,
} from './damageCalculator';

export type OwnedReadiness = 'ready' | 'craftable' | 'partial';

export interface OwnedTemplateMatch {
  template: MetaBuildTemplate;
  templateStats: CalculatedBuildStats;
  adaptedWeapon: WeaponItem;
  weaponOwnedInBox: boolean;
  substitutedWeapon: boolean;
  adaptedLoadout: BuildLoadout;
  adaptedStats: CalculatedBuildStats;
  bestOwnedTalisman: TalismanItem | null;
  readiness: OwnedReadiness;
  rankEligible: boolean;
  ownedGearCount: number;
  totalGearCount: number;
  gearOwnershipPercent: number;
  ownedDecoCount: number;
  totalDecoCount: number;
  decoOwnershipPercent: number;
  craftableGearCount: number;
  missingGearNames: string[];
  missingDecoNames: string[];
  craftableWithMaterials: boolean;
  missingMaterials: Array<{ name: string; shortfall: number; source: string }>;
}

export interface SynthesizedBoxBuild {
  id: string;
  title: string;
  weaponClass: WeaponClass;
  weapon: WeaponItem;
  loadout: BuildLoadout;
  stats: CalculatedBuildStats;
  score: number;
  usesCraftablePieces: boolean;
  craftablePieces: Array<{
    slotLabel: string;
    itemId: string;
    itemName: string;
    zennyCost: number;
    materials: Array<{ name: string; quantity: number; source: string }>;
  }>;
  talismanUsed: TalismanItem;
  decoSlotsFilled: number;
  decoSlotsTotal: number;
  missingSkillHighlights: string[];
}

export interface SynthesizeBoxResult {
  builds: SynthesizedBoxBuild[];
  missingArmorSlots: ArmorSlot[];
  ownedWeaponCount: number;
  ownedArmorCount: number;
  ownedDecoCount: number;
  ownedTalismanCount: number;
}

const EMPTY_ARMOR_AUGMENT = {
  defenseDelta: 0,
  skillAddedId: '',
  skillAddedPoints: 0,
  slotUpgrade: 0,
};

const EMPTY_Q_WEAPON: BuildLoadout['quriousWeapon'] = {
  attackLevel: 0,
  elementLevel: 0,
  affinityLevel: 0,
  sharpnessBoost: false,
  extraSlotLevel: 0,
};

const TRUE_ELEMENTS = new Set(['Fire', 'Water', 'Thunder', 'Ice', 'Dragon']);
const STATUS_ELEMENTS = new Set(['Poison', 'Paralysis', 'Sleep', 'Blast']);

type ShotSpecialty = 'pierce' | 'spread' | 'normal_rapid' | 'sticky' | 'mixed_pierce_spread';

function isElementPhialCB(weapon: WeaponItem): boolean {
  if (weapon.weaponClass !== 'Charge Blade') return false;
  if (/element phial/i.test(weapon.unlockNote)) return true;
  if (/impact phial/i.test(weapon.unlockNote) || weapon.id === 'cb_rajang_hr') return false;
  return TRUE_ELEMENTS.has(weapon.elementType);
}

function inferShotSpecialty(weapon: WeaponItem): ShotSpecialty | null {
  if (weapon.damageType !== 'Shot') return null;

  const text = `${weapon.name} ${weapon.unlockNote}`.toLowerCase();

  if (weapon.weaponClass === 'Bow') {
    if (text.includes('spread')) return 'spread';
    if (text.includes('pierce') && !text.includes('rapid')) return 'pierce';
    if (text.includes('pierce') && text.includes('rapid')) return 'pierce';
    return 'normal_rapid';
  }

  // Light Bowgun & Heavy Bowgun
  if (text.includes('sticky') && !text.includes('pierc') && !text.includes('spread')) {
    return 'sticky';
  }
  if (text.includes('pierc') && text.includes('spread')) {
    // Check curated meta template for this weapon if available
    const tpl = META_BUILD_TEMPLATES.find((t) => t.loadout.weaponId === weapon.id);
    if (tpl) {
      const decos = Object.values(tpl.loadout.decorations).flat();
      if (decos.some((d) => d.includes('spread'))) return 'spread';
      if (decos.some((d) => d.includes('pierce'))) return 'pierce';
    }
    return 'mixed_pierce_spread';
  }
  if (text.includes('spread')) return 'spread';
  if (text.includes('pierc')) return 'pierce';
  if (text.includes('normal')) return 'normal_rapid';

  return 'pierce';
}

export function getSkillWeightsForWeapon(weapon: WeaponItem): Record<string, number> {
  const isShot = weapon.damageType === 'Shot';
  const isBow = weapon.weaponClass === 'Bow';
  const isBowgun =
    weapon.weaponClass === 'Light Bowgun' || weapon.weaponClass === 'Heavy Bowgun';
  const hasTrueElem = TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0;
  const hasStatus = STATUS_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0;
  const shotSpecialty = inferShotSpecialty(weapon);
  const elemCB = isElementPhialCB(weapon);

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
    blood_rite: 8,
    powder_mantle: 11,
    dereliction: 12,
    resentment: 7,
    peak_performance: 7,
    resuscitate: 6,
    intrepid_heart: 10,
    wirebug_whisperer: isBowgun ? 4 : 9,
    wind_mantle: isBowgun ? 0 : 9,
    frenzied_bloodlust: isBowgun ? 3 : 8,
    defiance: 5,
    stun_resistance: 4,
    flinch_free: 2,
    spiribirds_call: 3,
    evade_extender: 5,
    evade_window: 4,
  };

  // Sticky bowguns & Impact phials don't scale explosions with affinity/crit boost,
  // though physical shots/hits still gain minor value
  if (shotSpecialty === 'sticky') {
    weights.weakness_exploit = 6;
    weights.critical_boost = 4;
    weights.critical_eye = 4;
    weights.attack_boost = 18;
    weights.artillery = 24;
    weights.peak_performance = 9;
    weights.agitator = 14;
  }

  // Sharpness & Melee-only skills (0 on all Gunners!)
  if (!isShot) {
    weights.heaven_sent = 12;
    weights.handicraft =
      weapon.handicraftBonusSharpness && weapon.sharpness !== 'Purple'
        ? 13
        : weapon.sharpness === 'Purple'
        ? 2
        : 6;
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

  // Elemental Attack & Boosters (STRICTLY matching weapon.elementType!)
  if (hasTrueElem) {
    const elemSkill = `${weapon.elementType.toLowerCase()}_attack`;
    weights[elemSkill] = 16;
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
      if (!elemCB) {
        weights.artillery = 18;
        weights.slugger = 6;
      } else {
        weights.burst = 17;
        weights.element_exploit = 16;
      }
      break;
    case 'Insect Glaive':
      weights.power_prolonger = 12;
      weights.wirebug_whisperer = 13;
      weights.evade_extender = 9;
      weights.heaven_sent = 15;
      weights.constitution = 5;
      break;
    case 'Light Bowgun': {
      weights.recoil_down = 17;
      weights.reload_speed = 16;
      weights.spare_shot = 14;
      weights.ammo_up = 13;
      weights.ballistics = 9;
      weights.steadiness = 6;
      weights.maximum_might = 10;
      if (shotSpecialty !== 'sticky') {
        weights.rapid_fire_up = 20;
      }
      if (shotSpecialty === 'pierce') {
        weights.pierce_up = hasTrueElem ? 13 : 19;
      } else if (shotSpecialty === 'spread') {
        weights.spread_up = 19;
      } else if (shotSpecialty === 'normal_rapid') {
        weights.normal_rapid_up = 19;
      } else if (shotSpecialty === 'mixed_pierce_spread') {
        weights.pierce_up = 16;
        weights.spread_up = 13;
      }
      break;
    }
    case 'Heavy Bowgun': {
      weights.recoil_down = 17;
      weights.reload_speed = 16;
      weights.spare_shot = 15;
      weights.ammo_up = 15;
      weights.ballistics = 9;
      weights.steadiness = 6;
      weights.tune_up = 8;
      weights.evade_extender = 10;
      weights.guard = 7;
      weights.guard_up = 5;
      weights.maximum_might = 10;
      if (shotSpecialty === 'pierce') {
        weights.pierce_up = hasTrueElem ? 13 : 19;
      } else if (shotSpecialty === 'spread') {
        weights.spread_up = 19;
      } else if (shotSpecialty === 'normal_rapid') {
        weights.normal_rapid_up = 19;
      } else if (shotSpecialty === 'mixed_pierce_spread') {
        weights.pierce_up = 17;
        weights.spread_up = 14;
      }
      break;
    }
    case 'Bow': {
      weights.bow_charge_plus = 24;
      weights.constitution = 17;
      weights.stamina_surge = 16;
      weights.berserk = 18;
      weights.strife = 18;
      weights.ballistics = 8;
      if (shotSpecialty === 'spread') {
        weights.spread_up = 20;
      } else if (shotSpecialty === 'pierce') {
        weights.pierce_up = 20;
      } else {
        weights.normal_rapid_up = 20;
      }
      break;
    }
  }

  // Ensure Bowgun-only skills never leak onto Bow
  if (!isBowgun) {
    delete weights.recoil_down;
    delete weights.reload_speed;
    delete weights.spare_shot;
    delete weights.ammo_up;
    delete weights.steadiness;
    delete weights.tune_up;
    delete weights.rapid_fire_up;
  }

  return weights;
}

/**
 * Adjusts skill weights dynamically for the active armor + talisman context
 * to prevent dead conditional skills or conflicting synergies.
 */
function refineWeightsForContext(
  baseWeights: Record<string, number>,
  weapon: WeaponItem,
  armorSkills: Record<string, number>,
  talisman: TalismanItem
): Record<string, number> {
  const w = { ...baseWeights };
  const totalOf = (sk: string) =>
    (armorSkills[sk] ?? 0) +
    (talisman.skill1Id === sk ? talisman.skill1Level : 0) +
    (talisman.skill2Id === sk ? talisman.skill2Level : 0);

  const hasBerserk = totalOf('berserk') > 0;
  const hasDereliction = totalOf('dereliction') > 0;
  const hasBloodlust = totalOf('bloodlust') > 0;
  const hasRedHealth = hasBerserk || hasDereliction || hasBloodlust;
  const hasHellfire = totalOf('hellfire_cloak') > 0;
  const hasBloodRite = totalOf('blood_rite') > 0;
  const hasDragonConversion = totalOf('dragon_conversion') > 0;

  // Anti-synergy: Peak Performance has ~0 uptime with Berserk / Dereliction / Bloodlust
  if (hasRedHealth) {
    w.peak_performance = 0;
  } else {
    // Without red health drain, Resentment and Strife have minimal/0 uptime
    w.resentment = 0;
    if (!hasBerserk) {
      w.strife = Math.min(w.strife ?? 0, 2);
    }
  }

  if (hasBerserk) {
    // Berserk drains HP on Blue Scroll -> Recovery Speed helps & infinite stamina with Strife
    w.recovery_speed = 6;
    if ((armorSkills.strife ?? 0) > 0) {
      w.constitution = Math.min(w.constitution ?? 0, 8);
      w.stamina_surge = Math.min(w.stamina_surge ?? 0, 8);
    }
  }

  // Coalescence & Resuscitate require Bloodlust, Hellfire Cloak, or regular blights
  if (!hasBloodlust && !hasHellfire) {
    w.coalescence = 0;
    w.resuscitate = 0;
  }

  // Blood Awakening needs Blood Rite (or Anomaly Bloodblight)
  if (!hasBloodRite) {
    w.blood_awakening = Math.min(w.blood_awakening ?? 0, 7);
  }

  // Dragon Conversion converts elemental resistances on Red Scroll
  if (hasDragonConversion && !hasBerserk && TRUE_ELEMENTS.has(weapon.elementType)) {
    w.dragon_resistance = 3;
    w.thunder_resistance = 3;
  }

  return w;
}

function scoreTalismanForWeights(
  talisman: TalismanItem,
  weights: Record<string, number>
): number {
  let score = 0;
  if (talisman.skill1Id && talisman.skill1Level > 0) {
    score += (weights[talisman.skill1Id] ?? 0) * talisman.skill1Level;
  }
  if (talisman.skill2Id && talisman.skill2Level > 0) {
    score += (weights[talisman.skill2Id] ?? 0) * talisman.skill2Level;
  }
  for (const s of talisman.slots) {
    if (s >= 4) score += 14;
    else if (s === 3) score += 10;
    else if (s === 2) score += 8;
    else if (s === 1) score += 3;
  }
  return score;
}

export function pickBestOwnedTalisman(
  talismans: TalismanItem[],
  weapon: WeaponItem
): TalismanItem | null {
  if (!talismans || talismans.length === 0) return null;
  const weights = getSkillWeightsForWeapon(weapon);
  let best = talismans[0];
  let bestScore = -1;
  for (const t of talismans) {
    const s = scoreTalismanForWeights(t, weights);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return best;
}

function isRecipeCraftable(
  kind: 'weapon' | 'armor' | 'decoration',
  id: string,
  materials: Record<string, number>
): boolean {
  const recipe = getEquipmentRecipe(kind, id);
  if (!recipe || recipe.materials.length === 0) return false;
  return recipe.materials.every((m) => (materials[m.name] ?? 0) >= m.quantity);
}

/**
 * Greedily fills weapon, 5 armor pieces, and talisman slots using ONLY strictly relevant,
 * allowed decorations, respecting exact slot levels, owned decoration quantities, and max skill caps.
 */
function slotOptimalDecorations(
  weapon: WeaponItem,
  armor: Record<ArmorSlot, ArmorItem>,
  talisman: TalismanItem,
  allowedDecos: DecorationItem[],
  weights: Record<string, number>,
  options?: {
    preferredDecoIds?: string[];
    ownedDecoCounts?: Record<string, number>;
    includeCraftable?: boolean;
    materials?: Record<string, number>;
  }
): BuildLoadout['decorations'] {
  const skillTotals: Record<string, number> = {};
  const addPts = (id: string, pts: number) => {
    if (!id || pts <= 0) return;
    skillTotals[id] = (skillTotals[id] ?? 0) + pts;
  };

  (Object.values(armor) as ArmorItem[]).forEach((piece) => {
    for (const [sk, pts] of Object.entries(piece.skills)) {
      addPts(sk, pts);
    }
  });
  if (talisman.skill1Id) addPts(talisman.skill1Id, talisman.skill1Level);
  if (talisman.skill2Id) addPts(talisman.skill2Id, talisman.skill2Level);

  const effectiveWeights = refineWeightsForContext(
    weights,
    weapon,
    skillTotals,
    talisman
  );

  const preferredSet = new Set(options?.preferredDecoIds ?? []);
  const ownedDecoCounts = options?.ownedDecoCounts ?? {};
  const hasCountTracking = Object.keys(ownedDecoCounts).length > 0;
  const includeCraftable = options?.includeCraftable ?? false;
  const materials = options?.materials ?? {};

  const normalDecos = allowedDecos.filter((d) => !d.isRampage);
  const remainingCopies: Record<string, number> = {};
  for (const d of normalDecos) {
    if (includeCraftable && isRecipeCraftable('decoration', d.id, materials)) {
      remainingCopies[d.id] = 99;
    } else if (hasCountTracking) {
      remainingCopies[d.id] = ownedDecoCounts[d.id] ?? 0;
    } else {
      remainingCopies[d.id] = 99;
    }
  }

  const result: BuildLoadout['decorations'] = {
    weapon: [],
    helm: [],
    chest: [],
    arms: [],
    waist: [],
    legs: [],
    talisman: [],
  };

  const targets: Array<{
    key: keyof BuildLoadout['decorations'];
    slots: [number, number, number];
  }> = [
    { key: 'weapon', slots: weapon.slots },
    { key: 'helm', slots: armor.Helm.slots },
    { key: 'chest', slots: armor.Chest.slots },
    { key: 'arms', slots: armor.Arms.slots },
    { key: 'waist', slots: armor.Waist.slots },
    { key: 'legs', slots: armor.Legs.slots },
    { key: 'talisman', slots: talisman.slots },
  ];

  const slotEntries: Array<{
    key: keyof BuildLoadout['decorations'];
    idx: number;
    level: number;
  }> = [];

  for (const t of targets) {
    t.slots.forEach((lvl, idx) => {
      if (lvl > 0) {
        slotEntries.push({ key: t.key, idx, level: lvl });
      }
    });
  }

  // Sort smallest slot level first (1 -> 2 -> 3 -> 4) so Lv1 slots handle Lv1 utility/elem decos
  // before larger slots pick multi-point Lv4/Lv2 decos.
  slotEntries.sort((a, b) => a.level - b.level);

  for (const entry of slotEntries) {
    let bestDeco: DecorationItem | null = null;
    let bestValue = 0;

    for (const d of normalDecos) {
      if (d.slotLevel > entry.level) continue;
      if ((remainingCopies[d.id] ?? 0) <= 0) continue;

      const weight = effectiveWeights[d.skillId] ?? 0;
      // CRITICAL: Never slot any decoration whose skill has zero relevance to this weapon/set!
      if (weight <= 0) continue;

      const skillDef = getSkillById(d.skillId);
      const maxLv =
        d.skillId === 'flinch_free' ? 1 : (skillDef?.maxLevel ?? 7);
      const currentLv = skillTotals[d.skillId] ?? 0;
      const usablePoints = Math.max(0, Math.min(d.points, maxLv - currentLv));
      if (usablePoints <= 0) continue;

      const slotEfficiencyBonus = d.slotLevel === entry.level ? 1.08 : 0.94;
      const preferredBonus = preferredSet.has(d.id) ? 1.12 : 1.0;
      const value = usablePoints * weight * slotEfficiencyBonus * preferredBonus;

      if (value > bestValue) {
        bestValue = value;
        bestDeco = d;
      }
    }

    if (bestDeco) {
      while (result[entry.key].length <= entry.idx) {
        result[entry.key].push('');
      }
      result[entry.key][entry.idx] = bestDeco.id;
      addPts(bestDeco.skillId, bestDeco.points);
      remainingCopies[bestDeco.id] = Math.max(0, (remainingCopies[bestDeco.id] ?? 1) - 1);
    }
  }

  return result;
}

function chooseBestScrollMode(
  weapon: WeaponItem,
  armorSkills: Record<string, number>,
  talisman?: TalismanItem
): ScrollMode {
  const berserkLv =
    (armorSkills.berserk ?? 0) +
    (talisman?.skill1Id === 'berserk' ? talisman.skill1Level : 0) +
    (talisman?.skill2Id === 'berserk' ? talisman.skill2Level : 0);

  if (berserkLv > 0) {
    return 'Blue';
  }
  if ((armorSkills.dragon_conversion ?? 0) > 0 || (armorSkills.furious ?? 0) > 0) {
    return 'Red';
  }
  if ((armorSkills.strife ?? 0) > 0 && (armorSkills.dereliction ?? 0) > 0) {
    return TRUE_ELEMENTS.has(weapon.elementType) ? 'Red' : 'Blue';
  }
  if ((armorSkills.dereliction ?? 0) > 0) {
    return TRUE_ELEMENTS.has(weapon.elementType) ? 'Red' : 'Blue';
  }
  if ((armorSkills.mail_of_hellfire ?? 0) > 0) {
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
  if (
    weapon.rampageSlot >= 3 &&
    TRUE_ELEMENTS.has(weapon.elementType) &&
    weapon.elementValue >= 25 &&
    allowedDecoSet.has('ramp_elembane')
  ) {
    return 'ramp_elembane';
  }
  if (weapon.rampageSlot >= 2) {
    if (allowedDecoSet.has('ramp_anti_elder')) return 'ramp_anti_elder';
    if (allowedDecoSet.has('ramp_anti_wyvern')) return 'ramp_anti_wyvern';
  }
  const ownedRamp = DECORATIONS_DB.find(
    (d) => d.isRampage && d.slotLevel <= weapon.rampageSlot && allowedDecoSet.has(d.id)
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
    const tShot = inferShotSpecialty(targetWeapon);
    const cShot = inferShotSpecialty(candidate);
    if (tShot && cShot && tShot === cShot) {
      bonus += 500;
    }
  }

  return bonus + scoreWeaponForSelection(candidate);
}

export function evaluateOwnedBuildMatches(
  profile: HunterProfile,
  inventory: InventoryState,
  options?: {
    weaponFilter?: string;
    stageFilter?: RankTier | 'All';
  }
): OwnedTemplateMatch[] {
  const weaponFilter = options?.weaponFilter ?? 'All';
  const stageFilter = options?.stageFilter ?? 'All';

  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedDecoSet = new Set(inventory.ownedDecoIds);
  const ownedDecoCounts = inventory.ownedDecoCounts ?? {};
  const hasDecoCounts = Object.keys(ownedDecoCounts).length > 0;
  const ownedRampageOrNormalDecos = DECORATIONS_DB.filter((d) =>
    ownedDecoSet.has(d.id)
  );

  const templates = META_BUILD_TEMPLATES.filter((t) => {
    if (weaponFilter !== 'All' && t.weaponClass !== weaponFilter) return false;
    if (stageFilter !== 'All' && t.rankTier !== stageFilter) return false;
    return true;
  });

  return templates
    .map((template) => {
      const fullTemplateLoadout: BuildLoadout = {
        ...template.loadout,
        id: template.id,
        updatedAt: new Date().toISOString(),
      };
      const templateStats = calculateBuildStats(fullTemplateLoadout);
      const rankEligible =
        profile.mr >= template.minMr && profile.ar >= template.minAr;

      const weapon = getWeaponById(template.loadout.weaponId) ?? WEAPONS_DB[0];
      const helm = getArmorById(template.loadout.helmId) ?? ARMOR_DB[0];
      const chest = getArmorById(template.loadout.chestId) ?? ARMOR_DB[0];
      const arms = getArmorById(template.loadout.armsId) ?? ARMOR_DB[0];
      const waist = getArmorById(template.loadout.waistId) ?? ARMOR_DB[0];
      const legs = getArmorById(template.loadout.legsId) ?? ARMOR_DB[0];

      // Pull synced weapon: use template weapon if owned, otherwise substitute best matching owned weapon
      let adaptedWeapon = weapon;
      let weaponOwnedInBox = ownedWeaponSet.has(weapon.id);
      let substitutedWeapon = false;

      if (!weaponOwnedInBox) {
        const classOwnedWeapons = WEAPONS_DB.filter(
          (w) => w.weaponClass === template.weaponClass && ownedWeaponSet.has(w.id)
        ).sort(
          (a, b) =>
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
        { owned: ownedArmorSet.has(helm.id), name: helm.name },
        { owned: ownedArmorSet.has(chest.id), name: chest.name },
        { owned: ownedArmorSet.has(arms.id), name: arms.name },
        { owned: ownedArmorSet.has(waist.id), name: waist.name },
        { owned: ownedArmorSet.has(legs.id), name: legs.name },
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
      const remainingTemplateCounts: Record<string, number> = { ...ownedDecoCounts };

      for (const id of templateDecoIds) {
        if (!ownedDecoSet.has(id)) {
          missingDecoSet.add(getDecorationById(id)?.name ?? id);
        } else if (hasDecoCounts) {
          if ((remainingTemplateCounts[id] ?? 0) > 0) {
            ownedDecoCount++;
            remainingTemplateCounts[id]--;
          } else {
            missingDecoSet.add(getDecorationById(id)?.name ?? id);
          }
        } else {
          ownedDecoCount++;
        }
      }

      const decoOwnershipPercent =
        totalDecoCount === 0 ? 100 : Math.round((ownedDecoCount / totalDecoCount) * 100);
      const missingDecoNames = Array.from(missingDecoSet);

      // Adapt template loadout with player's synced weapon, best owned talisman, and strictly owned decorations
      const bestOwnedTalisman = pickBestOwnedTalisman(inventory.talismans, adaptedWeapon);
      const talismanToUse: TalismanItem = bestOwnedTalisman ?? {
        id: 'tal_empty',
        name: 'No Owned Talisman',
        skill1Id: '',
        skill1Level: 0,
        skill2Id: '',
        skill2Level: 0,
        slots: [0, 0, 0],
        source: 'Custom',
      };

      const weights = getSkillWeightsForWeapon(adaptedWeapon);
      const adaptedDecos = slotOptimalDecorations(
        adaptedWeapon,
        { Helm: helm, Chest: chest, Arms: arms, Waist: waist, Legs: legs },
        talismanToUse,
        ownedRampageOrNormalDecos,
        weights,
        {
          preferredDecoIds: templateDecoIds,
          ownedDecoCounts,
          includeCraftable: false,
        }
      );

      const adaptedRampage = ownedDecoSet.has(template.loadout.rampageDecoId)
        ? template.loadout.rampageDecoId
        : chooseBestRampageDeco(adaptedWeapon, ownedDecoSet);

      const armorSkills: Record<string, number> = {};
      for (const piece of [helm, chest, arms, waist, legs]) {
        for (const [sk, pts] of Object.entries(piece.skills)) {
          armorSkills[sk] = (armorSkills[sk] ?? 0) + pts;
        }
      }

      const adaptedLoadout: BuildLoadout = {
        ...template.loadout,
        id: `owned_${template.id}_${adaptedWeapon.id}`,
        name: `${template.title} (Your Box)`,
        weaponId: adaptedWeapon.id,
        talisman: talismanToUse,
        rampageDecoId: adaptedRampage,
        decorations: adaptedDecos,
        scrollMode: substitutedWeapon
          ? chooseBestScrollMode(adaptedWeapon, armorSkills, talismanToUse)
          : template.loadout.scrollMode,
        updatedAt: new Date().toISOString(),
      };
      const adaptedStats = calculateBuildStats(adaptedLoadout);

      const crafting = calculateBuildCraftingSummary(adaptedLoadout, inventory);
      const missingMaterials = crafting.consolidatedMaterials
        .filter((m) => m.shortfall > 0)
        .map((m) => ({
          name: m.name,
          shortfall: m.shortfall,
          source: m.source,
        }));
      const craftableGearCount = crafting.pieceBreakdowns.filter(
        (p) => p.slotLabel !== 'Decoration' && !p.owned && p.readyToCraft
      ).length;
      const craftableWithMaterials = missingMaterials.length === 0;

      let readiness: OwnedReadiness = 'partial';
      if (ownedGearCount === 6) {
        readiness = 'ready';
      } else if (craftableWithMaterials) {
        readiness = 'craftable';
      }

      return {
        template,
        templateStats,
        adaptedWeapon,
        weaponOwnedInBox,
        substitutedWeapon,
        adaptedLoadout,
        adaptedStats,
        bestOwnedTalisman,
        readiness,
        rankEligible,
        ownedGearCount,
        totalGearCount,
        gearOwnershipPercent,
        ownedDecoCount,
        totalDecoCount,
        decoOwnershipPercent,
        craftableGearCount,
        missingGearNames,
        missingDecoNames,
        craftableWithMaterials,
        missingMaterials,
      };
    })
    .sort((a, b) => {
      const order: Record<OwnedReadiness, number> = {
        ready: 0,
        craftable: 1,
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
    score += w * pts;
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
    slotSum
  );
}

function computeFunctionalUtilityBonus(
  weapon: WeaponItem,
  skills: Record<string, number>,
  weights: Record<string, number>
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
    'intrepid_heart',
    'power_prolonger',
    'slugger',
    'embolden',
    'berserk',
  ];
  for (const sk of utilityKeys) {
    const lv = skills[sk] ?? 0;
    const w = weights[sk] ?? 0;
    if (lv > 0 && w > 0) {
      bonus += lv * w * 1.4;
    }
  }
  // Extra reward for Gunlance / CB artillery + load shells synergy
  if (weapon.weaponClass === 'Gunlance') {
    bonus += (skills.artillery ?? 0) * 18 + (skills.load_shells ?? 0) * 15;
  }
  return bonus;
}

export function synthesizeOwnedBoxBuilds(
  inventory: InventoryState,
  options?: {
    weaponClassFilter?: string;
    includeCraftable?: boolean;
    maxBuilds?: number;
  }
): SynthesizeBoxResult {
  const weaponClassFilter = options?.weaponClassFilter ?? 'All';
  const includeCraftable = options?.includeCraftable ?? false;
  const maxBuilds = options?.maxBuilds ?? 48;

  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedDecoSet = new Set(inventory.ownedDecoIds);
  const ownedDecoCounts = inventory.ownedDecoCounts ?? {};
  const materials = inventory.materials ?? {};

  const candidateWeapons = WEAPONS_DB.filter((w) => {
    if (weaponClassFilter !== 'All' && w.weaponClass !== weaponClassFilter) {
      return false;
    }
    if (ownedWeaponSet.has(w.id)) return true;
    return includeCraftable && isRecipeCraftable('weapon', w.id, materials);
  });

  const armorBySlot: Record<ArmorSlot, ArmorItem[]> = {
    Helm: [],
    Chest: [],
    Arms: [],
    Waist: [],
    Legs: [],
  };

  for (const a of ARMOR_DB) {
    const allowed =
      ownedArmorSet.has(a.id) ||
      (includeCraftable && isRecipeCraftable('armor', a.id, materials));
    if (allowed) {
      armorBySlot[a.slot].push(a);
    }
  }

  const missingArmorSlots = (['Helm', 'Chest', 'Arms', 'Waist', 'Legs'] as ArmorSlot[]).filter(
    (s) => armorBySlot[s].length === 0
  );

  const allowedDecos = DECORATIONS_DB.filter(
    (d) =>
      ownedDecoSet.has(d.id) ||
      (includeCraftable && isRecipeCraftable('decoration', d.id, materials))
  );
  const allowedDecoSet = new Set(allowedDecos.map((d) => d.id));

  if (candidateWeapons.length === 0 || missingArmorSlots.length > 0) {
    return {
      builds: [],
      missingArmorSlots,
      ownedWeaponCount: inventory.ownedWeaponIds.length,
      ownedArmorCount: inventory.ownedArmorIds.length,
      ownedDecoCount: inventory.ownedDecoIds.length,
      ownedTalismanCount: inventory.talismans.length,
    };
  }

  const byClass = new Map<WeaponClass, WeaponItem[]>();
  for (const w of candidateWeapons) {
    const arr = byClass.get(w.weaponClass) ?? [];
    arr.push(w);
    byClass.set(w.weaponClass, arr);
  }

  const selectedWeapons: WeaponItem[] = [];
  const perClassLimit = weaponClassFilter === 'All' ? 4 : 24;
  for (const [, list] of byClass) {
    const sorted = [...list].sort(
      (a, b) => scoreWeaponForSelection(b) - scoreWeaponForSelection(a)
    );
    selectedWeapons.push(...sorted.slice(0, perClassLimit));
  }

  const builds: SynthesizedBoxBuild[] = [];

  for (const weapon of selectedWeapons) {
    const weights = getSkillWeightsForWeapon(weapon);
    const bestTalisman =
      pickBestOwnedTalisman(inventory.talismans, weapon) ?? {
        id: 'tal_none',
        name: 'No Talisman in Box',
        skill1Id: '',
        skill1Level: 0,
        skill2Id: '',
        skill2Level: 0,
        slots: [0, 0, 0],
        source: 'Custom',
      };

    // Rank top 5 armor pieces per slot strictly by relevant skills + slots
    const topSlotPieces: Record<ArmorSlot, ArmorItem[]> = {
      Helm: [...armorBySlot.Helm]
        .sort(
          (a, b) =>
            scoreArmorPieceForWeapon(b, weapon, weights) -
            scoreArmorPieceForWeapon(a, weapon, weights)
        )
        .slice(0, 5),
      Chest: [...armorBySlot.Chest]
        .sort(
          (a, b) =>
            scoreArmorPieceForWeapon(b, weapon, weights) -
            scoreArmorPieceForWeapon(a, weapon, weights)
        )
        .slice(0, 5),
      Arms: [...armorBySlot.Arms]
        .sort(
          (a, b) =>
            scoreArmorPieceForWeapon(b, weapon, weights) -
            scoreArmorPieceForWeapon(a, weapon, weights)
        )
        .slice(0, 5),
      Waist: [...armorBySlot.Waist]
        .sort(
          (a, b) =>
            scoreArmorPieceForWeapon(b, weapon, weights) -
            scoreArmorPieceForWeapon(a, weapon, weights)
        )
        .slice(0, 5),
      Legs: [...armorBySlot.Legs]
        .sort(
          (a, b) =>
            scoreArmorPieceForWeapon(b, weapon, weights) -
            scoreArmorPieceForWeapon(a, weapon, weights)
        )
        .slice(0, 5),
    };

    // Evaluate combinations and collect top 6 candidates to verify with full stats & decos
    type ComboCandidate = {
      combo: Record<ArmorSlot, ArmorItem>;
      heuristicScore: number;
    };
    const topCombos: ComboCandidate[] = [];

    for (const helm of topSlotPieces.Helm) {
      for (const chest of topSlotPieces.Chest) {
        for (const arms of topSlotPieces.Arms) {
          for (const waist of topSlotPieces.Waist) {
            for (const legs of topSlotPieces.Legs) {
              const skillTotals: Record<string, number> = {};
              const pieces = [helm, chest, arms, waist, legs];
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

              const ctxWeights = refineWeightsForContext(
                weights,
                weapon,
                skillTotals,
                bestTalisman
              );

              let skillScore = 0;
              for (const [sk, rawPts] of Object.entries(skillTotals)) {
                const maxLv = getSkillById(sk)?.maxLevel ?? 7;
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

              const total = skillScore + slotScore;
              if (
                topCombos.length < 6 ||
                total > topCombos[topCombos.length - 1].heuristicScore
              ) {
                topCombos.push({
                  combo: { Helm: helm, Chest: chest, Arms: arms, Waist: waist, Legs: legs },
                  heuristicScore: total,
                });
                topCombos.sort((a, b) => b.heuristicScore - a.heuristicScore);
                if (topCombos.length > 6) topCombos.pop();
              }
            }
          }
        }
      }
    }

    if (topCombos.length === 0) continue;

    const rampageDecoId = chooseBestRampageDeco(weapon, allowedDecoSet);
    const elemFactor =
      weapon.weaponClass === 'Dual Blades' ||
      weapon.weaponClass === 'Bow' ||
      weapon.weaponClass === 'Charge Blade'
        ? 1.85
        : 1.15;

    let bestEvaluated: {
      combo: Record<ArmorSlot, ArmorItem>;
      loadout: BuildLoadout;
      stats: CalculatedBuildStats;
      decorations: BuildLoadout['decorations'];
      score: number;
    } | null = null;

    for (const candidate of topCombos) {
      const armorSkills: Record<string, number> = {};
      for (const p of Object.values(candidate.combo)) {
        for (const [sk, pts] of Object.entries(p.skills)) {
          armorSkills[sk] = (armorSkills[sk] ?? 0) + pts;
        }
      }

      const scrollMode = chooseBestScrollMode(weapon, armorSkills, bestTalisman);
      const decorations = slotOptimalDecorations(
        weapon,
        candidate.combo,
        bestTalisman,
        allowedDecos,
        weights,
        {
          ownedDecoCounts,
          includeCraftable,
          materials,
        }
      );

      const loadout: BuildLoadout = {
        id: `box_opt_${weapon.id}`,
        name: `${weapon.name} (Box Optimized)`,
        weaponClass: weapon.weaponClass,
        weaponId: weapon.id,
        helmId: candidate.combo.Helm.id,
        chestId: candidate.combo.Chest.id,
        armsId: candidate.combo.Arms.id,
        waistId: candidate.combo.Waist.id,
        legsId: candidate.combo.Legs.id,
        talisman: bestTalisman,
        rampageDecoId,
        decorations,
        quriousWeapon: { ...EMPTY_Q_WEAPON },
        quriousArmor: {
          Helm: { ...EMPTY_ARMOR_AUGMENT },
          Chest: { ...EMPTY_ARMOR_AUGMENT },
          Arms: { ...EMPTY_ARMOR_AUGMENT },
          Waist: { ...EMPTY_ARMOR_AUGMENT },
          Legs: { ...EMPTY_ARMOR_AUGMENT },
        },
        scrollMode,
        updatedAt: new Date().toISOString(),
      };

      const stats = calculateBuildStats(loadout);
      const utilityBonus = computeFunctionalUtilityBonus(weapon, stats.skills, weights);
      const evalScore = Math.round(
        stats.effectiveRaw + stats.effectiveElement * elemFactor + utilityBonus * 0.45
      );

      if (!bestEvaluated || evalScore > bestEvaluated.score) {
        bestEvaluated = {
          combo: candidate.combo,
          loadout,
          stats,
          decorations,
          score: evalScore,
        };
      }
    }

    if (!bestEvaluated) continue;

    const { combo: bestCombo, loadout, stats, decorations, score } = bestEvaluated;

    const allSlots = [
      ...weapon.slots,
      ...bestCombo.Helm.slots,
      ...bestCombo.Chest.slots,
      ...bestCombo.Arms.slots,
      ...bestCombo.Waist.slots,
      ...bestCombo.Legs.slots,
      ...bestTalisman.slots,
    ].filter((s) => s > 0);
    const decoSlotsTotal = allSlots.length;
    const decoSlotsFilled = Object.values(decorations)
      .flat()
      .filter((id) => Boolean(id)).length;

    const craftablePieces: SynthesizedBoxBuild['craftablePieces'] = [];
    if (!ownedWeaponSet.has(weapon.id)) {
      const rec = getEquipmentRecipe('weapon', weapon.id);
      if (rec) {
        craftablePieces.push({
          slotLabel: 'Weapon',
          itemId: weapon.id,
          itemName: weapon.name,
          zennyCost: rec.zennyCost,
          materials: rec.materials,
        });
      }
    }
    for (const slot of ['Helm', 'Chest', 'Arms', 'Waist', 'Legs'] as ArmorSlot[]) {
      const piece = bestCombo[slot];
      if (!ownedArmorSet.has(piece.id)) {
        const rec = getEquipmentRecipe('armor', piece.id);
        if (rec) {
          craftablePieces.push({
            slotLabel: slot,
            itemId: piece.id,
            itemName: piece.name,
            zennyCost: rec.zennyCost,
            materials: rec.materials,
          });
        }
      }
    }

    const topSkills = Object.entries(stats.skills)
      .filter(([sk]) => (weights[sk] ?? 0) > 0)
      .sort((a, b) => (weights[b[0]] ?? 0) * b[1] - (weights[a[0]] ?? 0) * a[1])
      .slice(0, 6)
      .map(([sk, lv]) => `${getSkillById(sk)?.name ?? sk} ${lv}`);

    builds.push({
      id: `synth_${weapon.id}`,
      title: `${weapon.name} Box Set`,
      weaponClass: weapon.weaponClass,
      weapon,
      loadout,
      stats,
      score,
      usesCraftablePieces: craftablePieces.length > 0,
      craftablePieces,
      talismanUsed: bestTalisman,
      decoSlotsFilled,
      decoSlotsTotal,
      missingSkillHighlights: topSkills,
    });
  }

  builds.sort((a, b) => b.score - a.score || b.stats.effectiveRaw - a.stats.effectiveRaw);

  return {
    builds: builds.slice(0, maxBuilds),
    missingArmorSlots: [],
    ownedWeaponCount: inventory.ownedWeaponIds.length,
    ownedArmorCount: inventory.ownedArmorIds.length,
    ownedDecoCount: inventory.ownedDecoIds.length,
    ownedTalismanCount: inventory.talismans.length,
  };
}
