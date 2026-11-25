import React, { useMemo, useState } from 'react';
import { Search, X, Check, Filter } from 'lucide-react';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  SKILLS_DB,
  WEAPONS_DB,
  getWeaponById,
} from '../data/sunbreakDb';
import { rampageDecorationFits } from '../engine/damageCalculator';
import {
  ArmorItem,
  ArmorSlot,
  DecorationItem,
  InventoryState,
  RankTier,
  WeaponClass,
  WeaponItem,
} from '../types/sunbreak';
import { SharpnessBar } from './SharpnessBar';

export type DrawerTarget =
  | { kind: 'weapon'; weaponClass: WeaponClass }
  | { kind: 'armor'; slot: ArmorSlot }
  | { kind: 'decoration'; slotKey: 'weapon' | 'helm' | 'chest' | 'arms' | 'waist' | 'legs' | 'talisman'; slotIndex: number; maxSlotLevel: number }
  | { kind: 'rampage'; maxSlotLevel: number }
  | null;

interface EquipmentDrawerProps {
  target: DrawerTarget;
  inventory: InventoryState;
  selectedWeaponId: string;
  selectedArmorId?: string;
  selectedDecoId?: string;
  onClose: () => void;
  onSelectWeapon: (weapon: WeaponItem) => void;
  onSelectArmor: (armor: ArmorItem) => void;
  onSelectDecoration: (decoId: string) => void;
  onSelectRampageDeco: (decoId: string) => void;
}

const RANK_TIERS: Array<'All' | RankTier> = [
  'All',
  'LR',
  'HR',
  'MR',
  'Early MR',
  'Story MR',
  'MR 10+',
  'Endgame AR',
];

export const EquipmentDrawer: React.FC<EquipmentDrawerProps> = ({
  target,
  inventory,
  selectedWeaponId,
  selectedArmorId,
  selectedDecoId,
  onClose,
  onSelectWeapon,
  onSelectArmor,
  onSelectDecoration,
  onSelectRampageDeco,
}) => {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minSkillPts, setMinSkillPts] = useState(1);
  const [minSlotTier, setMinSlotTier] = useState(0);
  const [rankFilter, setRankFilter] = useState<'All' | RankTier>('All');
  const [elementFilter, setElementFilter] = useState('All');
  const [ownedOnly, setOwnedOnly] = useState(false);

  const ownedWeapons = useMemo(
    () => new Set(inventory.ownedWeaponIds),
    [inventory.ownedWeaponIds]
  );
  const ownedArmor = useMemo(
    () => new Set(inventory.ownedArmorIds),
    [inventory.ownedArmorIds]
  );
  const ownedDecos = useMemo(
    () => new Set(inventory.ownedDecoIds),
    [inventory.ownedDecoIds]
  );

  const filteredWeapons = useMemo(() => {
    if (target?.kind !== 'weapon') return [];
    const q = search.trim().toLowerCase();
    return WEAPONS_DB.filter((w) => {
      if (w.weaponClass !== target.weaponClass) return false;
      if (
        q &&
        !w.name.toLowerCase().includes(q) &&
        !w.unlockNote.toLowerCase().includes(q) &&
        !w.elementType.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (rankFilter !== 'All' && w.rankTier !== rankFilter) return false;
      if (elementFilter !== 'All' && w.elementType !== elementFilter) return false;
      if (minSlotTier > 0 && Math.max(...w.slots) < minSlotTier) return false;
      if (ownedOnly && !ownedWeapons.has(w.id)) return false;
      return true;
    }).sort((a, b) => b.raw - a.raw);
  }, [target, search, rankFilter, elementFilter, minSlotTier, ownedOnly, ownedWeapons]);

  const filteredArmor = useMemo(() => {
    if (target?.kind !== 'armor') return [];
    const q = search.trim().toLowerCase();
    return ARMOR_DB.filter((a) => {
      if (a.slot !== target.slot || a.isSelectable === false) return false;
      if (q) {
        const skillMatch = Object.entries(a.skills).some(([skId, pts]) => {
          if (pts <= 0) return false;
          const skName = SKILLS_DB.find((s) => s.id === skId)?.name.toLowerCase() ?? skId;
          return skName.includes(q);
        });
        if (
          !a.name.toLowerCase().includes(q) &&
          !a.variantLabel?.toLowerCase().includes(q) &&
          !a.unlockNote.toLowerCase().includes(q) &&
          !skillMatch
        ) {
          return false;
        }
      }
      if (rankFilter !== 'All' && a.rankTier !== rankFilter) return false;
      if (minSlotTier > 0 && Math.max(...a.slots) < minSlotTier) return false;
      if (skillFilter) {
        const pts = a.skills[skillFilter] ?? 0;
        if (pts < minSkillPts) return false;
      }
      if (ownedOnly && !ownedArmor.has(a.id)) return false;
      return true;
    }).sort((a, b) => {
      if (skillFilter) {
        return (b.skills[skillFilter] ?? 0) - (a.skills[skillFilter] ?? 0);
      }
      return b.defense - a.defense;
    });
  }, [target, search, rankFilter, minSlotTier, skillFilter, minSkillPts, ownedOnly, ownedArmor]);

  const filteredDecos = useMemo(() => {
    if (target?.kind !== 'decoration' && target?.kind !== 'rampage') return [];
    const q = search.trim().toLowerCase();
    const isRamp = target.kind === 'rampage';
    const selectedWeapon = isRamp ? getWeaponById(selectedWeaponId) : undefined;
    return DECORATIONS_DB.filter((d) => {
      if (Boolean(d.isRampage) !== isRamp) return false;
      if (d.slotLevel > target.maxSlotLevel) return false;
      if (target.kind === 'rampage' && !rampageDecorationFits(
        d.id, selectedWeapon, target.maxSlotLevel - (selectedWeapon?.rampageSlot ?? 0),
      )) return false;
      if (q) {
        const skName = (d.skillName ?? SKILLS_DB.find((s) => s.id === d.skillId)?.name ?? '').toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !skName.includes(q)) return false;
      }
      if (!isRamp && skillFilter && d.skillId !== skillFilter) return false;
      if (ownedOnly && !ownedDecos.has(d.id)) return false;
      return true;
    }).sort((a, b) => b.slotLevel - a.slotLevel || b.points - a.points);
  }, [target, search, skillFilter, ownedOnly, ownedDecos, selectedWeaponId]);

  if (!target) return null;

  const resultCount =
    target.kind === 'weapon'
      ? filteredWeapons.length
      : target.kind === 'armor'
      ? filteredArmor.length
      : filteredDecos.length;

  const title =
    target.kind === 'weapon'
      ? `Select ${target.weaponClass}`
      : target.kind === 'armor'
      ? `Select ${target.slot} Armor`
      : target.kind === 'rampage'
      ? `Select Rampage Decoration (Max Lv${target.maxSlotLevel})`
      : `Insert Decoration (Slot Lv${target.maxSlotLevel})`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex h-full w-full max-w-[540px] flex-col border-l border-white/10 bg-[#12161C]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#ECEFF4]">{title}</h2>
            <p className="text-xs text-[#98A2B3]">
              <span className="font-mono-tabular text-[#D4A853]">{resultCount}</span> matching entries · Filter by skills, slots, rank tier, or owned inventory
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-[#98A2B3] hover:bg-white/5 hover:text-[#ECEFF4] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3 border-b border-white/10 bg-[#0F1318] px-6 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, skill, or monster unlock..."
              className="w-full rounded-lg border border-white/10 bg-[#0B0D10] py-2 pl-9 pr-3 text-sm text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(target.kind === 'armor' || target.kind === 'decoration') && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#98A2B3]">
                  Target Skill
                </label>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                >
                  <option value="">All Skills</option>
                  {SKILLS_DB.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {target.kind === 'armor' && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#98A2B3]">
                  Min Skill Points
                </label>
                <select
                  value={minSkillPts}
                  onChange={(e) => setMinSkillPts(Number(e.target.value))}
                  disabled={!skillFilter}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] disabled:opacity-40 focus:border-[#D4A853] focus:outline-none"
                >
                  <option value={1}>Lv 1+</option>
                  <option value={2}>Lv 2+</option>
                  <option value={3}>Lv 3+</option>
                </select>
              </div>
            )}

            {(target.kind === 'weapon' || target.kind === 'armor') && (
              <>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#98A2B3]">
                    Rank Tier
                  </label>
                  <select
                    value={rankFilter}
                    onChange={(e) => setRankFilter(e.target.value as 'All' | RankTier)}
                    className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                  >
                    {RANK_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#98A2B3]">
                    Min Slot Size
                  </label>
                  <select
                    value={minSlotTier}
                    onChange={(e) => setMinSlotTier(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                  >
                    <option value={0}>Any Slots</option>
                    <option value={2}>Lv 2+ Slot</option>
                    <option value={3}>Lv 3+ Slot</option>
                    <option value={4}>Lv 4 Slot</option>
                  </select>
                </div>
              </>
            )}

            {target.kind === 'weapon' && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#98A2B3]">
                  Element / Status
                </label>
                <select
                  value={elementFilter}
                  onChange={(e) => setElementFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-2.5 py-1.5 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                >
                  <option value="All">All Elements</option>
                  <option value="None">Raw / Non-Element</option>
                  <option value="Fire">Fire</option>
                  <option value="Water">Water</option>
                  <option value="Thunder">Thunder</option>
                  <option value="Ice">Ice</option>
                  <option value="Dragon">Dragon</option>
                  <option value="Poison">Poison</option>
                  <option value="Blast">Blast</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#ECEFF4]">
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-[#0B0D10] accent-[#D4A853]"
              />
              <span>Owned in my synced inventory only</span>
            </label>

            {(target.kind === 'decoration' || target.kind === 'rampage') && (
              <button
                type="button"
                onClick={() => {
                  if (target.kind === 'decoration') onSelectDecoration('');
                  else onSelectRampageDeco('');
                }}
                className="text-xs font-medium text-[#98A2B3] hover:text-[#ECEFF4] underline-offset-2 hover:underline"
              >
                Clear Slot
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07] px-6 py-2">
          {target.kind === 'weapon' &&
            (filteredWeapons.length === 0 ? (
              <EmptyFilterState onReset={() => { setSearch(''); setRankFilter('All'); setElementFilter('All'); setMinSlotTier(0); setOwnedOnly(false); }} />
            ) : (
              filteredWeapons.map((w) => {
                const isSelected = w.id === selectedWeaponId;
                const isOwned = ownedWeapons.has(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWeapon(w)}
                    className={`w-full py-3.5 text-left transition-colors hover:bg-white/[0.03] px-3 -mx-3 rounded-lg ${
                      isSelected ? 'bg-[#D4A853]/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-sm text-[#ECEFF4]">{w.name}</span>
                      <span className="font-mono-tabular text-xs text-[#D4A853]">
                        {w.raw} Raw · {w.affinity >= 0 ? `+${w.affinity}%` : `${w.affinity}%`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#98A2B3]">
                      <div className="flex items-center gap-2">
                        <span>
                          {w.elementType === 'None'
                            ? 'Raw'
                            : `${w.elementType} ${w.elementValue}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          Slots [{w.slots.join('-')}]
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Ramp Lv{w.rampageSlot}</span>
                      </div>
                      <SharpnessBar sharpness={w.sharpness} compact />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#667085]">
                      <span>{w.rankTier}</span>
                      <span aria-hidden="true">·</span>
                      <span>{w.unlockNote}</span>
                      <span aria-hidden="true">·</span>
                      <span className={isOwned ? 'text-emerald-400' : 'text-[#667085]'}>
                        {isOwned ? 'In Inventory' : 'Not Crafted'}
                      </span>
                    </div>
                  </button>
                );
              })
            ))}

          {target.kind === 'armor' &&
            (filteredArmor.length === 0 ? (
              <EmptyFilterState onReset={() => { setSearch(''); setSkillFilter(''); setRankFilter('All'); setMinSlotTier(0); setOwnedOnly(false); }} />
            ) : (
              filteredArmor.map((a) => {
                const isSelected = a.id === selectedArmorId;
                const isOwned = ownedArmor.has(a.id);
                const skillEntries = Object.entries(a.skills).filter(([, pts]) => pts > 0);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelectArmor(a)}
                    className={`w-full py-3.5 text-left transition-colors hover:bg-white/[0.03] px-3 -mx-3 rounded-lg ${
                      isSelected ? 'bg-[#D4A853]/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-sm text-[#ECEFF4]">
                        {a.name}{a.variantLabel && <span className="ml-2 text-xs text-[#98A2B3]">{a.variantLabel}</span>}
                      </span>
                      <span className="font-mono-tabular text-xs text-[#98A2B3]">
                        {a.defense} Def · [{a.slots.join('-')}]
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-[#D4A853]">
                      {skillEntries
                        .map(([skId, pts]) => {
                          const skName = SKILLS_DB.find((s) => s.id === skId)?.name ?? skId;
                          return `${skName} Lv${pts}`;
                        })
                        .join(' · ')}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#667085]">
                      <span>{a.rankTier}</span>
                      <span aria-hidden="true">·</span>
                      <span>{a.unlockNote}</span>
                      <span aria-hidden="true">·</span>
                      <span className={isOwned ? 'text-emerald-400' : 'text-[#667085]'}>
                        {isOwned ? 'In Inventory' : 'Not Crafted'}
                      </span>
                    </div>
                  </button>
                );
              })
            ))}

          {(target.kind === 'decoration' || target.kind === 'rampage') &&
            (filteredDecos.length === 0 ? (
              <EmptyFilterState onReset={() => { setSearch(''); setSkillFilter(''); setOwnedOnly(false); }} />
            ) : (
              filteredDecos.map((d: DecorationItem) => {
                const isSelected = d.id === selectedDecoId;
                const isOwned = ownedDecos.has(d.id);
                const skillName =
                  d.skillName ?? SKILLS_DB.find((s) => s.id === d.skillId)?.name ?? d.skillId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      target.kind === 'decoration'
                        ? onSelectDecoration(d.id)
                        : onSelectRampageDeco(d.id)
                    }
                    className={`flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-white/[0.03] px-3 -mx-3 rounded-lg ${
                      isSelected ? 'bg-[#D4A853]/10' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#ECEFF4]">
                          {d.name}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-[#98A2B3]">
                        {d.isRampage
                          ? `Rampage Skill: ${skillName} · Slot Lv${d.slotLevel}`
                          : `${skillName} +${d.points} · Slot Lv${d.slotLevel}`}
                        <span aria-hidden="true"> · </span>
                        <span className={isOwned ? 'text-emerald-400' : 'text-[#667085]'}>
                          {isOwned ? 'Owned' : 'Craftable'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-[#D4A853]">
                      Lv{d.slotLevel}
                    </span>
                  </button>
                );
              })
            ))}
        </div>
      </div>
    </div>
  );
};

const EmptyFilterState: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Filter className="h-6 w-6 text-[#667085] mb-2" aria-hidden="true" />
    <p className="text-sm font-medium text-[#ECEFF4]">No matching equipment found</p>
    <p className="mt-1 text-xs text-[#98A2B3]">
      Adjust your skill filter, rank tier, or owned inventory constraint.
    </p>
    <button
      type="button"
      onClick={onReset}
      className="mt-4 rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium text-[#ECEFF4] hover:bg-white/5"
    >
      Reset Filters
    </button>
  </div>
);
