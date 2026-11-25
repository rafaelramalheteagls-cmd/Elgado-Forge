import catalog from './generated/mhriceAppCatalog.json';
import {
  ArmorItem,
  ArmorSlot,
  DecorationItem,
  ElementType,
  RankTier,
  SharpnessTier,
  SkillCategory,
  SkillDefinition,
  WeaponClass,
  WeaponItem,
} from '../types/sunbreak';
import { ARMOR_DB as LEGACY_ARMOR_DB } from './armorCatalog';
import { DECORATIONS_DB as LEGACY_DECORATIONS_DB, SKILLS_DB as LEGACY_SKILLS_DB } from './skillsAndDecos';
import { WEAPONS_DB as LEGACY_WEAPONS_DB } from './weaponCatalog';

type AnyRecord = Record<string, any>;
const data = catalog as AnyRecord;
export const AFFINITY_SKILL_EFFECTS = catalog.affinitySkillEffects;
export const ANOMALY_MATERIAL_SOURCES: Record<string, Array<{ monster: string; minLevel?: number; maxLevel?: number }>> =
  catalog.anomalyMaterialSources;
const sourceWeaponsById = new Map(catalog.weaponClasses.flatMap(group => group.weapons.map(weapon => [weapon.id, weapon] as const)));
const sourceWeaponIdByName = new Map([...sourceWeaponsById.values()].map(weapon => [weapon.name, weapon.id]));
export const CRAFTING_CATEGORY_MATERIALS: Record<string, Array<{ name: string; points: number }>> = catalog.craftingCategoryMaterials;
const materialNames: Record<string, string> = catalog.materialNames;
const categoryNames: Record<string, Record<string, string>> = catalog.materialCategoryNames;

export function getWeaponCraftingOptions(id: string) {
  const weapon = sourceWeaponsById.get(id);
  return (weapon?.crafting ?? []).flatMap(recipe => {
    if (recipe.kind !== 'product' && recipe.kind !== 'process') return [];
    if (recipe.kind === 'process' && !weapon?.craftingPredecessor) return [];

    const materials = recipe.materials.flatMap((item, index) => {
      if (typeof item !== 'object' || !('Normal' in item)) return [];
      const sourceId = item.Normal;
      const name = materialNames[sourceId];
      const count = recipe.materialCounts[index];
      return name && count > 0 ? [{ sourceId, name, count }] : [];
    });
    if (materials.length !== recipe.materialCounts.filter(count => count > 0).length) return [];

    const category = recipe.materialCategory;
    const categoryEntry = typeof category === 'object' ? Object.entries(category)[0] : undefined;
    const points = recipe.materialCategoryNum;
    const categoryName = categoryEntry && categoryNames[categoryEntry[0]]?.[categoryEntry[0] === 'Mr' ? 200 + categoryEntry[1] : categoryEntry[1]];
    if (points > 0 && !categoryName) return [];

    return [{
      label: recipe.kind === 'product' ? 'Forge' : `Upgrade from ${weapon?.craftingPredecessor}`,
      kind: recipe.kind,
      predecessorId: recipe.kind === 'process' ? sourceWeaponIdByName.get(weapon?.craftingPredecessor ?? '') : undefined,
      minMr: recipe.minCraftingMr,
      materials,
      unlock: recipe.unlock,
      zenny: getWeaponCraftingZenny(weapon?.sourceDetails, recipe.kind),
      category: points > 0 ? { name: categoryName, points } : undefined,
    }];
  });
}
function getWeaponCraftingZenny(source: AnyRecord | undefined, kind: 'product' | 'process') {
  while (source && !Object.hasOwn(source, 'base_val')) source = source.base;
  const value = source?.base_val;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return undefined;
  // MHRice gen_weapon.rs uses integer division for the Forge price.
  return kind === 'product' ? Math.floor(value * 3 / 2) : value;
}
const equipmentCraftingZennyById = new Map<string, number>();
const equipmentCraftingUnlockById = new Map<string, string[]>();
const equipmentCraftingMrById = new Map<string, number>();
const armorMaterialsById = new Map<string, NonNullable<(typeof catalog.armor)[number]['craftingMaterials']>>();
const decorationMaterialsById = new Map<string, NonNullable<(typeof catalog.decorations)[number]['craftingMaterials']>>();
const rampageCraftingCategoriesById = new Map<string, (typeof catalog.rampageDecorations)[number]['craftingCategory']>();
// Order of the game's HyakuryuDecoBaseData weapon_equip_flag vector.
const RAMPAGE_WEAPON_FLAG_ORDER: readonly WeaponClass[] = [
  'Great Sword', 'Switch Axe', 'Long Sword', 'Light Bowgun', 'Heavy Bowgun', 'Hammer',
  'Gunlance', 'Lance', 'Sword & Shield', 'Dual Blades', 'Hunting Horn', 'Charge Blade',
  'Insect Glaive', 'Bow',
];
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function uniqueMap<T>(entries: Array<[string, T]>): Map<string, T> {
  const counts = new Map<string, number>();
  for (const [key] of entries) counts.set(key, (counts.get(key) ?? 0) + 1);
  return new Map(entries.filter(([key]) => counts.get(key) === 1));
}
const legacySkillByName = uniqueMap(LEGACY_SKILLS_DB.map((s) => [normalize(s.name), s] as [string, typeof s]));
const legacyArmorByName = uniqueMap(LEGACY_ARMOR_DB.map((a) => [`${a.slot}:${normalize(a.name)}`, a] as [string, typeof a]));
const legacyDecoByName = uniqueMap(LEGACY_DECORATIONS_DB.map((d) => [`${normalize(d.name)}:${d.slotLevel}:${Boolean(d.isRampage)}`, d] as [string, typeof d]));
const sourceSkillNameCounts = new Map<string, number>();
for (const skill of data.skills as AnyRecord[]) sourceSkillNameCounts.set(normalize(skill.name), (sourceSkillNameCounts.get(normalize(skill.name)) ?? 0) + 1);
const sourceArmorNameCounts = new Map<string, number>();
const previousArmorNameCounts = new Map<string, number>();
for (const armor of data.armor as AnyRecord[]) {
  const key = `${armor.slot === 'Head' ? 'Helm' : armor.slot}:${normalize(armor.name)}`;
  sourceArmorNameCounts.set(key, (sourceArmorNameCounts.get(key) ?? 0) + 1);
  const previousKey = `${armor.slot === 'Head' ? 'Helm' : armor.slot}:${normalize(armor.previousName ?? armor.name)}`;
  previousArmorNameCounts.set(previousKey, (previousArmorNameCounts.get(previousKey) ?? 0) + 1);
}
const sourceDecoNameCounts = new Map<string, number>();
for (const deco of data.decorations as AnyRecord[]) { const key = `${normalize(deco.name)}:${deco.slotLevel}:false`; sourceDecoNameCounts.set(key, (sourceDecoNameCounts.get(key) ?? 0) + 1); }
for (const deco of data.rampageDecorations as AnyRecord[]) { const key = `${normalize(deco.name)}:${deco.slotLevel}:true`; sourceDecoNameCounts.set(key, (sourceDecoNameCounts.get(key) ?? 0) + 1); }

const skillIdBySource = new Map<string, string>();
const skillIdByName = new Map<string, string>();
const skills: SkillDefinition[] = (data.skills as AnyRecord[]).map((s) => {
  const legacy = sourceSkillNameCounts.get(normalize(s.name)) === 1 ? legacySkillByName.get(normalize(s.name)) : undefined;
  const id = legacy?.id ?? s.id;
  skillIdBySource.set(`${s.sourceKind}:${s.sourceId}`, id);
  skillIdByName.set(normalize(s.name), id);
  return {
    id,
    name: s.name,
    maxLevel: Math.max(1, (Number(s.maxLevel) || 0) + 1),
    category: categoryForSkill(s.name, s.description),
    summary: String(s.description || s.name).replace(/\s+/g, ' ').trim(),
    levelDescriptions: [],
    sourceId: s.sourceId,
    sourceKind: s.sourceKind,
  };
});
// Preserve legacy-only skill IDs referenced by older saved loadouts and presets.
const generatedSkillNames = new Set(skills.map((s) => normalize(s.name)));
for (const legacy of LEGACY_SKILLS_DB) {
  if (!generatedSkillNames.has(normalize(legacy.name))) skills.push({ ...legacy, isLegacy: true });
}

function categoryForSkill(name: string, description: string): SkillCategory {
  const text = `${name} ${description}`.toLowerCase();
  if (/attack|agitator|resentment|peak performance|offensive guard|foray|sneak attack|burst|mail of hellfire|dereliction/.test(text)) return 'Attack';
  if (/critical|affinity|weakness exploit|maximum might|latent power/.test(text)) return 'Affinity';
  if (/element|fire attack|water attack|ice attack|thunder attack|dragon attack|poison attack|paralysis attack|sleep attack|blast attack/.test(text)) return 'Elemental';
  if (/sharpness|handicraft|razor sharp|protective polish|master's touch/.test(text)) return 'Sharpness';
  if (/bloodlust|berserk|strife|frostcraft|qurio|anomaly|blood rite|intrepid heart|heaven-sent|embolden/.test(text)) return 'Endgame';
  return 'Utility';
}

function rankForRarity(rarity: number): RankTier {
  if (rarity <= 3) return 'LR';
  if (rarity <= 7) return 'HR';
  return 'MR';
}
function minMrForRank(rank: RankTier): number { return rank === 'MR' ? 1 : 0; }
function expandSlots(counts: number[] = []): [number, number, number] {
  const expanded: number[] = [];
  for (let level = counts.length; level >= 1; level--) {
    const count = Math.max(0, Math.floor(Number(counts[level - 1]) || 0));
    for (let i = 0; i < count; i++) expanded.push(level);
  }
  return [expanded[0] ?? 0, expanded[1] ?? 0, expanded[2] ?? 0];
}
const sharpnessNames: SharpnessTier[] = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'White', 'Purple'];
function highestSharpness(gauge: number[] = []): SharpnessTier {
  for (let i = sharpnessNames.length - 1; i >= 0; i--) if ((gauge[i] ?? 0) > 0) return sharpnessNames[i];
  // Gunner weapons do not use sharpness; the damage engine ignores this neutral placeholder.
  return 'Yellow';
}
function elementType(value: string): ElementType {
  if (value === 'Paralyze') return 'Paralysis';
  if (value === 'Bomb') return 'Blast';
  const allowed: ElementType[] = ['None', 'Fire', 'Water', 'Thunder', 'Ice', 'Dragon', 'Poison', 'Paralysis', 'Sleep', 'Blast'];
  return allowed.includes(value as ElementType) ? value as ElementType : 'None';
}
function weaponDamageType(cls: WeaponClass): 'Sever' | 'Blunt' | 'Shot' {
  if (cls === 'Light Bowgun' || cls === 'Heavy Bowgun' || cls === 'Bow') return 'Shot';
  if (cls === 'Hammer' || cls === 'Hunting Horn') return 'Blunt';
  return 'Sever';
}
export const MHRICE_WEAPONS_DB: WeaponItem[] = (data.weaponClasses as AnyRecord[]).flatMap((group) =>
  (group.weapons as AnyRecord[]).map((w) => {
    const cls = w.weaponClass as WeaponClass;
    const rankTier = rankForRarity(Number(w.rarity) || 1);
    const slots = expandSlots(w.slots);
    const rampageSlots = (w.rampageSlots as number[] | undefined) ?? [];
    const rampageSlot = rampageSlots.reduce((max, count, index) => count > 0 ? Math.max(max, index + 1) : max, 0);
    const gauge = (w.sharpness as number[] | undefined) ?? [];
    const sharp = highestSharpness(gauge);
    const recipeRanks = (w.crafting as Array<{ kind: string; minCraftingMr: number }>)
      .filter(recipe => recipe.kind === 'product' || recipe.kind === 'process')
      .map(recipe => recipe.minCraftingMr);
    if (recipeRanks.length) equipmentCraftingMrById.set(w.id, Math.min(...recipeRanks));
    return {
      id: w.id,
      name: w.name,
      weaponClass: cls,
      rarity: Number(w.rarity) || 1,
      rankTier,
      minMr: minMrForRank(rankTier),
      minAr: 0,
      raw: Number(w.attack) || 0,
      elementType: elementType(w.elementType),
      elementValue: Number(w.elementValue) || 0,
      affinity: Number(w.affinity) || 0,
      defenseBonus: Number(w.defenseBonus) || 0,
      sharpness: sharp,
      // Handicraft gauge-extension values are preserved below; the current app's
      // simplified sharpness model cannot represent the full seven-color gauge.
      handicraftBonusSharpness: undefined,
      handicraftThreshold: undefined,
      slots,
      rampageSlot,
      damageType: weaponDamageType(cls),
      unlockNote: `MHRice progression flag(s): ${(w.craftingProgressFlags ?? []).join(', ') || 'not specified in source'}`,
      sourceId: w.sourceId,
      sourceSharpnessGauge: gauge,
      sourceSlots: w.slots,
      sourceRampageSlots: rampageSlots,
      sourceProgression: { ...(w.treeProgress ?? {}), craftingProgressFlags: w.craftingProgressFlags ?? [] },
      sourceCrafting: w.crafting ?? [],
      sourceDetails: w.sourceDetails,
    } satisfies WeaponItem;
  }).filter((w) => w.raw > 0)
);

const armorSlotMap: Record<string, ArmorSlot> = { Head: 'Helm', Chest: 'Chest', Arms: 'Arms', Waist: 'Waist', Legs: 'Legs' };
export const MHRICE_ARMOR_DB: ArmorItem[] = (data.armor as AnyRecord[]).map((a) => {
  const rankTier: RankTier = a.rankGroup === 'Lower' ? 'LR' : a.rankGroup === 'Upper' ? 'HR' : 'MR';
  const slot = armorSlotMap[a.slot] ?? 'Helm';
  const skills: Record<string, number> = {};
  for (const s of (a.skills ?? []) as AnyRecord[]) {
    const id = skillIdBySource.get(`${s.sourceSkillKind}:${s.sourceSkillId}`) ?? skillIdByName.get(normalize(s.skillName)) ?? s.skillId;
    skills[id] = (skills[id] ?? 0) + (Number(s.level) || 0);
  }
  const armorKey = `${slot}:${normalize(a.name)}`;
  const hasSharedName = (sourceArmorNameCounts.get(armorKey) ?? 0) > 1;
  const previousKey = `${slot}:${normalize(a.previousName ?? a.name)}`;
  const legacy = previousArmorNameCounts.get(previousKey) === 1 ? legacyArmorByName.get(previousKey) : undefined;
  const id = legacy?.id ?? a.id;
  if (a.craftingMaterials?.length) armorMaterialsById.set(id, a.craftingMaterials);
  if (typeof a.craftingZenny === 'number') equipmentCraftingZennyById.set(id, a.craftingZenny);
  if (a.craftingUnlock?.length) equipmentCraftingUnlockById.set(id, a.craftingUnlock);
  if (a.minCraftingMr > 0) equipmentCraftingMrById.set(id, a.minCraftingMr);
  const variant = a.sourceUpgrade === 'ChangedEx' ? 'Stormsoul upgrade'
    : a.sourceUpgrade && typeof a.sourceUpgrade === 'object' ? 'Base version'
    : a.sourceEquipRestriction === 'MaleOnly' ? 'Male only'
    : a.sourceEquipRestriction === 'FemaleOnly' ? 'Female only'
    : `MHRice ID ${a.sourceId}`;
  return {
    id,
    name: a.name,
    slot,
    rarity: Number(a.rarity) || 1,
    rankTier,
    minMr: minMrForRank(rankTier),
    minAr: 0,
    defense: Number(a.defense) || 0,
    resistances: {
      fire: Number(a.resistances?.fire) || 0,
      water: Number(a.resistances?.water) || 0,
      thunder: Number(a.resistances?.thunder) || 0,
      ice: Number(a.resistances?.ice) || 0,
      dragon: Number(a.resistances?.dragon) || 0,
    },
    slots: expandSlots(a.decorationSlots),
    skills,
    unlockNote: `MHRice ${a.rankGroup ?? 'unknown'} rank · ${a.seriesName ?? 'Unknown series'}`,
    variantLabel: hasSharedName ? variant : undefined,
    sourceId: a.sourceId,
    sourceSeriesId: a.seriesId,
    sourceSeriesName: a.seriesName,
    isSelectable: a.isSelectable,
    sourceRankGroup: a.rankGroup,
    sourceSlots: a.decorationSlots,
    nameResolved: Boolean(a.nameResolved),
  } satisfies ArmorItem;
});

function mapSourceSkills(sourceSkills: AnyRecord[] = []) {
  return sourceSkills.map((s) => ({
    skillId: skillIdBySource.get(`${s.sourceSkillKind}:${s.sourceSkillId}`) ?? skillIdByName.get(normalize(s.skillName)) ?? s.skillId,
    skillName: s.skillName,
    level: Number(s.level) || 0,
  }));
}
export const MHRICE_DECORATIONS_DB: DecorationItem[] = [
  ...(data.decorations as AnyRecord[]).map((d) => {
    const mapped = mapSourceSkills(d.skills);
    const rankTier = rankForRarity(Number(d.rarity) || 1);
    const decoKey = `${normalize(d.name)}:${d.slotLevel}:false`;
    const legacy = sourceDecoNameCounts.get(decoKey) === 1 ? legacyDecoByName.get(decoKey) : undefined;
    const id = legacy?.id ?? d.id;
    if (d.craftingMaterials?.length) decorationMaterialsById.set(id, d.craftingMaterials);
    if (d.craftingUnlock?.length) equipmentCraftingUnlockById.set(id, d.craftingUnlock);
    if (d.minCraftingMr > 0) equipmentCraftingMrById.set(id, d.minCraftingMr);
    if (typeof d.craftingZenny === 'number') equipmentCraftingZennyById.set(id, d.craftingZenny);
    return {
      id,
      name: d.name,
      slotLevel: Math.max(1, Math.min(4, Number(d.slotLevel) || 1)) as 1 | 2 | 3 | 4,
      skillId: mapped[0]?.skillId ?? 'unknown',
      points: mapped[0]?.level ?? 0,
      rankTier,
      minMr: minMrForRank(rankTier),
      sourceId: d.sourceId,
      sourceSkills: mapped,
    } satisfies DecorationItem;
  }),
  ...(data.rampageDecorations as AnyRecord[]).map((d) => {
    const slotLevel = Math.max(1, Math.min(4, Number(d.slotLevel) || 1)) as 1 | 2 | 3 | 4;
    const decoKey = `${normalize(d.name)}:${slotLevel}:true`;
    const legacy = sourceDecoNameCounts.get(decoKey) === 1 ? legacyDecoByName.get(decoKey) : undefined;
    const rankTier = rankForRarity(Number(d.rarity) || 8);
    const id = legacy?.id ?? d.id;
    if (d.craftingMaterials?.length) decorationMaterialsById.set(id, d.craftingMaterials);
    if (d.craftingCategory) rampageCraftingCategoriesById.set(id, d.craftingCategory);
    if (d.minCraftingMr > 0) equipmentCraftingMrById.set(id, d.minCraftingMr);
    if (typeof d.craftingZenny === 'number') equipmentCraftingZennyById.set(id, d.craftingZenny);
    if (d.craftingUnlock?.length) equipmentCraftingUnlockById.set(id, d.craftingUnlock);
    return {
      id,
      name: d.name,
      slotLevel,
      isRampage: true,
      skillId: `rampage:${d.skillSourceId}`,
      skillName: d.skillName,
      rampageWeaponClasses: RAMPAGE_WEAPON_FLAG_ORDER.filter((_, index) => d.weaponEquipFlags[index] === true),
      points: 1,
      rankTier,
      minMr: minMrForRank(rankTier),
      sourceId: d.sourceId,
    } satisfies DecorationItem;
  }),
];

export function getArmorCraftingMaterials(id: string) {
  return armorMaterialsById.get(id);
}

export function getEquipmentCraftingZenny(id: string) {
  return equipmentCraftingZennyById.get(id);
}

export function getEquipmentCraftingUnlock(id: string) {
  return equipmentCraftingUnlockById.get(id);
}

export function getMinimumCraftingMr(id: string) {
  return equipmentCraftingMrById.get(id) ?? 0;
}

export function getDecorationCraftingMaterials(id: string) {
  return decorationMaterialsById.get(id);
}

export function getRampageCraftingCategory(id: string) {
  return rampageCraftingCategoriesById.get(id);
}

export const MHRICE_SKILLS_DB = skills;
export const LEGACY_CATALOGS = {
  weapons: LEGACY_WEAPONS_DB,
  armor: LEGACY_ARMOR_DB,
  decorations: LEGACY_DECORATIONS_DB,
  skills: LEGACY_SKILLS_DB,
};
export const MHRICE_IMPORT_METADATA = data.metadata;
