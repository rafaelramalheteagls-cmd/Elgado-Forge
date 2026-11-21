import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Play, ShieldAlert } from 'lucide-react';
import {
  getWeaponById,
  MONSTERS_DB,
  WEAPON_COMBOS_DB,
} from '../data/sunbreakDb';
import {
  DEFAULT_SIM_CONFIG,
  simulateTrainingDps,
} from '../engine/damageCalculator';
import {
  BuildLoadout,
  MonsterState,
  SimulationConfig,
} from '../types/sunbreak';

interface TrainingSimulatorViewProps {
  loadout: BuildLoadout;
}

const ARENA_IMAGE_URL = '/src/assets/images/training_arena_backdrop_1795219159719.jpg';

export const TrainingSimulatorView: React.FC<TrainingSimulatorViewProps> = ({
  loadout,
}) => {
  const weapon = getWeaponById(loadout.weaponId);

  const classCombos = useMemo(() => {
    const exact = WEAPON_COMBOS_DB.filter(
      (c) => c.weaponClass === loadout.weaponClass
    );
    return exact.length > 0 ? exact : WEAPON_COMBOS_DB;
  }, [loadout.weaponClass]);

  const [config, setConfig] = useState<SimulationConfig>(() => ({
    ...DEFAULT_SIM_CONFIG,
    comboId: classCombos[0]?.id ?? DEFAULT_SIM_CONFIG.comboId,
  }));
  const [imgFailed, setImgFailed] = useState(false);
  const [monsterQuery, setMonsterQuery] = useState('');

  // Sync comboId when weaponClass changes
  useEffect(() => {
    if (!classCombos.some((c) => c.id === config.comboId)) {
      setConfig((prev) => ({ ...prev, comboId: classCombos[0].id }));
    }
  }, [classCombos, config.comboId]);

  const filteredMonsters = useMemo(() => {
    const q = monsterQuery.trim().toLowerCase();
    if (!q) return MONSTERS_DB;
    const matches = MONSTERS_DB.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.species.toLowerCase().includes(q) ||
        m.primaryWeakness.toLowerCase().includes(q)
    );
    return matches.length > 0 ? matches : MONSTERS_DB;
  }, [monsterQuery]);

  const monster =
    MONSTERS_DB.find((m) => m.id === config.monsterId) ?? MONSTERS_DB[0];
  const part =
    monster.hitzones.find((h) => h.partName === config.partName) ??
    monster.hitzones[0];
  const activeCombo =
    WEAPON_COMBOS_DB.find((c) => c.id === config.comboId) ?? classCombos[0];

  const result = useMemo(
    () => simulateTrainingDps(loadout, config),
    [loadout, config]
  );

  const handleMonsterChange = (monsterId: string) => {
    const nextMonster =
      MONSTERS_DB.find((m) => m.id === monsterId) ?? MONSTERS_DB[0];
    setConfig((prev) => ({
      ...prev,
      monsterId,
      partName: nextMonster.hitzones[0].partName,
    }));
  };

  const maxTimelineDmg = Math.max(
    1,
    result.timeline[result.timeline.length - 1]?.cumulativeDamage ?? 1
  );

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-6">
      {/* Training Arena Atmospheric Header */}
      <section className="relative overflow-hidden rounded-xl border border-white/[0.09] bg-[#12161C]">
        {!imgFailed ? (
          <img
            src={ARENA_IMAGE_URL}
            alt="Monster Hunter Rise Training Grounds mechanical wyvern target"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-48 w-full object-cover object-center opacity-55"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-[#171C24] via-[#12161C] to-[#0B0D10] flex items-center justify-end px-8">
            <Crosshair className="h-16 w-16 text-[#D4A853]/20" aria-hidden="true" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/70 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-medium text-[#D4A853]">
              Simulated Training Grounds · {loadout.name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[#ECEFF4]">
              Monster DPS & Combo Simulator
            </h1>
          </div>
          <div className="flex items-center gap-6 font-mono-tabular">
            <div>
              <span className="block text-[11px] text-[#98A2B3]">Simulated DPS</span>
              <span className="text-2xl font-bold text-[#D4A853]">
                {result.dps.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-[#98A2B3]">Combo Burst</span>
              <span className="text-2xl font-semibold text-[#ECEFF4]">
                {result.comboDamage}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-[#98A2B3]">
                Est. Solo Clear ({monster.name})
              </span>
              <span className="text-2xl font-semibold text-[#ECEFF4]">
                {Math.floor(result.estimatedClearSeconds / 60)}m{' '}
                {String(result.estimatedClearSeconds % 60).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: Target Monster & Combat Conditions */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
              Target Monster & Hitzone
            </h2>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#98A2B3]">
                  Target Monster ({filteredMonsters.length})
                </label>
                <input
                  type="text"
                  value={monsterQuery}
                  onChange={(e) => setMonsterQuery(e.target.value)}
                  placeholder="Filter monster / weakness..."
                  className="w-44 rounded border border-white/10 bg-[#0B0D10] px-2 py-1 text-[11px] text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
                />
              </div>
              <select
                value={config.monsterId}
                onChange={(e) => handleMonsterChange(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-sm text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
              >
                {filteredMonsters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.rankLabel})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#98A2B3]">
                {monster.species} · Weakness: {monster.primaryWeakness} / {monster.secondaryWeakness} · Solo HP{' '}
                <span className="font-mono-tabular">{monster.hpSolo.toLocaleString()}</span>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#98A2B3]">
                Target Body Part
              </label>
              <select
                value={part.partName}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, partName: e.target.value }))
                }
                className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-sm text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
              >
                {monster.hitzones.map((hz) => (
                  <option key={hz.partName} value={hz.partName}>
                    {hz.partName}
                  </option>
                ))}
              </select>

              <div className="mt-2.5 grid grid-cols-4 gap-2 rounded-lg border border-white/[0.07] bg-[#0B0D10] p-2.5 text-center font-mono-tabular text-xs">
                <div>
                  <span className="block text-[10px] text-[#667085]">Sever</span>
                  <span className="text-[#ECEFF4]">{part.sever}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#667085]">Blunt</span>
                  <span className="text-[#ECEFF4]">{part.blunt}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#667085]">Shot</span>
                  <span className="text-[#ECEFF4]">{part.shot}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#667085]">
                    {weapon?.elementType === 'None' || !weapon
                      ? 'Elem'
                      : weapon.elementType}
                  </span>
                  <span className="text-[#D4A853]">
                    {weapon?.elementType === 'Fire'
                      ? part.fire
                      : weapon?.elementType === 'Water'
                      ? part.water
                      : weapon?.elementType === 'Thunder'
                      ? part.thunder
                      : weapon?.elementType === 'Ice'
                      ? part.ice
                      : weapon?.elementType === 'Dragon'
                      ? part.dragon
                      : Math.max(part.fire, part.water, part.thunder, part.ice, part.dragon)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-[#98A2B3]">
                Monster Combat State
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-[#0B0D10] p-1">
                {(['Normal', 'Enraged', 'Anomaly Toppled'] as MonsterState[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, monsterState: st }))
                      }
                      className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                        config.monsterState === st
                          ? 'bg-[#D4A853] text-[#0B0D10]'
                          : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                      }`}
                    >
                      {st === 'Anomaly Toppled' ? 'Toppled' : st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#98A2B3]">
                Combo Rotation ({loadout.weaponClass})
              </label>
              <select
                value={activeCombo.id}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, comboId: e.target.value }))
                }
                className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
              >
                {classCombos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.durationSec}s)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#98A2B3]">
                {activeCombo.description}
              </p>
            </div>
          </div>

          {/* Uptime & Conditional Modifiers */}
          <div className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5 space-y-3.5">
            <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
              Skill Uptime & Buff Assumptions
            </h2>

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-[#98A2B3]">Weakspot Hit Rate (WEX)</span>
                <span className="font-mono-tabular text-[#ECEFF4]">
                  {config.wexUptime}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={config.wexUptime}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    wexUptime: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-[#D4A853]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-[#98A2B3]">Enrage Uptime (Agitator)</span>
                <span className="font-mono-tabular text-[#ECEFF4]">
                  {config.monsterState === 'Enraged' ? 100 : config.agitatorUptime}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={config.monsterState === 'Enraged'}
                value={config.agitatorUptime}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    agitatorUptime: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-[#D4A853] disabled:opacity-40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="mb-1 block text-[11px] text-[#98A2B3]">
                  Dereliction Qurio
                </label>
                <select
                  value={config.derelictionQurio}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      derelictionQurio: Number(e.target.value) as 1 | 2 | 3,
                    }))
                  }
                  className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value={1}>1 Qurio</option>
                  <option value={2}>2 Qurio</option>
                  <option value={3}>3 Qurio (Max)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[#98A2B3]">
                  Frostcraft Gauge
                </label>
                <select
                  value={config.frostcraftGauge}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      frostcraftGauge: Number(e.target.value) as 0 | 1 | 2 | 3,
                    }))
                  }
                  className="w-full rounded border border-white/15 bg-[#0B0D10] px-2 py-1.5 text-xs text-[#ECEFF4]"
                >
                  <option value={0}>Empty (0%)</option>
                  <option value={1}>Bar 1</option>
                  <option value={2}>Bar 2</option>
                  <option value={3}>Full Gauge (3)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs text-[#ECEFF4]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bloodlustCleared}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      bloodlustCleared: e.target.checked,
                    }))
                  }
                  className="accent-[#D4A853]"
                />
                <span>Frenzy Cleared (Bloodlust +20% Aff)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.burstActive}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, burstActive: e.target.checked }))
                  }
                  className="accent-[#D4A853]"
                />
                <span>Burst Active (5+ continuous hits)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.powercharmTalon}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      powercharmTalon: e.target.checked,
                    }))
                  }
                  className="accent-[#D4A853]"
                />
                <span>Powercharm & Powertalon (+15 Raw)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.dangoBooster}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, dangoBooster: e.target.checked }))
                  }
                  className="accent-[#D4A853]"
                />
                <span>Dango Booster & Demondrug (+16 Raw)</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Right: Hit-by-Hit Telemetry & 60s DPS Timeline */}
        <div className="space-y-4">
          {/* Raw vs Elemental Split */}
          <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                Damage Composition
              </h2>
              <div className="flex items-center gap-4 font-mono-tabular text-xs">
                <span className="text-[#D4A853]">
                  Raw {result.rawSharePercent}%
                </span>
                <span className="text-sky-400">
                  Elemental {result.elementSharePercent}%
                </span>
              </div>
            </div>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[#0B0D10] border border-white/10">
              <div
                style={{ width: `${result.rawSharePercent}%` }}
                className="bg-[#D4A853] transition-all duration-200"
              />
              <div
                style={{ width: `${result.elementSharePercent}%` }}
                className="bg-sky-500 transition-all duration-200"
              />
            </div>

            {weapon?.elementType !== 'None' &&
              weapon?.elementType !== monster.primaryWeakness &&
              weapon?.elementType !== monster.secondaryWeakness && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Element mismatch: {monster.name} is primarily weak to{' '}
                    {monster.primaryWeakness} / {monster.secondaryWeakness}, while your
                    equipped weapon deals {weapon?.elementType}.
                  </span>
                </div>
              )}
          </section>

          {/* Hit-by-Hit Combo Table */}
          <section className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#12161C]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-[#D4A853]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                  {activeCombo.name} — Hit Breakdown
                </h2>
              </div>
              <span className="font-mono-tabular text-xs text-[#98A2B3]">
                Cycle {activeCombo.durationSec}s
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-[#0F1318] text-[#98A2B3]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Attack Move</th>
                  <th className="px-4 py-2.5 text-right font-medium">Raw</th>
                  <th className="px-4 py-2.5 text-right font-medium">Element</th>
                  <th className="px-4 py-2.5 text-right font-medium">Crit Hit</th>
                  <th className="px-5 py-2.5 text-right font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {result.hits.map((hit, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-[#ECEFF4]">
                      {hit.moveName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-[#98A2B3]">
                      {hit.rawDamage}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-sky-400">
                      {hit.elementDamage}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-[#ECEFF4]">
                      {hit.critDamage}
                    </td>
                    <td className="px-5 py-3 text-right font-mono-tabular font-semibold text-[#D4A853]">
                      {hit.totalAverageDamage}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-white/10 bg-[#0F1318]">
                <tr>
                  <td className="px-5 py-3 font-semibold text-[#ECEFF4]">
                    Total Combo Output
                  </td>
                  <td colSpan={3} />
                  <td className="px-5 py-3 text-right font-mono-tabular text-sm font-bold text-[#D4A853]">
                    {result.comboDamage}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* 60-Second Cumulative Damage Curve */}
          <section className="rounded-xl border border-white/[0.09] bg-[#12161C] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#ECEFF4]">
                  60-Second Training Window Progression
                </h2>
                <p className="text-xs text-[#98A2B3]">
                  Cumulative damage against {monster.name} ({part.partName})
                </p>
              </div>
              <span className="font-mono-tabular text-xs font-medium text-[#D4A853]">
                60s Total: {maxTimelineDmg.toLocaleString()}
              </span>
            </div>

            <div className="h-44 w-full">
              <svg
                viewBox="0 0 600 160"
                className="h-full w-full overflow-visible"
                role="img"
                aria-label="60-second cumulative training damage chart"
              >
                {[0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = 135 - pct * 115;
                  return (
                    <g key={pct}>
                      <line
                        x1={40}
                        y1={y}
                        x2={585}
                        y2={y}
                        stroke="rgba(255,255,255,0.07)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={0}
                        y={y + 4}
                        fill="#667085"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {Math.round((maxTimelineDmg * pct) / 1000)}k
                      </text>
                    </g>
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#D4A853"
                  strokeWidth="2.5"
                  points={result.timeline
                    .map((pt) => {
                      const x = 40 + (pt.second / 60) * 545;
                      const y = 135 - (pt.cumulativeDamage / maxTimelineDmg) * 115;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {result.timeline.map((pt) => {
                  const x = 40 + (pt.second / 60) * 545;
                  const y = 135 - (pt.cumulativeDamage / maxTimelineDmg) * 115;
                  return (
                    <g key={pt.second}>
                      <circle cx={x} cy={y} r={3} fill="#D4A853" />
                      {pt.second % 15 === 0 && (
                        <text
                          x={x}
                          y={153}
                          textAnchor="middle"
                          fill="#98A2B3"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {pt.second}s
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
