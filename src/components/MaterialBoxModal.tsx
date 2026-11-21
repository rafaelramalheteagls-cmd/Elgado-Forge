import React, { useEffect, useMemo, useState } from 'react';
import { Download, Package, Search, X } from 'lucide-react';
import { MATERIALS_CATALOG, SunbreakMaterialMeta } from '../data/sunbreakDb';
import { RANK_TIERS } from '../engine/damageCalculator';
import { InventoryState, RankTier } from '../types/sunbreak';
import { exportMaterialsAsCsv } from '../utils/storageAndShare';

interface MaterialBoxModalProps {
  open: boolean;
  inventory: InventoryState;
  onUpdateInventory: (next: InventoryState) => void;
  onClose: () => void;
}

type CategoryFilter = 'All' | SunbreakMaterialMeta['category'];
type StockFilter = 'all' | 'owned' | 'empty';

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Monster Part',
  'Anomaly',
  'Ore & Jewel',
  'Bone & Bug',
  'Ticket & Coin',
];

export const MaterialBoxModal: React.FC<MaterialBoxModalProps> = ({
  open,
  inventory,
  onUpdateInventory,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [rankFilter, setRankFilter] = useState<RankTier | 'All'>('All');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MATERIALS_CATALOG.filter((mat) => {
      if (category !== 'All' && mat.category !== category) return false;
      if (rankFilter !== 'All' && mat.rankTier !== rankFilter) return false;
      const qty = inventory.materials[mat.name] ?? 0;
      if (stockFilter === 'owned' && qty <= 0) return false;
      if (stockFilter === 'empty' && qty > 0) return false;
      if (q) {
        return (
          mat.name.toLowerCase().includes(q) ||
          mat.source.toLowerCase().includes(q) ||
          mat.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, category, rankFilter, stockFilter, inventory.materials]);

  const summary = useMemo(() => {
    let stockedCount = 0;
    let totalUnits = 0;
    for (const mat of MATERIALS_CATALOG) {
      const qty = inventory.materials[mat.name] ?? 0;
      if (qty > 0) {
        stockedCount++;
        totalUnits += qty;
      }
    }
    return { stockedCount, totalUnits };
  }, [inventory.materials]);

  const setMaterialQuantity = (name: string, nextQty: number) => {
    const clamped = Math.max(0, Math.min(9999, Math.floor(nextQty)));
    const nextMaterials = { ...inventory.materials };
    if (clamped === 0) {
      delete nextMaterials[name];
    } else {
      nextMaterials[name] = clamped;
    }
    onUpdateInventory({
      ...inventory,
      materials: nextMaterials,
      lastInventorySyncAt: new Date().toISOString(),
    });
  };

  const handleBulkAdjustFiltered = (delta: number, resetToZero = false) => {
    const nextMaterials = { ...inventory.materials };
    for (const mat of filteredMaterials) {
      if (resetToZero) {
        delete nextMaterials[mat.name];
      } else {
        const current = nextMaterials[mat.name] ?? 0;
        const nextVal = Math.max(0, Math.min(9999, current + delta));
        if (nextVal === 0) {
          delete nextMaterials[mat.name];
        } else {
          nextMaterials[mat.name] = nextVal;
        }
      }
    }
    onUpdateInventory({
      ...inventory,
      materials: nextMaterials,
      lastInventorySyncAt: new Date().toISOString(),
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-box-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0B0D10]">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.09] bg-[#12161C] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4A853]/30 bg-[#D4A853]/10 text-[#D4A853]">
              <Package className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="material-box-modal-title"
                className="font-display text-lg font-semibold text-[#ECEFF4]"
              >
                Elgado Material Box — Complete Game Item Inventory
              </h2>
              <p className="font-mono-tabular text-xs text-[#98A2B3]">
                {summary.stockedCount} / {MATERIALS_CATALOG.length} item types stocked ·{' '}
                {summary.totalUnits.toLocaleString()} total units in box
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportMaterialsAsCsv(inventory)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
            >
              <Download className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3.5 py-1.5 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Close Window</span>
            </button>
          </div>
        </header>

        {/* Filter & Bulk Controls */}
        <div className="space-y-3 border-b border-white/[0.08] bg-[#12161C]/70 px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Material category filter">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === cat
                      ? 'bg-[#D4A853] text-[#0B0D10]'
                      : 'border border-white/10 bg-[#0B0D10] text-[#98A2B3] hover:text-[#ECEFF4]'
                  }`}
                >
                  {cat === 'All' ? `All Items (${MATERIALS_CATALOG.length})` : cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAdjustFiltered(10)}
                disabled={filteredMaterials.length === 0}
                className="rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853] disabled:opacity-40"
              >
                +10 to Shown ({filteredMaterials.length})
              </button>
              <button
                type="button"
                onClick={() => handleBulkAdjustFiltered(0, true)}
                disabled={filteredMaterials.length === 0}
                className="rounded-lg border border-red-500/30 bg-[#0B0D10] px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/30 disabled:opacity-40"
              >
                Reset Shown to 0
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, monster, ore, jewel, ticket, or anomaly tier..."
                className="w-full rounded-lg border border-white/15 bg-[#0B0D10] py-2 pl-8 pr-3 text-xs text-[#ECEFF4] placeholder-[#667085] focus:border-[#D4A853] focus:outline-none"
              />
            </div>

            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value as RankTier | 'All')}
              aria-label="Filter by rank tier"
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="All">All Rank Tiers</option>
              {RANK_TIERS.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              aria-label="Filter by stock status"
              className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
            >
              <option value="all">All Stock Status</option>
              <option value="owned">In Stock Only (&gt; 0)</option>
              <option value="empty">Missing / Zero Only (0)</option>
            </select>

            <span className="font-mono-tabular text-xs text-[#98A2B3]">
              Showing {filteredMaterials.length} items
            </span>
          </div>
        </div>

        {/* Full Item Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredMaterials.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#12161C]/40 p-8 text-center">
              <p className="text-sm font-medium text-[#ECEFF4]">
                No materials match the active filters.
              </p>
              <p className="mt-1 text-xs text-[#98A2B3]">
                Try clearing the search query or switching back to All Categories / All Rank Tiers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredMaterials.map((mat) => {
                const qty = inventory.materials[mat.name] ?? 0;
                return (
                  <div
                    key={mat.name}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                      qty > 0
                        ? 'border-[#D4A853]/35 bg-[#12161C]'
                        : 'border-white/[0.08] bg-[#12161C]/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#ECEFF4]">
                        {mat.name}
                      </p>
                      <p className="truncate text-[11px] text-[#98A2B3]">
                        {mat.source}
                      </p>
                      <p className="text-[10px] text-[#667085]">
                        {mat.category} · {mat.rankTier}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 font-mono-tabular shrink-0">
                      <button
                        type="button"
                        onClick={() => setMaterialQuantity(mat.name, qty - 1)}
                        aria-label={`Decrease ${mat.name}`}
                        className="rounded border border-white/10 bg-[#0B0D10] px-2 py-1 text-xs text-[#98A2B3] hover:text-[#ECEFF4]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={qty}
                        onChange={(e) =>
                          setMaterialQuantity(mat.name, Number(e.target.value) || 0)
                        }
                        aria-label={`${mat.name} quantity`}
                        className="w-16 rounded border border-white/15 bg-[#0B0D10] px-1.5 py-1 text-center text-xs text-[#ECEFF4] focus:border-[#D4A853] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMaterialQuantity(mat.name, qty + 1)}
                        aria-label={`Increase ${mat.name} by 1`}
                        className="rounded border border-white/10 bg-[#0B0D10] px-2 py-1 text-xs text-[#98A2B3] hover:text-[#ECEFF4]"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialQuantity(mat.name, qty + 5)}
                        aria-label={`Increase ${mat.name} by 5`}
                        className="rounded border border-[#D4A853]/30 bg-[#D4A853]/10 px-2 py-1 text-xs font-medium text-[#D4A853] hover:bg-[#D4A853]/20"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
