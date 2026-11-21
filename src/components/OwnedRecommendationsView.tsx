import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Hammer,
  PackageOpen,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { MaterialBoxModal } from './MaterialBoxModal';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  MATERIALS_CATALOG,
  META_BUILD_TEMPLATES,
  WEAPON_CLASSES,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { getSkillDisplayName, RANK_TIERS } from '../engine/damageCalculator';
import {
  evaluateOwnedBuildMatches,
  OwnedReadiness,
  OwnedTemplateMatch,
  synthesizeOwnedBoxBuilds,
} from '../engine/ownedBuildOptimizer';
import {
  BuildLoadout,
  HunterProfile,
  InventoryState,
  RankTier,
} from '../types/sunbreak';

interface OwnedRecommendationsViewProps {
  profile: HunterProfile;
  inventory: InventoryState;
  onUpdateInventory: (next: InventoryState) => void;
  onLoadBuild: (loadout: BuildLoadout) => void;
  onGoToSync: () => void;
}

type FocusMode = 'all' | 'custom' | 'ready' | 'craftable' | 'partial';

const READINESS_LABELS: Record<OwnedReadiness, string> = {
  ready: 'Ready to Equip',
  craftable: 'Craftable Now (Zero Farming)',
  partial: 'Partial Box Match',
};

const READINESS_TEXT_CLASSES: Record<OwnedReadiness, string> = {
  ready: 'text-emerald-400',
  craftable: 'text-[#D4A853]',
  partial: 'text-[#98A2B3]',
};

export const OwnedRecommendationsView: React.FC<OwnedRecommendationsViewProps> = ({
  profile,
  inventory,
  onUpdateInventory,
  onLoadBuild,
  onGoToSync,
}) => {
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [weaponFilter, setWeaponFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<RankTier | 'All'>('All');
  const [includeCraftableInBox, setIncludeCraftableInBox] = useState(false);
  const [materialBoxOpen, setMaterialBoxOpen] = useState(false);

  const stockedMaterialCount = useMemo(
    () =>
      MATERIALS_CATALOG.filter((m) => (inventory.materials[m.name] ?? 0) > 0)
        .length,
    [inventory.materials]
  );

  const synthesized = useMemo(
    () =>
      synthesizeOwnedBoxBuilds(inventory, {
        weaponClassFilter: weaponFilter,
        includeCraftable: includeCraftableInBox,
        maxBuilds: weaponFilter === 'All' ? 42 : 24,
      }),
    [inventory, weaponFilter, includeCraftableInBox]
  );

  const allMatches = useMemo(
    () =>
      evaluateOwnedBuildMatches(profile, inventory, {
        weaponFilter,
        stageFilter,
      }),
    [profile, inventory, weaponFilter, stageFilter]
  );

  const readinessCounts = useMemo(() => {
    const counts = { ready: 0, craftable: 0, partial: 0 };
    for (const m of allMatches) {
      counts[m.readiness]++;
    }
    return counts;
  }, [allMatches]);

  const filteredMatches = useMemo(() => {
    if (focusMode === 'custom') return [];
    if (focusMode === 'ready') {
      return allMatches.filter((m) => m.readiness === 'ready');
    }
    if (focusMode === 'craftable') {
      return allMatches.filter((m) => m.readiness === 'craftable');
    }
    if (focusMode === 'partial') {
      return allMatches.filter((m) => m.readiness === 'partial');
    }
    return allMatches.slice(0, 60);
  }, [allMatches, focusMode]);

  const showCustomSection = focusMode === 'all' || focusMode === 'custom';
  const showCuratedSection = focusMode !== 'custom';

  const hasEmptyBox =
    inventory.ownedWeaponIds.length === 0 ||
    synthesized.missingArmorSlots.length > 0;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-6">
      {/* Page Header & Owned Box Inventory Overview */}
      <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#D4A853]">
              Inventory-Driven Optimizer · HR {profile.hr} · MR {profile.mr} · AR {profile.ar}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[#ECEFF4]">
              Owned Equipment &amp; Material Box Build Recommendations
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-[#98A2B3]">
              Assembles optimal sets strictly from the weapons, armor, decorations, and talismans in your box—and surfaces which of the {META_BUILD_TEMPLATES.length} curated Sunbreak builds you can equip right now or forge directly from your Material Box.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMaterialBoxOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3.5 py-2 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853] transition-colors whitespace-nowrap"
            >
              <PackageOpen className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
              <span>Edit Material Box</span>
            </button>
            <button
              type="button"
              onClick={onGoToSync}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sync REFramework / Gear</span>
            </button>
          </div>
        </div>

        {/* 5-Column Inventory Summary Strip */}
        <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3.5 py-2.5">
            <span className="block text-[11px] text-[#667085]">Owned Weapons</span>
            <span className="mt-0.5 block font-mono-tabular text-base font-semibold text-[#ECEFF4]">
              {inventory.ownedWeaponIds.length}{' '}
              <span className="text-xs font-normal text-[#667085]">
                / {WEAPONS_DB.length}
              </span>
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3.5 py-2.5">
            <span className="block text-[11px] text-[#667085]">Owned Armor Pieces</span>
            <span className="mt-0.5 block font-mono-tabular text-base font-semibold text-[#ECEFF4]">
              {inventory.ownedArmorIds.length}{' '}
              <span className="text-xs font-normal text-[#667085]">
                / {ARMOR_DB.length}
              </span>
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3.5 py-2.5">
            <span className="block text-[11px] text-[#667085]">Owned Decorations</span>
            <span className="mt-0.5 block font-mono-tabular text-base font-semibold text-[#ECEFF4]">
              {inventory.ownedDecoIds.length}{' '}
              <span className="text-xs font-normal text-[#667085]">
                / {DECORATIONS_DB.length}
              </span>
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3.5 py-2.5">
            <span className="block text-[11px] text-[#667085]">Synced Talismans</span>
            <span className="mt-0.5 block font-mono-tabular text-base font-semibold text-[#ECEFF4]">
              {inventory.talismans.length}
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#0B0D10] px-3.5 py-2.5">
            <span className="block text-[11px] text-[#667085]">Stocked Materials</span>
            <span className="mt-0.5 block font-mono-tabular text-base font-semibold text-[#ECEFF4]">
              {stockedMaterialCount}{' '}
              <span className="text-xs font-normal text-[#667085]">
                / {MATERIALS_CATALOG.length}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Filter & Focus Toolbar */}
      <section className="space-y-3 rounded-xl border border-white/[0.09] bg-[#12161C] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Recommendation focus filter"
          >
            {(
              [
                { id: 'all', label: 'All Recommendations' },
                {
                  id: 'custom',
                  label: `Custom Box Sets (${synthesized.builds.length})`,
                },
                {
                  id: 'ready',
                  label: `Ready to Equip (${readinessCounts.ready})`,
                },
                {
                  id: 'craftable',
                  label: `Craftable Now (${readinessCounts.craftable})`,
                },
                {
                  id: 'partial',
                  label: `Closest Meta (${readinessCounts.partial})`,
                },
              ] as Array<{ id: FocusMode; label: string }>
            ).map((tab) => {
              const active = focusMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFocusMode(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors font-mono-tabular ${
                    active
                      ? 'bg-[#D4A853] text-[#0B0D10]'
                      : 'border border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
            <input
              type="checkbox"
              checked={includeCraftableInBox}
              onChange={(e) => setIncludeCraftableInBox(e.target.checked)}
              className="accent-[#D4A853]"
            />
            <span>Include forgeable gear from Material Box</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-[#98A2B3]">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
              <span>Filters</span>
            </div>

            <select
              aria-label="Filter by Weapon Class"
              value={weaponFilter}
              onChange={(e) => setWeaponFilter(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="All">All 14 Weapon Classes</option>
              {WEAPON_CLASSES.map((wc) => (
                <option key={wc} value={wc}>
                  {wc}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Curated Builds by Stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as RankTier | 'All')}
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="All">All Progression Stages</option>
              {RANK_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <span className="font-mono-tabular text-xs text-[#98A2B3]">
            {synthesized.builds.length} box sets · {readinessCounts.ready} ready ·{' '}
            {readinessCounts.craftable} craftable
          </span>
        </div>
      </section>

      {/* SECTION A: CUSTOM BOX-ASSEMBLED BUILDS */}
      {showCustomSection && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#ECEFF4]">
                Custom Sets Assembled From Your Box
              </h2>
              <p className="text-xs text-[#98A2B3]">
                {includeCraftableInBox
                  ? 'Optimized across your owned gear, talismans, and decorations—plus pieces you can craft immediately with stocked materials.'
                  : 'Built strictly using only the weapons, armor pieces, decorations, and talismans currently marked as owned in your box.'}
              </p>
            </div>
          </div>

          {synthesized.builds.length === 0 ? (
            <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-[#ECEFF4]">
                {hasEmptyBox
                  ? 'More Owned Equipment Slots Needed to Assemble a Full Set'
                  : 'No Matching Weapon Class Found in Your Owned Box'}
              </h3>
              <p className="text-xs leading-relaxed text-[#98A2B3] max-w-2xl">
                {inventory.ownedWeaponIds.length === 0
                  ? 'Your owned weapons list is currently empty. Import your REFramework JSON snapshot or mark your unlocked gear in Steam & Inventory Sync.'
                  : synthesized.missingArmorSlots.length > 0
                  ? `Custom set synthesis requires at least 1 owned (or craftable) piece per armor slot. Currently missing: ${synthesized.missingArmorSlots.join(', ')}.`
                  : `You do not currently own any ${weaponFilter} weapons in your box. Enable "Include forgeable gear from Material Box" or select All 14 Weapon Classes.`}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onGoToSync}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B]"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Go to Steam &amp; Inventory Sync</span>
                </button>
                {!includeCraftableInBox && (
                  <button
                    type="button"
                    onClick={() => setIncludeCraftableInBox(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3.5 py-2 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
                  >
                    <Hammer className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                    <span>Include Craftable Material Box Gear</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {synthesized.builds.map((sb) => {
                const helm = getArmorById(sb.loadout.helmId);
                const chest = getArmorById(sb.loadout.chestId);
                const arms = getArmorById(sb.loadout.armsId);
                const waist = getArmorById(sb.loadout.waistId);
                const legs = getArmorById(sb.loadout.legsId);
                const rampDeco = sb.loadout.rampageDecoId
                  ? getDecorationById(sb.loadout.rampageDecoId)
                  : undefined;

                return (
                  <article
                    key={sb.id}
                    className="flex flex-col justify-between rounded-xl border border-white/[0.09] bg-[#12161C] p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#98A2B3]">
                            <span className="font-medium text-[#D4A853]">
                              {sb.weaponClass}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {sb.weapon.elementType === 'None'
                                ? 'Raw / Physical'
                                : `${sb.weapon.elementType} ${sb.weapon.elementValue}`}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{sb.loadout.scrollMode} Scroll</span>
                          </div>
                          <h3 className="mt-1 font-display text-lg font-semibold text-[#ECEFF4]">
                            {sb.title}
                          </h3>
                        </div>

                        <div className="text-right font-mono-tabular shrink-0">
                          <span className="block text-xs text-[#98A2B3]">EFR</span>
                          <span className="text-lg font-bold text-[#D4A853]">
                            {sb.stats.effectiveRaw.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/[0.07] bg-[#0B0D10] p-3 text-xs">
                        <div className="col-span-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5 mb-0.5">
                          <div className="truncate text-[#98A2B3]">
                            <span className="text-[#667085]">Weapon: </span>
                            <span className="font-medium text-[#ECEFF4]">{sb.weapon.name}</span>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-medium ${
                              inventory.ownedWeaponIds.includes(sb.weapon.id)
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {inventory.ownedWeaponIds.includes(sb.weapon.id)
                              ? 'Synced'
                              : 'Craftable'}
                          </span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Helm: </span>
                          <span className="text-[#ECEFF4]">{helm?.name}</span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Chest: </span>
                          <span className="text-[#ECEFF4]">{chest?.name}</span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Arms: </span>
                          <span className="text-[#ECEFF4]">{arms?.name}</span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Waist: </span>
                          <span className="text-[#ECEFF4]">{waist?.name}</span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Legs: </span>
                          <span className="text-[#ECEFF4]">{legs?.name}</span>
                        </div>
                        <div className="truncate text-[#98A2B3]">
                          <span className="text-[#667085]">Charm: </span>
                          <span className="text-[#ECEFF4]">{sb.talismanUsed.name}</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Affinity / Sharpness
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {sb.stats.totalAffinity}% · {sb.stats.sharpness}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Element / Defense
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {sb.stats.effectiveElement > 0
                              ? `${sb.stats.effectiveElement.toFixed(0)} EFE`
                              : 'Raw'}{' '}
                            · {sb.stats.defense} Def
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Owned Deco Slots
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {sb.decoSlotsFilled} / {sb.decoSlotsTotal} filled
                          </span>
                        </div>
                      </div>

                      {sb.missingSkillHighlights.length > 0 && (
                        <p className="mt-2.5 text-[11px] text-[#98A2B3]">
                          <span className="text-[#667085]">Active Skills: </span>
                          {sb.missingSkillHighlights.join(' · ')}
                          {rampDeco ? ` · ${rampDeco.name}` : ''}
                        </p>
                      )}

                      {sb.usesCraftablePieces ? (
                        <p className="mt-2 text-xs text-emerald-400">
                          Forgeable from your Material Box:{' '}
                          {sb.craftablePieces.map((p) => p.itemName).join(', ')} (
                          {sb.craftablePieces
                            .reduce((s, p) => s + p.zennyCost, 0)
                            .toLocaleString()}
                          z)
                        </p>
                      ) : (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>100% assembled from items currently in your box</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
                      <span className="font-mono-tabular text-xs text-[#667085]">
                        Optimization Score {sb.score}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onLoadBuild({
                            ...sb.loadout,
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
          )}
        </section>
      )}

      {/* SECTION B: CURATED META BUILDS MATCHED AGAINST YOUR BOX */}
      {showCuratedSection && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#ECEFF4]">
                Curated Meta Templates Matched to Your Inventory
              </h2>
              <p className="text-xs text-[#98A2B3]">
                Ranked by equipment ownership, Material Box craftability, and decoration availability. Each build is also previewed with your best synced talisman and owned decorations.
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-[#98A2B3]">
              Showing {filteredMatches.length} of {allMatches.length} templates
            </span>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-6 text-xs text-[#98A2B3]">
              No curated builds match this exact filter combination yet. Try switching to{' '}
              <button
                type="button"
                onClick={() => setFocusMode('all')}
                className="font-medium text-[#D4A853] hover:underline"
              >
                All Recommendations
              </button>{' '}
              or adjusting your weapon and stage filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredMatches.map((match: OwnedTemplateMatch) => {
                const { template, adaptedStats, bestOwnedTalisman } = match;
                const coreSkills = Object.entries(adaptedStats.skills)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([sk, lv]) => `${getSkillDisplayName(sk)} ${lv}`);

                return (
                  <article
                    key={template.id}
                    className="flex flex-col justify-between rounded-xl border border-white/[0.09] bg-[#12161C] p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#98A2B3]">
                            <span className={`font-semibold ${READINESS_TEXT_CLASSES[match.readiness]}`}>
                              {READINESS_LABELS[match.readiness]}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{template.rankTier}</span>
                            <span aria-hidden="true">·</span>
                            <span>{template.weaponClass}</span>
                          </div>
                          <h3 className="mt-1 font-display text-lg font-semibold text-[#ECEFF4]">
                            {template.title}
                          </h3>
                        </div>

                        <div className="text-right font-mono-tabular shrink-0">
                          <span className="block text-xs text-[#98A2B3]">Your Box EFR</span>
                          <span className="text-lg font-bold text-[#D4A853]">
                            {adaptedStats.effectiveRaw.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#98A2B3]">
                        {template.summary}
                      </p>

                      <p className="mt-2 text-[11px] text-[#98A2B3]">
                        <span className="text-[#667085]">Weapon: </span>
                        <span className="font-medium text-[#ECEFF4]">
                          {match.adaptedWeapon.name}
                        </span>{' '}
                        {match.substitutedWeapon ? (
                          <span className="text-[#D4A853]">
                            (Swapped to your synced weapon)
                          </span>
                        ) : match.weaponOwnedInBox ? (
                          <span className="text-emerald-400">(Synced in Box)</span>
                        ) : (
                          <span className="text-amber-400">(Not in Box)</span>
                        )}
                      </p>

                      {coreSkills.length > 0 && (
                        <p className="mt-1 text-[11px] text-[#98A2B3]">
                          <span className="text-[#667085]">With Your Box: </span>
                          <span className="text-[#ECEFF4]">{coreSkills.join(' · ')}</span>
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.07] bg-[#0B0D10] p-3 text-xs">
                        <div>
                          <span className="block text-[11px] text-[#667085]">Owned Gear</span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {match.ownedGearCount}/{match.totalGearCount} ({match.gearOwnershipPercent}%)
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-[#667085]">Owned Decos</span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {match.ownedDecoCount}/{match.totalDecoCount} ({match.decoOwnershipPercent}%)
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Affinity / Elem
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {adaptedStats.totalAffinity}% ·{' '}
                            {adaptedStats.effectiveElement > 0
                              ? `${adaptedStats.effectiveElement.toFixed(0)} EFE`
                              : 'Raw'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-[#98A2B3]">
                        <div>
                          <span className="text-[#667085]">Matched Charm: </span>
                          <span className="text-[#ECEFF4]">
                            {bestOwnedTalisman
                              ? bestOwnedTalisman.name
                              : 'No Talisman in Box (None synced)'}
                          </span>
                        </div>

                        {match.missingGearNames.length > 0 && (
                          <div>
                            <span className="font-medium text-amber-400">Missing Gear: </span>
                            <span>{match.missingGearNames.slice(0, 3).join(', ')}</span>
                            {match.missingGearNames.length > 3 && (
                              <span> +{match.missingGearNames.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {match.missingDecoNames.length > 0 && (
                          <div>
                            <span className="font-medium text-[#ECEFF4]">Missing Decos: </span>
                            <span>{match.missingDecoNames.slice(0, 4).join(', ')}</span>
                            {match.missingDecoNames.length > 4 && (
                              <span> +{match.missingDecoNames.length - 4} more</span>
                            )}
                          </div>
                        )}

                        {match.missingGearNames.length > 0 &&
                          (match.craftableWithMaterials ? (
                            <div className="font-medium text-emerald-400">
                              All forging materials for missing pieces are stocked in your Material Box.
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-[#ECEFF4]">To Farm: </span>
                              <span className="font-mono-tabular">
                                {match.missingMaterials
                                  .slice(0, 3)
                                  .map((m) => `${m.shortfall}x ${m.name}`)
                                  .join(', ')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                      <span className="text-xs text-[#667085]">{template.playstyle}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onLoadBuild({
                              ...template.loadout,
                              id: `build_${Date.now()}`,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853] transition-colors whitespace-nowrap"
                        >
                          Load Original
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onLoadBuild({
                              ...match.adaptedLoadout,
                              id: `build_${Date.now()}`,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-1.5 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors whitespace-nowrap"
                        >
                          <span>Load w/ Your Box</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <MaterialBoxModal
        open={materialBoxOpen}
        inventory={inventory}
        onUpdateInventory={onUpdateInventory}
        onClose={() => setMaterialBoxOpen(false)}
      />
    </div>
  );
};
