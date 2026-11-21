import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getEquipmentRecipe,
  getMonsterById,
  getSkillById,
  getWeaponById,
  META_BUILD_TEMPLATES,
  MONSTERS_DB,
  SKILLS_DB,
  WEAPON_COMBOS_DB,
  WEAPONS_DB,
} from '../data/sunbreakDb';
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
} from '../types/sunbreak';

export const RANK_TIERS: RankTier[] = [
  'HR',
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
  const base = [...weapon.slots] as [number, number, number];
  let extra = loadout.quriousWeapon?.extraSlotLevel ?? 0;
  for (let i = 0; i < 3 && extra > 0; i++) {
    if (base[i] < 4) {
      const bump = Math.min(4 - base[i], extra);
      base[i] += bump;
      extra -= bump;
    }
  }
  return base;
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

export function aggregateBuildSkills(loadout: BuildLoadout): {
  skills: Record<string, number>;
  overcapped: string[];
} {
  const rawTotals: Record<string, number> = {};

  const addSkill = (id: string, pts: number) => {
    if (!id || pts <= 0) return;
    rawTotals[id] = (rawTotals[id] ?? 0) + pts;
  };

  const armorIds: Array<{ slot: ArmorSlot; id: string }> = [
    { slot: 'Helm', id: loadout.helmId },
    { slot: 'Chest', id: loadout.chestId },
    { slot: 'Arms', id: loadout.armsId },
    { slot: 'Waist', id: loadout.waistId },
    { slot: 'Legs', id: loadout.legsId },
  ];

  for (const { slot, id } of armorIds) {
    const piece = getArmorById(id);
    if (piece) {
      for (const [skillId, pts] of Object.entries(piece.skills)) {
        addSkill(skillId, pts);
      }
    }
    const qAug = loadout.quriousArmor?.[slot];
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
  const decoGroups = [
    loadout.decorations.weapon,
    loadout.decorations.helm,
    loadout.decorations.chest,
    loadout.decorations.arms,
    loadout.decorations.waist,
    loadout.decorations.legs,
    loadout.decorations.talisman,
  ];
  for (const group of decoGroups) {
    for (const decoId of group) {
      const deco = getDecorationById(decoId);
      if (deco) addSkill(deco.skillId, deco.points);
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
  const agiUptime = cfg.monsterState === 'Enraged' ? 1.0 : (cfg.agitatorUptime ?? 75) / 100;
  const agiRaw = ([0, 4, 8, 12, 16, 20][agi] ?? 0) * agiUptime;
  const agiAff = ([0, 3, 5, 7, 10, 15][agi] ?? 0) * agiUptime;
  flatRawBonus += agiRaw;

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

  // Offensive Guard (guarded classes / lance / CB / GS / SnS)
  const og = skills['offensive_guard'] ?? 0;
  if (og > 0) {
    const ogBonus = [1.0, 1.05, 1.1, 1.15][og] ?? 1.0;
    rawMult *= 1 + (ogBonus - 1) * 0.7;
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
    const sBonus = [1.0, 1.05, 1.1, 1.2][sneak] ?? 1.0;
    rawMult *= 1 + (sBonus - 1) * 0.45;
  }

  // Gunner Shot-Type & Rapid Fire multipliers
  if (weapon.damageType === 'Shot') {
    const ammoUpLv = Math.max(
      skills['normal_rapid_up'] ?? 0,
      skills['pierce_up'] ?? 0,
      skills['spread_up'] ?? 0
    );
    if (ammoUpLv > 0) {
      const shotMult = [1.0, 1.05, 1.1, 1.2][ammoUpLv] ?? 1.0;
      rawMult *= shotMult;
      activeEndgameEffects.push(`Shot Type Up Lv${ammoUpLv} (+${Math.round((shotMult - 1) * 100)}%)`);
    }
    const rfLv = skills['rapid_fire_up'] ?? 0;
    if (weapon.weaponClass === 'Light Bowgun' && rfLv > 0) {
      const rfMult = [1.0, 1.05, 1.1, 1.2][rfLv] ?? 1.0;
      rawMult *= rfMult;
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
  const trueRaw = Math.round((baseRaw * rawMult + flatRawBonus) * fcMult);

  // Affinity
  const ce = skills['critical_eye'] ?? 0;
  const ceAff = [0, 5, 10, 15, 20, 25, 30, 40][ce] ?? 0;
  const wex = skills['weakness_exploit'] ?? 0;
  const wexAff = ([0, 15, 30, 50][wex] ?? 0) * ((cfg.wexUptime ?? 90) / 100);
  const mm = skills['maximum_might'] ?? 0;
  const mmAff = [0, 10, 20, 30][mm] ?? 0;

  const unclampedAffinity =
    weapon.affinity + qAff + ceAff + wexAff + agiAff + blAff + strifeAff + mmAff + forayAff;
  const totalAffinity = Math.max(-100, Math.min(100, Math.round(unclampedAffinity)));

  // Critical Boost
  const cb = skills['critical_boost'] ?? 0;
  const critMultiplier =
    totalAffinity >= 0 ? ([1.25, 1.3, 1.35, 1.4][cb] ?? 1.25) : 0.75;

  const avgCritScale =
    totalAffinity >= 0
      ? 1 + (totalAffinity / 100) * (critMultiplier - 1)
      : 1 + (Math.abs(totalAffinity) / 100) * (0.75 - 1);

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

  const effectiveRaw = Math.round(trueRaw * avgCritScale * sharpMods.raw * 10) / 10;

  // Element Calculation
  let trueElement = 0;
  let effectiveElement = 0;
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

    const critElemLv = skills['critical_element'] ?? 0;
    const critElemMult =
      totalAffinity > 0
        ? 1 + (totalAffinity / 100) * ([0, 0.05, 0.1, 0.15][critElemLv] ?? 0)
        : 1.0;

    const elemExploitLv = skills['element_exploit'] ?? 0;
    const elemExploitMult = [1.0, 1.1, 1.125, 1.15][elemExploitLv] ?? 1.0;

    effectiveElement =
      Math.round(trueElement * critElemMult * elemExploitMult * sharpMods.elem * 10) / 10;
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
  const resistances = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };

  pieces.forEach((id, idx) => {
    const piece = getArmorById(id);
    const qArmor = loadout.quriousArmor?.[slotsOrder[idx]];
    if (piece) {
      defense += piece.defense + (qArmor?.defenseDelta ?? 0);
      resistances.fire += piece.resistances.fire + mohResDelta;
      resistances.water += piece.resistances.water + mohResDelta;
      resistances.thunder += piece.resistances.thunder + mohResDelta;
      resistances.ice += piece.resistances.ice + mohResDelta;
      resistances.dragon += piece.resistances.dragon + mohResDelta;
    }
  });

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

  // Dragon Conversion (Red Scroll converts positive resistances to True Element)
  const dcLv = skills['dragon_conversion'] ?? 0;
  if (dcLv > 0 && loadout.scrollMode === 'Red' && isTrueElement && weapon.elementValue > 0) {
    const totalPosRes =
      Math.max(0, resistances.fire) +
      Math.max(0, resistances.water) +
      Math.max(0, resistances.thunder) +
      Math.max(0, resistances.ice) +
      Math.max(0, resistances.dragon);
    const dcRatio = [0, 0.15, 0.2, 0.25][dcLv] ?? 0;
    const dcBonus = Math.round(totalPosRes * dcRatio);
    trueElement += dcBonus;
    effectiveElement = Math.round((effectiveElement + dcBonus * sharpMods.elem) * 10) / 10;
    activeEndgameEffects.push(`Dragon Conversion Lv${dcLv} (+${dcBonus} Elem)`);
  }

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

export function simulateTrainingDps(
  loadout: BuildLoadout,
  config: SimulationConfig
): SimulationResult {
  const weapon = getWeaponById(loadout.weaponId) ?? WEAPONS_DB[0];
  const monster = getMonsterById(config.monsterId) ?? MONSTERS_DB[0];
  const part =
    monster.hitzones.find((h) => h.partName === config.partName) ?? monster.hitzones[0];

  const matchingCombo =
    WEAPON_COMBOS_DB.find((c) => c.id === config.comboId) ??
    WEAPON_COMBOS_DB.find((c) => c.weaponClass === weapon.weaponClass) ??
    WEAPON_COMBOS_DB[0];

  const stats = calculateBuildStats(loadout, config);

  const rawHzv =
    weapon.damageType === 'Sever'
      ? part.sever
      : weapon.damageType === 'Blunt'
      ? part.blunt
      : part.shot;

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

  const rampElembaneMult =
    loadout.rampageDecoId === 'ramp_elembane' && elemHzv >= 25 ? 1.15 : 1.0;
  const rampSpeciesMult =
    loadout.rampageDecoId === 'ramp_anti_elder' && monster.species === 'Elder Dragon'
      ? 1.05
      : loadout.rampageDecoId === 'ramp_anti_wyvern' &&
        monster.species.includes('Wyvern')
      ? 1.05
      : 1.0;

  // Elem exploit only triggers on elemHzv >= 20
  const effectiveElemAdjusted =
    elemHzv >= 20
      ? stats.effectiveElement * rampElembaneMult
      : stats.trueElement * stats.sharpnessElemMod;

  const rapidMorphLv = stats.skills['rapid_morph'] ?? 0;
  const morphBoost =
    weapon.weaponClass === 'Switch Axe' || weapon.weaponClass === 'Charge Blade'
      ? [1.0, 1.0, 1.1, 1.2][rapidMorphLv] ?? 1.0
      : 1.0;

  let totalRawCombo = 0;
  let totalElemCombo = 0;

  const hits = matchingCombo.hits.map((hit) => {
    const isMorphHit = hit.moveName.toLowerCase().includes('morph');
    const moveMorphMult = isMorphHit ? morphBoost : 1.0;

    const rawHit =
      stats.effectiveRaw *
      (hit.motionValue / 100) *
      (rawHzv / 100) *
      stateMult *
      rampSpeciesMult *
      moveMorphMult;

    const elemHit =
      effectiveElemAdjusted * hit.elementMod * (elemHzv / 100) * stateMult;

    const avgDamage = Math.round(rawHit + elemHit);
    const critRaw =
      stats.trueRaw *
      stats.critMultiplier *
      stats.sharpnessRawMod *
      (hit.motionValue / 100) *
      (rawHzv / 100) *
      stateMult *
      rampSpeciesMult *
      moveMorphMult;

    totalRawCombo += rawHit;
    totalElemCombo += elemHit;

    return {
      moveName: hit.moveName,
      rawDamage: Math.round(rawHit),
      elementDamage: Math.round(elemHit),
      totalAverageDamage: avgDamage,
      critDamage: Math.round(critRaw + elemHit),
    };
  });

  const comboDamage = Math.round(totalRawCombo + totalElemCombo);
  const dps = Math.round((comboDamage / matchingCombo.durationSec) * 10) / 10;
  const totalSum = Math.max(1, totalRawCombo + totalElemCombo);
  const rawSharePercent = Math.round((totalRawCombo / totalSum) * 100);
  const elementSharePercent = 100 - rawSharePercent;
  const estimatedClearSeconds = Math.max(
    12,
    Math.round(monster.hpSolo / Math.max(1, dps * 0.68))
  );

  const timeline: Array<{ second: number; cumulativeDamage: number }> = [];
  for (let sec = 0; sec <= 60; sec += 5) {
    timeline.push({
      second: sec,
      cumulativeDamage: Math.round(sec * dps),
    });
  }

  return {
    comboDamage,
    dps,
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
  craftableWithMaterials: boolean;
  missingMaterials: Array<{ name: string; shortfall: number; source: string }>;
}

export function calculateBuildCraftingSummary(
  loadout: BuildLoadout,
  inventory: InventoryState
): {
  totalZenny: number;
  ownedGearCount: number;
  totalGearCount: number;
  pieceBreakdowns: Array<{
    slotLabel: string;
    itemId: string;
    itemName: string;
    owned: boolean;
    zennyCost: number;
    materials: Array<{
      name: string;
      source: string;
      required: number;
      owned: number;
      shortfall: number;
    }>;
    readyToCraft: boolean;
  }>;
  consolidatedMaterials: Array<{
    name: string;
    source: string;
    required: number;
    owned: number;
    shortfall: number;
  }>;
} {
  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedDecoSet = new Set(inventory.ownedDecoIds);
  const matBox = inventory.materials ?? {};

  const targets: Array<{
    kind: 'weapon' | 'armor' | 'decoration';
    id: string;
    owned: boolean;
  }> = [
    { kind: 'weapon', id: loadout.weaponId, owned: ownedWeaponSet.has(loadout.weaponId) },
    { kind: 'armor', id: loadout.helmId, owned: ownedArmorSet.has(loadout.helmId) },
    { kind: 'armor', id: loadout.chestId, owned: ownedArmorSet.has(loadout.chestId) },
    { kind: 'armor', id: loadout.armsId, owned: ownedArmorSet.has(loadout.armsId) },
    { kind: 'armor', id: loadout.waistId, owned: ownedArmorSet.has(loadout.waistId) },
    { kind: 'armor', id: loadout.legsId, owned: ownedArmorSet.has(loadout.legsId) },
  ];

  // Add unique missing decorations slotted in the build
  const allDecoIds = new Set<string>();
  Object.values(loadout.decorations).forEach((group) => {
    group.forEach((dId) => {
      if (dId) allDecoIds.add(dId);
    });
  });
  if (loadout.rampageDecoId) allDecoIds.add(loadout.rampageDecoId);

  allDecoIds.forEach((dId) => {
    if (!ownedDecoSet.has(dId)) {
      targets.push({ kind: 'decoration', id: dId, owned: false });
    }
  });

  let totalZenny = 0;
  let ownedGearCount = 0;
  const totalGearCount = 6;
  const aggMap = new Map<string, { name: string; source: string; required: number }>();
  const pieceBreakdowns: Array<{
    slotLabel: string;
    itemId: string;
    itemName: string;
    owned: boolean;
    zennyCost: number;
    materials: Array<{
      name: string;
      source: string;
      required: number;
      owned: number;
      shortfall: number;
    }>;
    readyToCraft: boolean;
  }> = [];

  for (const t of targets) {
    const recipe = getEquipmentRecipe(t.kind, t.id);
    if (!recipe) continue;

    if (t.kind !== 'decoration' && t.owned) {
      ownedGearCount++;
    }

    if (!t.owned) {
      totalZenny += recipe.zennyCost;
    }

    const mappedMats = recipe.materials.map((m) => {
      const ownedQty = matBox[m.name] ?? 0;
      const shortfall = t.owned ? 0 : Math.max(0, m.quantity - ownedQty);
      if (!t.owned) {
        const prev = aggMap.get(m.name);
        aggMap.set(m.name, {
          name: m.name,
          source: m.source,
          required: (prev?.required ?? 0) + m.quantity,
        });
      }
      return {
        name: m.name,
        source: m.source,
        required: m.quantity,
        owned: ownedQty,
        shortfall,
      };
    });

    pieceBreakdowns.push({
      slotLabel: recipe.slotLabel,
      itemId: recipe.itemId,
      itemName: recipe.itemName,
      owned: t.owned,
      zennyCost: recipe.zennyCost,
      materials: mappedMats,
      readyToCraft: t.owned || mappedMats.every((m) => m.shortfall === 0),
    });
  }

  const consolidatedMaterials = Array.from(aggMap.values())
    .map((m) => {
      const owned = matBox[m.name] ?? 0;
      return {
        name: m.name,
        source: m.source,
        required: m.required,
        owned,
        shortfall: Math.max(0, m.required - owned),
      };
    })
    .sort((a, b) => b.shortfall - a.shortfall || b.required - a.required);

  return {
    totalZenny,
    ownedGearCount,
    totalGearCount,
    pieceBreakdowns,
    consolidatedMaterials,
  };
}

export function evaluateMetaRecommendations(
  profile: HunterProfile,
  inventory: InventoryState,
  weaponFilter: string,
  stageFilter: RankTier | 'All' = 'All'
): EvaluatedMetaBuild[] {
  const templates = META_BUILD_TEMPLATES.filter((t) => {
    if (weaponFilter !== 'All' && t.weaponClass !== weaponFilter) return false;
    if (stageFilter !== 'All' && t.rankTier !== stageFilter) return false;
    return true;
  });

  const activeStage = getHunterProgressionStage(profile.mr, profile.ar);
  const activeStageIndex = RANK_TIERS.indexOf(activeStage);

  return templates
    .map((template) => {
      const fullLoadout: BuildLoadout = {
        ...template.loadout,
        id: template.id,
        updatedAt: new Date().toISOString(),
      };
      const stats = calculateBuildStats(fullLoadout);
      const rankEligible =
        profile.mr >= template.minMr && profile.ar >= template.minAr;

      const crafting = calculateBuildCraftingSummary(fullLoadout, inventory);

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

      const weapon = getWeaponById(template.loadout.weaponId);
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

      const missingMaterials = crafting.consolidatedMaterials
        .filter((m) => m.shortfall > 0)
        .map((m) => ({
          name: m.name,
          shortfall: m.shortfall,
          source: m.source,
        }));

      return {
        template,
        stats,
        rankEligible,
        ownershipPercent,
        ownedCount,
        totalPieces: requiredGearIds.length,
        missingItems,
        craftableWithMaterials: missingMaterials.length === 0,
        missingMaterials,
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
    weaponIds: WEAPONS_DB.filter((w) => w.minMr <= mr && w.minAr <= ar).map(
      (w) => w.id
    ),
    armorIds: ARMOR_DB.filter((a) => a.minMr <= mr && a.minAr <= ar).map(
      (a) => a.id
    ),
    decoIds: DECORATIONS_DB.filter((d) => d.minMr <= mr).map((d) => d.id),
  };
}

export function getSkillDisplayName(id: string): string {
  return SKILLS_DB.find((s) => s.id === id)?.name ?? id;
}

