import {
  ARMOR_DB,
  DECORATIONS_DB,
  DEFAULT_TALISMAN,
  MATERIALS_CATALOG,
  SKILLS_DB,
  STARTER_LOADOUT,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { getUnlockedIdsForRank } from '../engine/damageCalculator';
import {
  BuildLoadout,
  HunterProfile,
  InventoryState,
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

export function createDefaultInventory(mr = 10, ar = 50): InventoryState {
  const unlocked = getUnlockedIdsForRank(mr, ar);
  return {
    ownedWeaponIds: unlocked.weaponIds,
    ownedArmorIds: unlocked.armorIds,
    ownedDecoIds: unlocked.decoIds,
    ownedDecoCounts: {},
    talismans: [],
    materials: {
      'Afflicted Bone': 14,
      'Afflicted Blood': 9,
      'Afflicted Direhorn': 4,
      'Afflicted Cortex': 3,
      'Pure Dragon Blood': 6,
      'Eltalite Ore': 18,
      'Sovereign Jewel': 4,
      'Adamantine Jewel': 10,
      'Lazurite Jewel': 12,
      'Bloodrun Jewel': 5,
      'Risen Dragonbone': 2,
      'Silver-rimmed Shard': 2,
    },
    autoSyncEnabled: false,
    lastInventorySyncAt: null,
  };
}

export function loadSavedBuilds(): BuildLoadout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_BUILDS);
    if (!raw) return [STARTER_LOADOUT];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [STARTER_LOADOUT];
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
    return parsed?.weaponId ? parsed : STARTER_LOADOUT;
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
    if (!raw) return createDefaultInventory(10, 50);
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    const merged = { ...createDefaultInventory(10, 50), ...parsed };
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
    return createDefaultInventory(10, 50);
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
    const parsed = JSON.parse(json) as BuildLoadout;
    if (!parsed || !parsed.weaponId || !parsed.helmId || !parsed.decorations) {
      return null;
    }
    return {
      ...STARTER_LOADOUT,
      ...parsed,
      talisman: parsed.talisman ?? DEFAULT_TALISMAN,
    };
  } catch {
    return null;
  }
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
const WEAPON_BASE_LOOKUP = new Map<string, string>();
WEAPONS_DB.forEach((w) => {
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
const ARMOR_BASE_LOOKUP = new Map<string, string>();
ARMOR_DB.forEach((a) => {
  ARMOR_LOOKUP.set(normalizeKey(a.id), a.id);
  ARMOR_LOOKUP.set(normalizeKey(a.name), a.id);
  indexEquipAliases(ARMOR_LOOKUP, a.name, a.id);
  indexEquipAliases(ARMOR_BASE_LOOKUP, a.name.replace(/\++\s*$/, ''), a.id);
});

function resolveWeaponNameOrId(raw: string): string | undefined {
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

function resolveDecoNameOrId(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const direct = DECO_LOOKUP.get(normalizeKey(trimmed));
  if (direct) return direct;
  const alt = trimmed.replace(/[【\[(\s]*(\d+)[】\])]/g, ' $1').trim();
  return DECO_LOOKUP.get(normalizeKey(alt));
}

const MATERIAL_LOOKUP = new Map<string, string>();
MATERIALS_CATALOG.forEach((m) => {
  MATERIAL_LOOKUP.set(normalizeKey(m.name), m.name);
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
  hasWeaponsField: boolean;
  hasArmorField: boolean;
  hasDecosField: boolean;
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

export function parseCharmOrInventoryPayload(rawText: string): ParsedSyncPayload {
  const emptyResult: ParsedSyncPayload = {
    isReFrameworkSnapshot: false,
    replaceMaterials: false,
    hasWeaponsField: false,
    hasArmorField: false,
    hasDecosField: false,
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
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.talismans)
      ? parsed.talismans
      : [];

    list.forEach((entry: Record<string, unknown>, idx: number) => {
      const s1 = matchSkillId(String(entry.skill1Id ?? entry.skill1 ?? ''));
      const s2 = matchSkillId(String(entry.skill2Id ?? entry.skill2 ?? ''));
      const l1 = Math.max(0, Math.min(4, Number(entry.skill1Level ?? entry.level1 ?? 0)));
      const l2 = Math.max(0, Math.min(4, Number(entry.skill2Level ?? entry.level2 ?? 0)));

      let slotsTuple: [number, number, number];
      if (Array.isArray(entry.slots)) {
        const nums = entry.slots.map((n) => Math.max(0, Math.min(4, Math.floor(Number(n) || 0))));
        // Handle MHRise [lv1_count, lv2_count, lv3_count, lv4_count] vectors
        // including legacy 3-element exports like [0, 2, 0] or [0, 2, 1].
        const isCountVector =
          nums.length >= 4 ||
          (nums.length === 3 &&
            nums[0] === 0 &&
            ((nums[1] ?? 0) > 0 || (nums[2] ?? 0) > 0));
        if (isCountVector) {
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
        slotsTuple = [
          Math.max(0, Math.min(4, Number(entry.slot1 ?? 0))),
          Math.max(0, Math.min(4, Number(entry.slot2 ?? 0))),
          Math.max(0, Math.min(4, Number(entry.slot3 ?? 0))),
        ];
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
          skill2Id: s2,
          skill2Level: l2,
          slots: slotsTuple,
          source: 'Imported',
        });
      }
    });

    const materials: Record<string, number> = {};
    let matchedCatalogMaterials = 0;
    const unmatchedItems: string[] = [];

    if (
      !Array.isArray(parsed) &&
      parsed.materials &&
      typeof parsed.materials === 'object' &&
      !Array.isArray(parsed.materials)
    ) {
      for (const [rawKey, rawVal] of Object.entries(parsed.materials as Record<string, unknown>)) {
        const cleanName = rawKey.trim();
        const qty = Math.max(0, Math.min(9999, Math.floor(Number(rawVal) || 0)));
        if (!cleanName || qty <= 0) continue;

        const canonical = MATERIAL_LOOKUP.get(normalizeKey(cleanName));
        if (canonical) {
          materials[canonical] = (materials[canonical] ?? 0) + qty;
          matchedCatalogMaterials++;
        } else {
          materials[cleanName] = (materials[cleanName] ?? 0) + qty;
        }
      }
    }

    // Resolve Weapons
    const weaponIdsSet = new Set<string>(
      Array.isArray(parsed.ownedWeaponIds) ? parsed.ownedWeaponIds.filter(Boolean) : []
    );
    if (!Array.isArray(parsed) && Array.isArray(parsed.weapons)) {
      for (const rawW of parsed.weapons) {
        const candidate =
          rawW && typeof rawW === 'object'
            ? String((rawW as Record<string, unknown>).name ?? (rawW as Record<string, unknown>).id ?? '')
            : String(rawW ?? '');
        const name = candidate.trim();
        if (!name) continue;
        if (KINSECT_KEYS.has(normalizeKey(name))) continue;
        const resolved = resolveWeaponNameOrId(name);
        if (resolved) weaponIdsSet.add(resolved);
        else unmatchedItems.push(name);
      }
    }

    // Resolve Armor
    const armorIdsSet = new Set<string>(
      Array.isArray(parsed.ownedArmorIds) ? parsed.ownedArmorIds.filter(Boolean) : []
    );
    if (!Array.isArray(parsed) && Array.isArray(parsed.armor)) {
      for (const rawA of parsed.armor) {
        const candidate =
          rawA && typeof rawA === 'object'
            ? String((rawA as Record<string, unknown>).name ?? (rawA as Record<string, unknown>).id ?? '')
            : String(rawA ?? '');
        const name = candidate.trim();
        if (!name) continue;
        const resolved = resolveArmorNameOrId(name);
        if (resolved) armorIdsSet.add(resolved);
        else unmatchedItems.push(name);
      }
    }

    // Resolve Decorations
    const decoIdsSet = new Set<string>(
      Array.isArray(parsed.ownedDecoIds) ? parsed.ownedDecoIds.filter(Boolean) : []
    );
    const ownedDecoCounts: Record<string, number> = {};
    if (
      !Array.isArray(parsed) &&
      parsed.ownedDecoCounts &&
      typeof parsed.ownedDecoCounts === 'object' &&
      !Array.isArray(parsed.ownedDecoCounts)
    ) {
      for (const [id, rawQty] of Object.entries(parsed.ownedDecoCounts as Record<string, unknown>)) {
        const qty = Math.max(0, Math.floor(Number(rawQty) || 0));
        if (id && qty > 0) {
          ownedDecoCounts[id] = qty;
          decoIdsSet.add(id);
        }
      }
    }
    if (!Array.isArray(parsed) && Array.isArray(parsed.decorations)) {
      for (const rawD of parsed.decorations) {
        if (typeof rawD === 'string') {
          const resolved = resolveDecoNameOrId(rawD);
          if (resolved) {
            decoIdsSet.add(resolved);
            ownedDecoCounts[resolved] = (ownedDecoCounts[resolved] ?? 0) + 1;
          } else if (rawD.trim()) {
            unmatchedItems.push(rawD.trim());
          }
        } else if (rawD && typeof rawD === 'object') {
          const rec = rawD as Record<string, unknown>;
          const qty = Math.max(0, Math.floor(Number(rec.quantity ?? rec.count ?? rec.num ?? 1) || 0));
          const name = String(rec.name ?? rec.id ?? '').trim();
          if (qty > 0 && qty <= 999 && name) {
            const resolved = resolveDecoNameOrId(name);
            if (resolved) {
              decoIdsSet.add(resolved);
              ownedDecoCounts[resolved] = (ownedDecoCounts[resolved] ?? 0) + qty;
            } else if (/jewel|soul/i.test(name)) {
              unmatchedItems.push(name);
            }
          }
        }
      }
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
      replaceMaterials:
        !Array.isArray(parsed) &&
        Boolean(parsed.materials && typeof parsed.materials === 'object'),
      hasWeaponsField,
      hasArmorField,
      hasDecosField,
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

