import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  PackageOpen,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { MaterialBoxModal } from './MaterialBoxModal';
import { COMMUNITY_ARCHETYPES, GAMECAT_SET_SEARCH, SUNBREAK_META_INDEX, SUNBREAK_SOLO_PROGRESSION } from '../data/communityArchetypes';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  getArmorById,
  getDecorationById,
  getWeaponById,
  SKILLS_DB,
  MATERIALS_CATALOG,
  WEAPON_CLASSES,
  WEAPONS_DB,
} from '../data/sunbreakDb';
import { estimateGunlanceFullBurst, getBowgunHandling, getGunlanceShellingLevel, getGunlanceShellingType, getPrimaryBowgunAmmo } from '../data/weaponMechanics';
import { getSkillDisplayName, RANK_TIERS, RECOMMENDATION_TEMPLATES } from '../engine/damageCalculator';
import {
  type BuildPreference,
  type BuildSearchConstraints,
  type SynthesizedBoxBuild,
  getSkillWeightsForWeapon,
  OwnedReadiness,
  OwnedTemplateMatch,
} from '../engine/ownedBuildOptimizer';
import type { OwnedBuildRequest, OwnedBuildResponse } from '../engine/ownedBuild.worker';
import {
  BuildLoadout,
  HunterProfile,
  InventoryState,
  RankTier,
} from '../types/sunbreak';

interface OwnedRecommendationsViewProps {
  activeBuild: BuildLoadout;
  onCompareBuild: (loadout: BuildLoadout) => void;
  profile: HunterProfile;
  inventory: InventoryState;
  onUpdateInventory: (next: InventoryState) => void;
  onLoadBuild: (loadout: BuildLoadout) => void;
  onGoToSync: () => void;
}

type FocusMode = 'all' | 'custom' | 'ready' | 'partial';

const READINESS_LABELS: Record<OwnedReadiness, string> = {
  ready: 'Ready to Equip',
  partial: 'Partial Box Match',
};

const READINESS_TEXT_CLASSES: Record<OwnedReadiness, string> = {
  ready: 'text-emerald-400',
  partial: 'text-[#98A2B3]',
};

function PrioritySkillLevels({ skills }: { skills: OwnedTemplateMatch['prioritySkills'] }) {
  if (skills.length === 0) return null;
  return (
    <p className="mt-2.5 text-[11px] text-[#98A2B3]">
      <span className="text-[#667085]">Priority skills: </span>
      {skills.map(({ name, level, target }) => (
        <span key={name} className={level >= target ? 'mr-2 text-emerald-400' : 'mr-2 text-amber-400'}>
          {name} {level}/{target}
        </span>
      ))}
    </p>
  );
}

function WeaponSetup({ weapon, skills, ammoId }: {
  weapon: OwnedTemplateMatch['adaptedWeapon'];
  skills: Record<string, number>;
  ammoId?: BuildLoadout['bowgunAmmo'];
}) {
  const shelling = getGunlanceShellingType(weapon);
  const ammo = getPrimaryBowgunAmmo(weapon, ammoId);
  if (shelling) return <p className="mt-1 text-xs text-[#98A2B3]">Shelling · {shelling} Lv{getGunlanceShellingLevel(weapon)}</p>;
  if (ammo) {
    const handling = getBowgunHandling(weapon, skills, ammoId);
    return <p className="mt-1 text-xs text-[#98A2B3]">
      Primary ammo · {ammo.label}
      {handling && ` · ${handling.recoil} recoil · ${handling.reload} reload (skills only)`}
    </p>;
  }
  return null;
}

function ComfortSkills({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <p className="mt-1 text-[11px] text-[#98A2B3]">
      <span className="text-[#667085]">Survival &amp; comfort · </span>{skills.join(' · ')}
    </p>
  );
}

function BuildExplanation({ build }: { build: SynthesizedBoxBuild }) {
  const { loadout } = build;
  const armor = [loadout.helmId, loadout.chestId, loadout.armsId, loadout.waistId, loadout.legsId]
    .map(getArmorById);
  const skillLine = (skills: Array<{ skillId: string; level: number }>) =>
    skills.filter(skill => skill.skillId && skill.level > 0)
      .map(skill => `${getSkillDisplayName(skill.skillId)} ${skill.level}`).join(' · ');
  const decorations = new Map<string, number>();
  for (const id of [...Object.values(loadout.decorations).flat(), loadout.rampageDecoId]) {
    if (id) decorations.set(id, (decorations.get(id) ?? 0) + 1);
  }
  const talisman = loadout.talisman;
  const talismanSkills = skillLine([
    { skillId: talisman.skill1Id, level: talisman.skill1Level },
    { skillId: talisman.skill2Id, level: talisman.skill2Level },
  ]);
  return (
    <details className="mt-3 rounded-lg border border-white/10 p-2.5 text-xs text-[#98A2B3]">
      <summary className="cursor-pointer font-medium text-[#ECEFF4]">Why this setup?</summary>
      <ul className="mt-2 space-y-1">
        {armor.map(piece => piece && <li key={piece.id}>
          <span className="text-[#ECEFF4]">{piece.name}</span> · [{piece.slots.join('-')}]
          {' · '}{skillLine(Object.entries(piece.skills).map(([skillId, level]) => ({ skillId, level })))}
        </li>)}
        <li><span className="text-[#ECEFF4]">{talisman.name}</span> · [{talisman.slots.join('-')}]
          {talismanSkills && ` · ${talismanSkills}`}</li>
        {[...decorations].map(([id, count]) => {
          const deco = getDecorationById(id);
          if (!deco) return null;
          const contribution = deco.isRampage ? deco.skillName : skillLine((deco.sourceSkills ?? [
            { skillId: deco.skillId, level: deco.points },
          ]).map(skill => ({ ...skill, level: skill.level * count })));
          return <li key={id}><span className="text-[#ECEFF4]">{deco.name} ×{count}</span> · {contribution}</li>;
        })}
      </ul>
      <PrioritySkillLevels skills={build.prioritySkills} />
    </details>
  );
}

export const OwnedRecommendationsView: React.FC<OwnedRecommendationsViewProps> = ({
  activeBuild,
  onCompareBuild,
  profile,
  inventory,
  onUpdateInventory,
  onLoadBuild,
  onGoToSync,
}) => {
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [weaponFilter, setWeaponFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<RankTier | 'All'>('All');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [buildPreference, setBuildPreference] = useState<BuildPreference>('balanced');
  const [allowHealthDrain, setAllowHealthDrain] = useState(false);
  const [craftableNow, setCraftableNow] = useState(false);
  const [constraints, setConstraints] = useState<BuildSearchConstraints>({});
  const archetype = COMMUNITY_ARCHETYPES.find(item => item.id === constraints.communityArchetypeId);
  const [copiedTargets, setCopiedTargets] = useState('');
  const [objectiveWeaponId, setObjectiveWeaponId] = useState<string>();
  const [skillId, setSkillId] = useState('');
  const [skillLevel, setSkillLevel] = useState(1);
  const selectedSkill = SKILLS_DB.find(skill => skill.id === skillId);
  const lockableArmor = [
    ['Helm', activeBuild.helmId], ['Chest', activeBuild.chestId], ['Arms', activeBuild.armsId],
    ['Waist', activeBuild.waistId], ['Legs', activeBuild.legsId],
  ] as const;
  const [materialBoxOpen, setMaterialBoxOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [calculation, setCalculation] = useState<{
    request: OwnedBuildRequest;
    result: OwnedBuildResponse | 'error';
  }>();

  const stockedMaterialCount = useMemo(
    () =>
      MATERIALS_CATALOG.filter((m) => (inventory.materials[m.name] ?? 0) > 0)
        .length,
    [inventory.materials]
  );

  const request = useMemo<OwnedBuildRequest>(() => ({
    profile, inventory, weaponFilter, preference: buildPreference, allowHealthDrain, craftableNow, constraints, objectiveWeaponId,
  }), [profile, inventory, weaponFilter, buildPreference, allowHealthDrain, craftableNow, constraints, objectiveWeaponId]);
  useEffect(() => {
    let worker: Worker | undefined;
    let active = true;
    const finish = (result: OwnedBuildResponse | 'error') => {
      if (active) setCalculation({ request, result });
      worker?.terminate();
    };
    try {
      worker = new Worker(new URL('../engine/ownedBuild.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<OwnedBuildResponse>) => finish(data);
      worker.onerror = () => finish('error');
      worker.onmessageerror = () => finish('error');
      worker.postMessage(request);
    } catch {
      finish('error');
    }
    return () => {
      active = false;
      worker?.terminate();
    };
  }, [request, retryCount]);

  const result = calculation?.request === request ? calculation.result : undefined;
  const synthesized = result === 'error' ? undefined : result?.synthesized;
  const damageAlternative = result && result !== 'error'
    ? result.alternatives?.find(item => item.objective === 'damage')?.build : undefined;

  const allMatches = useMemo(
    () => result && result !== 'error' ? result.matches.filter((match) =>
      (stageFilter === 'All' || match.template.rankTier === stageFilter)
      && (!eligibleOnly || match.rankEligible)
    ) : [],
    [result, stageFilter, eligibleOnly]
  );

  const readinessCounts = useMemo(() => {
    const counts = { ready: 0, partial: 0 };
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
    if (focusMode === 'partial') {
      return allMatches.filter((m) => m.readiness === 'partial');
    }
    return allMatches.slice(0, 60);
  }, [allMatches, focusMode]);

  const showCustomSection = focusMode === 'all' || focusMode === 'custom';
  const showCuratedSection = focusMode !== 'custom';

  const hasEmptyBox =
    inventory.ownedWeaponIds.length === 0 ||
    Boolean(synthesized?.missingArmorSlots.length);

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
              Ranks sets built from your inventory and compares your gear against {RECOMMENDATION_TEMPLATES.length} Sunbreak templates.
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
              {inventory.talismans.filter((talisman) => talisman.source !== 'Preset').length}
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
                  label: synthesized ? `Custom Box Sets (${synthesized.builds.length})` : 'Custom Box Sets',
                },
                {
                  id: 'ready',
                  label: synthesized ? `Ready to Equip (${readinessCounts.ready})` : 'Ready to Equip',
                },
                {
                  id: 'partial',
                  label: synthesized ? `Closest Meta (${readinessCounts.partial})` : 'Closest Meta',
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
              onChange={(e) => {
                const next = e.target.value;
                setWeaponFilter(next);
                if (archetype && next !== 'All' && next !== archetype.weaponClass) {
                  setConstraints(current => ({ ...current, communityArchetypeId: undefined }));
                }
              }}
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="All">All 14 Weapon Classes</option>
              {WEAPON_CLASSES.map((wc) => (
                <option key={wc} value={wc}>
                  {wc}
                </option>
              ))}
            </select>

            {showCustomSection && (
              <select aria-label="Community Archetype"
                value={constraints.communityArchetypeId ?? ''}
                onChange={event => {
                  const id = event.target.value;
                  const selected = COMMUNITY_ARCHETYPES.find(item => item.id === id);
                  setConstraints(current => ({ ...current, communityArchetypeId: selected?.id }));
                  setCopiedTargets('');
                  if (selected) setWeaponFilter(selected.weaponClass);
                }}
                className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4]">
                <option value="">Community Archetype</option>
                {COMMUNITY_ARCHETYPES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            )}

            <select
              aria-label="Build preference"
              value={buildPreference}
              onChange={(e) => setBuildPreference(e.target.value === 'comfort' ? 'comfort' : 'balanced')}
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="balanced">Balanced</option>
              <option value="comfort">Survival &amp; Comfort</option>
            </select>

            {showCustomSection && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
                <input type="checkbox" checked={craftableNow} onChange={event => setCraftableNow(event.target.checked)}
                  className="accent-[#D4A853]" />
                <span>Craftable Now</span>
              </label>
            )}
            {showCustomSection && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
                <input
                  type="checkbox"
                  checked={allowHealthDrain}
                  onChange={(event) => setAllowHealthDrain(event.target.checked)}
                  className="accent-[#D4A853]"
                />
                <span>Allow health-drain skills in custom sets</span>
              </label>
            )}

            {showCuratedSection && (
              <>
                <select
                  aria-label="Filter Curated Templates by Stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as RankTier | 'All')}
                  className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                >
                  <option value="All">All Template Stages</option>
                  {RANK_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
                  <input
                    type="checkbox"
                    checked={eligibleOnly}
                    onChange={(e) => setEligibleOnly(e.target.checked)}
                    className="accent-[#D4A853]"
                  />
                  <span>Templates within my rank</span>
                </label>
              </>
            )}
          </div>
          {showCustomSection && archetype && (
            <div className="space-y-1 text-xs text-[#98A2B3]">
              <p>Endgame guide · {archetype.note} Results use your selected inventory mode and locks.</p>
              <div className="flex flex-wrap gap-3 text-[#D4A853]">
                <a href={archetype.source} target="_blank" rel="noreferrer">Weapon guide</a>
                <a href={SUNBREAK_META_INDEX} target="_blank" rel="noreferrer">Sunbreak Megathread</a>
                <a href={SUNBREAK_SOLO_PROGRESSION} target="_blank" rel="noreferrer">Solo Endgame Progression</a>
                <a href={GAMECAT_SET_SEARCH} target="_blank" rel="noreferrer">Open GameCat</a>
              </div>
            </div>
          )}

          <span role="status" className="font-mono-tabular text-xs text-[#98A2B3]">
            {synthesized
              ? `${synthesized.builds.length} box sets · ${readinessCounts.ready} ready`
              : result === 'error' ? 'Build calculation failed.' : 'Calculating builds…'}
          </span>
          {result === 'error' && (
            <button type="button" className="text-xs text-[#D4A853] hover:underline" onClick={() => {
              setCalculation(undefined);
              setRetryCount((count) => count + 1);
            }}>Retry</button>
          )}
        </div>
      </section>

      {/* SECTION A: CUSTOM BOX-ASSEMBLED BUILDS */}
      {showCustomSection && synthesized && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#ECEFF4]">
                Custom Sets Assembled From Your Box
              </h2>
              <p className="text-xs text-[#98A2B3]">
                {craftableNow
                  ? 'Includes gear and decorations you can craft with the materials in your box. Check zenny and unlock requirements before crafting.'
                  : 'Uses the gear, decorations, and talismans marked as owned.'}
              </p>
            </div>
            <details className="mt-2 text-xs text-[#ECEFF4]">
              <summary className="cursor-pointer font-medium">Equipment locks &amp; skill targets</summary>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={Boolean(constraints.weaponId)} onChange={event => {
                    const checked = event.target.checked;
                    setConstraints(current => ({ ...current, weaponId: checked ? activeBuild.weaponId : undefined }));
                    if (checked) setWeaponFilter(activeBuild.weaponClass);
                  }} />
                  {getWeaponById(activeBuild.weaponId)?.name ?? 'Current weapon'}
                </label>
                {lockableArmor.map(([slot, id]) => (
                  <label key={slot} className="flex items-center gap-1.5">
                    <input type="checkbox" disabled={!id} checked={Boolean(constraints.armor?.[slot])}
                      onChange={event => setConstraints(current => ({
                        ...current, armor: { ...current.armor, [slot]: event.target.checked ? id : undefined },
                      }))} />
                    {getArmorById(id)?.name ?? slot}
                  </label>
                ))}
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" disabled={!inventory.talismans.some(t => t.id === activeBuild.talisman.id)}
                    checked={Boolean(constraints.talismanId)}
                    onChange={event => setConstraints(current => ({ ...current, talismanId: event.target.checked ? activeBuild.talisman.id : undefined }))} />
                  {activeBuild.talisman.name}
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select aria-label="Target skill" value={skillId} onChange={event => { setSkillId(event.target.value); setSkillLevel(1); }}
                  className="rounded bg-[#0B0D10] p-1.5">
                  <option value="">Select a skill</option>
                  {SKILLS_DB.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
                <select aria-label="Target level" value={skillLevel} onChange={event => setSkillLevel(Number(event.target.value))}
                  className="rounded bg-[#0B0D10] p-1.5">
                  {Array.from({ length: selectedSkill?.maxLevel ?? 1 }, (_, index) => <option key={index}>{index + 1}</option>)}
                </select>
                <button type="button" disabled={!selectedSkill} className="rounded border border-white/15 px-2 py-1"
                  onClick={() => setConstraints(current => ({ ...current, skillTargets: { ...current.skillTargets, [skillId]: skillLevel } }))}>
                  Add target
                </button>
                <button type="button" className="rounded border border-white/15 px-2 py-1" onClick={() => setConstraints({})}>
                  Clear constraints
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(constraints.skillTargets ?? {}).map(([id, level]) => (
                  <button key={id} type="button" className="rounded border border-white/15 px-2 py-1"
                    aria-label={`Remove ${getSkillDisplayName(id)} target`}
                    onClick={() => setConstraints(current => {
                      const skillTargets = { ...current.skillTargets };
                      delete skillTargets[id];
                      return { ...current, skillTargets };
                    })}>{getSkillDisplayName(id)} Lv{level} ×</button>
                ))}
              </div>
            </details>
          </div>

          {result && result !== 'error' && result.alternatives && (
            <section className="space-y-3 rounded-xl border border-white/10 bg-[#12161C] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold">Build objectives · {getWeaponById(objectiveWeaponId ?? '')?.name}</h3>
                  <p className="text-xs text-[#98A2B3]">Simulation target for all sets: enraged Primordial Malzeno, head.</p>
                </div>
                <button type="button" className="text-xs text-[#D4A853]" onClick={() => setObjectiveWeaponId(undefined)}>Close</button>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {result.alternatives.map(({ objective, build }) => {
                  const burst = build && estimateGunlanceFullBurst(build.weapon, build.stats, 0, 1);
                  const changedPieces = build && damageAlternative && objective !== 'damage'
                    ? (['helmId', 'chestId', 'armsId', 'waistId', 'legsId'] as const)
                        .filter(slot => build.loadout[slot] !== damageAlternative.loadout[slot]).length : 0;
                  const dpsDelta = build?.objectiveDps !== undefined && damageAlternative?.objectiveDps !== undefined
                    ? build.objectiveDps - damageAlternative.objectiveDps : undefined;
                  return <article key={objective} className="rounded-lg border border-white/10 bg-[#0B0D10] p-3">
                    <h4 className="font-medium text-[#D4A853]">
                      {{ damage: 'More damage', comfort: 'More comfort', cost: 'Lower crafting cost' }[objective]}
                    </h4>
                    {build ? <>
                      <p className="mt-1 text-xs text-[#ECEFF4]">
                        {build.objectiveMagazineDamage !== undefined
                          ? `${build.objectiveMagazineDamage} damage per magazine`
                          : `${build.objectiveDps?.toFixed(1) ?? '—'} DPS`} · {build.stats.effectiveRaw.toFixed(1)} EFR
                      </p>
                      <p className="text-xs text-[#98A2B3]">
                        {build.craftingCost === undefined ? 'Crafting cost unavailable' : `${build.craftingCost.toLocaleString('en-US')} zenny`}
                        {burst && ` · Full Burst ${burst.fixedDamage}`}
                      </p>
                      {objective !== 'damage' && dpsDelta !== undefined && (
                        <p className="mt-1 text-xs text-[#98A2B3]">
                          {dpsDelta > 0 ? '+' : ''}{dpsDelta.toFixed(1)} DPS vs. damage set · {changedPieces} armor changes
                          {build.talismanUsed.id !== damageAlternative?.talismanUsed.id && ' · Different talisman'}
                        </p>
                      )}
                      <ComfortSkills skills={build.comfortHighlights} />
                      <BuildExplanation build={build} />
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#D4A853]">
                        <button type="button" onClick={() => onCompareBuild(build.loadout)}>Compare with current</button>
                        <button type="button" onClick={() => onLoadBuild({ ...build.loadout, id: `build_${Date.now()}` })}>Load into Builder</button>
                      </div>
                    </> : <p className="mt-1 text-xs text-[#98A2B3]">No set found with the current inventory and locks.</p>}
                  </article>;
                })}
              </div>
            </section>
          )}
          {synthesized.builds.length === 0 && !hasEmptyBox && synthesized.blockedArmorSlots.length > 0 ? (
            <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-6 text-xs text-[#98A2B3]">
              Your only owned pieces for {synthesized.blockedArmorSlots.join(', ')} have health-drain skills.
              Enable health-drain skills or add other owned pieces for those slots.
            </div>
          ) : synthesized.builds.length === 0 ? (
            <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-[#ECEFF4]">
                {hasEmptyBox
                  ? 'More Equipment Needed to Assemble a Full Set'
                  : archetype ? 'No Set Matches This Archetype'
                  : craftableNow ? 'No Craftable Set Found'
                  : 'No Matching Weapon Class Found in Your Owned Box'}
              </h3>
              <p className="text-xs leading-relaxed text-[#98A2B3] max-w-2xl">
                {archetype
                  ? 'Check the weapon requirements, equipment locks, and whether Craftable Now can expand your options.'
                  : craftableNow
                  ? 'Try another weapon class or sync your latest equipment and materials.'
                  : inventory.ownedWeaponIds.length === 0
                  ? 'Your owned weapons list is empty. Import a REFramework snapshot or mark the gear you own in Steam & Inventory Sync.'
                  : synthesized.missingArmorSlots.length > 0
                  ? `Custom set synthesis requires at least 1 owned piece per armor slot. Currently missing: ${synthesized.missingArmorSlots.join(', ')}.`
                  : `You do not currently own any ${weaponFilter} weapons in your box. Select another weapon class or choose All 14 Weapon Classes.`}
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
                          <WeaponSetup weapon={sb.weapon} skills={sb.stats.skills} ammoId={sb.loadout.bowgunAmmo} />
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
                          <span className="shrink-0 text-[10px] font-medium text-emerald-400">
                            {sb.craftableWeapon ? 'Craftable' : 'Owned'}
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
                      {sb.craftableItems && sb.craftableItems.length > 0 && (
                        <p className="mt-2 text-xs text-[#D4A853]">Craftable Now · {sb.craftableItems.join(', ')}</p>
                      )}
                      {sb.weaponCraftingSteps && sb.weaponCraftingSteps.length > 1 && (
                        <p className="mt-1 text-xs text-[#98A2B3]">
                          Weapon route · {sb.weaponCraftingSteps.join(' → ')}
                          {sb.craftingCost !== undefined && ` · Set cost ${sb.craftingCost.toLocaleString('en-US')} zenny`}
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Weakspot Affinity / Sharpness
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {sb.stats.weakspotAffinity}% · {sb.stats.sharpness}
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

                      <PrioritySkillLevels skills={sb.prioritySkills} />
                      <BuildExplanation build={sb} />
                      {archetype && sb.prioritySkills.length > 0 && (
                        <button type="button" className="mt-2 text-xs text-[#D4A853]" onClick={async () => {
                          const text = sb.prioritySkills.map(skill => `${skill.name} Lv${skill.target}`).join('\n');
                          try {
                            await navigator.clipboard.writeText(text);
                            setCopiedTargets(sb.id);
                          } catch {
                            setCopiedTargets(`failed:${sb.id}`);
                          }
                        }}>
                          {copiedTargets === sb.id ? 'Targets copied' : copiedTargets === `failed:${sb.id}` ? 'Copy failed · retry' : 'Copy skill targets for GameCat'}
                        </button>
                      )}
                      <ComfortSkills skills={sb.comfortHighlights} />
                      {sb.missingSkillHighlights.length > 0 && (
                        <p className="mt-2.5 text-[11px] text-[#98A2B3]">
                          <span className="text-[#667085]">Active Skills: </span>
                          {sb.missingSkillHighlights.join(' · ')}
                          {rampDeco ? ` · ${rampDeco.name}` : ''}
                        </p>
                      )}

                      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{sb.craftableItems?.length ? 'Materials available for this set' : 'Assembled from items currently in your box'}</span>
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
                      <span className="font-mono-tabular text-xs text-[#667085]">
                        Optimization Score {sb.score}
                      </span>
                      <button type="button" className="px-2 text-xs text-[#D4A853]" onClick={() => onCompareBuild(sb.loadout)}>
                        Compare with current
                      </button>
                      <button type="button" className="px-2 text-xs text-[#D4A853]" onClick={() => setObjectiveWeaponId(sb.weapon.id)}>
                        Compare objectives
                      </button>
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
      {showCuratedSection && synthesized && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#ECEFF4]">
                Curated Meta Templates Matched to Your Inventory
              </h2>
              <p className="text-xs text-[#98A2B3]">
                Ranked by equipment ownership and decoration availability. The adapted build uses a talisman and decorations from your box.
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
                const { template, adaptedStats, adaptedWeapon, bestOwnedTalisman } = match;
                const skillWeights = getSkillWeightsForWeapon(adaptedWeapon);
                const coreSkills = Object.entries(adaptedStats.skills)
                  .filter(([sk]) => (skillWeights[sk] ?? 0) > 0)
                  .sort(
                    (a, b) =>
                      (skillWeights[b[0]] ?? 0) * b[1] - (skillWeights[a[0]] ?? 0) * a[1]
                  )
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
                          {!match.rankEligible && (
                            <p className="mt-1 text-xs text-amber-400">
                              {profile.mr < template.minMr || profile.ar < template.minAr
                                ? `Template requires MR ${template.minMr}${template.minAr > 0 ? ` / AR ${template.minAr}` : ''}`
                                : 'Some missing equipment requires more progression.'}
                            </p>
                          )}
                          {match.progressionUnverified && (
                            <p className="mt-1 text-xs text-amber-400">Verify smithy unlocks for missing equipment.</p>
                          )}
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
                      {template.omittedDecorations.length > 0 && (
                        <details className="mt-2 text-[11px] text-[#98A2B3]">
                          <summary className="cursor-pointer">Legacy decorations left out · {template.omittedDecorations.length}</summary>
                          <p className="mt-1">{[...new Set(template.omittedDecorations)].join(' · ')}</p>
                        </details>
                      )}

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
                      <WeaponSetup weapon={match.adaptedWeapon} skills={match.adaptedStats.skills} />
                      {!match.weaponOwnedInBox && template.weaponClass === 'Gunlance' && (
                        <p className="mt-1 text-xs text-amber-400">No owned Gunlance matches this shelling type.</p>
                      )}

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
                          <span className="block text-[11px] text-[#667085]">Template Decos Owned</span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {match.ownedDecoCount}/{match.totalDecoCount} ({match.decoOwnershipPercent}%)
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-[#667085]">
                            Weakspot Affinity / Elem
                          </span>
                          <span className="font-mono-tabular font-medium text-[#ECEFF4]">
                            {adaptedStats.weakspotAffinity}% ·{' '}
                            {adaptedStats.effectiveElement > 0
                              ? `${adaptedStats.effectiveElement.toFixed(0)} EFE`
                              : 'Raw'}
                          </span>
                        </div>
                      </div>

                      <PrioritySkillLevels skills={match.prioritySkills} />
                      <ComfortSkills skills={match.comfortHighlights} />
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
                            <span className="font-medium text-[#ECEFF4]">Missing Template Decos: </span>
                            <span>{match.missingDecoNames.slice(0, 4).join(', ')}</span>
                            {match.missingDecoNames.length > 4 && (
                              <span> +{match.missingDecoNames.length - 4} more</span>
                            )}
                          </div>
                        )}

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
                          Load Template
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
                          disabled={!match.weaponOwnedInBox && template.weaponClass === 'Gunlance'}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-1.5 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors whitespace-nowrap disabled:opacity-50"
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
