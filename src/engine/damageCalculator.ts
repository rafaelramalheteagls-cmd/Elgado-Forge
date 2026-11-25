import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getMonsterById,
  getSkillById,
  getWeaponById,
  META_BUILD_TEMPLATES,
  MONSTERS_DB,
  SKILLS_DB,
  WEAPON_COMBOS_DB,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { AFFINITY_SKILL_EFFECTS, getMinimumCraftingMr } from '../data/mhriceAdapter';
import { elementExploitMultiplier, estimateChargeBladeSaedPhials, estimateGunlanceFullBurst, getBowgunMagazineCycleSeconds, getBowShotProfile, getPrimaryBowgunAmmo, getRecommendedShot, sneakAttackMultiplier, supportsOffensiveGuard } from '../data/weaponMechanics';
import {
  ArmorSlot,
  BuildLoadout,
  CalculatedBuildStats,
  HunterProfile,
  InventoryState,
  MetaBuildTemplate,
  RankTier,
  SharpnessTier,
  SimulationConfig,
  SimulationResult,
  TalismanItem,
  WeaponItem,
} from '../types/sunbreak';

export const RANK_TIERS: RankTier[] = [
  'LR',
  'HR',
  'MR',
  'Early MR',
  'Story MR',
  'MR 10+',
  'Endgame AR',
];

export function getHunterProgressionStage(mr: number, ar: number): RankTier {
  if (mr <= 0) return 'HR';
  if (mr <= 3) return 'Early MR';
  if (mr <= 9) return 'Story MR';
  if (ar < 50) return 'MR 10+';
  return 'Endgame AR';
}

export const SHARPNESS_MODIFIERS: Record<SharpnessTier, { raw: number; elem: number }> = {
  Red: { raw: 0.5, elem: 0.25 },
  Orange: { raw: 0.75, elem: 0.5 },
  Yellow: { raw: 1.0, elem: 0.75 },
  Green: { raw: 1.05, elem: 1.0 },
  Blue: { raw: 1.2, elem: 1.0625 },
  White: { raw: 1.32, elem: 1.15 },
  Purple: { raw: 1.39, elem: 1.25 },
};

const SHARPNESS_ORDER: SharpnessTier[] = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'White',
  'Purple',
];

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  monsterId: 'mon_primordial_malzeno',
  partName: 'Head',
  monsterState: 'Enraged',
  comboId: 'combo_ls_harvest',
  wexUptime: 90,
  agitatorUptime: 75,
  bloodlustCleared: true,
  derelictionQurio: 3,
  frostcraftGauge: 3,
  burstActive: true,
  coalescenceActive: true,
  powercharmTalon: true,
  dangoBooster: true,
};

export function resolveWeaponSlots(loadout: BuildLoadout): [number, number, number] {
  const weapon = getWeaponById(loadout.weaponId);
  if (!weapon) return [0, 0, 0];
  return [...weapon.slots];
}

export function resolveArmorSlots(
  armorId: string,
  slotUpgrade: number
): [number, number, number] {
  const piece = getArmorById(armorId);
  if (!piece) return [0, 0, 0];
  const base = [...piece.slots] as [number, number, number];
  let rem = slotUpgrade;
  for (let i = 0; i < 3 && rem > 0; i++) {
    if (base[i] === 0) {
      base[i] = 1;
      rem -= 1;
    } else if (base[i] < 4) {
      const bump = Math.min(4 - base[i], rem);
      base[i] += bump;
      rem -= bump;
    }
  }
  return base;
}

const ARMOR_LOADOUT_SLOTS = [
  ['helm', 'Helm', 'helmId'],
  ['chest', 'Chest', 'chestId'],
  ['arms', 'Arms', 'armsId'],
  ['waist', 'Waist', 'waistId'],
  ['legs', 'Legs', 'legsId'],
] as const;

export function resolveDecorationSlots(loadout: BuildLoadout) {
  return {
    weapon: resolveWeaponSlots(loadout),
    helm: resolveArmorSlots(loadout.helmId, loadout.quriousArmor?.Helm?.slotUpgrade ?? 0),
    chest: resolveArmorSlots(loadout.chestId, loadout.quriousArmor?.Chest?.slotUpgrade ?? 0),
    arms: resolveArmorSlots(loadout.armsId, loadout.quriousArmor?.Arms?.slotUpgrade ?? 0),
    waist: resolveArmorSlots(loadout.waistId, loadout.quriousArmor?.Waist?.slotUpgrade ?? 0),
    legs: resolveArmorSlots(loadout.legsId, loadout.quriousArmor?.Legs?.slotUpgrade ?? 0),
    talisman: loadout.talisman.slots,
  };
}

export function decorationFits(id: string, slotLevel: number, rampage = false): boolean {
  const deco = getDecorationById(id);
  return Boolean(deco && Boolean(deco.isRampage) === rampage && deco.slotLevel <= slotLevel);
}

export function resolveRampageSlot(weapon: WeaponItem | undefined, upgrade = 0): number {
  const base = weapon?.rampageSlot ?? 0;
  return base > 0 ? Math.min(3, base + Math.max(0, Math.min(2, Math.trunc(upgrade) || 0))) : 0;
}

export function rampageDecorationFits(id: string, weapon: WeaponItem | undefined, upgrade = 0): boolean {
  const deco = id ? getDecorationById(id) : undefined;
  return Boolean(weapon && deco?.isRampage && deco.slotLevel <= resolveRampageSlot(weapon, upgrade)
    && (deco.rampageWeaponClasses?.includes(weapon.weaponClass) ?? true));
}

function uniqueCatalogMatch<T extends { id: string; name: string }>(
  items: T[],
  item: T | undefined,
  sameKind: (a: T, b: T) => boolean
): string | undefined {
  if (!item) return undefined;
  if (items.some((candidate) => candidate.id === item.id)) return item.id;
  const matches = items.filter((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase() && sameKind(candidate, item));
  return matches.length === 1 ? matches[0].id : undefined;
}

const catalogWeaponId = (id: string) => uniqueCatalogMatch(WEAPONS_DB, getWeaponById(id), (a, b) => a.weaponClass === b.weaponClass);
export function resolveMechanicsWeapon(weapon: WeaponItem): WeaponItem {
  return weapon.sourceDetails ? weapon : getWeaponById(catalogWeaponId(weapon.id) ?? '') ?? weapon;
}
// Legacy labels differ from the English names in these MHRice series and slots.
const LEGACY_ARMOR_SOURCE_IDS = new Map([
  ['arms_hermitaur_x', 'armor:arm:386'],
  ['waist_hermitaur_x', 'armor:waist:386'],
  ['arms_gore_x', 'armor:arm:389'],
  ['helm_violet_mizu', 'armor:head:394'],
  ['arms_violet_mizu', 'armor:arm:394'],
  ['waist_violet_mizu', 'armor:waist:394'],
  ['chest_risen_mizuha', 'armor:chest:491'],
]);
const catalogArmorId = (id: string) => uniqueCatalogMatch(
  ARMOR_DB, getArmorById(LEGACY_ARMOR_SOURCE_IDS.get(id) ?? id), (a, b) => a.slot === b.slot
);
const catalogDecoId = (id: string) => uniqueCatalogMatch(DECORATIONS_DB, getDecorationById(id),
  (a, b) => a.slotLevel === b.slotLevel && Boolean(a.isRampage) === Boolean(b.isRampage));

export const EMPTY_RECOMMENDATION_TALISMAN: TalismanItem = {
  id: 'tal_none',
  name: 'No Talisman Equipped',
  skill1Id: '',
  skill1Level: 0,
  skill2Id: '',
  skill2Level: 0,
  slots: [0, 0, 0],
  source: 'Custom',
};

export function resolveRecommendationInventory(inventory: InventoryState): InventoryState {
  const ownedDecoCounts: Record<string, number> = {};
  for (const [id, count] of Object.entries(inventory.ownedDecoCounts ?? {})) {
    const resolved = catalogDecoId(id) ?? id;
    ownedDecoCounts[resolved] = Math.max(ownedDecoCounts[resolved] ?? 0, count);
  }
  return {
    ...inventory,
    ownedWeaponIds: [...new Set(inventory.ownedWeaponIds.map((id) => catalogWeaponId(id) ?? id))],
    ownedArmorIds: [...new Set(inventory.ownedArmorIds.map((id) => catalogArmorId(id) ?? id))],
    ownedDecoIds: [...new Set(inventory.ownedDecoIds.map((id) => catalogDecoId(id) ?? id))],
    ownedDecoCounts,
    talismans: inventory.talismans.filter((talisman) => talisman.source !== 'Preset'),
  };
}

export const RECOMMENDATION_TEMPLATES = META_BUILD_TEMPLATES.flatMap((template) => {
  const original = template.loadout;
  const weaponId = catalogWeaponId(original.weaponId);
  const helmId = catalogArmorId(original.helmId);
  const chestId = catalogArmorId(original.chestId);
  const armsId = catalogArmorId(original.armsId);
  const waistId = catalogArmorId(original.waistId);
  const legsId = catalogArmorId(original.legsId);
  if (!weaponId || !helmId || !chestId || !armsId || !waistId || !legsId) return [];

  const loadout: BuildLoadout = {
    ...original, id: template.id, updatedAt: '', weaponId, helmId, chestId, armsId, waistId, legsId,
    talisman: EMPTY_RECOMMENDATION_TALISMAN,
  };
  const slots = resolveDecorationSlots(loadout);
  const decorations = { ...loadout.decorations };
  for (const key of Object.keys(slots) as Array<keyof typeof slots>) {
    decorations[key] = decorations[key].map((id, index) => {
      const resolved = id ? catalogDecoId(id) : undefined;
      return resolved && decorationFits(resolved, slots[key][index] ?? 0) ? resolved : '';
    });
  }
  const rampage = catalogDecoId(original.rampageDecoId);
  const rampageDecoId = rampage && rampageDecorationFits(rampage, getWeaponById(weaponId), original.quriousWeapon?.extraSlotLevel) ? rampage : '';
  return [{ ...template, loadout: { ...loadout, decorations, rampageDecoId } }];
});

export function aggregateBuildSkills(loadout: BuildLoadout): {
  skills: Record<string, number>;
  overcapped: string[];
} {
  const rawTotals: Record<string, number> = {};

  const addSkill = (id: string, pts: number) => {
    if (!id || pts <= 0) return;
    rawTotals[id] = (rawTotals[id] ?? 0) + pts;
  };

  for (const [, slot, idKey] of ARMOR_LOADOUT_SLOTS) {
    const piece = getArmorById(loadout[idKey]);
    const qAug = loadout.quriousArmor?.[slot];
    if (piece) {
      for (const [skillId, pts] of Object.entries(piece.skills)) {
        addSkill(skillId, pts - Number(qAug?.skillRemovedId === skillId));
      }
    }
    if (qAug?.skillAddedId && qAug.skillAddedPoints > 0) {
      addSkill(qAug.skillAddedId, qAug.skillAddedPoints);
    }
  }

  // Talisman
  if (loadout.talisman.skill1Id && loadout.talisman.skill1Level > 0) {
    addSkill(loadout.talisman.skill1Id, loadout.talisman.skill1Level);
  }
  if (loadout.talisman.skill2Id && loadout.talisman.skill2Level > 0) {
    addSkill(loadout.talisman.skill2Id, loadout.talisman.skill2Level);
  }

  // Decorations across all slots
  const slots = resolveDecorationSlots(loadout);
  for (const key of Object.keys(slots) as Array<keyof typeof slots>) {
    for (const [index, decoId] of loadout.decorations[key].entries()) {
      const deco = getDecorationById(decoId);
      if (deco && !deco.isRampage && deco.slotLevel <= (slots[key][index] ?? 0)) {
        for (const skill of deco.sourceSkills ?? [{ skillId: deco.skillId, level: deco.points }]) {
          addSkill(skill.skillId, skill.level);
        }
      }
    }
  }

  const capped: Record<string, number> = {};
  const overcapped: string[] = [];

  for (const [id, pts] of Object.entries(rawTotals)) {
    const def = getSkillById(id);
    const max = def?.maxLevel ?? 7;
    if (pts > max) {
      overcapped.push(id);
      capped[id] = max;
    } else {
      capped[id] = pts;
    }
  }

  return { skills: capped, overcapped };
}

export function resolveSharpness(
  weaponSharpness: SharpnessTier,
  handicraftLv: number,
  bonusSharpness?: SharpnessTier,
  threshold = 2,
  quriousSharpnessBoost = false
): SharpnessTier {
  if (weaponSharpness === 'Purple') return 'Purple';
  if (bonusSharpness && handicraftLv >= threshold) return bonusSharpness;
  if (quriousSharpnessBoost && handicraftLv >= 1) {
    const idx = SHARPNESS_ORDER.indexOf(weaponSharpness);
    return SHARPNESS_ORDER[Math.min(SHARPNESS_ORDER.length - 1, idx + 1)];
  }
  return weaponSharpness;
}

export function calculateBuildStats(
  loadout: BuildLoadout,
  simOverrides?: Partial<SimulationConfig>
): CalculatedBuildStats {
  const weapon = getWeaponById(loadout.weaponId) ?? WEAPONS_DB[0];
  const { skills, overcapped } = aggregateBuildSkills(loadout);
  const cfg = { ...DEFAULT_SIM_CONFIG, ...simOverrides };

  const activeEndgameEffects: string[] = [];

  // Base Raw + Qurious Weapon Attack
  const qAtk = (loadout.quriousWeapon?.attackLevel ?? 0) * 5;
  const qElem = (loadout.quriousWeapon?.elementLevel ?? 0) * 4;
  const qAff =
    loadout.quriousWeapon?.affinityLevel === 1
      ? 5
      : loadout.quriousWeapon?.affinityLevel === 2
      ? 10
      : loadout.quriousWeapon?.affinityLevel === 3
      ? 15
      : 0;

  let baseRaw = weapon.raw + qAtk;
  let flatRawBonus = 0;
  let rawMult = 1.0;

  // Powercharm (+6) + Powertalon (+9)
  if (cfg.powercharmTalon) {
    flatRawBonus += 15;
  }
  // Dango Booster Lv3 / Mega Demondrug
  if (cfg.dangoBooster) {
    flatRawBonus += 16;
  }

  // Attack Boost
  const ab = skills['attack_boost'] ?? 0;
  const abFlat = [0, 3, 6, 9, 7, 8, 9, 10][ab] ?? 0;
  const abMult = [1.0, 1.0, 1.0, 1.0, 1.05, 1.06, 1.08, 1.1][ab] ?? 1.0;
  rawMult *= abMult;
  flatRawBonus += abFlat;

  // Agitator
  const agi = skills['agitator'] ?? 0;
  const agiUptime = cfg.monsterState === 'Enraged' ? 1 : Math.min(1, Math.max(0, (cfg.agitatorUptime ?? 75) / 100));
  const agiRaw = AFFINITY_SKILL_EFFECTS.agitatorAttack[agi] ?? 0;
  const agiAff = AFFINITY_SKILL_EFFECTS.agitator[agi] ?? 0;
  const averageEnrage = (inactive: number, active: number) => inactive * (1 - agiUptime) + active * agiUptime;

  // Resentment
  const res = skills['resentment'] ?? 0;
  const hasRedHealth =
    (skills['berserk'] ?? 0) > 0 && loadout.scrollMode === 'Blue'
      ? true
      : (skills['dereliction'] ?? 0) > 0 || (skills['bloodlust'] ?? 0) > 0;
  if (res > 0 && hasRedHealth) {
    flatRawBonus += [0, 5, 10, 15, 20, 25][res] ?? 0;
  }

  // Peak Performance
  const pp = skills['peak_performance'] ?? 0;
  if (pp > 0 && !hasRedHealth) {
    flatRawBonus += [0, 5, 10, 20][pp] ?? 0;
  }

  const og = skills['offensive_guard'] ?? 0;
  const guardUptime = Math.min(1, Math.max(0, (cfg.offensiveGuardUptime ?? 70) / 100));
  if (og > 0 && guardUptime > 0 && supportsOffensiveGuard(weapon.weaponClass)) {
    const ogBonus = [1.0, 1.05, 1.1, 1.15][og] ?? 1.0;
    rawMult *= 1 + (ogBonus - 1) * guardUptime;
    activeEndgameEffects.push(`Offensive Guard Lv${og} (+${Math.round((ogBonus - 1) * 100)}% proc)`);
  }

  // Adrenaline Rush
  const adr = skills['adrenaline_rush'] ?? 0;
  if (adr > 0) {
    const adrAtk = [0, 10, 15, 30][adr] ?? 0;
    flatRawBonus += Math.round(adrAtk * 0.75);
    activeEndgameEffects.push(`Adrenaline Rush Lv${adr} (+${adrAtk} Raw)`);
  }

  // Resuscitate (pairs with Bloodlust)
  const resus = skills['resuscitate'] ?? 0;
  if (resus > 0 && (skills['bloodlust'] ?? 0) > 0) {
    const rAtk = [0, 5, 10, 20][resus] ?? 0;
    flatRawBonus += Math.round(rAtk * 0.5);
  }

  // Foray (active on Poison/Para weapons)
  const foray = skills['foray'] ?? 0;
  let forayAff = 0;
  if (foray > 0 && (weapon.elementType === 'Poison' || weapon.elementType === 'Paralysis')) {
    const fAtk = [0, 10, 10, 15][foray] ?? 0;
    forayAff = [0, 0, 10, 20][foray] ?? 0;
    flatRawBonus += Math.round(fAtk * 0.75);
    activeEndgameEffects.push(`Foray Lv${foray} (+${fAtk} Raw / +${forayAff}% Aff)`);
  }

  // Sneak Attack (rear bonus averaged)
  const sneak = skills['sneak_attack'] ?? 0;
  if (sneak > 0) {
    rawMult *= sneakAttackMultiplier(sneak);
  }

  // Gunner Shot-Type & Rapid Fire multipliers
  const shotWeapon = weapon.damageType === 'Shot' ? resolveMechanicsWeapon(weapon) : weapon;
  const shot = getRecommendedShot(shotWeapon, (skills.bow_charge_plus ?? 0) > 0, loadout.bowgunAmmo);
  let shotRawMultiplier = 1;
  if (shot) {
    const ammoUpLv = skills[shot.skillId] ?? 0;
    if (ammoUpLv > 0) {
      const shotMult = [1.0, 1.05, 1.1, 1.2][ammoUpLv] ?? 1.0;
      shotRawMultiplier *= shotMult;
      activeEndgameEffects.push(`Shot Type Up Lv${ammoUpLv} (+${Math.round((shotMult - 1) * 100)}%)`);
    }
    const rfLv = skills['rapid_fire_up'] ?? 0;
    if (shot.rapidFire && rfLv > 0) {
      const rfMult = [1.0, 1.05, 1.1, 1.2][rfLv] ?? 1.0;
      shotRawMultiplier *= rfMult;
      activeEndgameEffects.push(`Rapid Fire Up Lv${rfLv} (+${Math.round((rfMult - 1) * 100)}%)`);
    }
  }

  // Mail of Hellfire
  const moh = skills['mail_of_hellfire'] ?? 0;
  let mohElemMult = 1.0;
  let mohDefDelta = 0;
  let mohResDelta = 0;
  if (moh > 0) {
    if (loadout.scrollMode === 'Red') {
      const bonus = [0, 15, 25, 35][moh] ?? 0;
      flatRawBonus += bonus;
      mohDefDelta = [0, -50, -75, -100][moh] ?? 0;
      activeEndgameEffects.push(`Mail of Hellfire Lv${moh} (Red: +${bonus} Raw)`);
    } else {
      mohElemMult = [1.0, 1.05, 1.1, 1.2][moh] ?? 1.0;
      mohResDelta = [0, -10, -25, -50][moh] ?? 0;
      activeEndgameEffects.push(
        `Mail of Hellfire Lv${moh} (Blue: +${Math.round((mohElemMult - 1) * 100)}% Elem)`
      );
    }
  }

  // Dereliction
  const der = skills['dereliction'] ?? 0;
  let derElemFlat = 0;
  if (der > 0) {
    const qCount = cfg.derelictionQurio ?? 3;
    if (loadout.scrollMode === 'Blue') {
      const perQ = [0, 15, 20, 25][der] ?? 0;
      const bonus = perQ + (qCount - 1) * 5;
      flatRawBonus += bonus;
      activeEndgameEffects.push(`Dereliction Lv${der} (Blue: +${bonus} Raw)`);
    } else {
      const baseE = [0, 5, 8, 12][der] ?? 0;
      derElemFlat = baseE + (qCount - 1) * 4;
      activeEndgameEffects.push(`Dereliction Lv${der} (Red: +${derElemFlat} Elem)`);
    }
  }

  // Bloodlust
  const bl = skills['bloodlust'] ?? 0;
  let blAff = 0;
  if (bl > 0) {
    if (cfg.bloodlustCleared) {
      blAff = [0, 20, 20, 20][bl] ?? 20;
      activeEndgameEffects.push(`Bloodlust Lv${bl} Cleared (+20% Affinity)`);
    } else {
      const fAtk = [0, 10, 15, 20][bl] ?? 0;
      flatRawBonus += fAtk;
      activeEndgameEffects.push(`Bloodlust Lv${bl} Active (+${fAtk} Raw)`);
    }
  }

  // Coalescence
  const coal = skills['coalescence'] ?? 0;
  let coalElemFlat = 0;
  if (coal > 0 && (cfg.coalescenceActive || (bl > 0 && cfg.bloodlustCleared))) {
    const cAtk = [0, 12, 15, 18][coal] ?? 0;
    coalElemFlat = [0, 2, 3, 4][coal] ?? 0;
    flatRawBonus += cAtk;
    activeEndgameEffects.push(`Coalescence Lv${coal} (+${cAtk} Raw / +${coalElemFlat} Elem)`);
  }

  // Burst
  const burst = skills['burst'] ?? 0;
  let burstElemFlat = 0;
  if (burst > 0 && cfg.burstActive) {
    const bAtk = [0, 10, 12, 15][burst] ?? 0;
    burstElemFlat = [0, 8, 10, 15][burst] ?? 0;
    flatRawBonus += bAtk;
    activeEndgameEffects.push(`Burst Lv${burst} (+${bAtk} Raw / +${burstElemFlat} Elem)`);
  }

  // Blood Awakening
  const ba = skills['blood_awakening'] ?? 0;
  let baElemFlat = 0;
  if (ba > 0) {
    const baAtk = [0, 20, 30, 40][ba] ?? 0;
    baElemFlat = [0, 15, 20, 30][ba] ?? 0;
    flatRawBonus += baAtk;
    activeEndgameEffects.push(`Blood Awakening Lv${ba} (+${baAtk} Raw / +${baElemFlat} Elem)`);
  }

  // Frostcraft
  const fc = skills['frostcraft'] ?? 0;
  let fcMult = 1.0;
  if (fc > 0 && (cfg.frostcraftGauge ?? 3) > 0) {
    const maxBonus = [0, 0.15, 0.25, 0.3][fc] ?? 0;
    const ratio = (cfg.frostcraftGauge ?? 3) / 3;
    fcMult = 1 + maxBonus * ratio;
    activeEndgameEffects.push(`Frostcraft Lv${fc} (${Math.round((fcMult - 1) * 100)}% dmg)`);
  }

  // Buildup Boost
  const bub = skills['buildup_boost'] ?? 0;
  const isStatusWeapon =
    weapon.elementType === 'Poison' ||
    weapon.elementType === 'Paralysis' ||
    weapon.elementType === 'Sleep' ||
    weapon.elementType === 'Blast';
  if (bub > 0 && isStatusWeapon) {
    // 1/3 melee hits proc status buildup
    const avgProcMult = 1 + ([0, 0.1, 0.15, 0.2][bub] ?? 0) * 0.333;
    rawMult *= avgProcMult;
    activeEndgameEffects.push(`Buildup Boost Lv${bub} (+${Math.round((avgProcMult - 1) * 100)}% avg raw)`);
  }

  // Strife
  const strife = skills['strife'] ?? 0;
  let strifeAff = 0;
  let strifeElemMult = 1.0;
  if (strife > 0 && ((skills['berserk'] ?? 0) > 0 || hasRedHealth)) {
    strifeAff = [0, 10, 15, 20][strife] ?? 0;
    strifeElemMult = [1.0, 1.1, 1.15, 1.2][strife] ?? 1.0;
    activeEndgameEffects.push(
      `Strife Lv${strife} (+${strifeAff}% Affinity, +${Math.round((strifeElemMult - 1) * 100)}% Elem)`
    );
  }

  // True Raw
  const rawWithoutAgitator = Math.round((baseRaw * rawMult + flatRawBonus) * fcMult * shotRawMultiplier);
  const rawWithAgitator = Math.round((baseRaw * rawMult + flatRawBonus + agiRaw) * fcMult * shotRawMultiplier);
  const trueRaw = Math.round(averageEnrage(rawWithoutAgitator, rawWithAgitator));

  // Affinity
  const ce = skills['critical_eye'] ?? 0;
  const ceAff = AFFINITY_SKILL_EFFECTS.criticalEye[ce] ?? 0;
  const wex = skills['weakness_exploit'] ?? 0;
  const fullWexAff = AFFINITY_SKILL_EFFECTS.weaknessExploit[wex] ?? 0;
  const weakspotRate = Math.min(1, Math.max(0, (cfg.wexUptime ?? DEFAULT_SIM_CONFIG.wexUptime) / 100));
  const mm = skills['maximum_might'] ?? 0;
  const mmAff = [0, 10, 20, 30][mm] ?? 0;

  const baseAffinity = weapon.affinity + qAff + ceAff + blAff + strifeAff + mmAff + forayAff;
  const capAffinity = (affinity: number) => Math.max(-100, Math.min(100, affinity));
  const inactive = { normal: capAffinity(baseAffinity), weakspot: capAffinity(baseAffinity + fullWexAff) };
  const active = { normal: capAffinity(baseAffinity + agiAff), weakspot: capAffinity(baseAffinity + agiAff + fullWexAff) };
  const averageHit = (normal: number, weakspot: number) => normal * (1 - weakspotRate) + weakspot * weakspotRate;
  const totalAffinity = Math.round(averageEnrage(averageHit(inactive.normal, inactive.weakspot), averageHit(active.normal, active.weakspot)));
  const weakspotAffinity = Math.round(averageEnrage(inactive.weakspot, active.weakspot));

  // Critical Boost
  const cb = skills['critical_boost'] ?? 0;
  const positiveCritMultiplier = [1.25, 1.3, 1.35, 1.4][cb] ?? 1.25;
  const critMultiplier = totalAffinity >= 0 ? positiveCritMultiplier : 0.75;
  const rawCritScale = (affinity: number) => 1 + affinity / 100 * (affinity >= 0 ? positiveCritMultiplier - 1 : 0.25);
  const expectedRaw = averageEnrage(
    rawWithoutAgitator * averageHit(rawCritScale(inactive.normal), rawCritScale(inactive.weakspot)),
    rawWithAgitator * averageHit(rawCritScale(active.normal), rawCritScale(active.weakspot)),
  );

  // Sharpness
  const sharpness =
    weapon.damageType === 'Shot'
      ? weapon.sharpness
      : resolveSharpness(
          weapon.sharpness,
          skills['handicraft'] ?? 0,
          weapon.handicraftBonusSharpness,
          weapon.handicraftThreshold ?? 2,
          loadout.quriousWeapon?.sharpnessBoost
        );
  const sharpMods =
    weapon.damageType === 'Shot'
      ? { raw: 1.0, elem: 1.0 }
      : SHARPNESS_MODIFIERS[sharpness];

  const effectiveRaw = Math.round(expectedRaw * sharpMods.raw * 10) / 10;

  // Element Calculation
  let trueElement = 0;
  const isTrueElement =
    weapon.elementType === 'Fire' ||
    weapon.elementType === 'Water' ||
    weapon.elementType === 'Thunder' ||
    weapon.elementType === 'Ice' ||
    weapon.elementType === 'Dragon';

  if (isTrueElement && weapon.elementValue > 0) {
    const elemSkillId = `${weapon.elementType.toLowerCase()}_attack`;
    const elemLv = skills[elemSkillId] ?? 0;
    const elemSkillMult = [1.0, 1.0, 1.0, 1.05, 1.1, 1.2][elemLv] ?? 1.0;
    const elemSkillFlat = [0, 2, 3, 4, 4, 4][elemLv] ?? 0;

    const baseElem = weapon.elementValue + qElem;
    trueElement = Math.round(
      (baseElem * elemSkillMult * mohElemMult * strifeElemMult +
        elemSkillFlat +
        derElemFlat +
        burstElemFlat +
        coalElemFlat +
        baElemFlat) *
        fcMult
    );
  }

  // Defense & Resistances
  const pieces = [
    loadout.helmId,
    loadout.chestId,
    loadout.armsId,
    loadout.waistId,
    loadout.legsId,
  ];
  const slotsOrder: ArmorSlot[] = ['Helm', 'Chest', 'Arms', 'Waist', 'Legs'];

  let defense = weapon.defenseBonus;
  const resistances = { fire: mohResDelta, water: mohResDelta, thunder: mohResDelta, ice: mohResDelta, dragon: mohResDelta };

  pieces.forEach((id, idx) => {
    const piece = getArmorById(id);
    const qArmor = loadout.quriousArmor?.[slotsOrder[idx]];
    if (piece) {
      defense += piece.defense + (qArmor?.defenseDelta ?? 0);
      resistances.fire += piece.resistances.fire;
      resistances.water += piece.resistances.water;
      resistances.thunder += piece.resistances.thunder;
      resistances.ice += piece.resistances.ice;
      resistances.dragon += piece.resistances.dragon;
    }
  });

  // Defense Boost level effects are listed in the game's skill messages.
  const defenseBoost = skills['defense_boost'] ?? 0;
  const defensePercent = [100, 100, 100, 105, 105, 108, 108, 110][defenseBoost] ?? 100;
  const defenseFlat = [0, 5, 10, 10, 20, 20, 35, 35][defenseBoost] ?? 0;
  const allResistance = [0, 0, 0, 0, 3, 3, 5, 5][defenseBoost] ?? 0;
  defense = Math.floor(defense * defensePercent / 100) + defenseFlat;
  if (cfg.armorcharmTalon) defense += 30;
  for (const element of Object.keys(resistances) as Array<keyof typeof resistances>) {
    resistances[element] += allResistance;
  }

  const furiousLv = skills['furious'] ?? 0;
  if (furiousLv > 0 && loadout.scrollMode === 'Red') {
    const fDef = [0, 10, 20, 30][furiousLv] ?? 0;
    const fRes = [0, 5, 10, 20][furiousLv] ?? 0;
    defense += fDef;
    resistances.fire += fRes;
    resistances.water += fRes;
    resistances.thunder += fRes;
    resistances.ice += fRes;
    resistances.dragon += fRes;
    activeEndgameEffects.push(`Furious Lv${furiousLv} (Red: +${fRes} All Res)`);
  }

  // https://a-to-monhan.com/2023/02/11/sunbure-ryukihenkan/
  const dcLv = skills['dragon_conversion'] ?? 0;
  if (dcLv > 0) {
    const passiveResistance = [0, 3, 5, 10][dcLv] ?? 0;
    const chargeResistance = cfg.dragonConversionCharged ? ([0, 10, 15, 15][dcLv] ?? 0) : 0;
    let totalPosRes = 0;
    for (const element of Object.keys(resistances) as Array<keyof typeof resistances>) {
      const resistance = Math.min(50, resistances[element] + passiveResistance + chargeResistance);
      totalPosRes += Math.max(0, resistance);
      resistances[element] = loadout.scrollMode === 'Red' ? 0 : resistance;
    }
    if (loadout.scrollMode === 'Red' && isTrueElement && weapon.elementValue > 0) {
      const rate = weapon.damageType === 'Shot' ? (dcLv === 3 ? 8 : 4) : (dcLv === 3 ? 25 : 15);
      const dcBonus = Math.floor(totalPosRes * rate / 100);
      trueElement += dcBonus;
      activeEndgameEffects.push(`Dragon Conversion Lv${dcLv} (+${dcBonus} Elem)`);
    }
  }
  const critElemLv = skills['critical_element'] ?? 0;
  const elementalCritChance = averageEnrage(
    averageHit(Math.max(0, inactive.normal), Math.max(0, inactive.weakspot)),
    averageHit(Math.max(0, active.normal), Math.max(0, active.weakspot)),
  ) / 100;
  const critElemMult = 1 + elementalCritChance * ([0, 0.05, 0.1, 0.15][critElemLv] ?? 0);
  const elemExploitMult = cfg.elementExploitActive === false ? 1 : elementExploitMultiplier(skills['element_exploit'] ?? 0);
  const effectiveElement = Math.round(trueElement * critElemMult * elemExploitMult * sharpMods.elem * 10) / 10;

  const defSkill = skills['defiance'] ?? 0;
  if (defSkill > 0) {
    defense += [0, 0, 10, 10, 20, 30][defSkill] ?? 0;
  }
  const emboldenLv = skills['embolden'] ?? 0;
  if (emboldenLv > 0) {
    defense += [0, 10, 20, 40][emboldenLv] ?? 0;
  }
  defense = Math.max(1, defense + mohDefDelta);

  return {
    trueRaw,
    effectiveRaw,
    trueElement,
    effectiveElement,
    totalAffinity,
    weakspotAffinity,
    critMultiplier,
    sharpness,
    sharpnessRawMod: sharpMods.raw,
    sharpnessElemMod: sharpMods.elem,
    defense,
    resistances,
    skills,
    overcappedSkills: overcapped,
    activeEndgameEffects,
  };
}

// Explicit targets cover exceptions that the in-game species labels cannot express.
const AERIAL_TARGETS = new Set([
  'mon_aknosom', 'mon_pukei', 'mon_wind_ibushi', 'mon_thunder_narwa',
  'mon_kushala_daora', 'mon_teostra', 'mon_chameleos',
]);
const AQUATIC_TARGETS = new Set([
  'mon_tetranadon', 'mon_royal_ludroth', 'mon_somnacanth',
  'mon_jyuratodus', 'mon_mizutsune', 'mon_almudron',
]);

function rampageSpeciesMultiplier(id: string, monster: (typeof MONSTERS_DB)[number]): number {
  switch (id) {
    case 'ramp_anti_wyvern':
      return monster.species.endsWith(' Wyvern') || monster.species === 'Leviathan' ? 1.05 : 1;
    case 'ramp_anti_aerial':
      return monster.species === 'Flying Wyvern' || AERIAL_TARGETS.has(monster.id) ? 1.05 : 1;
    case 'ramp_anti_aquatic':
      return AQUATIC_TARGETS.has(monster.id) ? 1.05 : 1;
    case 'rampage-deco:27':
    case 'ramp_anti_fanged':
      return monster.species === 'Fanged Beast' ? 1.05 : 1;
    default:
      return 1;
  }
}

export function simulateTrainingDps(
  loadout: BuildLoadout,
  config: SimulationConfig
): SimulationResult {
  const weapon = getWeaponById(loadout.weaponId) ?? WEAPONS_DB[0];
  const monster = getMonsterById(config.monsterId) ?? MONSTERS_DB[0];
  const part =
    monster.hitzones.find((h) => h.partName === config.partName) ?? monster.hitzones[0];

  const matchingCombo =
    WEAPON_COMBOS_DB.find((c) => c.id === config.comboId && c.weaponClass === weapon.weaponClass) ??
    WEAPON_COMBOS_DB.find((c) => c.weaponClass === weapon.weaponClass) ??
    WEAPON_COMBOS_DB[0];

  const rawHitzones = { Sever: part.sever, Blunt: part.blunt, Shot: part.shot };

  const elemHzv =
    weapon.elementType === 'Fire'
      ? part.fire
      : weapon.elementType === 'Water'
      ? part.water
      : weapon.elementType === 'Thunder'
      ? part.thunder
      : weapon.elementType === 'Ice'
      ? part.ice
      : weapon.elementType === 'Dragon'
      ? part.dragon
      : 0;

  const stateMult =
    config.monsterState === 'Enraged'
      ? monster.enrageDamageMod
      : config.monsterState === 'Anomaly Toppled'
      ? 1.15
      : 1.0;

  const rampageDecoId = rampageDecorationFits(loadout.rampageDecoId, weapon, loadout.quriousWeapon?.extraSlotLevel)
    ? loadout.rampageDecoId
    : '';
  const rampElembaneMult =
    rampageDecoId === 'ramp_elembane' && elemHzv >= 25 ? 1.15 : 1.0;
  const rampSpeciesMult = rampageSpeciesMultiplier(rampageDecoId, monster);

  const simulationConfig = { ...config, elementExploitActive: elemHzv >= 20 };
  const stats = calculateBuildStats(loadout, simulationConfig);
  const statsWithoutWex = config.wexUptime > 0 && (stats.skills.weakness_exploit ?? 0) > 0
    ? calculateBuildStats(loadout, { ...simulationConfig, wexUptime: 0 })
    : stats;
  const hasRangedAttack = matchingCombo.hits.some((hit) => hit.rangedAttack);
  const usesWeaponMechanics = hasRangedAttack || weapon.weaponClass === 'Charge Blade' || weapon.weaponClass === 'Gunlance';
  // Look up source mechanics for legacy saves without changing their stored equipment IDs.
  const mechanicsWeapon = usesWeaponMechanics ? resolveMechanicsWeapon(weapon) : weapon;
  const bowShot = hasRangedAttack ? getBowShotProfile(mechanicsWeapon, (stats.skills.bow_charge_plus ?? 0) > 0) : undefined;
  const ammo = hasRangedAttack ? getPrimaryBowgunAmmo(mechanicsWeapon, loadout.bowgunAmmo) : undefined;

  const rapidMorphLv = stats.skills['rapid_morph'] ?? 0;
  const morphBoost =
    weapon.weaponClass === 'Switch Axe' || weapon.weaponClass === 'Charge Blade'
      ? [1.0, 1.0, 1.1, 1.2][rapidMorphLv] ?? 1.0
      : 1.0;

  let totalRawCombo = 0;
  let totalElemCombo = 0;

  const hits = matchingCombo.hits.map((hit) => {
    if (hit.gunlanceFullBurst) {
      const shelling = estimateGunlanceFullBurst(mechanicsWeapon, stats, part.fire, stateMult, rampSpeciesMult);
      const rawDamage = shelling?.fixedDamage ?? 0;
      const elementDamage = shelling?.fireDamage ?? 0;
      totalRawCombo += rawDamage;
      totalElemCombo += elementDamage;
      return {
        moveName: hit.moveName,
        rawDamage,
        elementDamage,
        totalAverageDamage: rawDamage + elementDamage,
        critDamage: rawDamage + elementDamage,
        shellCount: shelling?.shellCount,
        shellingUnavailable: !shelling,
      };
    }
    if (hit.chargeBladeSaedPhials) {
      const phials = estimateChargeBladeSaedPhials(mechanicsWeapon, stats, elemHzv, stateMult, rampSpeciesMult);
      const rawDamage = phials?.fixedDamage ?? 0;
      const elementDamage = phials?.elementDamage ?? 0;
      totalRawCombo += rawDamage;
      totalElemCombo += elementDamage;
      return {
        moveName: phials ? `5× ${phials.phial === 'impact' ? 'Impact' : 'Element'} Phial Bursts` : hit.moveName,
        rawDamage,
        elementDamage,
        totalAverageDamage: rawDamage + elementDamage,
        critDamage: rawDamage + elementDamage,
        nonCritical: true,
        attackUnavailable: !phials,
      };
    }
    const rawHzv = rawHitzones[hit.damageType ?? weapon.damageType];
    const hitStats = rawHzv >= 45 ? stats : statsWithoutWex;
    let { moveName, motionValue, elementMod } = hit;
    if (hit.rangedAttack) {
      if (!bowShot && !ammo) {
        return { moveName, rawDamage: 0, elementDamage: 0, totalAverageDamage: 0, critDamage: 0, attackUnavailable: true };
      }
      if (bowShot) {
        moveName = `${moveName} · Charge ${bowShot.charge} · ${bowShot.label}${bowShot.pierce ? ' (first tick)' : ''}`;
        motionValue = bowShot.motionValue * bowShot.hitCount;
        elementMod = bowShot.elementMod * bowShot.hitCount;
      } else if (ammo) {
        const configuredTicks = config.pierceTicksPerProjectile ?? 1;
        const ticks = ammo.pierce
          ? Math.min(10, Math.max(1, Number.isFinite(configuredTicks) ? Math.trunc(configuredTicks) : 1))
          : ammo.hitsPerProjectile;
        moveName = `${ammo.label} · ${ammo.capacity} rounds${ammo.pierce ? ` · ${ticks} tick(s) per projectile` : ''}`;
        const rapidFireMultiplier = ammo.rapidFire ? 3 * 0.7 : 1;
        motionValue = ammo.motionValue * ammo.capacity * ticks * rapidFireMultiplier;
      }
    }
    const isMorphHit = moveName.toLowerCase().includes('morph');
    const moveMorphMult = isMorphHit ? morphBoost : 1.0;

    const rawHit =
      hitStats.effectiveRaw *
      (motionValue / 100) *
      (rawHzv / 100) *
      stateMult *
      rampSpeciesMult *
      moveMorphMult;

    const elemHit =
      hitStats.effectiveElement * rampElembaneMult * elementMod * (elemHzv / 100) * stateMult;

    const avgDamage = Math.round(rawHit + elemHit);
    const critRaw =
      hitStats.trueRaw *
      hitStats.critMultiplier *
      hitStats.sharpnessRawMod *
      (motionValue / 100) *
      (rawHzv / 100) *
      stateMult *
      rampSpeciesMult *
      moveMorphMult;

    totalRawCombo += rawHit;
    totalElemCombo += elemHit;

    return {
      moveName,
      rawDamage: Math.round(rawHit),
      elementDamage: Math.round(elemHit),
      totalAverageDamage: avgDamage,
      critDamage: Math.round(critRaw + elemHit),
    };
  });

  const comboDamage = Math.round(totalRawCombo + totalElemCombo);
  const isBowgunMagazine = matchingCombo.hits.some(hit => hit.rangedAttack === 'bowgun-magazine');
  const cycleSeconds = isBowgunMagazine
    ? getBowgunMagazineCycleSeconds(mechanicsWeapon, stats.skills, loadout.bowgunAmmo)
    : matchingCombo.durationSec;
  const dps = cycleSeconds === undefined ? undefined : Math.round(comboDamage / cycleSeconds * 10) / 10;
  const totalSum = Math.max(1, totalRawCombo + totalElemCombo);
  const rawSharePercent = Math.round((totalRawCombo / totalSum) * 100);
  const elementSharePercent = 100 - rawSharePercent;
  const estimatedClearSeconds = dps === undefined ? undefined : Math.max(
    12,
    Math.round(monster.hpSolo / Math.max(1, dps * 0.68))
  );

  const timeline: Array<{ second: number; cumulativeDamage: number }> = [];
  if (dps !== undefined) {
    for (let sec = 0; sec <= 60; sec += 5) {
      timeline.push({ second: sec, cumulativeDamage: Math.round(sec * dps) });
    }
  }

  return {
    comboDamage,
    dps,
    cycleSeconds,
    isBowgunMagazine,
    rawSharePercent,
    elementSharePercent,
    estimatedClearSeconds,
    hits,
    timeline,
  };
}

export interface EvaluatedMetaBuild {
  template: MetaBuildTemplate;
  stats: CalculatedBuildStats;
  rankEligible: boolean;
  ownershipPercent: number;
  ownedCount: number;
  totalPieces: number;
  missingItems: string[];
  missingDecorations: string[];
}

export function calculateBuildCraftingSummary(loadout: BuildLoadout, inventory: InventoryState) {
  const box = resolveRecommendationInventory(inventory);
  const equipped = [
    { id: catalogWeaponId(loadout.weaponId) ?? loadout.weaponId, item: getWeaponById(loadout.weaponId), slotLabel: 'Weapon', owned: box.ownedWeaponIds },
    ...ARMOR_LOADOUT_SLOTS.map(([, slotLabel, key]) => ({
      id: catalogArmorId(loadout[key]) ?? loadout[key], item: getArmorById(loadout[key]), slotLabel, owned: box.ownedArmorIds,
    })),
  ].filter(({ id }) => Boolean(id));
  const missingGear = equipped.filter(({ id, owned }) => !owned.includes(id));
  const pieceBreakdowns = missingGear.map(({ id, item, slotLabel }) => ({
    itemId: id, itemName: item?.name ?? id, slotLabel, requiredCopies: 1, missingCopies: 1,
  }));
  const copies = new Map<string, number>();
  const slots = resolveDecorationSlots(loadout);
  for (const key of Object.keys(slots) as Array<keyof typeof slots>) {
    for (const [index, id] of loadout.decorations[key].entries()) {
      if (!decorationFits(id, slots[key][index] ?? 0)) continue;
      const normalizedId = catalogDecoId(id) ?? id;
      copies.set(normalizedId, (copies.get(normalizedId) ?? 0) + 1);
    }
  }
  if (rampageDecorationFits(loadout.rampageDecoId, getWeaponById(loadout.weaponId), loadout.quriousWeapon?.extraSlotLevel)) {
    copies.set(catalogDecoId(loadout.rampageDecoId) ?? loadout.rampageDecoId, 1);
  }
  for (const [id, requiredCopies] of copies) {
    const owned = box.ownedDecoIds.includes(id) ? (box.ownedDecoCounts?.[id] ?? 1) : 0;
    if (requiredCopies > owned) {
      pieceBreakdowns.push({
        itemId: id, itemName: getDecorationById(id)?.name ?? id, slotLabel: 'Decoration',
        requiredCopies, missingCopies: requiredCopies - owned,
      });
    }
  }
  return { totalGearCount: equipped.length, ownedGearCount: equipped.length - missingGear.length, pieceBreakdowns };
}

export function canCraftMissingEquipmentAtMr(loadout: BuildLoadout, inventory: InventoryState, mr: number): boolean {
  return calculateBuildCraftingSummary(loadout, inventory).pieceBreakdowns.every(
    ({ itemId }) => getMinimumCraftingMr(itemId) <= mr,
  );
}

export function evaluateMetaRecommendations(
  profile: HunterProfile,
  inventory: InventoryState,
  weaponFilter: string,
  stageFilter: RankTier | 'All' = 'All',
  optimizeTalisman?: (loadout: BuildLoadout, weapon: WeaponItem, inventory: InventoryState) => BuildLoadout
): EvaluatedMetaBuild[] {
  inventory = resolveRecommendationInventory(inventory);
  const templates = RECOMMENDATION_TEMPLATES.filter((t) => {
    if (weaponFilter !== 'All' && t.weaponClass !== weaponFilter) return false;
    if (stageFilter !== 'All' && t.rankTier !== stageFilter) return false;
    return true;
  });

  const activeStage = getHunterProgressionStage(profile.mr, profile.ar);
  const activeStageIndex = RANK_TIERS.indexOf(activeStage);

  return templates
    .map((template) => {
      const weapon = getWeaponById(template.loadout.weaponId);
      const base: BuildLoadout = {
        ...template.loadout,
        talisman: EMPTY_RECOMMENDATION_TALISMAN,
        id: template.id,
        updatedAt: new Date().toISOString(),
      };
      const fullLoadout = weapon && optimizeTalisman ? optimizeTalisman(base, weapon, inventory) : base;
      const stats = calculateBuildStats(fullLoadout);
      const crafting = calculateBuildCraftingSummary(fullLoadout, inventory);
      const rankEligible =
        profile.mr >= template.minMr && profile.ar >= template.minAr
        && crafting.pieceBreakdowns.every(({ itemId }) => getMinimumCraftingMr(itemId) <= profile.mr);
      const missingDecorations = crafting.pieceBreakdowns
        .filter(piece => piece.slotLabel === 'Decoration')
        .map(piece => `${piece.itemName} ×${piece.missingCopies}`);

      const requiredGearIds = [
        template.loadout.weaponId,
        template.loadout.helmId,
        template.loadout.chestId,
        template.loadout.armsId,
        template.loadout.waistId,
        template.loadout.legsId,
      ];

      const ownedSet = new Set([
        ...inventory.ownedWeaponIds,
        ...inventory.ownedArmorIds,
      ]);

      const missingItems: string[] = [];
      let ownedCount = 0;

      if (ownedSet.has(template.loadout.weaponId)) {
        ownedCount++;
      } else if (weapon) {
        missingItems.push(`${weapon.name} (${weapon.unlockNote})`);
      }

      const armorChecks = [
        template.loadout.helmId,
        template.loadout.chestId,
        template.loadout.armsId,
        template.loadout.waistId,
        template.loadout.legsId,
      ];
      for (const aId of armorChecks) {
        if (ownedSet.has(aId)) {
          ownedCount++;
        } else {
          const piece = getArmorById(aId);
          if (piece) missingItems.push(`${piece.name} (${piece.unlockNote})`);
        }
      }

      const ownershipPercent = Math.round(
        (ownedCount / requiredGearIds.length) * 100
      );

      return {
        template: { ...template, loadout: fullLoadout },
        stats,
        rankEligible,
        ownershipPercent,
        ownedCount,
        totalPieces: requiredGearIds.length,
        missingItems,
        missingDecorations,
      };
    })
    .sort((a, b) => {
      if (a.rankEligible !== b.rankEligible) return a.rankEligible ? -1 : 1;
      const aStageIdx = RANK_TIERS.indexOf(a.template.rankTier);
      const bStageIdx = RANK_TIERS.indexOf(b.template.rankTier);
      const aExact = aStageIdx === activeStageIndex ? 0 : 1;
      const bExact = bStageIdx === activeStageIndex ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      if (bStageIdx !== aStageIdx) return bStageIdx - aStageIdx;
      if (b.ownershipPercent !== a.ownershipPercent) {
        return b.ownershipPercent - a.ownershipPercent;
      }
      return b.stats.effectiveRaw - a.stats.effectiveRaw;
    });
}

export function getUnlockedIdsForRank(mr: number, ar: number): {
  weaponIds: string[];
  armorIds: string[];
  decoIds: string[];
} {
  return {
    weaponIds: WEAPONS_DB.filter((w) => Math.max(w.minMr, getMinimumCraftingMr(w.id)) <= mr && w.minAr <= ar).map(
      (w) => w.id
    ),
    armorIds: ARMOR_DB.filter((a) => a.isSelectable !== false && Math.max(a.minMr, getMinimumCraftingMr(a.id)) <= mr && a.minAr <= ar).map(
      (a) => a.id
    ),
    decoIds: DECORATIONS_DB.filter((d) => Math.max(d.minMr, getMinimumCraftingMr(d.id)) <= mr).map((d) => d.id),
  };
}

export function getSkillDisplayName(id: string): string {
  return SKILLS_DB.find((s) => s.id === id)?.name ?? id;
}

