import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  FileCode2,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { MaterialBoxModal } from './MaterialBoxModal';
import { ReFrameworkScriptModal } from './ReFrameworkScriptModal';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getWeaponById,
  MATERIALS_CATALOG,
  MONSTERS_DB,
  SKILLS_DB,
  WEAPON_CLASSES,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import {
  evaluateMetaRecommendations,
  getHunterProgressionStage,
  getSkillDisplayName,
  RANK_TIERS,
  RECOMMENDATION_TEMPLATES,
} from '../engine/damageCalculator';
import { getSkillWeightsForWeapon, optimizeTemplateTalisman } from '../engine/ownedBuildOptimizer';
import {
  BuildLoadout,
  HunterProfile,
  InventoryState,
  RankTier,
  SteamSyncResponse,
  TalismanItem,
} from '../types/sunbreak';
import {
  exportBuildsAsJson,
  exportInventoryAsJson,
  exportMaterialsAsCsv,
  mergeUniqueTalismans,
  mergeImportedDecorations,
  mergeImportedEquipment,
  mergeImportedMaterials,
  mergeImportedTalismans,
  getTalismanSignature,
  mergeSteamProfile,
  parseBuildsBackup,
  partitionBuildsBackup,
  parseCharmOrInventoryPayload,
} from '../utils/storageAndShare';
import { SAMPLE_REFRAMEWORK_EXPORT_JSON } from '../utils/reframeworkLuaScript';

type SubTab = 'recommendations' | 'steam_sync' | 'database';

interface MetaAndSyncViewProps {
  profile: HunterProfile;
  inventory: InventoryState;
  savedBuilds: BuildLoadout[];
  onImportBuilds: (builds: BuildLoadout[]) => void;
  initialSubTab?: SubTab;
  subTabRequestKey?: number;
  onUpdateProfile: React.Dispatch<React.SetStateAction<HunterProfile>>;
  onUpdateInventory: (next: InventoryState) => void;
  onLoadBuild: (loadout: BuildLoadout) => void;
}

const SMITHY_BANNER_URL = '/src/assets/images/elgado_smithy_banner_1795219159176.jpg';
const SELECTABLE_ARMOR = ARMOR_DB.filter(armor => armor.isSelectable !== false);

export const MetaAndSyncView: React.FC<MetaAndSyncViewProps> = ({
  profile,
  inventory,
  savedBuilds,
  onImportBuilds,
  initialSubTab = 'recommendations',
  subTabRequestKey = 0,
  onUpdateProfile,
  onUpdateInventory,
  onLoadBuild,
}) => {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);

  useEffect(() => {
    if (subTabRequestKey > 0) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab, subTabRequestKey]);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Meta recommendations filters
  const [weaponFilter, setWeaponFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState<RankTier | 'All'>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'progression' | 'efr' | 'ownership'>('recommended');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Steam Sync state
  const [steamInput, setSteamInput] = useState(profile.steamId64 || '');
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamError, setSteamError] = useState('');
  const [steamNotice, setSteamNotice] = useState('');
  const [buildsBackup, setBuildsBackup] = useState<NonNullable<ReturnType<typeof parseBuildsBackup>>>();
  const [buildsBackupMessage, setBuildsBackupMessage] = useState('');
  const buildsBackupInput = useRef<HTMLInputElement>(null);
  const buildsBackupRequest = useRef(0);
  const buildsBackupPreview = buildsBackup ? partitionBuildsBackup(buildsBackup.builds, savedBuilds) : undefined;

  // Inventory & REFramework Importer state
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<{
    raw: string;
    inventory: InventoryState;
    profile: HunterProfile;
    replace: boolean;
    decorationCountsIncomplete: boolean;
    decorationImportIssues: string[];
    protectedImportGroups: Array<{ label: string; rows: string[] }>;
    groups: Array<{ name: string; changes: string[] }>;
  }>();
  const [importError, setImportError] = useState('');
  const [importUnmatched, setImportUnmatched] = useState<string[]>([]);
  const [replaceBoxOnImport, setReplaceBoxOnImport] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [invTypeFilter, setInvTypeFilter] = useState<
    'all' | 'weapons' | 'armor' | 'decorations'
  >('all');
  const [matSearch, setMatSearch] = useState('');
  const [materialBoxOpen, setMaterialBoxOpen] = useState(false);
  const [reframeworkModalOpen, setReFrameworkModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synced Charms / Talismans management state
  const [charmSearch, setCharmSearch] = useState('');
  const [newCharmSkill1, setNewCharmSkill1] = useState('weakness_exploit');
  const [newCharmLv1, setNewCharmLv1] = useState(2);
  const [newCharmSkill2, setNewCharmSkill2] = useState('');
  const [newCharmLv2, setNewCharmLv2] = useState(1);
  const [newCharmSlots, setNewCharmSlots] = useState<[number, number, number]>([2, 2, 0]);
  const [newCharmName, setNewCharmName] = useState('');

  // Official Database Explorer state
  const [dbType, setDbType] = useState<
    'weapons' | 'armor' | 'decorations' | 'skills' | 'monsters'
  >('weapons');
  const [dbQuery, setDbQuery] = useState('');
  const [dbSkill, setDbSkill] = useState('');
  const [dbWeaponClass, setDbWeaponClass] = useState('');
  const [dbSlot, setDbSlot] = useState('');
  const [dbRank, setDbRank] = useState('');
  const [dbSpecies, setDbSpecies] = useState('');
  const [dbLastSynced, setDbLastSynced] = useState<string | null>(null);
  const [dbSyncError, setDbSyncError] = useState('');
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbResults, setDbResults] = useState<Record<string, unknown>[]>([]);

  const detectedStage = useMemo(
    () => getHunterProgressionStage(profile.mr, profile.ar),
    [profile.mr, profile.ar]
  );

  const stageCounts = useMemo(() => {
    const base =
      weaponFilter === 'All'
        ? RECOMMENDATION_TEMPLATES
        : RECOMMENDATION_TEMPLATES.filter((t) => t.weaponClass === weaponFilter);
    const counts: Record<RankTier | 'All', number> = {
      All: base.length,
      LR: 0,
      HR: 0,
      MR: 0,
      'Early MR': 0,
      'Story MR': 0,
      'MR 10+': 0,
      'Endgame AR': 0,
    };
    for (const t of base) {
      counts[t.rankTier]++;
    }
    return counts;
  }, [weaponFilter]);

  const recommendations = useMemo(() => {
    const list = evaluateMetaRecommendations(profile, inventory, weaponFilter, stageFilter, optimizeTemplateTalisman);
    const filtered = eligibleOnly ? list.filter((item) => item.rankEligible) : [...list];
    if (sortBy === 'progression') {
      filtered.sort(
        (a, b) =>
          RANK_TIERS.indexOf(a.template.rankTier) - RANK_TIERS.indexOf(b.template.rankTier) ||
          a.template.weaponClass.localeCompare(b.template.weaponClass)
      );
    } else if (sortBy === 'efr') {
      filtered.sort((a, b) => b.stats.effectiveRaw - a.stats.effectiveRaw);
    } else if (sortBy === 'ownership') {
      filtered.sort(
        (a, b) =>
          b.ownershipPercent - a.ownershipPercent ||
          b.stats.effectiveRaw - a.stats.effectiveRaw
      );
    }
    return filtered;
  }, [profile, inventory, weaponFilter, stageFilter, sortBy, eligibleOnly]);

  // Query server database API when browsing database tab
  useEffect(() => {
    if (subTab !== 'database') return;
    let active = true;
    const params = new URLSearchParams({ type: dbType });
    if (dbQuery.trim()) params.set('q', dbQuery.trim());
    if (dbSkill) params.set('skill', dbSkill);
    if (dbWeaponClass && dbType === 'weapons') params.set('weaponClass', dbWeaponClass);
    if (dbSlot && dbType === 'armor') params.set('slot', dbSlot);
    if (dbRank && (dbType === 'weapons' || dbType === 'armor' || dbType === 'decorations')) {
      params.set('rank', dbRank);
    }
    if (dbSpecies && dbType === 'monsters') params.set('species', dbSpecies);

    fetch(`/api/database/search?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.ok) {
          setDbResults(data.results ?? []);
        }
      })
      .catch(() => {
        if (active) setDbResults([]);
      });
    return () => {
      active = false;
    };
  }, [subTab, dbType, dbQuery, dbSkill, dbWeaponClass, dbSlot, dbRank, dbSpecies]);

  const handleSteamSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamInput.trim()) {
      setSteamError('Enter your SteamID64, Vanity ID, or Steam Community URL.');
      return;
    }
    setSteamLoading(true);
    setSteamError('');
    setSteamNotice('');

    try {
      const res = await fetch('/api/steam/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamInput: steamInput.trim() }),
      });
      const data = (await res.json()) as SteamSyncResponse & { error?: string };

      if (!res.ok || !data.ok) {
        setSteamError(data.error || 'Steam synchronization failed.');
      } else {
        const syncedAt = new Date().toISOString();
        onUpdateProfile(current => mergeSteamProfile(current, data, syncedAt));

        setSteamNotice(
          data.warning ||
            `Synced ${data.personaName} (${data.achievementsUnlocked}/${data.achievementsTotal} achievements).`
        );
      }
    } catch {
      setSteamError('Network error communicating with Steam sync service.');
    } finally {
      setSteamLoading(false);
    }
  };

  const applyImportPayload = (rawPayload: string, confirmed = false) => {
    setImportPreview(undefined);
    setImportError('');
    setImportStatus('');
    setImportUnmatched([]);
    try {
      const parsed = parseCharmOrInventoryPayload(rawPayload);
      const matCount = Object.keys(parsed.materials).length;
      const hasProfileUpdate = Boolean(
        parsed.profilePatch &&
          (parsed.profilePatch.hr !== undefined ||
            parsed.profilePatch.mr !== undefined ||
            parsed.profilePatch.ar !== undefined)
      );

      if (
        parsed.talismans.length === 0 &&
        parsed.ownedWeaponIds.length === 0 &&
        parsed.ownedArmorIds.length === 0 &&
        parsed.ownedDecoIds.length === 0 &&
        matCount === 0 &&
        !hasProfileUpdate &&
        !parsed.hasWeaponsField &&
        !parsed.hasArmorField &&
        !parsed.hasDecosField &&
        !parsed.hasTalismansField &&
        !parsed.replaceMaterials &&
        !parsed.materialImportIssues.length &&
        !parsed.talismanImportIssues.length
      ) {
        setImportError(
          'No valid REFramework export, charms, materials, or equipment detected. Use elgado_forge_export.json or charm CSV.'
        );
        return;
      }

      const prevWeapons = new Set(inventory.ownedWeaponIds);
      const prevArmor = new Set(inventory.ownedArmorIds);
      const prevDecos = new Set(inventory.ownedDecoIds);
      const existingRealTalismans = inventory.talismans.filter(
        (t) => t.source !== 'Preset'
      );

      const shouldReplace = parsed.isReFrameworkSnapshot && replaceBoxOnImport;
      const replaceMaterials = shouldReplace && parsed.replaceMaterials;

      const { ownedWeaponIds: nextWeapons, ownedArmorIds: nextArmor } =
        mergeImportedEquipment(inventory, parsed, shouldReplace);

      const replaceDecorations = shouldReplace && parsed.decorationCountsComplete;
      const { ownedDecoIds: nextDecos, ownedDecoCounts: nextDecoCounts } =
        mergeImportedDecorations(inventory, parsed, shouldReplace);

      const replaceTalismans = shouldReplace && parsed.hasTalismansField && !parsed.talismanImportIssues.length;
      const { merged: mergedTalismans, addedCount: addedTalismans } =
        mergeImportedTalismans(inventory, parsed, shouldReplace);

      const newWeaponCount = nextWeapons.filter((id) => !prevWeapons.has(id)).length;
      const newArmorCount = nextArmor.filter((id) => !prevArmor.has(id)).length;
      const newDecoCount = nextDecos.filter((id) => !prevDecos.has(id)).length;

      const nextInventory: InventoryState = {
        ...inventory,
        talismans: mergedTalismans,
        ownedWeaponIds: nextWeapons,
        ownedArmorIds: nextArmor,
        ownedDecoIds: nextDecos,
        ownedDecoCounts: nextDecoCounts,
        materials: mergeImportedMaterials(inventory, parsed, shouldReplace),
        lastInventorySyncAt: new Date().toISOString(),
      };

      if (!confirmed || importPreview?.inventory !== inventory || importPreview.profile !== profile
        || importPreview.replace !== replaceBoxOnImport) {
        const diff = (before: Record<string, number>, after: Record<string, number>, label: (id: string) => string = id => id) =>
          [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(id => {
            const previous = before[id] ?? 0;
            const next = after[id] ?? 0;
            return previous === next ? [] : [`${label(id)} · ${previous} → ${next}`];
          });
        const quantities = (ids: string[], counts?: Record<string, number>) =>
          Object.fromEntries(ids.map(id => [id, counts?.[id] ?? 1]));
        const names = new Map([...existingRealTalismans, ...mergedTalismans].map(t => [getTalismanSignature(t), t.name]));
        const groups = [
          { name: 'Weapons', changes: diff(quantities(inventory.ownedWeaponIds), quantities(nextWeapons), id => getWeaponById(id)?.name ?? id) },
          { name: 'Armor', changes: diff(quantities(inventory.ownedArmorIds), quantities(nextArmor), id => getArmorById(id)?.name ?? id) },
          { name: 'Decorations', changes: diff(quantities(inventory.ownedDecoIds, inventory.ownedDecoCounts), quantities(nextDecos, nextDecoCounts), id => getDecorationById(id)?.name ?? id) },
          { name: 'Talismans', changes: diff(quantities(existingRealTalismans.map(getTalismanSignature)), quantities(mergedTalismans.map(getTalismanSignature)), id => names.get(id) ?? id) },
          { name: 'Materials', changes: diff(inventory.materials, nextInventory.materials) },
        ];
        if (parsed.profilePatch) {
          groups.push({ name: 'Ranks', changes: diff(
            { HR: profile.hr, MR: profile.mr, AR: profile.ar },
            { HR: parsed.profilePatch.hr ?? profile.hr, MR: parsed.profilePatch.mr ?? profile.mr, AR: parsed.profilePatch.ar ?? profile.ar },
          ) });
        }
        setImportPreview({
          raw: rawPayload, inventory, profile, replace: replaceBoxOnImport, groups,
          decorationCountsIncomplete: parsed.isReFrameworkSnapshot && !parsed.decorationCountsComplete,
          decorationImportIssues: parsed.decorationImportIssues,
          protectedImportGroups: [
            { label: 'Weapons', rows: parsed.weaponImportIssues },
            { label: 'Armor', rows: parsed.armorImportIssues },
            { label: 'Materials', rows: parsed.materialImportIssues },
            { label: 'Talismans', rows: parsed.talismanImportIssues },
          ].filter(group => group.rows.length > 0),
        });
        setImportUnmatched(parsed.stats.unmatchedItems);
        return;
      }
      onUpdateInventory(nextInventory);

      if (hasProfileUpdate && parsed.profilePatch) {
        onUpdateProfile({
          ...profile,
          hunterName: parsed.profilePatch.hunterName ?? profile.hunterName,
          hr: parsed.profilePatch.hr ?? profile.hr,
          mr: parsed.profilePatch.mr ?? profile.mr,
          ar: parsed.profilePatch.ar ?? profile.ar,
          lastSyncedAt: new Date().toISOString(),
        });
      }

      const parts: string[] = [];
      if (matCount > 0 || replaceMaterials) {
        parts.push(
          replaceMaterials
            ? `${matCount} materials replaced`
            : `${matCount} materials updated`
        );
      }
      if (parsed.hasTalismansField || parsed.talismans.length > 0) {
        parts.push(
          replaceTalismans
            ? `${mergedTalismans.length} charm(s) synced`
            : addedTalismans > 0
            ? `+${addedTalismans} new charm(s)`
            : `${parsed.talismans.length} charm(s) already synced`
        );
      }
      if (parsed.hasWeaponsField || parsed.ownedWeaponIds.length > 0) {
        parts.push(
          shouldReplace && parsed.weaponImportIssues.length === 0
            ? `${nextWeapons.length} weapon(s) synced`
            : `+${newWeaponCount} weapon(s)`
        );
      }
      if (parsed.hasArmorField || parsed.ownedArmorIds.length > 0) {
        parts.push(
          shouldReplace && parsed.armorImportIssues.length === 0
            ? `${nextArmor.length} armor piece(s) synced`
            : `+${newArmorCount} armor piece(s)`
        );
      }
      if (parsed.hasDecosField || parsed.ownedDecoIds.length > 0) {
        parts.push(
          replaceDecorations
            ? `${nextDecos.length} decoration(s) synced`
            : parsed.decorationCountsComplete
              ? `+${newDecoCount} decoration(s)`
              : shouldReplace
                ? 'Partial decoration sync. Reported totals updated and unreported jewels kept.'
                : 'Partial decoration sync. Higher quantities were kept.'
        );
      }
      if (hasProfileUpdate && parsed.profilePatch) {
        parts.push(
          `HR ${parsed.profilePatch.hr ?? profile.hr} · MR ${parsed.profilePatch.mr ?? profile.mr} · AR ${parsed.profilePatch.ar ?? profile.ar}`
        );
      }

      setImportUnmatched(parsed.stats.unmatchedItems);
      setImportStatus(
        `${parsed.isReFrameworkSnapshot ? 'REFramework Snapshot Synced' : 'Inventory Imported'}: ${parts.join(' · ')}.`
      );
      setImportText('');
    } catch {
      setImportError('Failed to parse JSON or CSV payload. Verify file contents and syntax.');
    }
  };

  const handleAddManualCharm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharmSkill1 || newCharmLv1 <= 0) return;

    const s1Label = getSkillDisplayName(newCharmSkill1);
    const s2Id = newCharmSkill2 && newCharmLv2 > 0 ? newCharmSkill2 : '';
    const s2Lv = s2Id ? newCharmLv2 : 0;
    const s2Label = s2Id ? getSkillDisplayName(s2Id) : '';
    const sortedSlots = [...newCharmSlots].sort((a, b) => b - a) as [
      number,
      number,
      number
    ];
    const autoName =
      s2Label && s2Lv > 0
        ? `${s1Label} ${newCharmLv1} · ${s2Label} ${s2Lv} (${sortedSlots.join('-')})`
        : `${s1Label} ${newCharmLv1} (${sortedSlots.join('-')})`;

    const newItem: TalismanItem = {
      id: `tali_custom_${Date.now()}`,
      name: newCharmName.trim() || autoName,
      skill1Id: newCharmSkill1,
      skill1Level: newCharmLv1,
      skill2Id: s2Id,
      skill2Level: s2Lv,
      slots: sortedSlots,
      source: 'Custom',
    };

    const { merged } = mergeUniqueTalismans(inventory.talismans, [newItem]);
    onUpdateInventory({
      ...inventory,
      talismans: merged,
      lastInventorySyncAt: new Date().toISOString(),
    });
    setNewCharmName('');
  };

  const handleRemoveCharm = (charmId: string) => {
    onUpdateInventory({
      ...inventory,
      talismans: inventory.talismans.filter((t) => t.id !== charmId),
      lastInventorySyncAt: new Date().toISOString(),
    });
  };

  const handleClearAllCharms = () => {
    onUpdateInventory({
      ...inventory,
      talismans: [],
      lastInventorySyncAt: new Date().toISOString(),
    });
  };

  const handleImportCharms = () => {
    applyImportPayload(importText);
  };

  const handleImportFile = async (file: File) => {
    try {
      const content = await file.text();
      setImportText(content);
      applyImportPayload(content);
    } catch {
      setImportError(`Unable to read file "${file.name}".`);
    }
  };

  const handleBuildsBackup = async (file: File) => {
    const request = ++buildsBackupRequest.current;
    setBuildsBackup(undefined);
    setBuildsBackupMessage('');
    try {
      const backup = parseBuildsBackup(await file.text());
      if (request !== buildsBackupRequest.current) return;
      if (backup) setBuildsBackup(backup);
      else setBuildsBackupMessage('Invalid backup. Select a Builds JSON file exported by Elgado Forge.');
    } catch {
      if (request === buildsBackupRequest.current) setBuildsBackupMessage(`Unable to read "${file.name}".`);
    }
  };

  const handlePasteFromClipboard = async () => {
    setImportError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setImportError('Clipboard is empty. Copy JSON from REFramework first or paste manually.');
        return;
      }
      setImportText(text);
      applyImportPayload(text);
    } catch {
      setImportError(
        'Clipboard access was blocked by the browser. Press Ctrl+V inside the text box below and click Import Snapshot.'
      );
    }
  };

  const handleRefreshDatabase = async () => {
    setDbSyncing(true);
    setDbSyncError('');
    try {
      const res = await fetch('/api/database/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Catalog verification failed.');
      setDbLastSynced(data.lastSyncedAt);
    } catch (error) {
      setDbLastSynced(null);
      setDbSyncError(error instanceof Error ? error.message : 'Catalog verification failed.');
    } finally {
      setDbSyncing(false);
    }
  };

  const ownedWeaponSet = new Set(inventory.ownedWeaponIds);
  const ownedArmorSet = new Set(inventory.ownedArmorIds);
  const ownedSelectableArmorCount = SELECTABLE_ARMOR.filter(armor => ownedArmorSet.has(armor.id)).length;
  const ownedDecoSet = new Set(inventory.ownedDecoIds);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-6">
      {/* Smithy Header Banner */}
      <section className="relative overflow-hidden rounded-xl border border-white/[0.09] bg-[#12161C]">
        {!bannerFailed ? (
          <img
            src={SMITHY_BANNER_URL}
            alt="Elgado Smithy workbench with forged steel and brass calipers"
            referrerPolicy="no-referrer"
            onError={() => setBannerFailed(true)}
            className="h-44 w-full object-cover object-center opacity-50"
          />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-[#171C24] via-[#12161C] to-[#0B0D10]" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/70 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-medium text-[#D4A853]">
              Hunter Progression · HR {profile.hr} · MR {profile.mr} · AR {profile.ar}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[#ECEFF4]">
              Personalized Meta, Steam Sync & Sunbreak Database
            </h1>
          </div>

          <div
            className="inline-flex rounded-lg border border-white/15 bg-[#0B0D10]/90 p-1"
            role="tablist"
          >
            {(
              [
                { id: 'recommendations', label: 'Meta Recommendations' },
                { id: 'steam_sync', label: 'Steam & Inventory Sync' },
                { id: 'database', label: 'Official Database' },
              ] as Array<{ id: SubTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={subTab === t.id}
                onClick={() => setSubTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  subTab === t.id
                    ? 'bg-[#D4A853] text-[#0B0D10]'
                    : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SUB-TAB 1: PERSONALIZED META RECOMMENDATIONS */}
      {subTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-white/[0.09] bg-[#12161C] p-4">
            {/* Progression Stage Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Progression stage filter">
                {(['All', ...RANK_TIERS] as Array<RankTier | 'All'>).map((tier) => {
                  const active = stageFilter === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setStageFilter(tier)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors font-mono-tabular ${
                        active
                          ? 'bg-[#D4A853] text-[#0B0D10]'
                          : 'border border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                      }`}
                    >
                      {tier === 'All' ? 'All Stages' : tier} ({stageCounts[tier]})
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStageFilter(detectedStage)}
                className="text-xs font-medium text-[#D4A853] hover:underline whitespace-nowrap"
              >
                Your Stage: {detectedStage} (Filter) →
              </button>
            </div>

            {/* Secondary Filters & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="sr-only" htmlFor="meta-weapon-filter">
                    Filter by Weapon Class
                  </label>
                  <select
                    id="meta-weapon-filter"
                    value={weaponFilter}
                    onChange={(e) => setWeaponFilter(e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                  >
                    <option value="All">All 14 Weapon Classes</option>
                    {WEAPON_CLASSES.map((wc) => (
                      <option key={wc} value={wc}>
                        {wc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="sr-only" htmlFor="meta-sort-select">
                    Sort recommendations
                  </label>
                  <select
                    id="meta-sort-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as 'recommended' | 'progression' | 'efr' | 'ownership'
                      )
                    }
                    className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                  >
                    <option value="recommended">Sort: Best for Current Rank</option>
                    <option value="progression">Sort: Progression (HR → Endgame)</option>
                    <option value="efr">Sort: Highest Effective Raw</option>
                    <option value="ownership">Sort: Highest Inventory Match</option>
                  </select>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
                  <input
                    type="checkbox"
                    checked={eligibleOnly}
                    onChange={(e) => setEligibleOnly(e.target.checked)}
                    className="accent-[#D4A853]"
                  />
                  <span>
                    Matches my rank criteria only (MR {profile.mr} / AR {profile.ar})
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="font-mono-tabular text-[#98A2B3]">
                  Showing {recommendations.length} of {RECOMMENDATION_TEMPLATES.length} builds
                </span>
                <button
                  type="button"
                  onClick={() => setSubTab('steam_sync')}
                  className="font-medium text-[#D4A853] hover:underline"
                >
                  Adjust Rank / Sync →
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendations.map((rec) => {
              const { template, stats, rankEligible, progressionUnverified, ownershipPercent, ownedCount, totalPieces, missingItems, missingDecorations } =
                rec;
              const weaponItem = getWeaponById(template.loadout.weaponId);
              const skillWeights = weaponItem ? getSkillWeightsForWeapon(weaponItem) : {};
              const topSkills = Object.entries(stats.skills)
                .filter(([skillId]) => !weaponItem || (skillWeights[skillId] ?? 0) > 0)
                .sort(
                  (a, b) =>
                    (skillWeights[b[0]] ?? 1) * b[1] - (skillWeights[a[0]] ?? 1) * a[1]
                )
                .slice(0, 5)
                .map(([skillId, lv]) => `${getSkillDisplayName(skillId)} ${lv}`);

              return (
                <article
                  key={template.id}
                  className="flex flex-col justify-between rounded-xl border border-white/[0.09] bg-[#12161C] p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#98A2B3]">
                          <span className="font-medium text-[#D4A853]">{template.rankTier}</span>
                          <span aria-hidden="true">·</span>
                          <span>{template.weaponClass}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {template.minMr === 0 && template.minAr === 0
                              ? 'Req. High Rank'
                              : `Req. MR ${template.minMr}${template.minAr > 0 ? ` / AR ${template.minAr}` : ''}`}
                          </span>
                        </div>
                        <h2 className="mt-1 font-display text-lg font-semibold text-[#ECEFF4]">
                          {template.title}
                        </h2>
                      </div>
                      <div className="text-right font-mono-tabular shrink-0">
                        <span className="block text-xs text-[#98A2B3]">EFR</span>
                        <span className="text-lg font-bold text-[#D4A853]">
                          {stats.effectiveRaw.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#98A2B3]">
                      {template.summary}
                    </p>
                    {template.omittedDecorations.length > 0 && (
                      <details className="mt-2 text-[11px] text-[#98A2B3]">
                        <summary className="cursor-pointer">Legacy decorations left out · {template.omittedDecorations.length}</summary>
                        <p className="mt-1">{[...new Set(template.omittedDecorations)].join(' · ')}</p>
                      </details>
                    )}

                    {weaponItem && (
                      <p className="mt-2 text-[11px] text-[#ECEFF4]">
                        <span className="text-[#667085]">Weapon: </span>
                        <span className="font-medium">{weaponItem.name}</span>
                        {topSkills.length > 0 && (
                          <>
                            <span className="text-[#667085]"> · Core: </span>
                            <span className="text-[#98A2B3]">{topSkills.join(' · ')}</span>
                          </>
                        )}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#ECEFF4]">
                      <span className="text-[#667085]">Talisman: </span>
                      {template.loadout.talisman.name}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.07] bg-[#0B0D10] p-3 text-xs">
                      <div>
                        <span className="block text-[11px] text-[#667085]">Rank Match</span>
                        <span
                          className={`font-medium ${
                            rankEligible && !progressionUnverified ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {!rankEligible ? 'Above Current Rank' : progressionUnverified ? 'Verify Smithy Unlocks' : 'Rank Requirements Met'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-[#667085]">
                          Gear Owned
                        </span>
                        <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                          {ownedCount}/{totalPieces} ({ownershipPercent}%)
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-[#667085]">
                          Weakspot Affinity / Elem
                        </span>
                        <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                          {stats.weakspotAffinity}% ·{' '}
                          {stats.effectiveElement > 0
                            ? `${stats.effectiveElement.toFixed(0)} EFE`
                            : 'Raw'}
                        </span>
                      </div>
                    </div>

                    {missingItems.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs text-[#98A2B3]">
                        <div>
                          <span className="font-medium text-amber-400">
                            Missing Gear:{' '}
                          </span>
                          <span>{missingItems.slice(0, 3).join(', ')}</span>
                          {missingItems.length > 3 && (
                            <span> +{missingItems.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    {missingDecorations.length > 0 && (
                      <div className="mt-3 text-xs text-[#98A2B3]">
                        <span className="font-medium text-amber-400">Missing Decorations </span>
                        {missingDecorations.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
                    <span className="text-xs text-[#667085]">{template.playstyle}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onLoadBuild({
                          ...template.loadout,
                          id: `build_${Date.now()}`,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-1.5 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors"
                    >
                      <span>Load into Builder</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STEAM & REAL-TIME INVENTORY SYNC */}
      {subTab === 'steam_sync' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Steam Progression Sync & Rank Calibrator */}
          <div className="space-y-4">
            <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                  Steam Account Sync (Monster Hunter Rise AppID 1446780)
                </h2>
                <p className="mt-1 text-xs text-[#98A2B3]">
                  Reads public playtime and achievements for rank estimates. Recommendations use the ranks you enter or import from REFramework.
                </p>
              </div>

              <form onSubmit={handleSteamSync} className="flex gap-2">
                <input
                  type="text"
                  value={steamInput}
                  onChange={(e) => setSteamInput(e.target.value)}
                  placeholder="SteamID64, Vanity ID, or steamcommunity.com/id/..."
                  className="flex-1 rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-sm text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={steamLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-4 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${steamLoading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{steamLoading ? 'Syncing...' : 'Sync Steam'}</span>
                </button>
              </form>

              {steamError && (
                <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                  {steamError}
                </p>
              )}
              {steamNotice && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
                  {steamNotice}
                </p>
              )}

              {profile.steamId64 && (
                <div className="flex items-center gap-4 rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3.5">
                  {profile.steamAvatarUrl ? (
                    <img
                      src={profile.steamAvatarUrl}
                      alt={profile.steamPersona}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-[#171C24] text-sm font-semibold text-[#D4A853]">
                      {profile.steamPersona.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-[#ECEFF4] truncate">
                      {profile.steamPersona || profile.steamId64}
                    </p>
                    <p className="font-mono-tabular text-xs text-[#98A2B3]">
                      {profile.playtimeHours} hrs · {profile.achievementsUnlocked}/
                      {profile.achievementsTotal} achievements
                    </p>
                    {profile.steamEstimatedRanks && (
                      <p className="mt-1 text-xs text-[#98A2B3]">
                        Steam estimates · HR {profile.steamEstimatedRanks.hr} · MR {profile.steamEstimatedRanks.mr} · AR {profile.steamEstimatedRanks.ar}
                      </p>
                    )}
                    {profile.unlockedMilestones.length > 0 && (
                      <p className="mt-1 text-[11px] text-[#D4A853]">
                        {profile.unlockedMilestones.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Manual Rank Calibration */}
            <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                  Personal Rank Profile
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-[#98A2B3]">
                    Hunter Rank ({profile.hr})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={profile.hr}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, hr: Number(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 font-mono-tabular text-sm text-[#ECEFF4]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#98A2B3]">
                    Master Rank ({profile.mr})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={profile.mr}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, mr: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 font-mono-tabular text-sm text-[#ECEFF4]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#98A2B3]">
                    Anomaly Level ({profile.ar})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={profile.ar}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, ar: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 font-mono-tabular text-sm text-[#ECEFF4]"
                  />
                </div>
              </div>
            </section>

            {/* Dedicated Synced Charms / Talismans Box */}
            {(() => {
              const cq = charmSearch.trim().toLowerCase();
              const filteredCharms = inventory.talismans.filter((t) => {
                if (!cq) return true;
                const s1Name = t.skill1Id ? getSkillDisplayName(t.skill1Id).toLowerCase() : '';
                const s2Name = t.skill2Id ? getSkillDisplayName(t.skill2Id).toLowerCase() : '';
                return (
                  t.name.toLowerCase().includes(cq) ||
                  s1Name.includes(cq) ||
                  s2Name.includes(cq)
                );
              });

              return (
                <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                        Synced Charms / Talismans ({inventory.talismans.length})
                      </h2>
                      <p className="mt-0.5 text-xs text-[#98A2B3]">
                        Manage the real charms in your Equipment Box. Only charms listed here are used by Owned Builds.
                      </p>
                    </div>
                    {inventory.talismans.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllCharms}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/20 px-2.5 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Add Charm Form */}
                  <form
                    onSubmit={handleAddManualCharm}
                    className="space-y-3 rounded-lg border border-white/[0.07] bg-[#0B0D10] p-3.5"
                  >
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Skill 1
                        </label>
                        <select
                          value={newCharmSkill1}
                          onChange={(e) => setNewCharmSkill1(e.target.value)}
                          className="w-full rounded border border-white/15 bg-[#12161C] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          {SKILLS_DB.map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Lv
                        </label>
                        <select
                          value={newCharmLv1}
                          onChange={(e) => setNewCharmLv1(Number(e.target.value))}
                          className="w-full rounded border border-white/15 bg-[#12161C] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          {[1, 2, 3, 4].map((lv) => (
                            <option key={lv} value={lv}>
                              Lv {lv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Skill 2 (Optional)
                        </label>
                        <select
                          value={newCharmSkill2}
                          onChange={(e) => setNewCharmSkill2(e.target.value)}
                          className="w-full rounded border border-white/15 bg-[#12161C] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          <option value="">None</option>
                          {SKILLS_DB.map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Lv
                        </label>
                        <select
                          value={newCharmLv2}
                          disabled={!newCharmSkill2}
                          onChange={(e) => setNewCharmLv2(Number(e.target.value))}
                          className="w-full rounded border border-white/15 bg-[#12161C] px-2 py-1.5 text-xs text-[#ECEFF4] disabled:opacity-40"
                        >
                          {[0, 1, 2, 3, 4].map((lv) => (
                            <option key={lv} value={lv}>
                              Lv {lv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Slots (1 / 2 / 3)
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((idx) => (
                            <select
                              key={idx}
                              aria-label={`Charm slot ${idx + 1}`}
                              value={newCharmSlots[idx]}
                              onChange={(e) => {
                                const next = [...newCharmSlots] as [number, number, number];
                                next[idx] = Number(e.target.value);
                                setNewCharmSlots(next);
                              }}
                              className="w-12 rounded border border-white/15 bg-[#12161C] px-1.5 py-1.5 text-xs text-[#ECEFF4]"
                            >
                              {[0, 1, 2, 3, 4].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Label (Optional)
                        </label>
                        <input
                          type="text"
                          value={newCharmName}
                          onChange={(e) => setNewCharmName(e.target.value)}
                          placeholder="Auto-named from skills..."
                          className="w-full rounded border border-white/15 bg-[#12161C] px-2.5 py-1.5 text-xs text-[#ECEFF4] placeholder-[#667085]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3 py-1.5 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] whitespace-nowrap"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Add Charm</span>
                      </button>
                    </div>
                  </form>

                  {/* Search & Synced Charm List */}
                  {inventory.talismans.length > 0 && (
                    <input
                      type="text"
                      value={charmSearch}
                      onChange={(e) => setCharmSearch(e.target.value)}
                      placeholder="Filter synced charms by skill or name..."
                      className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                    />
                  )}

                  {filteredCharms.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-[#0B0D10] px-4 py-4 text-center text-xs text-[#98A2B3]">
                      {inventory.talismans.length === 0
                        ? 'No charms synced in your box yet. Import your REFramework snapshot or add a charm above.'
                        : 'No synced charms match that filter.'}
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.06] pr-1">
                      {filteredCharms.map((t) => {
                        const s1Text = t.skill1Id
                          ? `${getSkillDisplayName(t.skill1Id)} Lv${t.skill1Level}`
                          : '';
                        const s2Text =
                          t.skill2Id && t.skill2Level > 0
                            ? `${getSkillDisplayName(t.skill2Id)} Lv${t.skill2Level}`
                            : '';

                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-[#ECEFF4]">
                                  {t.name}
                                </span>
                                <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#98A2B3]">
                                  {t.source ?? 'Imported'}
                                </span>
                              </div>
                              <p className="mt-0.5 font-mono-tabular text-[11px] text-[#D4A853]">
                                {[s1Text, s2Text].filter(Boolean).join(' · ')} · Slots [
                                {t.slots.join('-')}]
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharm(t.id)}
                              aria-label={`Remove ${t.name}`}
                              className="shrink-0 rounded border border-white/10 bg-[#0B0D10] p-1.5 text-[#667085] hover:border-red-500/40 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })()}
          </div>

          {/* Right: Real-Time Inventory & Charm Importer */}
          <div className="space-y-4">
            <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                    REFramework Lua & Save Box Importer
                  </h2>
                  <p className="mt-0.5 text-xs text-[#98A2B3]">
                    Drop <span className="font-mono-tabular text-[#ECEFF4]">elgado_forge_export.json</span> or paste copied REFramework JSON. Replaces Material Box counts &amp; ranks; merges gear &amp; talismans.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReFrameworkModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A853]/40 bg-[#D4A853]/10 px-3 py-1.5 text-xs font-semibold text-[#D4A853] hover:bg-[#D4A853]/20 whitespace-nowrap transition-colors"
                >
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Get REFramework Lua Script</span>
                </button>
              </div>

              {/* Drag-and-Drop JSON Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleImportFile(file);
                }}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
                  isDragOver
                    ? 'border-[#D4A853] bg-[#D4A853]/10'
                    : 'border-white/15 bg-[#0B0D10]'
                }`}
              >
                <div className="text-xs">
                  <p className="font-medium text-[#ECEFF4]">
                    Drop <span className="font-mono-tabular text-[#D4A853]">elgado_forge_export.json</span> here
                  </p>
                  <p className="text-[11px] text-[#667085]">
                    Found in &lt;MHRise&gt;/reframework/data/ after clicking Export in-game
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt,application/json,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImportFile(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#12161C] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                  >
                    <Upload className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                    <span>Choose JSON File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#12161C] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                  >
                    <Clipboard className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                    <span>Paste Clipboard</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportPreview(undefined); }}
                placeholder={`Paste REFramework JSON snapshot or Charm CSV lines:\nWeakness Exploit,2,Critical Boost,1,2,2,0`}
                className="w-full rounded-lg border border-white/15 bg-[#0B0D10] p-3 font-mono-tabular text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setImportText(SAMPLE_REFRAMEWORK_EXPORT_JSON); setImportPreview(undefined); }}
                    className="inline-flex items-center gap-1.5 text-xs text-[#98A2B3] hover:text-[#ECEFF4]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                    <span>Load Sample REFramework JSON</span>
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#98A2B3] hover:text-[#ECEFF4]">
                    <input
                      type="checkbox"
                      checked={replaceBoxOnImport}
                      onChange={(e) => { setReplaceBoxOnImport(e.target.checked); setImportPreview(undefined); }}
                      className="accent-[#D4A853]"
                    />
                    <span>Replace box with snapshot</span>
                  </label>

                </div>

                <button
                  type="button"
                  onClick={handleImportCharms}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B]"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Import Snapshot</span>
                </button>
              </div>

              {importError && (
                <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                  {importError}
                </p>
              )}

              {importPreview && (
                <section className="space-y-2 rounded-lg border border-white/15 p-3 text-xs text-[#ECEFF4]">
                  <h3 className="font-medium">Import Preview</h3>
                  {importPreview.decorationCountsIncomplete && (
                    <p className="text-amber-400">The export has incomplete decoration counts. Existing quantities will be kept unless the export reports more copies.</p>
                  )}
                  {importPreview.decorationImportIssues.length > 0 && (
                    <details className="text-amber-400">
                      <summary className="cursor-pointer">Decoration rows that could not be imported · {importPreview.decorationImportIssues.length}</summary>
                      <ul className="mt-1 max-h-32 overflow-auto">
                        {importPreview.decorationImportIssues.map(issue => <li key={issue}>{issue}</li>)}
                      </ul>
                    </details>
                  )}
                  {importPreview.protectedImportGroups.map(({ label, rows }) => (
                    <details key={label} className="text-amber-400">
                      <summary className="cursor-pointer">{label} · {rows.length} unreadable entries. Valid entries will be merged with your existing inventory.</summary>
                      <ul className="mt-1 max-h-32 overflow-auto">
                        {rows.map(row => <li key={row}>{row}</li>)}
                      </ul>
                    </details>
                  ))}
                  {importPreview.groups.filter(group => group.changes.length > 0).map(group => (
                    <details key={group.name}>
                      <summary className="cursor-pointer">{group.name} · {group.changes.length} changes</summary>
                      <ul className="mt-1 max-h-44 overflow-auto text-[#98A2B3]">
                        {group.changes.map((change, index) => <li key={index}>{change}</li>)}
                      </ul>
                    </details>
                  ))}
                  {importPreview.groups.every(group => !group.changes.length) && <p>No inventory or rank changes detected.</p>}
                  <div className="flex gap-2">
                    <button type="button" className="rounded bg-[#D4A853] px-3 py-1.5 text-[#0B0D10]"
                      onClick={() => applyImportPayload(importPreview.raw, true)}>Apply Import</button>
                    <button type="button" className="rounded border border-white/15 px-3 py-1.5"
                      onClick={() => setImportPreview(undefined)}>Cancel</button>
                  </div>
                </section>
              )}
              {importStatus && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{importStatus}</span>
                </p>
              )}

              {importUnmatched.length > 0 && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-300">
                  {importUnmatched.length} item(s) not in Sunbreak catalog (skipped):{' '}
                  {importUnmatched.slice(0, 5).join(', ')}
                  {importUnmatched.length > 5 ? ` +${importUnmatched.length - 5} more` : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
                <span className="text-xs text-[#98A2B3] mr-auto">Export Backup</span>
                <button
                  type="button"
                  onClick={() => exportInventoryAsJson(inventory, profile)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                >
                  <Download className="h-3 w-3 text-[#D4A853]" aria-hidden="true" />
                  <span>Inventory JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportMaterialsAsCsv(inventory)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                >
                  <Download className="h-3 w-3 text-[#D4A853]" aria-hidden="true" />
                  <span>Materials CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportBuildsAsJson(savedBuilds)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                >
                  <Download className="h-3 w-3 text-[#D4A853]" aria-hidden="true" />
                  <span>Builds JSON</span>
                </button>
                <button type="button" onClick={() => buildsBackupInput.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853]">
                  <Upload className="h-3 w-3 text-[#D4A853]" aria-hidden="true" />
                  Import Builds JSON
                </button>
                <input ref={buildsBackupInput} type="file" accept=".json,application/json" hidden onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void handleBuildsBackup(file);
                  event.currentTarget.value = '';
                }} />
              </div>
              {buildsBackup && buildsBackupPreview && (
                <section className="space-y-2 rounded-lg border border-white/15 p-3 text-xs text-[#ECEFF4]">
                  <h3 className="font-medium">Build Backup Preview</h3>
                  <p>{buildsBackupPreview.added.length} to restore · {buildsBackupPreview.duplicates.length} duplicate IDs skipped · {buildsBackup.invalidRows.length} invalid rows</p>
                  {buildsBackupPreview.added.length > 0 && (
                    <ul className="max-h-32 overflow-auto text-[#98A2B3]">
                      {buildsBackupPreview.added.map(build => <li key={build.id}>{build.name}</li>)}
                    </ul>
                  )}
                  {buildsBackup.invalidRows.length > 0 && <p className="text-amber-400">Invalid rows · {buildsBackup.invalidRows.join(', ')}</p>}
                  <div className="flex gap-2">
                    <button type="button" disabled={buildsBackupPreview.added.length === 0}
                      className="rounded bg-[#D4A853] px-3 py-1.5 text-[#0B0D10] disabled:opacity-40"
                      onClick={() => {
                        onImportBuilds(buildsBackupPreview.added);
                        setBuildsBackupMessage(`Restored ${buildsBackupPreview.added.length} saved builds.`);
                        setBuildsBackup(undefined);
                      }}>Restore Builds</button>
                    <button type="button" onClick={() => setBuildsBackup(undefined)}
                      className="rounded border border-white/15 px-3 py-1.5">Cancel</button>
                  </div>
                </section>
              )}
              {buildsBackupMessage && <p role="status" className="text-xs text-[#98A2B3]">{buildsBackupMessage}</p>}
            </section>

            {/* Material Box (Item Box Tracker — Mod-Free) */}
            <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                    Material Box Tracker
                  </h2>
                  <p className="font-mono-tabular text-xs text-[#98A2B3]">
                    {
                      MATERIALS_CATALOG.filter(
                        (m) => (inventory.materials[m.name] ?? 0) > 0
                      ).length
                    }{' '}
                    / {MATERIALS_CATALOG.length} items stocked · Track forging shortfalls across builds
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMaterialBoxOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors whitespace-nowrap"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Full Material Box ({MATERIALS_CATALOG.length} Items)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={matSearch}
                  onChange={(e) => setMatSearch(e.target.value)}
                  placeholder="Quick edit material or monster..."
                  className="flex-1 rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMaterialBoxOpen(true)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                >
                  Expand All Items
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-white/[0.06] pr-1">
                {MATERIALS_CATALOG.filter((m) => {
                  const q = matSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    m.name.toLowerCase().includes(q) ||
                    m.source.toLowerCase().includes(q)
                  );
                })
                  .slice(0, 24)
                  .map((mat) => {
                    const qty = inventory.materials[mat.name] ?? 0;
                    return (
                      <div
                        key={mat.name}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="block font-medium text-[#ECEFF4]">
                            {mat.name}
                          </span>
                          <span className="block text-[11px] text-[#667085]">
                            {mat.source} · {mat.rankTier}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono-tabular shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateInventory({
                                ...inventory,
                                materials: {
                                  ...inventory.materials,
                                  [mat.name]: Math.max(0, qty - 1),
                                },
                              })
                            }
                            className="rounded border border-white/10 bg-[#0B0D10] px-2 py-1 text-[#98A2B3] hover:text-[#ECEFF4]"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={9999}
                            value={qty}
                            onChange={(e) =>
                              onUpdateInventory({
                                ...inventory,
                                materials: {
                                  ...inventory.materials,
                                  [mat.name]: Math.max(0, Number(e.target.value) || 0),
                                },
                              })
                            }
                            aria-label={`${mat.name} quantity`}
                            className="w-14 rounded border border-white/15 bg-[#0B0D10] px-1.5 py-1 text-center text-[#ECEFF4]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateInventory({
                                ...inventory,
                                materials: {
                                  ...inventory.materials,
                                  [mat.name]: qty + 1,
                                },
                              })
                            }
                            className="rounded border border-white/10 bg-[#0B0D10] px-2 py-1 text-[#98A2B3] hover:text-[#ECEFF4]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* Unlocked Gear & Decorations Box Checklist */}
            {(() => {
              const q = invSearch.trim().toLowerCase();
              const filteredWeapons =
                invTypeFilter === 'armor' || invTypeFilter === 'decorations'
                  ? []
                  : WEAPONS_DB.filter(
                      (w) =>
                        !q ||
                        w.name.toLowerCase().includes(q) ||
                        w.weaponClass.toLowerCase().includes(q)
                    );
              const filteredArmor =
                invTypeFilter === 'weapons' || invTypeFilter === 'decorations'
                  ? []
                  : SELECTABLE_ARMOR.filter(
                      (a) =>
                        !q ||
                        a.name.toLowerCase().includes(q) ||
                        a.variantLabel?.toLowerCase().includes(q) ||
                        a.slot.toLowerCase().includes(q)
                    );
              const filteredDecos =
                invTypeFilter === 'weapons' || invTypeFilter === 'armor'
                  ? []
                  : DECORATIONS_DB.filter((d) => {
                      if (!q) return true;
                      const skillName = (d.skillName ?? getSkillDisplayName(d.skillId)).toLowerCase();
                      return (
                        d.name.toLowerCase().includes(q) ||
                        skillName.includes(q) ||
                        `lv${d.slotLevel}`.includes(q) ||
                        (Boolean(d.isRampage) && 'rampage'.includes(q))
                      );
                    });
              const shownCount =
                filteredWeapons.length + filteredArmor.length + filteredDecos.length;
              const isFiltered = q.length > 0 || invTypeFilter !== 'all';

              const handleSelectAllGear = () => {
                const nextWeapons = Array.from(
                  new Set([
                    ...inventory.ownedWeaponIds,
                    ...filteredWeapons.map((w) => w.id),
                  ])
                );
                const nextArmor = Array.from(
                  new Set([
                    ...inventory.ownedArmorIds,
                    ...filteredArmor.map((a) => a.id),
                  ])
                );
                const nextDecos = Array.from(
                  new Set([
                    ...inventory.ownedDecoIds,
                    ...filteredDecos.map((d) => d.id),
                  ])
                );
                onUpdateInventory({
                  ...inventory,
                  ownedWeaponIds: nextWeapons,
                  ownedArmorIds: nextArmor,
                  ownedDecoIds: nextDecos,
                  lastInventorySyncAt: new Date().toISOString(),
                });
              };

              const handleDeselectAllGear = () => {
                if (!isFiltered) {
                  onUpdateInventory({
                    ...inventory,
                    ownedWeaponIds: [],
                    ownedArmorIds: [],
                    ownedDecoIds: [],
                    ownedDecoCounts: {},
                    lastInventorySyncAt: new Date().toISOString(),
                  });
                } else {
                  const weaponRemove = new Set(filteredWeapons.map((w) => w.id));
                  const armorRemove = new Set(filteredArmor.map((a) => a.id));
                  const decoRemove = new Set(filteredDecos.map((d) => d.id));
                  const nextDecoCounts = { ...(inventory.ownedDecoCounts ?? {}) };
                  decoRemove.forEach((id) => {
                    delete nextDecoCounts[id];
                  });
                  onUpdateInventory({
                    ...inventory,
                    ownedWeaponIds: inventory.ownedWeaponIds.filter(
                      (id) => !weaponRemove.has(id)
                    ),
                    ownedArmorIds: inventory.ownedArmorIds.filter(
                      (id) => !armorRemove.has(id)
                    ),
                    ownedDecoIds: inventory.ownedDecoIds.filter(
                      (id) => !decoRemove.has(id)
                    ),
                    ownedDecoCounts: nextDecoCounts,
                    lastInventorySyncAt: new Date().toISOString(),
                  });
                }
              };

              return (
                <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                        Owned Equipment Inventory (
                        {ownedWeaponSet.size + ownedSelectableArmorCount + ownedDecoSet.size} /{' '}
                        {WEAPONS_DB.length + SELECTABLE_ARMOR.length + DECORATIONS_DB.length})
                      </h2>
                      <p className="font-mono-tabular text-[11px] text-[#98A2B3]">
                        Weapons {ownedWeaponSet.size}/{WEAPONS_DB.length} · Armor{' '}
                        {ownedSelectableArmorCount}/{SELECTABLE_ARMOR.length} · Decorations{' '}
                        {ownedDecoSet.size}/{DECORATIONS_DB.length}
                      </p>
                    </div>
                    <input
                      type="text"
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      placeholder="Filter weapons, armor, jewels, or skills..."
                      className="rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1 text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-2.5">
                    <div className="inline-flex flex-wrap rounded-md border border-white/10 bg-[#0B0D10] p-0.5">
                      {(
                        [
                          { id: 'all', label: 'All Gear' },
                          { id: 'weapons', label: `Weapons (${ownedWeaponSet.size})` },
                          { id: 'armor', label: `Armor (${ownedSelectableArmorCount})` },
                          { id: 'decorations', label: `Decorations (${ownedDecoSet.size})` },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInvTypeFilter(tab.id)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            invTypeFilter === tab.id
                              ? 'bg-[#D4A853] text-[#0B0D10]'
                              : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllGear}
                        disabled={shownCount === 0}
                        className="rounded-md border border-[#D4A853]/40 bg-[#D4A853]/10 px-2.5 py-1 text-[11px] font-medium text-[#D4A853] hover:bg-[#D4A853]/20 disabled:opacity-40"
                      >
                        {isFiltered ? `Select Shown (${shownCount})` : 'Select All'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllGear}
                        disabled={shownCount === 0}
                        className="rounded-md border border-white/15 bg-[#0B0D10] px-2.5 py-1 text-[11px] font-medium text-[#98A2B3] hover:text-[#ECEFF4] disabled:opacity-40"
                      >
                        {isFiltered ? `Deselect Shown (${shownCount})` : 'Deselect All'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.06] pr-1">
                    {shownCount === 0 && (
                      <p className="py-6 text-center text-xs text-[#98A2B3]">
                        No equipment or decorations match that filter.
                      </p>
                    )}
                    {filteredWeapons.map((w) => {
                      const owned = ownedWeaponSet.has(w.id);
                      return (
                        <label
                          key={w.id}
                          className="flex cursor-pointer items-center justify-between py-2 text-xs"
                        >
                          <span className="text-[#ECEFF4]">
                            {w.name}{' '}
                            <span className="text-[#667085]">({w.weaponClass})</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={owned}
                            onChange={() => {
                              const next = owned
                                ? inventory.ownedWeaponIds.filter((id) => id !== w.id)
                                : [...inventory.ownedWeaponIds, w.id];
                              onUpdateInventory({ ...inventory, ownedWeaponIds: next });
                            }}
                            className="accent-[#D4A853]"
                          />
                        </label>
                      );
                    })}
                    {filteredArmor.map((a) => {
                      const owned = ownedArmorSet.has(a.id);
                      return (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center justify-between py-2 text-xs"
                        >
                          <span className="text-[#ECEFF4]">
                            {a.name} <span className="text-[#667085]">({a.variantLabel ? `${a.slot} · ${a.variantLabel}` : a.slot})</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={owned}
                            onChange={() => {
                              const next = owned
                                ? inventory.ownedArmorIds.filter((id) => id !== a.id)
                                : [...inventory.ownedArmorIds, a.id];
                              onUpdateInventory({ ...inventory, ownedArmorIds: next });
                            }}
                            className="accent-[#D4A853]"
                          />
                        </label>
                      );
                    })}
                    {filteredDecos.map((d) => {
                      const owned = ownedDecoSet.has(d.id);
                      const qty = owned ? inventory.ownedDecoCounts?.[d.id] ?? 1 : 0;
                      const setQuantity = (quantity: number) => {
                        const ownedDecoCounts = { ...inventory.ownedDecoCounts };
                        if (quantity > 0) ownedDecoCounts[d.id] = quantity;
                        else delete ownedDecoCounts[d.id];
                        const ownedDecoIds = inventory.ownedDecoIds.filter((id) => id !== d.id);
                        if (quantity > 0) ownedDecoIds.push(d.id);
                        onUpdateInventory({ ...inventory, ownedDecoIds, ownedDecoCounts });
                      };
                      const skillLabel = d.skillName ?? getSkillDisplayName(d.skillId);
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between gap-3 py-2 text-xs"
                        >
                          <span className="min-w-0 text-[#ECEFF4]">
                            <span className="font-medium">{d.name}</span>{' '}
                            <span className="text-[#98A2B3]">
                              ({d.isRampage ? `${skillLabel} · Rampage` : `+${d.points} ${skillLabel}`} · Lv${d.slotLevel})
                            </span>
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              key={qty}
                              aria-label={`${d.name} quantity`}
                              type="number"
                              min={0}
                              max={9999}
                              defaultValue={qty}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                              onBlur={(event) => {
                                const raw = event.currentTarget.valueAsNumber;
                                const next = Number.isFinite(raw) ? Math.max(0, Math.min(9999, Math.trunc(raw))) : qty;
                                event.currentTarget.value = String(next);
                                if (next !== qty) setQuantity(next);
                              }}
                              className="w-16 rounded border border-white/15 bg-[#0B0D10] px-2 py-1 font-mono-tabular text-[#ECEFF4]"
                            />
                            <input
                              aria-label={`Own ${d.name}`}
                              type="checkbox"
                              checked={owned}
                              onChange={() => setQuantity(owned ? 0 : 1)}
                              className="accent-[#D4A853]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: OFFICIAL SUNBREAK DATABASE EXPLORER */}
      {subTab === 'database' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.09] bg-[#12161C] p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'weapons', label: `Weapons (${WEAPONS_DB.length})` },
                  { id: 'armor', label: `Armor (${ARMOR_DB.length})` },
                  { id: 'decorations', label: `Decorations (${DECORATIONS_DB.length})` },
                  { id: 'skills', label: `Skills (${SKILLS_DB.length})` },
                  { id: 'monsters', label: `Monsters (${MONSTERS_DB.length})` },
                ] as Array<{
                  id: 'weapons' | 'armor' | 'decorations' | 'skills' | 'monsters';
                  label: string;
                }>
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setDbType(cat.id);
                    if (cat.id === 'decorations' && dbRank === 'LR') setDbRank('');
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    dbType === cat.id
                      ? 'bg-[#D4A853] text-[#0B0D10]'
                      : 'border border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  value={dbQuery}
                  onChange={(e) => setDbQuery(e.target.value)}
                  placeholder="Query Sunbreak database..."
                  className="rounded-lg border border-white/15 bg-[#0B0D10] py-1.5 pl-8 pr-3 text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                />
              </div>

              {dbType === 'weapons' && (
                <select
                  value={dbWeaponClass}
                  onChange={(e) => setDbWeaponClass(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value="">All Weapon Classes</option>
                  {WEAPON_CLASSES.map((wc) => (
                    <option key={wc} value={wc}>
                      {wc}
                    </option>
                  ))}
                </select>
              )}

              {dbType === 'armor' && (
                <select
                  value={dbSlot}
                  onChange={(e) => setDbSlot(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value="">All Slots</option>
                  {(['Helm', 'Chest', 'Arms', 'Waist', 'Legs'] as const).map((sl) => (
                    <option key={sl} value={sl}>
                      {sl}
                    </option>
                  ))}
                </select>
              )}

              {(dbType === 'weapons' || dbType === 'armor' || dbType === 'decorations') && (
                <select
                  value={dbRank}
                  onChange={(e) => setDbRank(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value="">All Rank Tiers</option>
                  {(dbType === 'decorations' ? ['HR', 'MR'] : ['LR', 'HR', 'MR']).map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              )}

              {(dbType === 'armor' || dbType === 'decorations') && (
                <select
                  value={dbSkill}
                  onChange={(e) => setDbSkill(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value="">All Skills</option>
                  {SKILLS_DB.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              )}

              {dbType === 'monsters' && (
                <select
                  value={dbSpecies}
                  onChange={(e) => setDbSpecies(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value="">All Species</option>
                  {Array.from(new Set(MONSTERS_DB.map((m) => m.species))).map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleRefreshDatabase}
                disabled={dbSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]/50"
              >
                <Database className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                <span>{dbSyncing ? 'Verifying...' : 'Verify Catalog'}</span>
              </button>
            </div>
          </div>

          {dbSyncError && <p role="alert" className="text-xs text-rose-300">{dbSyncError}</p>}
          {dbLastSynced && (
            <p className="text-xs text-emerald-400">
              Catalog Sunbreak TU6 (Ver.16) verified at{' '}
              {new Date(dbLastSynced).toLocaleTimeString()}.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#12161C]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-[#0F1318] text-[#98A2B3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Category / Tier</th>
                  <th className="px-5 py-3 font-medium">Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {dbResults.map((row, idx) => {
                  return (
                    <tr key={String(row.id ?? idx)} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-medium text-[#ECEFF4]">
                        {String(row.name ?? '')}
                      </td>
                      <td className="px-4 py-3 text-[#98A2B3]">
                        {String(
                          row.weaponClass ??
                            row.slot ??
                            row.category ??
                            row.species ??
                            row.rankTier ??
                            ''
                        )}{' '}
                        {row.rankTier ? `· ${String(row.rankTier)}` : ''}
                      </td>
                      <td className="px-5 py-3 font-mono-tabular text-[#D4A853]">
                        <div>
                          {dbType === 'weapons' &&
                            `Raw ${row.raw} · ${row.elementType} ${row.elementValue} · Aff ${row.affinity}% · ${row.sharpness}`}
                          {dbType === 'armor' && (
                            <>
                              <div>
                                {`Def ${row.defense} · Slots [${Array.isArray(row.slots) ? row.slots.join('-') : ''}] · ${row.unlockNote}`}
                              </div>
                              {row.skills && typeof row.skills === 'object' && (
                                <div className="mt-0.5 text-[11px] text-[#ECEFF4]">
                                  {Object.entries(row.skills as Record<string, number>)
                                    .filter(([, pts]) => pts > 0)
                                    .map(([skId, pts]) => {
                                      const skName =
                                        SKILLS_DB.find((s) => s.id === skId)?.name ?? skId;
                                      return `${skName} Lv${pts}`;
                                    })
                                    .join(' · ')}
                                </div>
                              )}
                            </>
                          )}
                          {dbType === 'decorations' &&
                            `Slot Lv${row.slotLevel} · +${row.points} ${
                              row.skillName ?? SKILLS_DB.find((s) => s.id === row.skillId)?.name ?? row.skillId
                            }`}
                          {dbType === 'skills' &&
                            `Max Lv${row.maxLevel} · ${String(row.summary ?? '')}`}
                          {dbType === 'monsters' &&
                            `HP ${Number(row.hpSolo ?? 0).toLocaleString()} · Weak: ${row.primaryWeakness} / ${row.secondaryWeakness} · ${
                              Array.isArray(row.hitzones) ? row.hitzones.length : 0
                            } hitzones`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MaterialBoxModal
        open={materialBoxOpen}
        inventory={inventory}
        onUpdateInventory={onUpdateInventory}
        onClose={() => setMaterialBoxOpen(false)}
      />

      <ReFrameworkScriptModal
        open={reframeworkModalOpen}
        onClose={() => setReFrameworkModalOpen(false)}
        onLoadSampleJson={(sample) => {
          setImportText(sample);
          setImportPreview(undefined);
          setImportError('');
        }}
      />
    </div>
  );
};
