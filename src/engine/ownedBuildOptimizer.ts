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

const EMPTY_Q_ARMOR: BuildLoadout['quriousArmor'] = {
  Helm: { ...EMPTY_ARMOR_AUGMENT },
  Chest: { ...EMPTY_ARMOR_AUGMENT },
  Arms: { ...EMPTY_ARMOR_AUGMENT },
  Waist: { ...EMPTY_ARMOR_AUGMENT },
  Legs: { ...EMPTY_ARMOR_AUGMENT },
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

export function getSkillWeightsForWeapon(weapon: WeaponItem): Record<string, number> {
  const weights: Record<string, number> = {
    weakness_exploit: 18,
    critical_boost: 16,
    attack_boost: 14,
    critical_eye: 13,
    agitator: 11,
    burst: 12,
    mail_of_hellfire: 14,
    bloodlust: 13,
    coalescence: 10,
    blood_awakening: 14,
    blood_rite: 8,
    powder_mantle: 12,
    heaven_sent: 12,
    frostcraft: 11,
    dereliction: 12,
    resentment: 7,
    peak_performance: 6,
    intrepid_heart: 10,
    wirebug_whisperer: 9,
    defiance: 5,
    stun_resistance: 4,
    evade_extender: 5,
    evade_window: 5,
  };

  if (weapon.damageType !== 'Shot') {
    weights.handicraft = weapon.handicraftBonusSharpness ? 12 : 5;
    weights.masters_touch = 11;
    weights.protective_polish = 9;
    weights.razor_sharp = 8;
    weights.speed_sharpening = 5;
  }

  if (TRUE_ELEMENTS.has(weapon.elementType) && weapon.elementValue > 0) {
    const elemSkill = `${weapon.elementType.toLowerCase()}_attack`;
    weights[elemSkill] = 14;
    weights.element_exploit = 15;
    weights.critical_element = 12;
    weights.dragon_conversion = 14;
    weights.furious = 10;
    weights.strife = 13;
    weights.burst = 15;
  }

  if (STATUS_ELEMENTS.has(weapon.elementType)) {
    weights.buildup_boost = 16;
    weights.status_trigger = 11;
    if (weapon.elementType === 'Poison' || weapon.elementType === 'Paralysis') {
      weights.foray = 14;
    }
  }

  switch (weapon.weaponClass) {
    case 'Great Sword':
      weights.focus = 16;
      weights.offensive_guard = 15;
      weights.frostcraft = 18;
      weights.wirebug_whisperer = 13;
      weights.critical_draw = 7;
      break;
    case 'Long Sword':
      weights.quick_sheathe = 22;
      weights.wirebug_whisperer = 14;
      weights.wind_mantle = 14;
      weights.frostcraft = 15;
      break;
    case 'Sword & Shield':
      weights.offensive_guard = 15;
      weights.wirebug_whisperer = 12;
      weights.embolden = 9;
      break;
    case 'Dual Blades':
      weights.berserk = 18;
      weights.strife = 18;
      weights.stamina_surge = 10;
      weights.constitution = 8;
      weights.heaven_sent = 14;
      break;
    case 'Lance':
      weights.offensive_guard = 18;
      weights.guard = 14;
      weights.guard_up = 10;
      weights.embolden = 12;
      break;
    case 'Gunlance':
      weights.artillery = 22;
      weights.load_shells = 18;
      weights.wirebug_whisperer = 15;
      weights.evade_extender = 12;
      weights.guard = 11;
      weights.razor_sharp = 12;
      weights.heaven_sent = 15;
      break;
    case 'Hammer':
      weights.focus = 14;
      weights.slugger = 11;
      weights.wirebug_whisperer = 13;
      break;
    case 'Hunting Horn':
      weights.horn_maestro = 24;
      weights.wirebug_whisperer = 15;
      weights.evade_extender = 9;
      break;
    case 'Switch Axe':
      weights.rapid_morph = 24;
      weights.power_prolonger = 10;
      weights.wirebug_whisperer = 12;
      weights.evade_extender = 10;
      break;
    case 'Charge Blade':
      weights.rapid_morph = 20;
      weights.load_shells = 18;
      weights.guard = 12;
      weights.guard_up = 9;
      if (!TRUE_ELEMENTS.has(weapon.elementType)) {
        weights.artillery = 16;
      }
      break;
    case 'Insect Glaive':
      weights.power_prolonger = 12;
      weights.wirebug_whisperer = 13;
      weights.evade_extender = 9;
      weights.heaven_sent = 15;
      break;
    case 'Light Bowgun':
      weights.rapid_fire_up = 20;
      weights.pierce_up = 17;
      weights.spread_up = 15;
      weights.normal_rapid_up = 13;
      weights.recoil_down = 16;
      weights.reload_speed = 15;
      weights.spare_shot = 14;
      weights.ammo_up = 13;
      break;
    case 'Heavy Bowgun':
      weights.pierce_up = 18;
      weights.spread_up = 17;
      weights.normal_rapid_up = 13;
      weights.recoil_down = 16;
      weights.reload_speed = 15;
      weights.spare_shot = 15;
      weights.ammo_up = 15;
      weights.evade_extender = 10;
      break;
    case 'Bow':
      weights.constitution = 17;
      weights.stamina_surge = 16;
      weights.normal_rapid_up = 16;
      weights.spread_up = 16;
      weights.pierce_up = 14;
      weights.berserk = 18;
      weights.strife = 18;
      weights.reload_speed = 11;
      break;
  }

  return weights;
}

function scoreTalismanForWeights(
  talisman: TalismanItem,
  weights: Record<string, number>
): number {
  let score = 0;
  if (talisman.skill1Id && talisman.skill1Level > 0) {
    score += (weights[talisman.skill1Id] ?? 2) * talisman.skill1Level;
  }
  if (talisman.skill2Id && talisman.skill2Level > 0) {
    score += (weights[talisman.skill2Id] ?? 2) * talisman.skill2Level;
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
 * Greedily fills weapon, 5 armor pieces, and talisman slots using ONLY allowed decorations,
 * respecting exact slot levels and never exceeding any skill's maxLevel.
 */
function slotOptimalDecorations(
  weapon: WeaponItem,
  armor: Record<ArmorSlot, ArmorItem>,
  talisman: TalismanItem,
  allowedDecos: DecorationItem[],
  weights: Record<string, number>,
  preferredDecoIds?: string[]
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

  const preferredSet = new Set(preferredDecoIds ?? []);
  const normalDecos = allowedDecos.filter((d) => !d.isRampage);

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

  // Fill smallest slots first or largest slots first? Smallest slots (Lv1) first prevents wasting Lv4 slots on Lv1 decos,
  // OR fill Lv1 slots first with Lv1 decos, then Lv2, Lv3, Lv4 so high-priority Lv2 skills aren't starved while Lv1 skills fill Lv1 slots!
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

  // Sort smallest slot level first (1 -> 2 -> 3 -> 4) so Lv1 slots handle Lv1 elemental/utility decos
  // before larger slots pick multi-point Lv4/Lv2 decos.
  slotEntries.sort((a, b) => a.level - b.level);

  for (const entry of slotEntries) {
    let bestDeco: DecorationItem | null = null;
    let bestValue = 0;

    for (const d of normalDecos) {
      if (d.slotLevel > entry.level) continue;
      const skillDef = getSkillById(d.skillId);
      const maxLv = skillDef?.maxLevel ?? 7;
      const currentLv = skillTotals[d.skillId] ?? 0;
      const usablePoints = Math.max(0, Math.min(d.points, maxLv - currentLv));
      if (usablePoints <= 0) continue;

      const weight = weights[d.skillId] ?? 1.5;
      // Prefer decos that utilize the slot efficiently (e.g. Lv4 deco in Lv4 slot, or Lv2 in Lv2)
      const slotEfficiencyBonus = d.slotLevel === entry.level ? 1.08 : 0.96;
      const preferredBonus = preferredSet.has(d.id) ? 1.15 : 1.0;
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
    }
  }

  return result;
}

function chooseBestScrollMode(
  weapon: WeaponItem,
  armorSkills: Record<string, number>
): ScrollMode {
  if ((armorSkills.berserk ?? 0) > 0 || (armorSkills.strife ?? 0) > 0) {
    return 'Blue';
  }
  if ((armorSkills.dragon_conversion ?? 0) > 0 || (armorSkills.furious ?? 0) > 0) {
    return 'Red';
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

      // Pull synced weapon: use template weapon if owned, otherwise substitute best owned weapon of same class
      let adaptedWeapon = weapon;
      let weaponOwnedInBox = ownedWeaponSet.has(weapon.id);
      let substitutedWeapon = false;

      if (!weaponOwnedInBox) {
        const classOwnedWeapons = WEAPONS_DB.filter(
          (w) => w.weaponClass === template.weaponClass && ownedWeaponSet.has(w.id)
        ).sort((a, b) => scoreWeaponForSelection(b) - scoreWeaponForSelection(a));

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

      // Count decorations slotted in template that exist in ownedDecoIds
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
      const ownedDecoCount = templateDecoIds.filter((id) =>
        ownedDecoSet.has(id)
      ).length;
      const decoOwnershipPercent =
        totalDecoCount === 0 ? 100 : Math.round((ownedDecoCount / totalDecoCount) * 100);

      const missingDecoNames = Array.from(
        new Set(
          templateDecoIds
            .filter((id) => !ownedDecoSet.has(id))
            .map((id) => getDecorationById(id)?.name ?? id)
        )
      );

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
        templateDecoIds
      );

      const adaptedRampage = ownedDecoSet.has(template.loadout.rampageDecoId)
        ? template.loadout.rampageDecoId
        : chooseBestRampageDeco(adaptedWeapon, ownedDecoSet);

      const adaptedLoadout: BuildLoadout = {
        ...template.loadout,
        id: `owned_${template.id}_${adaptedWeapon.id}`,
        name: `${template.title} (Your Box)`,
        weaponId: adaptedWeapon.id,
        talisman: talismanToUse,
        rampageDecoId: adaptedRampage,
        decorations: adaptedDecos,
        updatedAt: new Date().toISOString(),
      };
      const adaptedStats = calculateBuildStats(adaptedLoadout);

      // Crafting summary against user's Material Box (for adapted loadout using synced weapon if owned)
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
  weights: Record<string, number>
): number {
  let score = 0;
  for (const [sk, pts] of Object.entries(piece.skills)) {
    score += (weights[sk] ?? 1.5) * pts;
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

  // Pick top weapons per weapon class so every owned class gets strong representation
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

    // Rank top 4 armor pieces per slot for this specific weapon
    const topSlotPieces: Record<ArmorSlot, ArmorItem[]> = {
      Helm: [...armorBySlot.Helm]
        .sort((a, b) => scoreArmorPieceForWeapon(b, weights) - scoreArmorPieceForWeapon(a, weights))
        .slice(0, 4),
      Chest: [...armorBySlot.Chest]
        .sort((a, b) => scoreArmorPieceForWeapon(b, weights) - scoreArmorPieceForWeapon(a, weights))
        .slice(0, 4),
      Arms: [...armorBySlot.Arms]
        .sort((a, b) => scoreArmorPieceForWeapon(b, weights) - scoreArmorPieceForWeapon(a, weights))
        .slice(0, 4),
      Waist: [...armorBySlot.Waist]
        .sort((a, b) => scoreArmorPieceForWeapon(b, weights) - scoreArmorPieceForWeapon(a, weights))
        .slice(0, 4),
      Legs: [...armorBySlot.Legs]
        .sort((a, b) => scoreArmorPieceForWeapon(b, weights) - scoreArmorPieceForWeapon(a, weights))
        .slice(0, 4),
    };

    // Evaluate combinations across the top candidates (up to 4^5 = 1024 combos) using quick skill + slot heuristic
    let bestCombo: {
      Helm: ArmorItem;
      Chest: ArmorItem;
      Arms: ArmorItem;
      Waist: ArmorItem;
      Legs: ArmorItem;
    } | null = null;
    let bestComboScore = -Infinity;

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

              let skillScore = 0;
              for (const [sk, rawPts] of Object.entries(skillTotals)) {
                const maxLv = getSkillById(sk)?.maxLevel ?? 7;
                const cappedPts = Math.min(rawPts, maxLv);
                const overcapPenalty = Math.max(0, rawPts - maxLv) * 3;
                skillScore += cappedPts * (weights[sk] ?? 1.5) - overcapPenalty;
              }

              const total = skillScore + slotScore;
              if (total > bestComboScore) {
                bestComboScore = total;
                bestCombo = { Helm: helm, Chest: chest, Arms: arms, Waist: waist, Legs: legs };
              }
            }
          }
        }
      }
    }

    if (!bestCombo) continue;

    const armorSkills: Record<string, number> = {};
    for (const p of Object.values(bestCombo)) {
      for (const [sk, pts] of Object.entries(p.skills)) {
        armorSkills[sk] = (armorSkills[sk] ?? 0) + pts;
      }
    }

    const scrollMode = chooseBestScrollMode(weapon, armorSkills);
    const decorations = slotOptimalDecorations(
      weapon,
      bestCombo,
      bestTalisman,
      allowedDecos,
      weights
    );
    const rampageDecoId = chooseBestRampageDeco(weapon, allowedDecoSet);

    const loadout: BuildLoadout = {
      id: `box_opt_${weapon.id}`,
      name: `${weapon.name} (Box Optimized)`,
      weaponClass: weapon.weaponClass,
      weaponId: weapon.id,
      helmId: bestCombo.Helm.id,
      chestId: bestCombo.Chest.id,
      armsId: bestCombo.Arms.id,
      waistId: bestCombo.Waist.id,
      legsId: bestCombo.Legs.id,
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

    // Count slots filled vs total
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

    // Track any unowned pieces included via Material Box craftability
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

    const elemFactor =
      weapon.weaponClass === 'Dual Blades' ||
      weapon.weaponClass === 'Bow' ||
      weapon.weaponClass === 'Charge Blade'
        ? 1.85
        : 1.15;
    const score = Math.round(
      stats.effectiveRaw + stats.effectiveElement * elemFactor + bestComboScore * 0.25
    );

    const topSkills = Object.entries(stats.skills)
      .sort((a, b) => (weights[b[0]] ?? 1) * b[1] - (weights[a[0]] ?? 1) * a[1])
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
