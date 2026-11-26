import {
  ARMOR_DB,
  DECORATIONS_DB,
  DEFAULT_TALISMAN,
  getArmorById,
  getDecorationById,
  getWeaponById,
  MATERIALS_CATALOG,
  SKILLS_DB,
  STARTER_LOADOUT,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { DECORATION_NAMES_BY_GAME_ID } from '../data/mhriceDecorationIds';
import catalog from '../data/generated/mhriceAppCatalog.json';
import { EMPTY_ARMOR_AUGMENT, EMPTY_Q_ARMOR, EMPTY_Q_WEAPON } from '../data/quriousDefaults';
import {
  BuildLoadout,
  HunterProfile,
  InventoryState,
  SteamSyncResponse,
  TalismanItem,
} from '../types/sunbreak';

const STORAGE_KEYS = {
  SAVED_BUILDS: 'elgado_forge_saved_builds_v1',
  FAVORITE_IDS: 'elgado_forge_favorite_ids_v1',
  ACTIVE_BUILD: 'elgado_forge_active_build_v1',
  HUNTER_PROFILE: 'elgado_forge_hunter_profile_v1',
  INVENTORY: 'elgado_forge_inventory_v1',
};

export const DEFAULT_HUNTER_PROFILE: HunterProfile = {
  hunterName: 'Elgado Hunter',
  steamId64: '',
  steamPersona: '',
  steamAvatarUrl: '',
  playtimeHours: 0,
  hr: 100,
  mr: 10,
  ar: 50,
  achievementsUnlocked: 0,
  achievementsTotal: 100,
  unlockedMilestones: [],
  lastSyncedAt: null,
};

export function createDefaultInventory(): InventoryState {
  return {
    ownedWeaponIds: [],
    ownedArmorIds: [],
    ownedDecoIds: [],
    ownedDecoCounts: {},
    talismans: [],
    materials: {},
    autoSyncEnabled: false,
    lastInventorySyncAt: null,
  };
}

function withQuriousDefaults(build: BuildLoadout): BuildLoadout {
  const quriousArmor = { ...EMPTY_Q_ARMOR };
  for (const slot of Object.keys(quriousArmor) as Array<keyof typeof quriousArmor>) {
    quriousArmor[slot] = { ...EMPTY_ARMOR_AUGMENT, ...build.quriousArmor?.[slot] };
  }
  return { ...build, quriousWeapon: { ...EMPTY_Q_WEAPON, ...build.quriousWeapon }, quriousArmor };
}

export function loadSavedBuilds(): BuildLoadout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_BUILDS);
    if (!raw) return [STARTER_LOADOUT];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(build => build?.weaponId).map(withQuriousDefaults) : [STARTER_LOADOUT];
  } catch {
    return [STARTER_LOADOUT];
  }
}

export function saveBuildsList(builds: BuildLoadout[]): void {
  localStorage.setItem(STORAGE_KEYS.SAVED_BUILDS, JSON.stringify(builds));
}

export function loadFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_IDS);
    if (!raw) return [STARTER_LOADOUT.id];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [STARTER_LOADOUT.id];
  } catch {
    return [STARTER_LOADOUT.id];
  }
}

export function saveFavoriteIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.FAVORITE_IDS, JSON.stringify(ids));
}

export function loadActiveBuild(): BuildLoadout {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_BUILD);
    if (!raw) return STARTER_LOADOUT;
    const parsed = JSON.parse(raw);
    return parsed?.weaponId ? withQuriousDefaults(parsed) : STARTER_LOADOUT;
  } catch {
    return STARTER_LOADOUT;
  }
}

export function saveActiveBuild(build: BuildLoadout): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_BUILD, JSON.stringify(build));
}

export function loadHunterProfile(): HunterProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HUNTER_PROFILE);
    if (!raw) return DEFAULT_HUNTER_PROFILE;
    return { ...DEFAULT_HUNTER_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HUNTER_PROFILE;
  }
}

export function saveHunterProfile(profile: HunterProfile): void {
  localStorage.setItem(STORAGE_KEYS.HUNTER_PROFILE, JSON.stringify(profile));
}

export function mergeSteamProfile(profile: HunterProfile, steam: SteamSyncResponse, syncedAt: string): HunterProfile {
  return {
    ...profile,
    hunterName: steam.personaName || profile.hunterName,
    steamId64: steam.steamId64,
    steamPersona: steam.personaName,
    steamAvatarUrl: steam.avatarUrl,
    playtimeHours: steam.playtimeHours,
    achievementsUnlocked: steam.achievementsUnlocked,
    achievementsTotal: steam.achievementsTotal,
    unlockedMilestones: steam.milestones,
    steamEstimatedRanks: { hr: steam.estimatedHr, mr: steam.estimatedMr, ar: steam.estimatedAr },
    lastSyncedAt: syncedAt,
  };
}

const LEGACY_PRESET_TALISMAN_IDS = new Set([
  'tali_default_wex2',
  'tali_ab3_ce2',
  'tali_berserk2',
  'tali_frostcraft3',
  'tali_moh2',
]);

export function loadInventoryState(): InventoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) return createDefaultInventory();
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    const merged = { ...createDefaultInventory(), ...parsed };
    merged.talismans = Array.isArray(merged.talismans)
      ? merged.talismans.filter(
          (t) =>
            !(
              t.source === 'Preset' &&
              LEGACY_PRESET_TALISMAN_IDS.has(t.id)
            )
        )
      : [];
    return merged;
  } catch {
    return createDefaultInventory();
  }
}

export function saveInventoryState(inv: InventoryState): void {
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
}

// URL Share Codec (#build=<base64url>)
export function encodeBuildToShareUrl(loadout: BuildLoadout): string {
  const json = JSON.stringify(loadout);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#build=${b64}`;
}

export function decodeBuildFromHash(hashStr: string): BuildLoadout | null {
  try {
    if (!hashStr || !hashStr.includes('build=')) return null;
    const raw = hashStr.split('build=')[1]?.split('&')[0];
    if (!raw) return null;
    const norm = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = norm.length % 4 === 0 ? norm : norm + '='.repeat(4 - (norm.length % 4));
    const binary = atob(pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return normalizeSharedBuild(JSON.parse(json));
  } catch {
    return null;
  }
}

function normalizeSharedBuild(parsed: BuildLoadout): BuildLoadout | null {
  if (!parsed || typeof parsed.weaponId !== 'string' || typeof parsed.helmId !== 'string' ||
      !parsed.decorations || typeof parsed.decorations !== 'object' || Array.isArray(parsed.decorations)) return null;
  const weapon = getWeaponById(parsed.weaponId);
  if (!weapon) return null;
  const decorations = { ...parsed.decorations };
  for (const key of Object.keys(STARTER_LOADOUT.decorations) as Array<keyof typeof decorations>) {
    const group = decorations[key];
    if (group === undefined) decorations[key] = [];
    else if (!Array.isArray(group) || group.some((id) => typeof id !== 'string')) return null;
  }
  const talisman = parsed.talisman ?? DEFAULT_TALISMAN;
  if (!Array.isArray(talisman.slots) || talisman.slots.length !== 3 ||
      talisman.slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot > 4)) return null;
  if (parsed.quriousWeapon === null || parsed.quriousArmor === null) return null;
  return withQuriousDefaults({
    ...STARTER_LOADOUT, ...parsed, weaponClass: weapon.weaponClass, decorations, talisman,
    quriousWeapon: parsed.quriousWeapon, quriousArmor: parsed.quriousArmor,
  });
}

function restoreBackupBuild(build: BuildLoadout): BuildLoadout | null {
  if (typeof build?.id !== 'string' || !build.id.trim() || typeof build.name !== 'string') return null;
  const optionalRecord = (value: unknown) => value === undefined
    || (value !== null && typeof value === 'object' && !Array.isArray(value));
  if (!optionalRecord(build.quriousWeapon) || !optionalRecord(build.quriousArmor)) return null;
  const normalized = normalizeSharedBuild(build);
  if (!normalized) return null;
  const armorSlots = ['Helm', 'Chest', 'Arms', 'Waist', 'Legs'] as const;
  for (const slot of armorSlots) {
    if (!optionalRecord(build.quriousArmor?.[slot])) return null;
    const key = `${slot.toLowerCase()}Id` as 'helmId' | 'chestId' | 'armsId' | 'waistId' | 'legsId';
    const id = normalized[key];
    if (typeof id !== 'string' || (id && getArmorById(id)?.slot !== slot)) return null;
    const augment = normalized.quriousArmor[slot];
    if (!Number.isSafeInteger(augment.defenseDelta) || !Number.isSafeInteger(augment.skillAddedPoints)
      || !Number.isSafeInteger(augment.slotUpgrade) || typeof augment.skillAddedId !== 'string'
      || (augment.skillRemovedId !== undefined && typeof augment.skillRemovedId !== 'string')) return null;
  }
  const weaponAugment = normalized.quriousWeapon;
  if (![weaponAugment.attackLevel, weaponAugment.elementLevel, weaponAugment.affinityLevel, weaponAugment.extraSlotLevel]
    .every(Number.isSafeInteger) || typeof weaponAugment.sharpnessBoost !== 'boolean') return null;
  const charm = normalized.talisman;
  if (typeof charm.id !== 'string' || typeof charm.name !== 'string'
    || typeof charm.skill1Id !== 'string' || typeof charm.skill2Id !== 'string'
    || !Number.isSafeInteger(charm.skill1Level) || !Number.isSafeInteger(charm.skill2Level)
    || typeof normalized.updatedAt !== 'string' || typeof normalized.rampageDecoId !== 'string'
    || (normalized.scrollMode !== 'Red' && normalized.scrollMode !== 'Blue')
    || (normalized.bowgunAmmo !== undefined && (typeof normalized.bowgunAmmo !== 'string'
      || !/^(Normal|Kantsu|SanW)[1-3]$/.test(normalized.bowgunAmmo)))) return null;
  return normalized;
}

export function parseBuildsBackup(raw: string): { builds: BuildLoadout[]; invalidRows: number[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const builds: BuildLoadout[] = [];
  const invalidRows: number[] = [];
  for (const [index, row] of parsed.entries()) {
    const build = restoreBackupBuild(row);
    if (build) builds.push(build);
    else invalidRows.push(index + 1);
  }
  return { builds, invalidRows };
}

export function partitionBuildsBackup(builds: BuildLoadout[], savedBuilds: BuildLoadout[]) {
  const existingIds = new Set(savedBuilds.map(build => build.id));
  const added: BuildLoadout[] = [];
  const duplicates: BuildLoadout[] = [];
  for (const build of builds) {
    if (existingIds.has(build.id)) duplicates.push(build);
    else {
      added.push(build);
      existingIds.add(build.id);
    }
  }
  return { added, duplicates };
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const SKILL_LOOKUP = new Map<string, string>();
SKILLS_DB.forEach((s) => {
  SKILL_LOOKUP.set(normalizeKey(s.id), s.id);
  SKILL_LOOKUP.set(normalizeKey(s.name), s.id);
});

function indexEquipAliases(map: Map<string, string>, rawName: string, id: string) {
  const variants = new Set<string>([rawName]);
  const noRank = rawName.replace(/\((HR|MR)\)/gi, '').trim();
  variants.add(noRank);

  // Handle combined alias names like "Amulet / Tigrex Jawblade+"
  for (const base of Array.from(variants)) {
    if (base.includes('/')) {
      base.split('/').forEach((seg) => {
        const s = seg.trim();
        if (s) variants.add(s);
      });
    }
  }

  for (const v of Array.from(variants)) {
    if (/['’]s\b/i.test(v)) {
      variants.add(v.replace(/['’]s\b/gi, ''));
    }
    if (/Velociprey Vambraces/i.test(v)) {
      variants.add(v.replace(/Velociprey Vambraces/gi, 'Velociprey Braces'));
    }
    if (/Velociprey Braces/i.test(v)) {
      variants.add(v.replace(/Velociprey Braces/gi, 'Velociprey Vambraces'));
    }
    if (/Velociprey Coil/i.test(v)) {
      variants.add(v.replace(/Velociprey Coil/gi, 'Velociprey Tassets'));
    }
    if (/Velociprey Tassets/i.test(v)) {
      variants.add(v.replace(/Velociprey Tassets/gi, 'Velociprey Coil'));
    }
    if (/^Hermitaur\s/i.test(v)) {
      variants.add(`${v} X`);
      if (/Vambraces/i.test(v)) variants.add(v.replace(/Vambraces/gi, 'Braces') + ' X');
    }
    if (/^Ceanataur\s/i.test(v)) {
      variants.add(`${v} X`);
    }
    if (/^Golm\s+(Helm|Mail|Vambraces|Coil|Greaves)/i.test(v)) {
      variants.add(v.replace(/^Golm\b/i, 'Garangolm'));
    }
    if (/^Garangolm\s/i.test(v)) {
      variants.add(v.replace(/^Garangolm\b/i, 'Golm'));
    }
    if (/Lambent Hauberk/i.test(v)) {
      variants.add('Lambent Haori');
    }
    if (/Valstrax (.+) - Epoch/i.test(v)) {
      variants.add(v.replace(/Valstrax (.+) - Epoch/i, 'Risen Valstrax $1'));
    }
    if (/Primal/i.test(v)) {
      variants.add(v.replace(/Primal/gi, 'Primordial'));
    }
    if (/Primordial/i.test(v)) {
      variants.add(v.replace(/Primordial/gi, 'Primal'));
    }
    if (/^Fine Kamura\s/i.test(v)) {
      variants.add(v.replace(/^Fine Kamura\b/i, 'Kamura'));
      variants.add(v.replace(/^Fine Kamura\b/i, 'Kamura Legacy'));
      variants.add(v.replace(/^Fine Kamura\b/i, 'Kamura Heirloom'));
    }
    if (/^Royal Order's\s/i.test(v) && !v.endsWith('+')) {
      variants.add(`${v}+`);
    }
    if (v === "Duke's Claymore") variants.add('Decapitator Schneiden');
    if (v === "Duke's Sinclair") variants.add('Fissureforce');
    if (v === "Duke's Bayonet") variants.add('Scorched Schleien');
    if (v === "Duke's Grail") variants.add("Magician's Allure");
    if (v === "Duke's Scepter") variants.add('Whiplash Stock');
    if (v === "Duke's Arquebus") variants.add('Vigil Kugel');
    if (v === 'Dirty Marquis+') variants.add('Dirty Graf');
    if (v === 'Shieldraad+') variants.add('Armordraad');
    if (v === 'Longear Weiss+') variants.add('Splitear Weiss');
    if (v === "Daimyo's Warbow+") variants.add('Chelae Warbow');
    if (v === 'Kurenawi Kunpuu+') variants.add('Kurenawi Ougi+');
    if (v === "Teostra's Medal") {
      variants.add("Teostra's Emblem+");
      variants.add("Teostra's Emblem");
    }
    if (v === 'Abyssal Eruption') variants.add('Abyssal Wing');
    if (v === 'Silver Sunderer') variants.add('Epochal Greatsword');
    if (v === 'Silver Prominence') variants.add('Silver Lance');
    if (v === "Devil's Lute") variants.add('Tormented Soul Horn');
    if (v === 'Fine Kamura Cleaver') variants.add('Kamura Cleaver');
    if (v === 'Fine Kamura Rapier') {
      variants.add('Fine Kamura Heirloom');
      variants.add('Kamura Heirloom Blade');
    }
    if (/greatsword/i.test(v)) {
      variants.add(v.replace(/greatsword/gi, 'Great Sword'));
    }
    if (/great sword/i.test(v)) {
      variants.add(v.replace(/great sword/gi, 'Greatsword'));
    }
    if (/longsword/i.test(v)) {
      variants.add(v.replace(/longsword/gi, 'Long Sword'));
    }
    if (/long sword/i.test(v)) {
      variants.add(v.replace(/long sword/gi, 'Longsword'));
    }
  }

  for (const v of variants) {
    const k = normalizeKey(v);
    if (k && !map.has(k)) {
      map.set(k, id);
    }
  }
}

const KINSECT_KEYS = new Set(
  [
    ...catalog.kinsectNames,
    'Culldrone',
    'Mauldrone',
    'Windchopper',
    'Gullshad',
    'Alucanid',
    'Rigiprayne',
    'Cancadaman',
    'Fiddlebrix',
    'Carnage Beetle',
    'Grancathar',
    'Pseudocath',
    'Whispervesp',
    'Bullshroud',
    'Monarch Alucanid',
    'Foebeetle',
    'Gleambeetle',
    'Arginesse',
    'Bonnetfille',
    'Bilbobrix',
    'Exalted Alucanid',
    'Regent Alucanid',
    'Fleetflier',
    'Ladytarge',
  ].map(normalizeKey)
);

const WEAPON_LOOKUP = new Map<string, string>();
const WEAPON_EXACT_NAMES = new Map<string, string | null>();
const WEAPON_BASE_LOOKUP = new Map<string, string>();
WEAPONS_DB.forEach((w) => {
  const exactName = w.name.trim().toLowerCase();
  WEAPON_EXACT_NAMES.set(exactName, WEAPON_EXACT_NAMES.has(exactName) ? null : w.id);
  WEAPON_LOOKUP.set(normalizeKey(w.id), w.id);
  WEAPON_LOOKUP.set(normalizeKey(w.name), w.id);
  indexEquipAliases(WEAPON_LOOKUP, w.name, w.id);
  const strippedPlus = w.name.replace(/\++\s*$/, '').trim();
  indexEquipAliases(WEAPON_BASE_LOOKUP, strippedPlus, w.id);
  const strippedRoman = strippedPlus.replace(/\s+(i|ii|iii|iv|v|vi)$/i, '').trim();
  if (strippedRoman && strippedRoman !== strippedPlus) {
    indexEquipAliases(WEAPON_BASE_LOOKUP, strippedRoman, w.id);
  }
});

const ARMOR_LOOKUP = new Map<string, string>();
const ARMOR_EXACT_NAMES = new Map<string, string | null>();
const ARMOR_BASE_LOOKUP = new Map<string, string>();
const ARMOR_SOURCE_IDS = new Map<string, string>();
const ARMOR_SOURCE_SLOTS = { Helm: 'head', Chest: 'chest', Arms: 'arm', Waist: 'waist', Legs: 'leg' } as const;
ARMOR_DB.forEach((a) => {
  if (a.sourceId !== undefined) {
    ARMOR_SOURCE_IDS.set(`armor:${ARMOR_SOURCE_SLOTS[a.slot]}:${a.sourceId}`, a.id);
  }
  const exactName = a.name.trim().toLowerCase();
  ARMOR_EXACT_NAMES.set(exactName, ARMOR_EXACT_NAMES.has(exactName) ? null : a.id);
  ARMOR_LOOKUP.set(normalizeKey(a.id), a.id);
  ARMOR_LOOKUP.set(normalizeKey(a.name), a.id);
  indexEquipAliases(ARMOR_LOOKUP, a.name, a.id);
  indexEquipAliases(ARMOR_BASE_LOOKUP, a.name.replace(/\++\s*$/, ''), a.id);
});

function resolveWeaponNameOrId(raw: string): string | undefined {
  const exactName = raw.trim().toLowerCase();
  if (WEAPON_EXACT_NAMES.has(exactName)) return WEAPON_EXACT_NAMES.get(exactName) ?? undefined;
  const candidates = [raw, raw.replace(/['’]s\b/gi, '')];
  for (const c of candidates) {
    const k = normalizeKey(c);
    if (!k) continue;
    const exact = WEAPON_LOOKUP.get(k);
    if (exact) return exact;
  }
  const strippedPlus = raw.replace(/\++\s*$/, '').trim();
  const basePlus = WEAPON_BASE_LOOKUP.get(normalizeKey(strippedPlus));
  if (basePlus) return basePlus;

  const strippedRoman = strippedPlus.replace(/\s+(i|ii|iii|iv|v|vi)$/i, '').trim();
  if (strippedRoman) {
    return WEAPON_BASE_LOOKUP.get(normalizeKey(strippedRoman));
  }
  return undefined;
}

function resolveArmorNameOrId(raw: string): string | undefined {
  const exactName = raw.trim().toLowerCase();
  if (ARMOR_EXACT_NAMES.has(exactName)) return ARMOR_EXACT_NAMES.get(exactName) ?? undefined;
  const candidates = [raw, raw.replace(/['’]s\b/gi, '')];
  for (const c of candidates) {
    const k = normalizeKey(c);
    if (!k) continue;
    const exact = ARMOR_LOOKUP.get(k);
    if (exact) return exact;
  }
  return ARMOR_BASE_LOOKUP.get(normalizeKey(raw.replace(/\++\s*$/, '')));
}

const DECO_LOOKUP = new Map<string, string>();
DECORATIONS_DB.forEach((d) => {
  const candidates = new Set<string>([
    d.id,
    d.name,
    d.name.replace(/\+/g, ' plus '),
  ]);
  if (d.name.includes('+ ') && !d.name.includes('Jewel')) {
    candidates.add(d.name.replace('+', ' Jewel+'));
  }
  if (d.name.includes('Jewel+')) {
    candidates.add(d.name.replace('Jewel+', '+'));
  }
  if (d.id === 'deco_quick_sheathe_2') {
    candidates.add('Quick Sheath Jewel 2');
  }
  if (d.id === 'deco_quick_sheathe_4') {
    candidates.add('Quick Sheath+ 4');
    candidates.add('Quick Sheath Jewel+ 4');
  }
  candidates.forEach((c) => {
    const k = normalizeKey(c);
    if (k && !DECO_LOOKUP.has(k)) {
      DECO_LOOKUP.set(k, d.id);
    }
  });
});
for (const decoration of [...catalog.decorations, ...catalog.rampageDecorations]) {
  const id = DECO_LOOKUP.get(normalizeKey(decoration.name));
  if (id) DECO_LOOKUP.set(normalizeKey(decoration.id), id);
}

function resolveDecoNameOrId(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const direct = DECO_LOOKUP.get(normalizeKey(trimmed));
  if (direct) return direct;
  const alt = trimmed.replace(/[【\[(\s]*(\d+)[】\])]/g, ' $1').trim();
  return DECO_LOOKUP.get(normalizeKey(alt));
}

const MATERIAL_LOOKUP = new Map<string, string>();
function materialLookupKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9+]/g, '');
}
MATERIALS_CATALOG.forEach((m) => {
  MATERIAL_LOOKUP.set(materialLookupKey(m.name), m.name);
});

function matchSkillId(rawName: string): string {
  if (!rawName) return '';
  return SKILL_LOOKUP.get(normalizeKey(rawName)) ?? '';
}

export function getTalismanSignature(t: TalismanItem): string {
  return `${t.skill1Id}:${t.skill1Level}|${t.skill2Id}:${t.skill2Level}|${t.slots.join('-')}`;
}

export function mergeUniqueTalismans(
  existing: TalismanItem[],
  incoming: TalismanItem[]
): { merged: TalismanItem[]; addedCount: number } {
  const seen = new Set(existing.map(getTalismanSignature));
  const newlyAdded: TalismanItem[] = [];
  for (const t of incoming) {
    const sig = getTalismanSignature(t);
    if (!seen.has(sig)) {
      seen.add(sig);
      newlyAdded.push(t);
    }
  }
  return {
    merged: [...newlyAdded, ...existing],
    addedCount: newlyAdded.length,
  };
}

export interface ParsedSyncPayload {
  isReFrameworkSnapshot: boolean;
  replaceMaterials: boolean;
  materialImportIssues: string[];
  talismanImportIssues: string[];
  hasWeaponsField: boolean;
  hasArmorField: boolean;
  hasDecosField: boolean;
  decorationCountsComplete: boolean;
  decorationImportIssues: string[];
  weaponImportIssues: string[];
  armorImportIssues: string[];
  hasTalismansField: boolean;
  profilePatch?: {
    hunterName?: string;
    hr?: number;
    mr?: number;
    ar?: number;
  };
  talismans: TalismanItem[];
  ownedWeaponIds: string[];
  ownedArmorIds: string[];
  ownedDecoIds: string[];
  ownedDecoCounts: Record<string, number>;
  materials: Record<string, number>;
  stats: {
    matchedCatalogMaterials: number;
    totalMaterialEntries: number;
    matchedWeapons: number;
    matchedArmor: number;
    matchedDecos: number;
    unmatchedItems: string[];
  };
}

export function mergeImportedDecorations(inventory: InventoryState, parsed: ParsedSyncPayload, replaceBox: boolean) {
  if (replaceBox && parsed.decorationCountsComplete) {
    return { ownedDecoIds: parsed.ownedDecoIds, ownedDecoCounts: parsed.ownedDecoCounts };
  }
  const ownedDecoCounts = { ...inventory.ownedDecoCounts };
  for (const [id, quantity] of Object.entries(parsed.ownedDecoCounts)) {
    ownedDecoCounts[id] = Math.max(ownedDecoCounts[id] ?? 0, quantity);
  }
  return {
    ownedDecoIds: [...new Set([...inventory.ownedDecoIds, ...parsed.ownedDecoIds])],
    ownedDecoCounts,
  };
}

export function mergeImportedEquipment(inventory: InventoryState, parsed: ParsedSyncPayload, replaceBox: boolean) {
  return {
    ownedWeaponIds: replaceBox && parsed.hasWeaponsField && !parsed.weaponImportIssues.length
      ? parsed.ownedWeaponIds
      : [...new Set([...inventory.ownedWeaponIds, ...parsed.ownedWeaponIds])],
    ownedArmorIds: replaceBox && parsed.hasArmorField && !parsed.armorImportIssues.length
      ? parsed.ownedArmorIds
      : [...new Set([...inventory.ownedArmorIds, ...parsed.ownedArmorIds])],
  };
}

export function mergeImportedMaterials(inventory: InventoryState, parsed: ParsedSyncPayload, replaceBox: boolean) {
  return replaceBox && parsed.replaceMaterials
    ? parsed.materials
    : { ...inventory.materials, ...parsed.materials };
}

export function mergeImportedTalismans(inventory: InventoryState, parsed: ParsedSyncPayload, replaceBox: boolean) {
  const existing = replaceBox && parsed.hasTalismansField && !parsed.talismanImportIssues.length
    ? []
    : inventory.talismans.filter(talisman => talisman.source !== 'Preset');
  return mergeUniqueTalismans(existing, parsed.talismans);
}

function readImportInteger(value: unknown, min: number, max: number): number | undefined {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof number === 'number' && Number.isSafeInteger(number) && number >= min && number <= max
    ? number
    : undefined;
}

export function parseCharmOrInventoryPayload(rawText: string): ParsedSyncPayload {
  const emptyResult: ParsedSyncPayload = {
    isReFrameworkSnapshot: false,
    replaceMaterials: false,
    materialImportIssues: [],
    talismanImportIssues: [],
    hasWeaponsField: false,
    hasArmorField: false,
    hasDecosField: false,
    decorationCountsComplete: false,
    decorationImportIssues: [],
    weaponImportIssues: [],
    armorImportIssues: [],
    hasTalismansField: false,
    talismans: [],
    ownedWeaponIds: [],
    ownedArmorIds: [],
    ownedDecoIds: [],
    ownedDecoCounts: {},
    materials: {},
    stats: {
      matchedCatalogMaterials: 0,
      totalMaterialEntries: 0,
      matchedWeapons: 0,
      matchedArmor: 0,
      matchedDecos: 0,
      unmatchedItems: [],
    },
  };

  const trimmed = rawText.trim();
  if (!trimmed) return emptyResult;

  // Try JSON format first (REFramework v1, Elgado backup JSON, or Charm array)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    const isRefSnapshot =
      !Array.isArray(parsed) &&
      (parsed.schema === 'elgado-forge-reframework-v1' ||
        Boolean(parsed.profile) ||
        Array.isArray(parsed.weapons) ||
        Array.isArray(parsed.armor) ||
        Array.isArray(parsed.decorations));

    const talismans: TalismanItem[] = [];
    const talismanImportIssues: string[] = [];
    if (!Array.isArray(parsed) && 'talismans' in parsed && !Array.isArray(parsed.talismans)) {
      talismanImportIssues.push('talismans');
    }
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.talismans)
      ? parsed.talismans
      : [];

    list.forEach((row: unknown, idx: number) => {
      const label = `Talisman #${idx + 1}`;
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        talismanImportIssues.push(label);
        return;
      }
      const entry = row as Record<string, unknown>;
      const s1 = matchSkillId(String(entry.skill1Id ?? entry.skill1 ?? ''));
      const s2 = matchSkillId(String(entry.skill2Id ?? entry.skill2 ?? ''));
      const l1 = readImportInteger(entry.skill1Level ?? entry.level1, 1, 4);
      const l2 = readImportInteger(entry.skill2Level ?? entry.level2 ?? 0, 0, 4);
      const rawSlots = Array.isArray(entry.slots)
        ? entry.slots
        : [entry.slot1 ?? 0, entry.slot2 ?? 0, entry.slot3 ?? 0];
      const slots = rawSlots.map(value => readImportInteger(value, 0, 4));
      if (!s1 || l1 === undefined || l2 === undefined || (l2 > 0 && !s2)
        || (entry.slots != null && !Array.isArray(entry.slots)) || slots.length > 4
        || slots.some(value => value === undefined)) {
        talismanImportIssues.push(label);
        return;
      }

      let slotsTuple: [number, number, number];
      const nums = slots.map(value => value ?? 0);
      if (Array.isArray(entry.slots)) {
        // Handle MHRise [lv1_count, lv2_count, lv3_count, lv4_count] vectors
        // including legacy 3-element exports like [0, 2, 0] or [0, 2, 1].
        const isCountVector =
          nums.length >= 4 ||
          (nums.length === 3 &&
            nums[0] === 0 &&
            ((nums[1] ?? 0) > 0 || (nums[2] ?? 0) > 0));
        if (isCountVector) {
          if (nums.reduce((sum, count) => sum + count, 0) > 3) {
            talismanImportIssues.push(label);
            return;
          }
          const expanded: number[] = [];
          for (let lv = Math.min(4, nums.length); lv >= 1; lv--) {
            const cnt = nums[lv - 1] ?? 0;
            for (let k = 0; k < cnt; k++) {
              expanded.push(lv);
            }
          }
          slotsTuple = [expanded[0] ?? 0, expanded[1] ?? 0, expanded[2] ?? 0];
        } else {
          slotsTuple = [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
        }
      } else {
        slotsTuple = [nums[0], nums[1], nums[2]];
      }

      if (s1 && l1 > 0) {
        const s1Label = SKILLS_DB.find((s) => s.id === s1)?.name ?? s1;
        const s2Label = s2 ? SKILLS_DB.find((s) => s.id === s2)?.name ?? s2 : '';
        const defaultName = s2Label && l2 > 0
          ? `${s1Label} ${l1} · ${s2Label} ${l2} (${slotsTuple.join('-')})`
          : `${s1Label} ${l1} (${slotsTuple.join('-')})`;

        talismans.push({
          id: `tali_imp_${Date.now()}_${idx}`,
          name: String(entry.name ?? defaultName),
          skill1Id: s1,
          skill1Level: l1,
          skill2Id: l2 > 0 ? s2 : '',
          skill2Level: l2,
          slots: slotsTuple,
          source: 'Imported',
        });
      }
    });

    const materials: Record<string, number> = Object.create(null);
    const materialImportIssues: string[] = [];
    let matchedCatalogMaterials = 0;
    const unmatchedItems: string[] = [];

    const hasMaterialsField = !Array.isArray(parsed) && 'materials' in parsed;
    const hasMaterialMap = hasMaterialsField && parsed.materials !== null
      && typeof parsed.materials === 'object' && !Array.isArray(parsed.materials);
    if (hasMaterialsField && !hasMaterialMap) materialImportIssues.push('materials');
    if (hasMaterialMap) {
      for (const [rawKey, rawVal] of Object.entries(parsed.materials as Record<string, unknown>)) {
        const cleanName = rawKey.trim();
        const qty = readImportInteger(rawVal, 0, 9999);
        if (!cleanName || qty === undefined) {
          materialImportIssues.push(cleanName || 'Unnamed material');
          continue;
        }

        const canonical = MATERIAL_LOOKUP.get(materialLookupKey(cleanName));
        if (canonical) {
          materials[canonical] = (materials[canonical] ?? 0) + qty;
          matchedCatalogMaterials++;
        } else {
          materials[cleanName] = (materials[cleanName] ?? 0) + qty;
        }
      }
    }

    // Resolve Weapons
    const weaponIdsSet = new Set<string>();
    const weaponImportIssues: string[] = [];
    if (Array.isArray(parsed.ownedWeaponIds)) {
      for (const [index, value] of parsed.ownedWeaponIds.entries()) {
        const id = typeof value === 'string' ? value.trim() : '';
        const resolved = id && (resolveWeaponNameOrId(id) ?? getWeaponById(id)?.id);
        if (resolved) weaponIdsSet.add(resolved);
        else weaponImportIssues.push(id || `ownedWeaponIds #${index + 1}`);
      }
    }
    if (!Array.isArray(parsed) && Array.isArray(parsed.weapons)) {
      for (const [index, rawW] of parsed.weapons.entries()) {
        const candidate =
          rawW && typeof rawW === 'object'
            ? String((rawW as Record<string, unknown>).name ?? (rawW as Record<string, unknown>).id ?? '')
            : String(rawW ?? '');
        const name = candidate.trim();
        if (!name) {
          weaponImportIssues.push(`weapons #${index + 1}`);
          continue;
        }
        if (KINSECT_KEYS.has(normalizeKey(name))) continue;
        const resolved = resolveWeaponNameOrId(name);
        if (resolved) weaponIdsSet.add(resolved);
        else weaponImportIssues.push(name);
      }
    }

    // Resolve Armor
    const armorIdsSet = new Set<string>();
    const armorImportIssues: string[] = [];
    if (Array.isArray(parsed.ownedArmorIds)) {
      for (const [index, value] of parsed.ownedArmorIds.entries()) {
        const id = typeof value === 'string' ? value.trim() : '';
        const resolved = id && (resolveArmorNameOrId(id) ?? getArmorById(id)?.id);
        if (resolved) armorIdsSet.add(resolved);
        else armorImportIssues.push(id || `ownedArmorIds #${index + 1}`);
      }
    }
    if (!Array.isArray(parsed) && Array.isArray(parsed.armor)) {
      for (const [index, rawA] of parsed.armor.entries()) {
        const entry = rawA && typeof rawA === 'object' ? rawA as Record<string, unknown> : undefined;
        const id = String(entry?.id ?? '').trim();
        const name = String(entry ? entry.name ?? '' : rawA ?? '').trim();
        if (!name && !id) {
          armorImportIssues.push(`armor #${index + 1}`);
          continue;
        }
        const resolved = ARMOR_SOURCE_IDS.get(id || name)
          ?? (id ? ARMOR_LOOKUP.get(normalizeKey(id)) : undefined)
          ?? (name ? resolveArmorNameOrId(name) : undefined);
        if (resolved) armorIdsSet.add(resolved);
        else armorImportIssues.push(name || id);
      }
    }
    if (!Array.isArray(parsed)) {
      for (const field of ['weapons', 'ownedWeaponIds']) {
        if (field in parsed && !Array.isArray(parsed[field])) weaponImportIssues.push(field);
      }
      for (const field of ['armor', 'ownedArmorIds']) {
        if (field in parsed && !Array.isArray(parsed[field])) armorImportIssues.push(field);
      }
    }
    unmatchedItems.push(...weaponImportIssues, ...armorImportIssues);

    // Resolve Decorations
    const decoIdsSet = new Set<string>();
    const decorationImportIssues: string[] = [];
    const invalidDecoration = (label: string) => {
      decorationImportIssues.push(label);
      unmatchedItems.push(label);
    };
    const resolveImportedDeco = (id: string) => {
      const legacy = getDecorationById(id);
      return resolveDecoNameOrId(id) ?? (legacy && (resolveDecoNameOrId(legacy.name) ?? legacy.id));
    };
    if (Array.isArray(parsed.ownedDecoIds)) {
      for (const [index, id] of parsed.ownedDecoIds.entries()) {
        if (typeof id !== 'string' || !id.trim()) {
          invalidDecoration(`ownedDecoIds #${index + 1}`);
          continue;
        }
        const resolved = resolveImportedDeco(id);
        if (resolved) decoIdsSet.add(resolved);
        else invalidDecoration(id);
      }
    }
    const ownedDecoCounts: Record<string, number> = {};
    const listedDecoCounts: Record<string, number> = {};
    if (
      !Array.isArray(parsed) &&
      parsed.ownedDecoCounts &&
      typeof parsed.ownedDecoCounts === 'object' &&
      !Array.isArray(parsed.ownedDecoCounts)
    ) {
      for (const [id, rawQty] of Object.entries(parsed.ownedDecoCounts as Record<string, unknown>)) {
        const qty = typeof rawQty === 'number' || (typeof rawQty === 'string' && rawQty.trim()) ? Number(rawQty) : NaN;
        if (!Number.isSafeInteger(qty) || qty < 0) {
          invalidDecoration(`${id} (invalid quantity)`);
          continue;
        }
        const resolved = resolveImportedDeco(id);
        if (!resolved) {
          invalidDecoration(id);
          continue;
        }
        if (qty === 0) continue;
        ownedDecoCounts[resolved] = Math.max(ownedDecoCounts[resolved] ?? 0, qty);
        decoIdsSet.add(resolved);
      }
    }
    if (!Array.isArray(parsed) && Array.isArray(parsed.decorations)) {
      for (const [index, rawD] of parsed.decorations.entries()) {
        const rowLabel = `decorations #${index + 1}`;
        if (typeof rawD === 'string') {
          const resolved = resolveDecoNameOrId(rawD);
          if (resolved) {
            decoIdsSet.add(resolved);
            listedDecoCounts[resolved] = (listedDecoCounts[resolved] ?? 0) + 1;
          } else invalidDecoration(rawD.trim() || rowLabel);
        } else if (rawD && typeof rawD === 'object') {
          const rec = rawD as Record<string, unknown>;
          const quantityField = ['quantity', 'count', 'num'].find(field => Object.hasOwn(rec, field));
          const value = quantityField ? rec[quantityField] : 1;
          const qty = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
          const name = String(rec.name ?? rec.id ?? '').trim();
          const gameName = typeof rec.id === 'number' ? DECORATION_NAMES_BY_GAME_ID.get(rec.id) : undefined;
          const resolved = resolveImportedDeco(name) ?? (gameName && resolveImportedDeco(gameName));
          if (!Number.isSafeInteger(qty) || qty < 0 || qty > 999) {
            invalidDecoration(`${name || rowLabel} (invalid quantity)`);
          } else if (!resolved) {
            invalidDecoration(name || rowLabel);
          } else if (qty > 0) {
            decoIdsSet.add(resolved);
            listedDecoCounts[resolved] = (listedDecoCounts[resolved] ?? 0) + qty;
          }
        } else invalidDecoration(rowLabel);
      }
    }
    // The map and the list can describe the same inventory copies.
    for (const [id, quantity] of Object.entries(listedDecoCounts)) {
      ownedDecoCounts[id] = Math.max(ownedDecoCounts[id] ?? 0, quantity);
    }

    if (isRefSnapshot && Array.isArray(parsed.equippedDecorationIdCounts)) {
      for (const [index, row] of parsed.equippedDecorationIdCounts.entries()) {
        const label = `equippedDecorationIdCounts #${index + 1}`;
        if (!row || typeof row !== 'object') {
          invalidDecoration(label);
          continue;
        }
        const { id, quantity } = row as Record<string, unknown>;
        if (typeof id !== 'number' || typeof quantity !== 'number'
          || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
          invalidDecoration(label);
          continue;
        }
        const name = DECORATION_NAMES_BY_GAME_ID.get(id);
        const decoration = name && DECORATIONS_DB.find((item) => item.name === name);
        if (!decoration) {
          invalidDecoration(`Equipped decoration ID ${id}`);
          continue;
        }
        decoIdsSet.add(decoration.id);
        // Exported totals can already include equipped copies.
        ownedDecoCounts[decoration.id] = Math.max(ownedDecoCounts[decoration.id] ?? 0, quantity);
      }
    }
    if (!Array.isArray(parsed)) {
      for (const field of ['decorations', 'ownedDecoIds', 'equippedDecorationIdCounts']) {
        if (field in parsed && !Array.isArray(parsed[field])) invalidDecoration(field);
      }
      if ('ownedDecoCounts' in parsed && (!parsed.ownedDecoCounts || typeof parsed.ownedDecoCounts !== 'object'
        || Array.isArray(parsed.ownedDecoCounts))) invalidDecoration('ownedDecoCounts');
    }

    // Extract Profile / Ranks
    let profilePatch: ParsedSyncPayload['profilePatch'];
    const rawProfile =
      !Array.isArray(parsed) ? (parsed.profile ?? parsed.hunterProfile) : undefined;
    if (rawProfile && typeof rawProfile === 'object') {
      const p = rawProfile as Record<string, unknown>;
      profilePatch = {
        hunterName: typeof p.hunterName === 'string' && p.hunterName.trim() ? p.hunterName.trim() : undefined,
        hr: typeof p.hr === 'number' && p.hr >= 1 ? Math.min(999, Math.floor(p.hr)) : undefined,
        mr: typeof p.mr === 'number' && p.mr >= 0 ? Math.min(999, Math.floor(p.mr)) : undefined,
        ar: typeof p.ar === 'number' && p.ar >= 0 ? Math.min(300, Math.floor(p.ar)) : undefined,
      };
    }

    const ownedWeaponIds = Array.from(weaponIdsSet);
    const ownedArmorIds = Array.from(armorIdsSet);
    const ownedDecoIds = Array.from(decoIdsSet);

    const hasWeaponsField =
      !Array.isArray(parsed) &&
      (Array.isArray(parsed.weapons) || Array.isArray(parsed.ownedWeaponIds));
    const hasArmorField =
      !Array.isArray(parsed) &&
      (Array.isArray(parsed.armor) || Array.isArray(parsed.ownedArmorIds));
    const hasDecosField =
      !Array.isArray(parsed) &&
      (Array.isArray(parsed.decorations) || Array.isArray(parsed.ownedDecoIds));
    const hasTalismansField = Array.isArray(parsed) || Array.isArray(parsed.talismans);

    return {
      isReFrameworkSnapshot: isRefSnapshot,
      replaceMaterials: hasMaterialMap && materialImportIssues.length === 0,
      materialImportIssues,
      talismanImportIssues,
      hasWeaponsField,
      hasArmorField,
      hasDecosField,
      decorationCountsComplete: decorationImportIssues.length === 0 && hasDecosField && (isRefSnapshot
        ? parsed.decorationCountsComplete === true || (parsed.decorationCountsComplete === undefined
          && parsed.exporterRevision === 2 && Array.isArray(parsed.decorations))
        : parsed.decorationCountsComplete !== false),
      decorationImportIssues: [...new Set(decorationImportIssues)],
      weaponImportIssues: [...new Set(weaponImportIssues)],
      armorImportIssues: [...new Set(armorImportIssues)],
      hasTalismansField,
      profilePatch,
      talismans,
      ownedWeaponIds,
      ownedArmorIds,
      ownedDecoIds,
      ownedDecoCounts,
      materials,
      stats: {
        matchedCatalogMaterials,
        totalMaterialEntries: Object.keys(materials).length,
        matchedWeapons: ownedWeaponIds.length,
        matchedArmor: ownedArmorIds.length,
        matchedDecos: ownedDecoIds.length,
        unmatchedItems,
      },
    };
  }

  // Fallback: standard MHRise charm CSV lines:
  // Skill1,Lv1,Skill2,Lv2,Slot1,Slot2,Slot3
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const talismans: TalismanItem[] = [];

  lines.forEach((line, idx) => {
    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 5) return;
    const s1 = matchSkillId(cols[0]);
    const l1 = Math.max(0, Math.min(4, Number(cols[1]) || 0));
    const s2 = matchSkillId(cols[2]);
    const l2 = Math.max(0, Math.min(4, Number(cols[3]) || 0));
    const sl1 = Math.max(0, Math.min(4, Number(cols[4]) || 0));
    const sl2 = Math.max(0, Math.min(4, Number(cols[5]) || 0));
    const sl3 = Math.max(0, Math.min(4, Number(cols[6]) || 0));

    if (s1 && l1 > 0) {
      const s1Label = SKILLS_DB.find((s) => s.id === s1)?.name ?? s1;
      talismans.push({
        id: `tali_csv_${Date.now()}_${idx}`,
        name: `${s1Label} ${l1} (${sl1}-${sl2}-${sl3})`,
        skill1Id: s1,
        skill1Level: l1,
        skill2Id: s2,
        skill2Level: l2,
        slots: [sl1, sl2, sl3],
        source: 'Imported',
      });
    }
  });

  return {
    ...emptyResult,
    hasTalismansField: talismans.length > 0,
    talismans,
  };
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportInventoryAsJson(
  inventory: InventoryState,
  profile: HunterProfile
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    hunterProfile: {
      hunterName: profile.hunterName,
      hr: profile.hr,
      mr: profile.mr,
      ar: profile.ar,
    },
    ownedWeaponIds: inventory.ownedWeaponIds,
    ownedArmorIds: inventory.ownedArmorIds,
    ownedDecoIds: inventory.ownedDecoIds,
    ownedDecoCounts: inventory.ownedDecoCounts ?? {},
    talismans: inventory.talismans,
    materials: inventory.materials,
  };
  triggerFileDownload(
    'elgado-forge-inventory.json',
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export function exportMaterialsAsCsv(inventory: InventoryState): void {
  const rows = ['Material,Quantity'];
  Object.entries(inventory.materials)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, qty]) => {
      rows.push(`"${name.replace(/"/g, '""')}",${qty}`);
    });
  triggerFileDownload(
    'elgado-forge-materials.csv',
    rows.join('\n'),
    'text/csv;charset=utf-8;'
  );
}

export function exportBuildsAsJson(builds: BuildLoadout[]): void {
  triggerFileDownload(
    'elgado-forge-builds.json',
    JSON.stringify(builds, null, 2),
    'application/json'
  );
}

