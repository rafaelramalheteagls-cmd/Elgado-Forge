import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Sliders,
  Star,
  Trash2,
} from 'lucide-react';
import {
  getArmorById,
  getDecorationById,
  getSkillById,
  getWeaponById,
  SKILLS_DB,
  STARTER_LOADOUT,
  WEAPON_CLASSES,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { estimateGunlanceFullBurst, getBowgunAmmoOptions, getBowgunHandling, getPrimaryBowgunAmmo } from '../data/weaponMechanics';
import { EMPTY_ARMOR_AUGMENT } from '../data/quriousDefaults';
import { getArmorCraftingMaterials, getDecorationCraftingMaterials, getEquipmentCraftingUnlock, getEquipmentCraftingZenny, getRampageCraftingCategory, getWeaponCraftingOptions } from '../data/mhriceAdapter';
import { ANOMALY_MATERIAL_SOURCES } from '../data/mhriceAdapter';
import {
  calculateBuildCraftingSummary,
  calculateBuildStats,
  rampageDecorationFits,
  resolveRecommendationInventory,
  resolveRampageSlot,
  resolveArmorSlots,
  resolveMechanicsWeapon,
  resolveWeaponSlots,
} from '../engine/damageCalculator';
import { createCraftingPlanner, craftingRoute, getAnomalyFarmOptions, recordCraftedItem, summarizeCraftingForecast } from '../engine/craftingPlanner';
import {
  ArmorSlot,
  BuildLoadout,
  InventoryState,
  QuriousArmorAugment,
  TalismanItem,
  WeaponClass,
} from '../types/sunbreak';
import { DrawerTarget } from './EquipmentDrawer';
import { SharpnessBar } from './SharpnessBar';

interface BuilderWorkspaceProps {
  loadout: BuildLoadout;
  masterRank: number;
  researchLevel: number;
  savedBuilds: BuildLoadout[];
  favoriteIds: string[];
  inventory: InventoryState;
  onUpdateLoadout: (next: BuildLoadout) => void;
  onUpdateInventory: React.Dispatch<React.SetStateAction<InventoryState>>;
  onSaveBuild: () => void;
  onToggleFavorite: (buildId: string) => void;
  onSelectSavedBuild: (build: BuildLoadout) => void;
  onDeleteSavedBuild: (buildId: string) => void;
  onOpenDrawer: (target: DrawerTarget) => void;
}

const ARMOR_SLOTS: Array<{
  slot: ArmorSlot;
  idKey: 'helmId' | 'chestId' | 'armsId' | 'waistId' | 'legsId';
  decoKey: 'helm' | 'chest' | 'arms' | 'waist' | 'legs';
}> = [
  { slot: 'Helm', idKey: 'helmId', decoKey: 'helm' },
  { slot: 'Chest', idKey: 'chestId', decoKey: 'chest' },
  { slot: 'Arms', idKey: 'armsId', decoKey: 'arms' },
  { slot: 'Waist', idKey: 'waistId', decoKey: 'waist' },
  { slot: 'Legs', idKey: 'legsId', decoKey: 'legs' },
];

export const BuilderWorkspace: React.FC<BuilderWorkspaceProps> = ({
  loadout,
  masterRank,
  researchLevel,
  savedBuilds,
  favoriteIds,
  inventory,
  onUpdateLoadout,
  onUpdateInventory,
  onSaveBuild,
  onToggleFavorite,
  onSelectSavedBuild,
  onDeleteSavedBuild,
  onOpenDrawer,
}) => {
  const [showWeaponQurious, setShowWeaponQurious] = useState(false);
  const [openArmorQurious, setOpenArmorQurious] = useState<ArmorSlot | null>(null);
  const [showCharmEditor, setShowCharmEditor] = useState(false);
  const [savedFilter, setSavedFilter] = useState<'all' | 'favorites'>('all');
  const [craftConfirmation, setCraftConfirmation] = useState<{
    itemId: string; inventory: InventoryState; build: BuildLoadout; masterRank: number;
  }>();
  const [farmReachableOnly, setFarmReachableOnly] = useState(false);
  const [armorPlan, setArmorPlan] = useState<{ base: BuildLoadout; slot: ArmorSlot; augment: QuriousArmorAugment }>();
  const activeArmorPlan = armorPlan?.base === loadout ? armorPlan : undefined;

  const stats = useMemo(() => calculateBuildStats(loadout, { wexUptime: 100, armorcharmTalon: true }), [loadout]);
  const plannedStats = useMemo(() => {
    if (!activeArmorPlan) return;
    return calculateBuildStats({
      ...loadout,
      quriousArmor: { ...loadout.quriousArmor, [activeArmorPlan.slot]: activeArmorPlan.augment },
    }, { wexUptime: 100, armorcharmTalon: true });
  }, [activeArmorPlan, loadout]);
  const plannedSkillChanges = plannedStats
    ? [...new Set([...Object.keys(stats.skills), ...Object.keys(plannedStats.skills)])]
      .filter(id => (stats.skills[id] ?? 0) !== (plannedStats.skills[id] ?? 0))
    : [];
  const crafting = useMemo(
    () => calculateBuildCraftingSummary(loadout, inventory),
    [loadout, inventory]
  );
  const craftingInventory = useMemo(() => resolveRecommendationInventory(inventory), [inventory]);
  const craftPlanner = useMemo(() => createCraftingPlanner(craftingInventory, masterRank), [craftingInventory, masterRank]);
  const craftPlan = useMemo(() => craftPlanner.plan(crafting.pieceBreakdowns), [craftPlanner, crafting]);
  const forecast = useMemo(() => summarizeCraftingForecast(craftPlanner, crafting.pieceBreakdowns), [craftPlanner, crafting]);
  const weapon = getWeaponById(loadout.weaponId) ?? WEAPONS_DB[0];
  const mechanicsWeapon = weapon.weaponClass === 'Gunlance' || weapon.damageType === 'Shot'
    ? resolveMechanicsWeapon(weapon)
    : weapon;
  const fullBurst = estimateGunlanceFullBurst(mechanicsWeapon, stats, 0, 1);
  const ammoOptions = getBowgunAmmoOptions(mechanicsWeapon);
  const primaryAmmo = getPrimaryBowgunAmmo(mechanicsWeapon, loadout.bowgunAmmo);
  const ammoHandling = getBowgunHandling(mechanicsWeapon, stats.skills, loadout.bowgunAmmo);
  const weaponSlots = resolveWeaponSlots(loadout);
  const isFavorited = favoriteIds.includes(loadout.id);

  const handleWeaponClassChange = (nextClass: WeaponClass) => {
    const classWeapons = WEAPONS_DB.filter((w) => w.weaponClass === nextClass).sort(
      (a, b) => b.raw - a.raw
    );
    const firstMatch = classWeapons[0] ?? WEAPONS_DB[0];
    onUpdateLoadout({
      ...loadout,
      weaponClass: nextClass,
      weaponId: firstMatch.id,
      bowgunAmmo: undefined,
      decorations: {
        ...loadout.decorations,
        weapon: ['', '', ''],
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectPresetTalisman = (tali: TalismanItem) => {
    onUpdateLoadout({
      ...loadout,
      talisman: tali,
      decorations: {
        ...loadout.decorations,
        talisman: ['', '', ''],
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const sortedSkills = useMemo(() => {
    return Object.entries(stats.skills)
      .filter(([, pts]) => pts > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stats.skills]);

  const displayedSaved = useMemo(() => {
    const favSet = new Set(favoriteIds);
    const list =
      savedFilter === 'favorites'
        ? savedBuilds.filter((b) => favSet.has(b.id))
        : savedBuilds;
    return [...list].sort((a, b) => {
      const af = favSet.has(a.id) ? 1 : 0;
      const bf = favSet.has(b.id) ? 1 : 0;
      return bf - af;
    });
  }, [savedBuilds, favoriteIds, savedFilter]);

  const rampDeco = getDecorationById(loadout.rampageDecoId);
  const rampageUpgrade = loadout.quriousWeapon?.extraSlotLevel;
  const rampageSlot = resolveRampageSlot(weapon, rampageUpgrade);
  const rampDecoFits = rampageDecorationFits(loadout.rampageDecoId, weapon, rampageUpgrade);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-6">
      {/* Workbench Control Strip */}
      <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div>
              <label htmlFor="weapon-class-select" className="sr-only">
                Weapon Class
              </label>
              <select
                id="weapon-class-select"
                value={loadout.weaponClass}
                onChange={(e) => handleWeaponClassChange(e.target.value as WeaponClass)}
                className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-sm font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
              >
                {WEAPON_CLASSES.map((wc) => (
                  <option key={wc} value={wc}>
                    {wc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px] max-w-md">
              <label htmlFor="build-name-input" className="sr-only">
                Loadout Name
              </label>
              <input
                id="build-name-input"
                type="text"
                value={loadout.name}
                onChange={(e) =>
                  onUpdateLoadout({
                    ...loadout,
                    name: e.target.value,
                    updatedAt: new Date().toISOString(),
                  })
                }
                placeholder="Name this Sunbreak loadout..."
                className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-2 text-sm font-medium text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
              />
            </div>

            {/* Switch Skill Scroll Mode */}
            <div
              className="inline-flex items-center rounded-lg border border-white/10 bg-[#0B0D10] p-1"
              role="group"
              aria-label="Switch Skill Scroll"
            >
              <button
                type="button"
                onClick={() =>
                  onUpdateLoadout({
                    ...loadout,
                    scrollMode: 'Red',
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  loadout.scrollMode === 'Red'
                    ? 'bg-red-900/50 text-red-200 border border-red-500/40'
                    : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                }`}
              >
                Red Scroll
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateLoadout({
                    ...loadout,
                    scrollMode: 'Blue',
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  loadout.scrollMode === 'Blue'
                    ? 'bg-sky-900/50 text-sky-200 border border-sky-500/40'
                    : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                }`}
              >
                Blue Scroll
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(loadout.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                isFavorited
                  ? 'border-[#D4A853]/50 bg-[#D4A853]/15 text-[#D4A853]'
                  : 'border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
              }`}
              aria-pressed={isFavorited}
            >
              <Star
                className={`h-3.5 w-3.5 ${isFavorited ? 'fill-[#D4A853]' : ''}`}
                aria-hidden="true"
              />
              <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              type="button"
              onClick={onSaveBuild}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171C24] px-3.5 py-2 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]/60 hover:text-[#D4A853] whitespace-nowrap transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save Build</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateLoadout({
                  ...STARTER_LOADOUT,
                  id: `build_${Date.now()}`,
                  name: 'Custom Sunbreak Set',
                  updatedAt: new Date().toISOString(),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-2 text-xs font-medium text-[#98A2B3] hover:text-[#ECEFF4] whitespace-nowrap transition-colors"
              title="Create fresh copy"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Copy</span>
            </button>
          </div>
        </div>

        {/* Saved & Favorites Quick Access Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#98A2B3]">Saved Loadouts</span>
            <div className="inline-flex rounded-md border border-white/10 bg-[#0B0D10] p-0.5">
              <button
                type="button"
                onClick={() => setSavedFilter('all')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  savedFilter === 'all'
                    ? 'bg-[#171C24] text-[#ECEFF4]'
                    : 'text-[#667085] hover:text-[#98A2B3]'
                }`}
              >
                All ({savedBuilds.length})
              </button>
              <button
                type="button"
                onClick={() => setSavedFilter('favorites')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  savedFilter === 'favorites'
                    ? 'bg-[#171C24] text-[#D4A853]'
                    : 'text-[#667085] hover:text-[#98A2B3]'
                }`}
              >
                Favorites ({favoriteIds.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {displayedSaved.map((b) => {
              const active = b.id === loadout.id;
              const fav = favoriteIds.includes(b.id);
              return (
                <div
                  key={b.id}
                  className={`inline-flex items-center rounded-lg border text-xs transition-colors ${
                    active
                      ? 'border-[#D4A853]/60 bg-[#D4A853]/10 text-[#ECEFF4]'
                      : 'border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSavedBuild(b)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 whitespace-nowrap"
                  >
                    {fav && (
                      <Star
                        className="h-3 w-3 fill-[#D4A853] text-[#D4A853]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="max-w-[160px] truncate">{b.name}</span>
                    <span className="text-[11px] text-[#667085]">{b.weaponClass}</span>
                  </button>
                  {savedBuilds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSavedBuild(b.id)}
                      className="border-l border-white/10 px-2 py-1.5 text-[#667085] hover:text-red-400"
                      aria-label={`Delete ${b.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main 2-Column Asymmetric Workbench */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
        {/* Left: 7-Slot Equipment Assembly */}
        <div className="space-y-4">
          {/* Weapon Slot */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#98A2B3]">
                  <span>Weapon</span>
                  <span aria-hidden="true">·</span>
                  <span>{weapon.weaponClass}</span>
                  <span aria-hidden="true">·</span>
                  <span>{weapon.rankTier}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenDrawer({ kind: 'weapon', weaponClass: loadout.weaponClass })
                  }
                  className="text-left font-display text-lg font-semibold text-[#ECEFF4] hover:text-[#D4A853] transition-colors"
                >
                  {weapon.name}
                </button>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#98A2B3] pt-0.5">
                  <span className="font-mono-tabular text-[#ECEFF4]">
                    {weapon.raw} Base Raw
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {weapon.elementType === 'None'
                      ? 'Non-Elemental'
                      : `${weapon.elementType} ${weapon.elementValue}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Affinity {weapon.affinity >= 0 ? `+${weapon.affinity}%` : `${weapon.affinity}%`}
                  </span>
                  <SharpnessBar sharpness={stats.sharpness} compact />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeaponQurious((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#98A2B3] hover:text-[#ECEFF4]"
                >
                  <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Qurious Craft</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenDrawer({ kind: 'weapon', weaponClass: loadout.weaponClass })
                  }
                  className="rounded-lg border border-[#D4A853]/40 bg-[#D4A853]/10 px-3 py-1.5 text-xs font-medium text-[#D4A853] hover:bg-[#D4A853]/20"
                >
                  Change Weapon
                </button>
              </div>
            </div>

            {/* Weapon Deco & Rampage Slots */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
              <span className="text-xs text-[#98A2B3] mr-1">Decorations</span>
              {weaponSlots.map((slotLv, idx) => (
                <DecoSlotButton
                  key={`w_${idx}`}
                  slotLevel={slotLv}
                  decoId={loadout.decorations.weapon[idx] ?? ''}
                  onClick={() =>
                    slotLv > 0 &&
                    onOpenDrawer({
                      kind: 'decoration',
                      slotKey: 'weapon',
                      slotIndex: idx,
                      maxSlotLevel: slotLv,
                    })
                  }
                />
              ))}

              <span className="ml-3 text-xs text-[#98A2B3]">Rampage</span>
              <button
                type="button"
                onClick={() =>
                  rampageSlot > 0 &&
                  onOpenDrawer({ kind: 'rampage', maxSlotLevel: rampageSlot })
                }
                disabled={rampageSlot === 0}
                className="rounded-md border border-white/15 bg-[#0B0D10] px-2.5 py-1 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]/60 disabled:opacity-40"
              >
                {rampDeco
                  ? `${rampDeco.name}${rampDecoFits ? '' : ' (Incompatible)'}`
                  : rampageSlot > 0
                  ? `Empty Rampage Lv${rampageSlot}`
                  : 'No Rampage Slot'}
              </button>
            </div>

            {/* Qurious Weapon Crafting Inline Panel */}
            {showWeaponQurious && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] text-[#98A2B3]">
                    Attack Boost (0–4)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={loadout.quriousWeapon.attackLevel}
                    onChange={(e) =>
                      onUpdateLoadout({
                        ...loadout,
                        quriousWeapon: {
                          ...loadout.quriousWeapon,
                          attackLevel: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#D4A853]"
                  />
                  <span className="font-mono-tabular text-xs text-[#ECEFF4]">
                    +{loadout.quriousWeapon.attackLevel * 5} Raw (Lv
                    {loadout.quriousWeapon.attackLevel})
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#98A2B3]">
                    Element Boost (0–8)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={loadout.quriousWeapon.elementLevel}
                    onChange={(e) =>
                      onUpdateLoadout({
                        ...loadout,
                        quriousWeapon: {
                          ...loadout.quriousWeapon,
                          elementLevel: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#D4A853]"
                  />
                  <span className="font-mono-tabular text-xs text-[#ECEFF4]">
                    +{loadout.quriousWeapon.elementLevel * 4} Elem (Lv
                    {loadout.quriousWeapon.elementLevel})
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#98A2B3]">
                    Affinity Boost (0–3)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    value={loadout.quriousWeapon.affinityLevel}
                    onChange={(e) =>
                      onUpdateLoadout({
                        ...loadout,
                        quriousWeapon: {
                          ...loadout.quriousWeapon,
                          affinityLevel: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#D4A853]"
                  />
                  <span className="font-mono-tabular text-xs text-[#ECEFF4]">
                    +{loadout.quriousWeapon.affinityLevel * 5}% Affinity
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#98A2B3]">
                    Rampage Slot Upgrade
                  </label>
                  <select
                    value={loadout.quriousWeapon.extraSlotLevel}
                    onChange={(e) =>
                      onUpdateLoadout({
                        ...loadout,
                        quriousWeapon: {
                          ...loadout.quriousWeapon,
                          extraSlotLevel: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1 text-xs text-[#ECEFF4]"
                  >
                    <option value={0}>None</option>
                    <option value={1}>+1 Slot Tier</option>
                    <option value={2}>+2 Slot Tiers</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 5 Armor Slots */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] divide-y divide-white/[0.07]">
            {ARMOR_SLOTS.map(({ slot, idKey, decoKey }) => {
              const piece = getArmorById(loadout[idKey]);
              const qArmor = loadout.quriousArmor[slot];
              const resolvedSlots = resolveArmorSlots(
                loadout[idKey],
                qArmor?.slotUpgrade ?? 0
              );
              const isQOpen = openArmorQurious === slot;
              const plan = activeArmorPlan?.slot === slot ? activeArmorPlan : undefined;
              const editedAugment = plan?.augment ?? qArmor ?? EMPTY_ARMOR_AUGMENT;
              const updateAugment = (changes: Partial<QuriousArmorAugment>) => {
                const augment = { ...editedAugment, ...changes };
                if (plan) setArmorPlan({ ...plan, augment });
                else onUpdateLoadout({ ...loadout, quriousArmor: { ...loadout.quriousArmor, [slot]: augment } });
              };

              const nativeSkills = piece
                ? Object.entries(piece.skills)
                    .filter(([sId, pts]) => pts > Number(qArmor?.skillRemovedId === sId))
                      .map(([sId, pts]) => `${getSkillById(sId)?.name ?? sId} ${pts - Number(qArmor?.skillRemovedId === sId)}`)
                : [];
              if (qArmor?.skillAddedId && qArmor.skillAddedPoints > 0) {
                nativeSkills.push(
                  `+${getSkillById(qArmor.skillAddedId)?.name ?? qArmor.skillAddedId} ${
                    qArmor.skillAddedPoints
                  } (Qurious)`
                );
              }

              return (
                <div key={slot} className="p-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#98A2B3]">
                        <span>{slot}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {(piece?.defense ?? 0) + (qArmor?.defenseDelta ?? 0)} Def
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{piece?.rankTier}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDrawer({ kind: 'armor', slot })}
                        className="mt-0.5 text-left font-medium text-sm text-[#ECEFF4] hover:text-[#D4A853] transition-colors"
                      >
                        {piece?.name ?? 'Select Armor'}
                      </button>
                      <p className="mt-1 text-xs text-[#D4A853]/90">
                        {nativeSkills.join(' · ') || 'No innate skills'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {resolvedSlots.map((slotLv, idx) => (
                        <DecoSlotButton
                          key={`${slot}_${idx}`}
                          slotLevel={slotLv}
                          decoId={loadout.decorations[decoKey][idx] ?? ''}
                          onClick={() =>
                            slotLv > 0 &&
                            onOpenDrawer({
                              kind: 'decoration',
                              slotKey: decoKey,
                              slotIndex: idx,
                              maxSlotLevel: slotLv,
                            })
                          }
                        />
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setOpenArmorQurious(isQOpen ? null : slot);
                          setArmorPlan(undefined);
                        }}
                        className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-[11px] font-medium text-[#98A2B3] hover:text-[#ECEFF4]"
                        title="Qurious Armor Crafting"
                      >
                        <span>Augment</span>
                        {isQOpen ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDrawer({ kind: 'armor', slot })}
                        className="rounded-md border border-white/15 bg-[#171C24] px-2.5 py-1.5 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853]/60 hover:text-[#D4A853]"
                      >
                        Swap
                      </button>
                    </div>
                  </div>

                  {isQOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-3">
                      <div>
                        <label htmlFor={`qurious-skill-${slot}`} className="mb-1 block text-[11px] text-[#98A2B3]">
                          Qurious Added Skill
                        </label>
                        <select
                          id={`qurious-skill-${slot}`}
                          value={editedAugment.skillAddedId}
                          onChange={(e) => updateAugment({ skillAddedId: e.target.value, skillAddedPoints: e.target.value ? 1 : 0 })}
                          className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          <option value="">None</option>
                          {SKILLS_DB.map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name} (+1)
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="block text-[11px] text-[#98A2B3]">
                        Qurious Removed Skill
                        <select
                          value={editedAugment.skillRemovedId ?? ''}
                          onChange={(e) => updateAugment({ skillRemovedId: e.target.value || undefined })}
                          className="mt-1 w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          <option value="">None</option>
                          {Object.keys(piece?.skills ?? {}).map(id => <option key={id} value={id}>{getSkillById(id)?.name ?? id} (−1)</option>)}
                        </select>
                      </label>
                      <div>
                        <label htmlFor={`qurious-slots-${slot}`} className="mb-1 block text-[11px] text-[#98A2B3]">
                          Slot Upgrade
                        </label>
                        <select
                          id={`qurious-slots-${slot}`}
                          value={editedAugment.slotUpgrade}
                          onChange={(e) => updateAugment({ slotUpgrade: Number(e.target.value) })}
                          className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          <option value={0}>Base Slots</option>
                          <option value={1}>+1 Slot Level</option>
                          <option value={2}>+2 Slot Levels</option>
                        </select>
                      </div>
                      <label className="block text-[11px] text-[#98A2B3]">
                        Defense Change
                        <input
                          key={`${loadout.id}-${plan ? 'preview' : 'current'}`}
                          type="number"
                          min={-(piece?.defense ?? 0)}
                          defaultValue={editedAugment.defenseDelta}
                          onBlur={(e) => {
                            const defenseDelta = Math.max(-(piece?.defense ?? 0), Math.trunc(e.target.valueAsNumber || 0));
                            e.target.value = String(defenseDelta);
                            if (defenseDelta !== editedAugment.defenseDelta) updateAugment({ defenseDelta });
                          }}
                          className="mt-1 w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        />
                      </label>
                      <div className="self-end sm:col-span-2">
                        <button type="button" onClick={() => setArmorPlan(plan ? undefined : { base: loadout, slot, augment: { ...editedAugment } })} className="rounded border border-white/15 px-3 py-1.5 text-xs text-[#D4A853]">
                          {plan ? 'Discard Preview' : 'Preview Augment'}
                        </button>
                      </div>
                      {plan && plannedStats && (
                        <div className="space-y-1 rounded border border-white/10 p-3 text-xs text-[#98A2B3] sm:col-span-3">
                          <p className="font-medium text-[#ECEFF4]">Current → Planned</p>
                          <p>Slots {resolvedSlots.join('–')} → {resolveArmorSlots(loadout[idKey], editedAugment.slotUpgrade).join('–')} · Total Defense {stats.defense} → {plannedStats.defense} · EFR {stats.effectiveRaw.toFixed(1)} → {plannedStats.effectiveRaw.toFixed(1)}</p>
                          {plannedSkillChanges.length > 0 && <p>{plannedSkillChanges.map(id => `${getSkillById(id)?.name ?? id} ${stats.skills[id] ?? 0} → ${plannedStats.skills[id] ?? 0}`).join(' · ')}</p>}
                          <p>Qurious roll legality and odds are not evaluated.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Talisman Slot */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#98A2B3]">
                  <span>Talisman</span>
                  <span aria-hidden="true">·</span>
                  <span>{loadout.talisman.source ?? 'Custom'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    [{loadout.talisman.slots.join('-')}]
                  </span>
                </div>
                <p className="mt-0.5 font-medium text-sm text-[#ECEFF4]">
                  {loadout.talisman.name}
                </p>
                <p className="mt-1 text-xs text-[#D4A853]">
                  {[
                    loadout.talisman.skill1Id && loadout.talisman.skill1Level > 0
                      ? `${getSkillById(loadout.talisman.skill1Id)?.name ?? loadout.talisman.skill1Id} Lv${loadout.talisman.skill1Level}`
                      : null,
                    loadout.talisman.skill2Id && loadout.talisman.skill2Level > 0
                      ? `${getSkillById(loadout.talisman.skill2Id)?.name ?? loadout.talisman.skill2Id} Lv${loadout.talisman.skill2Level}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {loadout.talisman.slots.map((slotLv, idx) => (
                  <DecoSlotButton
                    key={`tali_${idx}`}
                    slotLevel={slotLv}
                    decoId={loadout.decorations.talisman[idx] ?? ''}
                    onClick={() =>
                      slotLv > 0 &&
                      onOpenDrawer({
                        kind: 'decoration',
                        slotKey: 'talisman',
                        slotIndex: idx,
                        maxSlotLevel: slotLv,
                      })
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowCharmEditor((v) => !v)}
                  className="ml-1 rounded-md border border-white/15 bg-[#171C24] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]/60 hover:text-[#D4A853]"
                >
                  {showCharmEditor ? 'Close Charm Box' : 'Edit / Synced Charms'}
                </button>
              </div>
            </div>

            {showCharmEditor && (
              <div className="mt-4 space-y-4 border-t border-white/[0.07] pt-4">
                <div>
                  <span className="mb-2 block text-xs font-medium text-[#98A2B3]">
                    Synced Charms ({inventory.talismans.length})
                  </span>
                  {inventory.talismans.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/10 bg-[#0B0D10] px-3 py-2 text-xs text-[#98A2B3]">
                      No charms synced yet. Import your REFramework snapshot or add charms in Steam &amp; Inventory Sync.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {inventory.talismans.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectPresetTalisman(t)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                            loadout.talisman.id === t.id
                              ? 'border-[#D4A853] bg-[#D4A853]/15 text-[#ECEFF4]'
                              : 'border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] text-[#98A2B3]">
                      Primary Skill
                    </label>
                    <select
                      value={loadout.talisman.skill1Id}
                      onChange={(e) =>
                        onUpdateLoadout({
                          ...loadout,
                          talisman: {
                            ...loadout.talisman,
                            id: 'tali_custom',
                            name: 'Custom Melded Charm',
                            source: 'Custom',
                            skill1Id: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
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
                      Skill 1 Lv
                    </label>
                    <select
                      value={loadout.talisman.skill1Level}
                      onChange={(e) =>
                        onUpdateLoadout({
                          ...loadout,
                          talisman: {
                            ...loadout.talisman,
                            id: 'tali_custom',
                            name: 'Custom Melded Charm',
                            source: 'Custom',
                            skill1Level: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                    >
                      {[1, 2, 3, 4].map((lv) => (
                        <option key={lv} value={lv}>
                          Lv {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-[#98A2B3]">
                      Secondary Skill
                    </label>
                    <select
                      value={loadout.talisman.skill2Id}
                      onChange={(e) =>
                        onUpdateLoadout({
                          ...loadout,
                          talisman: {
                            ...loadout.talisman,
                            id: 'tali_custom',
                            name: 'Custom Melded Charm',
                            source: 'Custom',
                            skill2Id: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
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
                      Slots (1 / 2 / 3)
                    </label>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((idx) => (
                        <select
                          key={idx}
                          value={loadout.talisman.slots[idx]}
                          onChange={(e) => {
                            const nextSlots = [...loadout.talisman.slots] as [
                              number,
                              number,
                              number
                            ];
                            nextSlots[idx] = Number(e.target.value);
                            onUpdateLoadout({
                              ...loadout,
                              talisman: {
                                ...loadout.talisman,
                                id: 'tali_custom',
                                name: 'Custom Melded Charm',
                                source: 'Custom',
                                slots: nextSlots,
                              },
                            });
                          }}
                          className="w-full rounded border border-white/15 bg-[#0B0D10] px-1 py-1.5 text-xs text-[#ECEFF4]"
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
                </div>
              </div>
            )}
          </div>

          {/* Crafting & Materials Checklist */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                  Crafting & Material Checklist
                </h2>
                <p className="mt-0.5 text-xs text-[#98A2B3]">
                  Tracks missing gear and decoration copies against your inventory
                </p>
              </div>
              <div className="text-right font-mono-tabular text-xs">
                <span className="text-[#ECEFF4]">
                  {crafting.ownedGearCount}/{crafting.totalGearCount} Gear Owned
                </span>
              </div>
            </div>
            {crafting.pieceBreakdowns.length > 0 && (
              <p className={craftPlan ? 'text-xs text-emerald-400' : 'text-xs text-[#98A2B3]'}>
                {craftPlan ? 'Craftable Now · Materials available for all missing items' : 'Crafting & farming plan'}
                {' · '}{forecast.incompleteCost ? 'Known cost' : 'Total cost'} {forecast.zenny.toLocaleString('en-US')} zenny
              </p>
            )}
            {forecast.missingMaterials.size > 0 && (
              <p className="text-xs text-amber-400">
                Materials to farm · {[...forecast.missingMaterials].map(([name, count]) => `${name} ×${count}`).join(', ')}
              </p>
            )}
            {[...forecast.missingMaterials].some(([name]) => ANOMALY_MATERIAL_SOURCES[name]?.length) && (
              <details className="text-xs text-[#98A2B3]">
                <summary className="cursor-pointer font-medium text-[#D4A853]">Where to farm</summary>
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={farmReachableOnly} onChange={(event) => setFarmReachableOnly(event.target.checked)} className="accent-[#D4A853]" />
                  Show only confirmed sources within your AR ({researchLevel})
                </label>
                <ul className="mt-2 space-y-2">
                  {[...forecast.missingMaterials].map(([name, count]) => {
                    const options = getAnomalyFarmOptions(name, researchLevel);
                    if (!options) return null;
                    const { reachable, higher, unspecified } = options;
                    const formatRanges = (entries: typeof reachable, limit = Infinity) => entries.map(source => {
                      const maxLevel = Math.min(source.maxLevel, limit);
                      const levels = maxLevel === source.minLevel ? maxLevel : `${source.minLevel}–${maxLevel}`;
                      return `${source.monster} Lv${levels}`;
                    }).join(', ');
                    return <li key={name}>
                      <span className="font-medium text-[#ECEFF4]">{name} ×{count}</span>
                      {reachable.length > 0 && <span className="block text-emerald-400">Within your AR · {formatRanges(reachable, researchLevel)}</span>}
                      {!farmReachableOnly && higher.length > 0 && <span className="block">Higher AR required · {formatRanges(higher)}</span>}
                      {!farmReachableOnly && unspecified.length > 0 && <span className="block">Investigation levels unconfirmed · {unspecified.join(', ')}</span>}
                      {farmReachableOnly && reachable.length === 0 && <span className="block">No recorded investigation range within your AR.</span>}
                    </li>;
                  })}
                </ul>
              </details>
            )}

            {/* Piece Status Strip */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {crafting.pieceBreakdowns
                .map((p) => {
                  const isWeapon = p.slotLabel === 'Weapon';
                  const isDeco = p.slotLabel.startsWith('Decoration');
                  const kind = isWeapon ? 'weapon' : isDeco ? 'decoration' : 'armor';
                  const craftStep = craftPlan?.get(p.itemId) ?? craftPlanner.reserve(p.itemId, kind, p.missingCopies);
                  const planned = craftStep ?? forecast.steps.get(p.itemId);
                  const route = planned ? craftingRoute(planned) : [];
                  const materials = isDeco ? getDecorationCraftingMaterials(p.itemId) : getArmorCraftingMaterials(p.itemId);
                  const rampageCategory = isDeco ? getRampageCraftingCategory(p.itemId) : undefined;
                  const weaponOptions = isWeapon ? getWeaponCraftingOptions(p.itemId) : [];
                  const zenny = getEquipmentCraftingZenny(p.itemId);
                  const unlock = getEquipmentCraftingUnlock(p.itemId);
                  const isConfirming = craftConfirmation?.itemId === p.itemId
                    && craftConfirmation.inventory === inventory && craftConfirmation.build === loadout
                    && craftConfirmation.masterRank === masterRank;
                  const handleConfirmCrafting = () => {
                    if (!craftStep) return;
                    setCraftConfirmation(undefined);
                    onUpdateInventory(current => {
                      if (current !== inventory) return current;
                      const updated = recordCraftedItem(craftingInventory, kind, craftStep);
                      if (updated === craftingInventory) return current;
                      if (isWeapon) return { ...current, materials: updated.materials, ownedWeaponIds: updated.ownedWeaponIds };
                      if (isDeco) return {
                        ...current, materials: updated.materials, ownedDecoCounts: updated.ownedDecoCounts, ownedDecoIds: updated.ownedDecoIds,
                      };
                      return { ...current, materials: updated.materials, ownedArmorIds: updated.ownedArmorIds };
                    });
                  };
                  const handleMarkOwned = () => {
                    if (isWeapon) {
                      onUpdateInventory({
                        ...inventory,
                        ownedWeaponIds: Array.from(
                          new Set([...inventory.ownedWeaponIds, p.itemId])
                        ),
                      });
                    } else if (isDeco) {
                      onUpdateInventory({
                        ...inventory,
                        ownedDecoCounts: { ...inventory.ownedDecoCounts, [p.itemId]: p.requiredCopies - p.missingCopies + 1 },
                        ownedDecoIds: Array.from(
                          new Set([...inventory.ownedDecoIds, p.itemId])
                        ),
                      });
                    } else {
                      onUpdateInventory({
                        ...inventory,
                        ownedArmorIds: Array.from(
                          new Set([...inventory.ownedArmorIds, p.itemId])
                        ),
                      });
                    }
                  };

                  return (
                    <div
                      key={`${p.slotLabel}_${p.itemId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="block text-[11px] text-[#667085]">
                          {p.slotLabel}
                        </span>
                        {craftStep && (
                          <span className="block text-emerald-400">
                            Craftable Now · {route.length > 1 ? `${route.length}-step route` : craftStep.recipe.label ?? 'Forge'}
                          </span>
                        )}
                        {craftStep?.recipe.category && route.length === 1 && (
                          <span className="block text-[#98A2B3]">
                            Planned materials · {craftStep.spent.map(material => `${material.name} ×${material.count}`).join(', ')}
                          </span>
                        )}
                        {(!craftStep || route.length > 1) && route.length > 0 && (
                          <ol className="mt-1 space-y-1 text-[#98A2B3]">
                            {route.map(step => (
                              <li key={step.itemId}>
                                {step.recipe.label ?? 'Forge'}
                                {isWeapon && ` → ${getWeaponById(step.itemId)?.name ?? step.itemId}`}
                                {step.needsPredecessor && !step.prerequisite && ' · Obtain the prerequisite weapon first'}
                                {(step.recipe.minMr ?? 0) > masterRank && ` · Requires MR ${step.recipe.minMr}`}
                                {step.missingPoints > 0 && ` · ${step.missingPoints} ${step.recipe.category?.name} points short`}
                                {route.length > 1 && (
                                  <span className="block">
                                    {[
                                      step.recipe.zenny === undefined ? undefined : `${step.recipe.zenny.toLocaleString('en-US')} zenny`,
                                      ...(step.recipe.unlock ?? []),
                                      ...step.spent.map(material => `${material.name} ×${material.count}`),
                                    ].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                        <span className="block truncate font-medium text-[#ECEFF4]">
                          {p.itemName}{p.missingCopies > 1 ? ` ×${p.missingCopies}` : ''}
                        </span>
                        {route.length > 1 ? null : weaponOptions.length > 0 ? weaponOptions.map((option) => (
                          <div key={option.kind} className="mt-1 text-[#98A2B3]">
                            <span className="font-medium">{option.label}</span>
                            <ul>
                              {option.unlock.length > 0 && <li>Unlock · {option.unlock.join(' · ')}</li>}
                              {option.zenny !== undefined && <li>{option.zenny.toLocaleString('en-US')} zenny</li>}
                              {option.materials.map((material) => (
                                <li key={material.sourceId}>{material.name} ×{material.count}</li>
                              ))}
                              {option.category && <li>{option.category.name} · {option.category.points} pts</li>}
                            </ul>
                          </div>
                        )) : materials || rampageCategory ? (
                          <ul className="mt-1 text-[#98A2B3]" aria-label="Crafting materials for missing copies">
                            {unlock && <li>Unlock · {unlock.join(' · ')}</li>}
                            {zenny !== undefined && <li>{(zenny * p.missingCopies).toLocaleString('en-US')} zenny</li>}
                            {materials?.map((material) => (
                              <li key={material.sourceId}>{material.name} ×{material.count * p.missingCopies}</li>
                            ))}
                            {rampageCategory && <li>{rampageCategory.name} · {rampageCategory.points * p.missingCopies} pts</li>}
                          </ul>
                        ) : (
                          <span className="block text-[#98A2B3]">Crafting materials unavailable.</span>
                        )}
                      </div>
                      <div className="shrink-0 space-y-2 text-right">
                        {isConfirming && craftStep ? (
                          <>
                            <p className="max-w-44 text-[11px] text-[#98A2B3]">
                              Deduct materials from your box
                              {isWeapon && route[0]?.recipe.predecessorId ? ' and consume the starting weapon' : ''}.
                            </p>
                            <button type="button" onClick={handleConfirmCrafting} className="block ml-auto rounded bg-[#D4A853] px-2.5 py-1 text-[11px] font-medium text-[#0B0D10]">
                              Confirm Crafting{p.missingCopies > 1 ? ` ×${p.missingCopies}` : ''}
                            </button>
                            <button type="button" onClick={() => setCraftConfirmation(undefined)} className="text-[11px] text-[#98A2B3]">Cancel</button>
                          </>
                        ) : (
                          <>
                            {craftStep && (
                              <button type="button" onClick={() => setCraftConfirmation({ itemId: p.itemId, inventory, build: loadout, masterRank })}
                                className="block ml-auto rounded border border-[#D4A853]/50 px-2.5 py-1 text-[11px] text-[#D4A853]">
                                Record Crafting
                              </button>
                            )}
                            <button type="button" onClick={handleMarkOwned}
                              className="rounded border border-white/15 bg-[#171C24] px-2.5 py-1 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853] hover:text-[#D4A853]">
                              Mark Owned
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {crafting.pieceBreakdowns.length === 0 && (
              <p className="text-xs text-emerald-400">All equipped weapons, armor, and decoration copies are marked as owned.</p>
            )}
          </div>
        </div>

        {/* Right: Combat Telemetry & Active Skills Rail */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
              Combat Telemetry
            </h2>
            <p className="mt-0.5 text-xs text-[#98A2B3]">
              Enraged weak-spot scenario · pouch charms, talons &amp; Dango Booster included
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3">
                <span className="text-[11px] text-[#98A2B3]">Effective Raw (EFR)</span>
                <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#D4A853]">
                  {stats.effectiveRaw.toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3">
                <span className="text-[11px] text-[#98A2B3]">Effective Element</span>
                <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#ECEFF4]">
                  {stats.effectiveElement > 0 ? stats.effectiveElement.toFixed(1) : '—'}
                </div>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-white/[0.07] text-xs">
              {fullBurst && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-[#98A2B3]">Full Burst (fixed damage)</dt>
                  <dd className="text-right font-mono-tabular font-medium text-[#ECEFF4]">
                    {fullBurst.fixedDamage} <span className="text-[#98A2B3]">· {fullBurst.shellCount} shells</span>
                  </dd>
                </div>
              )}
              {primaryAmmo && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-[#98A2B3]"><label htmlFor="builder-bowgun-ammo">Primary ammo</label></dt>
                  <dd>
                    <select id="builder-bowgun-ammo"
                      value={ammoOptions.some(ammo => ammo.id === loadout.bowgunAmmo) ? loadout.bowgunAmmo : ''}
                      onChange={event => onUpdateLoadout({
                        ...loadout,
                        bowgunAmmo: ammoOptions.find(ammo => ammo.id === event.target.value)?.id,
                      })}
                      className="rounded border border-white/15 bg-[#0B0D10] px-2 py-1 text-xs text-[#ECEFF4]">
                      <option value="">Auto · {ammoOptions[0].label}</option>
                      {ammoOptions.map(ammo => <option key={ammo.id} value={ammo.id}>{ammo.label}</option>)}
                    </select>
                  </dd>
                </div>
              )}
              {ammoHandling && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-[#98A2B3]">Ammo handling (skills only)</dt>
                  <dd className="text-right text-[#ECEFF4]">{ammoHandling.recoil} recoil · {ammoHandling.reload} reload</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <dt className="text-[#98A2B3]">True Raw Attack</dt>
                <dd className="font-mono-tabular font-medium text-[#ECEFF4]">
                  {stats.trueRaw}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[#98A2B3]">Total Affinity (Weakspot)</dt>
                <dd
                  className={`font-mono-tabular font-medium ${
                    stats.totalAffinity >= 90
                      ? 'text-emerald-400'
                      : stats.totalAffinity < 0
                      ? 'text-red-400'
                      : 'text-[#ECEFF4]'
                  }`}
                >
                  {stats.totalAffinity >= 0
                    ? `+${stats.totalAffinity}%`
                    : `${stats.totalAffinity}%`}{' '}
                  ({stats.critMultiplier.toFixed(2)}x)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[#98A2B3]">Sharpness Multiplier</dt>
                <dd className="font-mono-tabular font-medium text-[#ECEFF4]">
                  {stats.sharpness} ({stats.sharpnessRawMod.toFixed(2)}x)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[#98A2B3]">Total Defense</dt>
                <dd className="font-mono-tabular font-medium text-[#ECEFF4]">
                  {stats.defense}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[#98A2B3]">Elemental Resistances</dt>
                <dd className="font-mono-tabular text-[11px] text-[#98A2B3]">
                  F {stats.resistances.fire} · W {stats.resistances.water} · T{' '}
                  {stats.resistances.thunder} · I {stats.resistances.ice} · D{' '}
                  {stats.resistances.dragon}
                </dd>
              </div>
            </dl>

            {stats.activeEndgameEffects.length > 0 && (
              <div className="mt-4 border-t border-white/[0.07] pt-3">
                <span className="text-[11px] font-medium text-[#98A2B3]">
                  Conditional Scroll & Anomaly Modifiers
                </span>
                <ul className="mt-1.5 space-y-1 text-xs text-[#D4A853]">
                  {stats.activeEndgameEffects.map((eff) => (
                    <li key={eff}>{eff}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Active Skills Panel */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                Active Skills ({sortedSkills.length})
              </h2>
              {stats.overcappedSkills.length > 0 && (
                <span className="text-[11px] font-medium text-amber-400">
                  {stats.overcappedSkills.length} overcapped
                </span>
              )}
            </div>

            <div className="mt-3 divide-y divide-white/[0.06]">
              {sortedSkills.map(([skillId, level]) => {
                const def = getSkillById(skillId);
                const max = def?.maxLevel ?? 7;
                const isCapped = level === max;
                const isOver = stats.overcappedSkills.includes(skillId);
                return (
                  <div key={skillId} className="py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#ECEFF4]">
                        {def?.name ?? skillId}
                      </span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          isOver
                            ? 'text-amber-400'
                            : isCapped
                            ? 'text-[#D4A853]'
                            : 'text-[#98A2B3]'
                        }`}
                      >
                        Lv {level} / {max}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: max }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1 flex-1 rounded-xs ${
                            idx < level
                              ? isCapped
                                ? 'bg-[#D4A853]'
                                : 'bg-emerald-500/80'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const DecoSlotButton: React.FC<{
  slotLevel: number;
  decoId: string;
  onClick: () => void;
}> = ({ slotLevel, decoId, onClick }) => {
  if (slotLevel <= 0) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/[0.06] bg-[#0B0D10]/50 font-mono-tabular text-[11px] text-[#667085]">
        —
      </span>
    );
  }
  const deco = decoId ? getDecorationById(decoId) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium whitespace-nowrap transition-colors ${
        deco
          ? 'border-[#D4A853]/40 bg-[#D4A853]/10 text-[#ECEFF4] hover:border-[#D4A853]'
          : 'border-white/15 bg-[#0B0D10] text-[#98A2B3] hover:border-white/30 hover:text-[#ECEFF4]'
      }`}
    >
      <span className="font-mono-tabular text-[#D4A853]">[{slotLevel}]</span>
      {deco ? (
        <span className="max-w-[110px] truncate">{deco.name}</span>
      ) : (
        <Plus className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
};
