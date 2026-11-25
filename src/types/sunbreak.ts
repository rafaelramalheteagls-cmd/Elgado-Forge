export type WeaponClass =
  | 'Great Sword'
  | 'Long Sword'
  | 'Sword & Shield'
  | 'Dual Blades'
  | 'Lance'
  | 'Gunlance'
  | 'Hammer'
  | 'Hunting Horn'
  | 'Switch Axe'
  | 'Charge Blade'
  | 'Insect Glaive'
  | 'Light Bowgun'
  | 'Heavy Bowgun'
  | 'Bow';

export type ElementType =
  | 'None'
  | 'Fire'
  | 'Water'
  | 'Thunder'
  | 'Ice'
  | 'Dragon'
  | 'Poison'
  | 'Paralysis'
  | 'Sleep'
  | 'Blast';

export type SharpnessTier =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'White'
  | 'Purple';

export type ArmorSlot = 'Helm' | 'Chest' | 'Arms' | 'Waist' | 'Legs';

export type RankTier = 'LR' | 'HR' | 'MR' | 'Early MR' | 'Story MR' | 'MR 10+' | 'Endgame AR';

export type SkillCategory =
  | 'Attack'
  | 'Affinity'
  | 'Elemental'
  | 'Sharpness'
  | 'Endgame'
  | 'Utility';

export type ScrollMode = 'Red' | 'Blue';

export type DamageType = 'Sever' | 'Blunt' | 'Shot';

export type MonsterState = 'Normal' | 'Enraged' | 'Anomaly Toppled';

export interface SkillDefinition {
  id: string;
  name: string;
  maxLevel: number;
  category: SkillCategory;
  summary: string;
  levelDescriptions: string[];
  sourceId?: number;
  sourceKind?: 'Skill' | 'MrSkill';
  isLegacy?: boolean;
}

export interface WeaponItem {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  rarity: number;
  rankTier: RankTier;
  minMr: number;
  minAr: number;
  raw: number;
  elementType: ElementType;
  elementValue: number;
  affinity: number;
  defenseBonus: number;
  sharpness: SharpnessTier;
  handicraftBonusSharpness?: SharpnessTier;
  handicraftThreshold?: number;
  slots: [number, number, number];
  rampageSlot: number;
  damageType: DamageType;
  unlockNote: string;
  sourceId?: number;
  sourceSharpnessGauge?: number[];
  sourceSlots?: number[];
  sourceRampageSlots?: number[];
  sourceProgression?: { village?: unknown; hall?: unknown; masterRank?: unknown; craftingProgressFlags?: number[] };
  sourceCrafting?: unknown[];
  sourceDetails?: unknown;
  isLegacy?: boolean;
}

export interface ArmorItem {
  id: string;
  name: string;
  slot: ArmorSlot;
  rarity: number;
  rankTier: RankTier;
  minMr: number;
  minAr: number;
  defense: number;
  resistances: {
    fire: number;
    water: number;
    thunder: number;
    ice: number;
    dragon: number;
  };
  slots: [number, number, number];
  skills: Record<string, number>;
  unlockNote: string;
  sourceId?: number;
  sourceSeriesId?: number;
  sourceSeriesName?: string;
  variantLabel?: string;
  sourceRankGroup?: string;
  sourceSlots?: number[];
  nameResolved?: boolean;
  isSelectable?: boolean;
  isLegacy?: boolean;
}

export interface DecorationItem {
  id: string;
  name: string;
  slotLevel: 1 | 2 | 3 | 4;
  isRampage?: boolean;
  skillId: string;
  points: number;
  rankTier: RankTier;
  minMr: number;
  sourceId?: number;
  sourceSkills?: Array<{ skillId: string; skillName: string; level: number }>;
  skillName?: string;
  rampageWeaponClasses?: WeaponClass[];
  isLegacy?: boolean;
}

export interface TalismanItem {
  id: string;
  name: string;
  skill1Id: string;
  skill1Level: number;
  skill2Id: string;
  skill2Level: number;
  slots: [number, number, number];
  source?: 'Custom' | 'Imported' | 'Preset';
}

export interface QuriousWeaponAugment {
  attackLevel: number; // 0..4
  elementLevel: number; // 0..8
  affinityLevel: number; // 0..3
  sharpnessBoost: boolean;
  extraSlotLevel: number; // 0..2
}

export interface QuriousArmorAugment {
  defenseDelta: number;
  skillAddedId: string;
  skillAddedPoints: number;
  skillRemovedId?: string;
  slotUpgrade: number; // 0..2
}

export type BowgunAmmoId = `${'Normal' | 'Kantsu' | 'SanW'}${1 | 2 | 3}`;

export interface BuildLoadout {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  weaponId: string;
  bowgunAmmo?: BowgunAmmoId;
  helmId: string;
  chestId: string;
  armsId: string;
  waistId: string;
  legsId: string;
  talisman: TalismanItem;
  rampageDecoId: string;
  decorations: {
    weapon: string[];
    helm: string[];
    chest: string[];
    arms: string[];
    waist: string[];
    legs: string[];
    talisman: string[];
  };
  quriousWeapon: QuriousWeaponAugment;
  quriousArmor: Record<ArmorSlot, QuriousArmorAugment>;
  scrollMode: ScrollMode;
  updatedAt: string;
}

export interface MonsterHitzone {
  partName: string;
  sever: number;
  blunt: number;
  shot: number;
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
  isWeakspot: boolean;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  species: string;
  rankLabel: string;
  hpSolo: number;
  enrageDamageMod: number;
  primaryWeakness: ElementType;
  secondaryWeakness: ElementType;
  hitzones: MonsterHitzone[];
}

export interface ComboHit {
  moveName: string;
  motionValue: number; // e.g., 264 for TCS
  elementMod: number; // e.g., 1.0 or 1.5
  sharpnessCost: number;
  statusProcChance: number; // 0.33 default for melee
  isAerialOrWirebug?: boolean;
  damageType?: DamageType;
  rangedAttack?: 'bow-shot' | 'bowgun-magazine';
  gunlanceFullBurst?: boolean;
  chargeBladeSaedPhials?: boolean;
}

export interface WeaponCombo {
  id: string;
  weaponClass: WeaponClass;
  name: string;
  description: string;
  durationSec?: number;
  hits: ComboHit[];
}

export interface SimulationConfig {
  pierceTicksPerProjectile?: number;
  offensiveGuardUptime?: number;
  dragonConversionCharged?: boolean;
  monsterId: string;
  partName: string;
  monsterState: MonsterState;
  comboId: string;
  wexUptime: number; // 0..100
  elementExploitActive?: boolean;
  agitatorUptime: number; // 0..100
  bloodlustCleared: boolean;
  derelictionQurio: 1 | 2 | 3;
  frostcraftGauge: 0 | 1 | 2 | 3;
  burstActive: boolean;
  coalescenceActive: boolean;
  powercharmTalon: boolean;
  armorcharmTalon?: boolean;
  dangoBooster: boolean;
}

export interface CalculatedBuildStats {
  trueRaw: number;
  effectiveRaw: number;
  trueElement: number;
  effectiveElement: number;
  totalAffinity: number;
  weakspotAffinity: number;
  critMultiplier: number;
  sharpness: SharpnessTier;
  sharpnessRawMod: number;
  sharpnessElemMod: number;
  defense: number;
  resistances: {
    fire: number;
    water: number;
    thunder: number;
    ice: number;
    dragon: number;
  };
  skills: Record<string, number>;
  overcappedSkills: string[];
  activeEndgameEffects: string[];
}

export interface SimulationHitResult {
  moveName: string;
  rawDamage: number;
  elementDamage: number;
  totalAverageDamage: number;
  critDamage: number;
  shellCount?: number;
  shellingUnavailable?: boolean;
  attackUnavailable?: boolean;
  nonCritical?: boolean;
}

export interface SimulationResult {
  comboDamage: number;
  dps?: number;
  cycleSeconds?: number;
  isBowgunMagazine: boolean;
  rawSharePercent: number;
  elementSharePercent: number;
  estimatedClearSeconds?: number;
  hits: SimulationHitResult[];
  timeline: Array<{ second: number; cumulativeDamage: number }>;
}

export interface HunterProfile {
  hunterName: string;
  steamId64: string;
  steamPersona: string;
  steamAvatarUrl: string;
  playtimeHours: number;
  hr: number;
  mr: number;
  ar: number;
  steamEstimatedRanks?: { hr: number; mr: number; ar: number };
  achievementsUnlocked: number;
  achievementsTotal: number;
  unlockedMilestones: string[];
  lastSyncedAt: string | null;
}

export interface InventoryState {
  ownedWeaponIds: string[];
  ownedArmorIds: string[];
  ownedDecoIds: string[];
  ownedDecoCounts?: Record<string, number>;
  talismans: TalismanItem[];
  materials: Record<string, number>;
  autoSyncEnabled: boolean;
  lastInventorySyncAt: string | null;
}

export interface MetaBuildTemplate {
  id: string;
  title: string;
  weaponClass: WeaponClass;
  rankTier: RankTier;
  minMr: number;
  minAr: number;
  playstyle: string;
  summary: string;
  loadout: Omit<BuildLoadout, 'id' | 'updatedAt'>;
}

export interface SteamSyncResponse {
  ok: boolean;
  source: 'steam-web-api' | 'steam-community-xml';
  steamId64: string;
  personaName: string;
  avatarUrl: string;
  playtimeHours: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  estimatedHr: number;
  estimatedMr: number;
  estimatedAr: number;
  milestones: string[];
  warning?: string;
}

export interface MaterialCatalogEntry {
  name: string;
  source: string;
  rankTier: RankTier;
  category: 'Monster Part' | 'Anomaly' | 'Ore & Jewel' | 'Bone & Bug' | 'Ticket & Coin';
}

export interface CraftingMaterialReq {
  name: string;
  quantity: number;
  source: string;
}

export interface EquipmentRecipe {
  itemId: string;
  itemName: string;
  slotLabel: string;
  zennyCost: number;
  materials: CraftingMaterialReq[];
}

export interface MaterialShortfallItem {
  name: string;
  source: string;
  required: number;
  owned: number;
  shortfall: number;
}

export interface BuildCraftingSummary {
  totalZenny: number;
  ownedGearCount: number;
  totalGearCount: number;
  pieceBreakdowns: Array<{
    slotLabel: string;
    itemId: string;
    itemName: string;
    owned: boolean;
    zennyCost: number;
    materials: MaterialShortfallItem[];
    readyToCraft: boolean;
  }>;
  consolidatedMaterials: MaterialShortfallItem[];
}

