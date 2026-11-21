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
import {
  calculateBuildCraftingSummary,
  calculateBuildStats,
  resolveArmorSlots,
  resolveWeaponSlots,
} from '../engine/damageCalculator';
import {
  ArmorSlot,
  BuildLoadout,
  InventoryState,
  TalismanItem,
  WeaponClass,
} from '../types/sunbreak';
import { DrawerTarget } from './EquipmentDrawer';
import { SharpnessBar } from './SharpnessBar';

interface BuilderWorkspaceProps {
  loadout: BuildLoadout;
  savedBuilds: BuildLoadout[];
  favoriteIds: string[];
  inventory: InventoryState;
  onUpdateLoadout: (next: BuildLoadout) => void;
  onUpdateInventory: (next: InventoryState) => void;
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

  const stats = useMemo(() => calculateBuildStats(loadout), [loadout]);
  const crafting = useMemo(
    () => calculateBuildCraftingSummary(loadout, inventory),
    [loadout, inventory]
  );
  const weapon = getWeaponById(loadout.weaponId) ?? WEAPONS_DB[0];
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
                  weapon.rampageSlot > 0 &&
                  onOpenDrawer({ kind: 'rampage', maxSlotLevel: weapon.rampageSlot })
                }
                disabled={weapon.rampageSlot === 0}
                className="rounded-md border border-white/15 bg-[#0B0D10] px-2.5 py-1 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]/60 disabled:opacity-40"
              >
                {rampDeco
                  ? `${rampDeco.name}`
                  : weapon.rampageSlot > 0
                  ? `Empty Rampage Lv${weapon.rampageSlot}`
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
                    Extra Slot Upgrades
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

              const nativeSkills = piece
                ? Object.entries(piece.skills)
                    .filter(([, pts]) => pts > 0)
                    .map(([sId, pts]) => `${getSkillById(sId)?.name ?? sId} ${pts}`)
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
                        onClick={() => setOpenArmorQurious(isQOpen ? null : slot)}
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
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Qurious Added Skill
                        </label>
                        <select
                          value={qArmor?.skillAddedId ?? ''}
                          onChange={(e) =>
                            onUpdateLoadout({
                              ...loadout,
                              quriousArmor: {
                                ...loadout.quriousArmor,
                                [slot]: {
                                  ...qArmor,
                                  skillAddedId: e.target.value,
                                  skillAddedPoints: e.target.value ? 1 : 0,
                                },
                              },
                            })
                          }
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
                      <div>
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Slot Upgrade
                        </label>
                        <select
                          value={qArmor?.slotUpgrade ?? 0}
                          onChange={(e) =>
                            onUpdateLoadout({
                              ...loadout,
                              quriousArmor: {
                                ...loadout.quriousArmor,
                                [slot]: {
                                  ...qArmor,
                                  slotUpgrade: Number(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                        >
                          <option value={0}>Base Slots</option>
                          <option value={1}>+1 Slot Level</option>
                          <option value={2}>+2 Slot Levels</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#98A2B3]">
                          Bonus Defense ({qArmor?.defenseDelta ?? 0})
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={2}
                          value={qArmor?.defenseDelta ?? 0}
                          onChange={(e) =>
                            onUpdateLoadout({
                              ...loadout,
                              quriousArmor: {
                                ...loadout.quriousArmor,
                                [slot]: {
                                  ...qArmor,
                                  defenseDelta: Number(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full accent-[#D4A853]"
                        />
                      </div>
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
                  Tracks unowned gear in this set against your Material Box
                </p>
              </div>
              <div className="text-right font-mono-tabular text-xs">
                <span className="text-[#ECEFF4]">
                  {crafting.ownedGearCount}/{crafting.totalGearCount} Gear Owned
                </span>
                {crafting.totalZenny > 0 && (
                  <span className="ml-2 text-[#D4A853]">
                    · {crafting.totalZenny.toLocaleString()}z
                  </span>
                )}
              </div>
            </div>

            {/* Piece Status Strip */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {crafting.pieceBreakdowns
                .filter((p) => !p.owned)
                .map((p) => {
                  const isWeapon = p.slotLabel === 'Weapon';
                  const isDeco = p.slotLabel.startsWith('Decoration');
                  const handleMarkCrafted = () => {
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
                          {p.slotLabel} ·{' '}
                          <span
                            className={
                              p.readyToCraft ? 'text-emerald-400' : 'text-amber-400'
                            }
                          >
                            {p.readyToCraft ? 'Ready to Forge' : 'Missing Mats'}
                          </span>
                        </span>
                        <span className="block truncate font-medium text-[#ECEFF4]">
                          {p.itemName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkCrafted}
                        className="shrink-0 rounded border border-white/15 bg-[#171C24] px-2.5 py-1 text-[11px] font-medium text-[#ECEFF4] hover:border-[#D4A853] hover:text-[#D4A853]"
                      >
                        Mark Crafted
                      </button>
                    </div>
                  );
                })}
            </div>

            {crafting.consolidatedMaterials.length === 0 ? (
              <p className="text-xs text-emerald-400">
                All equipped weapons, armor, and decorations in this loadout are already crafted in your inventory.
              </p>
            ) : (
              <div className="overflow-x-auto border-t border-white/[0.07] pt-3">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#667085]">
                    <tr>
                      <th className="py-1.5 font-medium">Material</th>
                      <th className="py-1.5 font-medium">Hunt Source</th>
                      <th className="py-1.5 text-right font-medium">Need</th>
                      <th className="py-1.5 text-right font-medium">Box Qty</th>
                      <th className="py-1.5 text-right font-medium">Missing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {crafting.consolidatedMaterials.map((mat) => (
                      <tr key={mat.name}>
                        <td className="py-2 font-medium text-[#ECEFF4]">{mat.name}</td>
                        <td className="py-2 text-[#98A2B3]">{mat.source}</td>
                        <td className="py-2 text-right font-mono-tabular text-[#ECEFF4]">
                          {mat.required}
                        </td>
                        <td className="py-2 text-right font-mono-tabular">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateInventory({
                                  ...inventory,
                                  materials: {
                                    ...inventory.materials,
                                    [mat.name]: Math.max(0, mat.owned - 1),
                                  },
                                })
                              }
                              className="rounded border border-white/10 bg-[#0B0D10] px-1.5 py-0.5 text-[11px] text-[#98A2B3] hover:text-[#ECEFF4]"
                              aria-label={`Decrease ${mat.name}`}
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-[#ECEFF4]">
                              {mat.owned}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateInventory({
                                  ...inventory,
                                  materials: {
                                    ...inventory.materials,
                                    [mat.name]: mat.owned + 1,
                                  },
                                })
                              }
                              className="rounded border border-white/10 bg-[#0B0D10] px-1.5 py-0.5 text-[11px] text-[#98A2B3] hover:text-[#ECEFF4]"
                              aria-label={`Increase ${mat.name}`}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td
                          className={`py-2 text-right font-mono-tabular font-semibold ${
                            mat.shortfall > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {mat.shortfall > 0 ? `-${mat.shortfall}` : 'Ready'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              Sunbreak effective output including Powercharm/Talon & Dango Booster
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
