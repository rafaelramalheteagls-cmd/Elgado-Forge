import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Trophy } from 'lucide-react';
import {
  getSkillById,
  getWeaponById,
  META_BUILD_TEMPLATES,
  MONSTERS_DB,
  WEAPON_COMBOS_DB,
} from '../data/sunbreakDb';
import {
  calculateBuildStats,
  calculateBuildCraftingSummary,
  DEFAULT_SIM_CONFIG,
  simulateTrainingDps,
  resolveMechanicsWeapon,
  resolveRecommendationInventory,
} from '../engine/damageCalculator';
import { estimateGunlanceFullBurst } from '../data/weaponMechanics';
import { createCraftingPlanner, summarizeCraftingForecast } from '../engine/craftingPlanner';
import { BuildLoadout, InventoryState } from '../types/sunbreak';

interface CompareViewProps {
  activeBuild: BuildLoadout;
  savedBuilds: BuildLoadout[];
  comparisonBuild?: BuildLoadout;
  inventory: InventoryState;
  masterRank: number;
  onLoadIntoBuilder: (build: BuildLoadout) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  activeBuild,
  savedBuilds,
  comparisonBuild,
  inventory,
  masterRank,
  onLoadIntoBuilder,
}) => {
  const candidatePool = useMemo(() => {
    const map = new Map<string, BuildLoadout>();
    for (const b of savedBuilds) map.set(b.id, b);
    map.set(activeBuild.id, activeBuild);
    if (comparisonBuild) map.set(comparisonBuild.id, comparisonBuild);
    for (const t of META_BUILD_TEMPLATES) {
      if (!map.has(t.id)) {
        map.set(t.id, {
          ...t.loadout,
          id: t.id,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return Array.from(map.values());
  }, [activeBuild, savedBuilds, comparisonBuild]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const defaults = [activeBuild.id];
    const second = comparisonBuild?.id !== activeBuild.id && comparisonBuild
      ? comparisonBuild : candidatePool.find((b) => b.id !== activeBuild.id);
    if (second) defaults.push(second.id);
    return defaults;
  });

  const [targetMonsterId, setTargetMonsterId] = useState(MONSTERS_DB[1].id);
  const monster =
    MONSTERS_DB.find((m) => m.id === targetMonsterId) ?? MONSTERS_DB[0];

  const toggleBuildSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const evaluated = useMemo(() => {
    const planner = createCraftingPlanner(resolveRecommendationInventory(inventory), masterRank);
    return selectedIds
      .map((id) => candidatePool.find((b) => b.id === id))
      .filter((b): b is BuildLoadout => Boolean(b))
      .map((build) => {
        const stats = calculateBuildStats(build);
        const weapon = getWeaponById(build.weaponId);
        const combo =
          WEAPON_COMBOS_DB.find((c) => c.weaponClass === build.weaponClass) ??
          WEAPON_COMBOS_DB[0];
        const sim = simulateTrainingDps(build, {
          ...DEFAULT_SIM_CONFIG,
          monsterId: monster.id,
          partName: monster.hitzones[0].partName,
          comboId: combo.id,
        });
        const fullBurst = weapon && estimateGunlanceFullBurst(resolveMechanicsWeapon(weapon), stats, 0, 1);
        const missing = calculateBuildCraftingSummary(build, inventory).pieceBreakdowns;
        const crafting = summarizeCraftingForecast(planner, missing);
        return { build, stats, weapon, sim, fullBurst, crafting };
      });
  }, [selectedIds, candidatePool, monster, inventory, masterRank]);

  const baseline = evaluated[0];
  const bestDpsId = useMemo(() => {
    const timed = evaluated.filter(item => item.sim.dps !== undefined);
    if (timed.length < 2) return '';
    return timed.reduce((best, cur) =>
      (cur.sim.dps ?? -Infinity) > (best.sim.dps ?? -Infinity) ? cur : best
    ).build.id;
  }, [evaluated]);

  const allSkillIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of evaluated) {
      Object.keys(item.stats.skills).forEach((s) => set.add(s));
    }
    return Array.from(set).sort((a, b) => {
      const nameA = getSkillById(a)?.name ?? a;
      const nameB = getSkillById(b)?.name ?? b;
      return nameA.localeCompare(nameB);
    });
  }, [evaluated]);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#ECEFF4]">
            Automatic Set Comparison
          </h1>
          <p className="mt-1 text-sm text-[#98A2B3]">
            Select 2 to 4 builds to compute Effective Raw, Affinity, Skill diffs, and target monster DPS deltas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="compare-monster-select"
            className="text-xs font-medium text-[#98A2B3]"
          >
            Benchmark Monster
          </label>
          <select
            id="compare-monster-select"
            value={targetMonsterId}
            onChange={(e) => setTargetMonsterId(e.target.value)}
            className="rounded-lg border border-white/15 bg-[#12161C] px-3 py-2 text-xs font-medium text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
          >
            {MONSTERS_DB.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.hitzones[0].partName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Build Selector Tray */}
      <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-4">
        <span className="block text-xs font-medium text-[#98A2B3] mb-2.5">
          Compare Queue (Active, Saved & Meta Reference Sets — max 4)
        </span>
        <div className="flex flex-wrap gap-2">
          {candidatePool.map((b) => {
            const isSelected = selectedIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBuildSelection(b.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-[#D4A853] bg-[#D4A853]/15 text-[#ECEFF4]'
                    : 'border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-[#D4A853]" />}
                <span>{b.name}</span>
                <span className="text-[11px] text-[#667085]">{b.weaponClass}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Side-by-Side Comparison Matrix */}
      <section className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#12161C]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-[#0F1318]">
            <tr>
              <th className="px-5 py-3.5 text-xs font-medium text-[#98A2B3] w-52">
                Metric
              </th>
              {evaluated.map(({ build, weapon }, idx) => {
                const isBest = build.id === bestDpsId && evaluated.length > 1;
                return (
                  <th key={build.id} className="px-5 py-3.5 align-top">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-[#ECEFF4]">
                        {build.name}
                      </span>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4A853]">
                          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Top DPS</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs font-normal text-[#98A2B3]">
                      {idx === 0 ? 'Baseline' : `Delta vs. #1`}
                      <span aria-hidden="true"> · </span>
                      <span>{weapon?.name}</span>
                    </div>
                    {build.id !== activeBuild.id && (
                      <button
                        type="button"
                        onClick={() => onLoadIntoBuilder(build)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D4A853] hover:underline"
                      >
                        <span>Load in Builder</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.07]">
            <MetricRow
              label={`Simulated DPS (${monster.name})`}
              values={evaluated.map((e) => e.sim.dps)}
              baselineVal={baseline?.sim.dps}
              unit=" DPS"
              decimals={1}
              highlight
            />
            {evaluated.some(item => item.sim.isBowgunMagazine) && (
              <MetricRow label="Damage per Magazine"
                values={evaluated.map(item => item.sim.isBowgunMagazine ? item.sim.comboDamage : undefined)}
                baselineVal={baseline?.sim.isBowgunMagazine ? baseline.sim.comboDamage : undefined}
                decimals={0}
              />
            )}
            <MetricRow
              label="Effective Raw (EFR)"
              values={evaluated.map((e) => e.stats.effectiveRaw)}
              baselineVal={baseline?.stats.effectiveRaw ?? 0}
              decimals={1}
            />
            <MetricRow
              label="Effective Element (EFE)"
              values={evaluated.map((e) => e.stats.effectiveElement)}
              baselineVal={baseline?.stats.effectiveElement ?? 0}
              decimals={1}
            />
            {evaluated.some(e => e.fullBurst) && (
              <tr>
                <td className="px-5 py-3 text-[#98A2B3]">Full Burst (fixed damage)</td>
                {evaluated.map(e => {
                  const delta = e.fullBurst && baseline?.fullBurst
                    ? e.fullBurst.fixedDamage - baseline.fullBurst.fixedDamage : 0;
                  return <td key={e.build.id} className="px-5 py-3 text-[#ECEFF4]">
                    {e.fullBurst ? `${e.fullBurst.fixedDamage} · ${e.fullBurst.shellCount} shells` : '—'}
                    {delta !== 0 && <span className={delta > 0 ? 'ml-2 text-emerald-400' : 'ml-2 text-red-400'}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>}
                  </td>;
                })}
              </tr>
            )}
            <tr>
              <td className="px-5 py-3 text-[#98A2B3]">Crafting cost from your box</td>
              {evaluated.map(e => <td key={e.build.id} className="px-5 py-3 text-[#ECEFF4]">
                {e.crafting.zenny.toLocaleString('en-US')} zenny{e.crafting.incompleteCost && ' (known cost)'}
              </td>)}
            </tr>
            <MetricRow
              label="True Raw Attack"
              values={evaluated.map((e) => e.stats.trueRaw)}
              baselineVal={baseline?.stats.trueRaw ?? 0}
              decimals={0}
            />
            <MetricRow
              label="Weakspot Affinity"
              values={evaluated.map((e) => e.stats.weakspotAffinity)}
              baselineVal={baseline?.stats.weakspotAffinity ?? 0}
              unit="%"
              decimals={0}
            />
            <MetricRow
              label="Total Defense"
              values={evaluated.map((e) => e.stats.defense)}
              baselineVal={baseline?.stats.defense ?? 0}
              decimals={0}
            />
            <tr>
              <td className="px-5 py-3 text-xs font-medium text-[#98A2B3]">
                Sharpness & Scroll
              </td>
              {evaluated.map((e) => (
                <td
                  key={e.build.id}
                  className="px-5 py-3 font-mono-tabular text-xs text-[#ECEFF4]"
                >
                  {e.stats.sharpness} ({e.stats.sharpnessRawMod.toFixed(2)}x) ·{' '}
                  {e.build.scrollMode}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      {/* Skill Comparison Matrix */}
      <section className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#12161C]">
        <div className="border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
            Skill Level Comparison
          </h2>
        </div>
        <table className="w-full min-w-[720px] text-left text-xs">
          <tbody className="divide-y divide-white/[0.06]">
            {allSkillIds.map((skillId) => {
              const def = getSkillById(skillId);
              const basePts = baseline?.stats.skills[skillId] ?? 0;
              return (
                <tr key={skillId} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-2.5 font-medium text-[#ECEFF4] w-52">
                    {def?.name ?? skillId}
                  </td>
                  {evaluated.map((e, idx) => {
                    const pts = e.stats.skills[skillId] ?? 0;
                    const diff = pts - basePts;
                    return (
                      <td
                        key={e.build.id}
                        className="px-5 py-2.5 font-mono-tabular text-[#ECEFF4]"
                      >
                        <span>{pts > 0 ? `Lv ${pts}` : '—'}</span>
                        {idx > 0 && diff !== 0 && (
                          <span
                            className={`ml-2 ${
                              diff > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            ({diff > 0 ? `+${diff}` : diff})
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

const MetricRow: React.FC<{
  label: string;
  values: Array<number | undefined>;
  baselineVal: number | undefined;
  unit?: string;
  decimals?: number;
  highlight?: boolean;
}> = ({ label, values, baselineVal, unit = '', decimals = 1, highlight }) => {
  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-5 py-3 text-xs font-medium text-[#98A2B3]">{label}</td>
      {values.map((val, idx) => {
        const delta = val === undefined || baselineVal === undefined ? undefined : val - baselineVal;
        return (
          <td key={idx} className="px-5 py-3 font-mono-tabular">
            <span
              className={`font-semibold ${
                highlight ? 'text-base text-[#D4A853]' : 'text-sm text-[#ECEFF4]'
              }`}
            >
              {val === undefined ? '—' : `${val.toFixed(decimals)}${unit}`}
            </span>
            {idx > 0 && delta !== undefined && Math.abs(delta) > 0.05 && (
              <span
                className={`ml-2 text-xs ${
                  delta > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {delta > 0 ? `+${delta.toFixed(decimals)}` : delta.toFixed(decimals)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
};
