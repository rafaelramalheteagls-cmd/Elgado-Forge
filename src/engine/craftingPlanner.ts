import {
  ANOMALY_MATERIAL_SOURCES,
  CRAFTING_CATEGORY_MATERIALS,
  getArmorCraftingMaterials,
  getDecorationCraftingMaterials,
  getEquipmentCraftingZenny,
  getMinimumCraftingMr,
  getRampageCraftingCategory,
  getWeaponCraftingOptions,
} from '../data/mhriceAdapter';
import type { InventoryState } from '../types/sunbreak';

export function getAnomalyFarmOptions(material: string, researchLevel: number) {
  const sources = ANOMALY_MATERIAL_SOURCES[material];
  if (!sources?.length) return;
  const ranges = sources.filter((source): source is { monster: string; minLevel: number; maxLevel: number } =>
    source.minLevel !== undefined && source.maxLevel !== undefined
  );
  return {
    reachable: ranges.filter(source => source.minLevel <= researchLevel),
    higher: ranges.filter(source => source.minLevel > researchLevel),
    unspecified: [...new Set(sources.filter(source => source.minLevel === undefined
      && !ranges.some(range => range.monster === source.monster)).map(source => source.monster))],
  };
}

type Recipe = {
  label?: string;
  minMr?: number;
  materials: Array<{ name: string; count: number }>;
  category?: { name: string | undefined; points: number };
  zenny?: number;
  predecessorId?: string;
  unlock?: string[];
};
type ItemKind = 'weapon' | 'armor' | 'decoration';
type MaterialAmount = { name: string; count: number };
type CraftingStep = {
  itemId: string;
  copies: number;
  used: Map<string, number>;
  spent: MaterialAmount[];
  recipe: Recipe;
  shortfall: MaterialAmount[];
  missingPoints: number;
  needsPredecessor: boolean;
  prerequisite?: CraftingStep;
};

export function createCraftingPlanner(inventory: InventoryState, mr: number) {
  const ownedWeapons = new Set(inventory.ownedWeaponIds);
  const materials = new Map<string, number>();
  const key = (name: string) => name.trim().toLowerCase();
  for (const [name, count] of Object.entries(inventory.materials)) {
    if (Number.isSafeInteger(count) && count > 0) materials.set(key(name), count);
  }
  const recipes = new Map<string, Recipe[]>();

  function getRecipes(id: string, kind: ItemKind, forecast = false): Recipe[] {
    const cacheKey = `${id}:${forecast}`;
    const cached = recipes.get(cacheKey);
    if (cached) return cached;
    let options: Recipe[];
    if (kind === 'weapon') {
      options = getWeaponCraftingOptions(id).filter(recipe => forecast || (recipe.minMr <= mr
        && (recipe.kind === 'product' || Boolean(recipe.predecessorId))));
      options.sort((a, b) => Number(Boolean(a.predecessorId && !ownedWeapons.has(a.predecessorId)))
        - Number(Boolean(b.predecessorId && !ownedWeapons.has(b.predecessorId))));
    } else {
      const materials = kind === 'armor' ? getArmorCraftingMaterials(id) : getDecorationCraftingMaterials(id);
      options = materials && (forecast || getMinimumCraftingMr(id) <= mr) ? [{
        materials,
        category: kind === 'decoration' ? getRampageCraftingCategory(id) ?? undefined : undefined,
        zenny: getEquipmentCraftingZenny(id),
        minMr: getMinimumCraftingMr(id),
      }] : [];
    }
    recipes.set(cacheKey, options);
    return options;
  }

  function* weaponRoutes(id: string, forecast: boolean, visited = new Set<string>()): Generator<Array<{ id: string; recipe: Recipe }>> {
    if (visited.has(id)) return;
    const ancestors = new Set([...visited, id]);
    for (const recipe of getRecipes(id, 'weapon', forecast)) {
      const step = { id, recipe };
      if (!recipe.predecessorId || ownedWeapons.has(recipe.predecessorId)) {
        yield [step];
        continue;
      }
      let hasRoute = false;
      for (const route of weaponRoutes(recipe.predecessorId, forecast, ancestors)) {
        hasRoute = true;
        yield [...route, step];
      }
      if (forecast && !hasRoute) yield [step];
    }
  }

  function spendOnRecipe(
    id: string, recipe: Recipe, copies: number, budget: Map<string, number>, forecast: boolean,
    protectedMaterials = new Map<string, number>(), prerequisite?: CraftingStep,
  ): CraftingStep | undefined {
    const used = new Map(budget);
    const available = (name: string) => (materials.get(key(name)) ?? 0) - (used.get(key(name)) ?? 0);
    const spent = new Map<string, number>();
    const spend = (name: string, count: number) => {
      used.set(key(name), (used.get(key(name)) ?? 0) + count);
      spent.set(name, (spent.get(name) ?? 0) + count);
    };
    const shortfall: Array<{ name: string; count: number }> = [];
    for (const material of recipe.materials) {
      const count = material.count * copies;
      const missing = count - Math.max(0, available(material.name));
      if (!forecast && missing > 0) return;
      if (missing > 0) shortfall.push({ name: material.name, count: missing });
      spend(material.name, count);
    }
    let missingPoints = 0;
    if (recipe.category) {
      let points = recipe.category.points * copies;
      const candidates = CRAFTING_CATEGORY_MATERIALS[recipe.category.name ?? ''] ?? [];
      for (const material of [...candidates].sort((a, b) => b.points - a.points)) {
        const usable = available(material.name) - (protectedMaterials.get(key(material.name)) ?? 0);
        const count = Math.min(usable, Math.ceil(points / material.points));
        if (count <= 0) continue;
        spend(material.name, count);
        points -= count * material.points;
        if (points <= 0) break;
      }
      if (points > 0 && !forecast) return;
      missingPoints = Math.max(0, points);
    }
    return {
      itemId: id, copies, used, spent: [...spent].map(([name, count]) => ({ name, count })), recipe, shortfall, missingPoints,
      needsPredecessor: Boolean(recipe.predecessorId && !ownedWeapons.has(recipe.predecessorId)), prerequisite,
    };
  }

  function* reservationOptions(id: string, kind: ItemKind, copies: number, budget: Map<string, number>, forecast: boolean) {
    if (kind !== 'weapon') {
      for (const recipe of getRecipes(id, kind, forecast)) {
        const step = spendOnRecipe(id, recipe, copies, budget, forecast);
        if (step) yield step;
      }
      return;
    }
    for (const route of weaponRoutes(id, forecast)) {
      const protectedMaterials = new Map<string, number>();
      for (const { recipe } of route) {
        for (const material of recipe.materials) {
          const name = key(material.name);
          protectedMaterials.set(name, (protectedMaterials.get(name) ?? 0) + material.count);
        }
      }
      let step: CraftingStep | undefined;
      for (const entry of route) {
        for (const material of entry.recipe.materials) {
          const name = key(material.name);
          protectedMaterials.set(name, (protectedMaterials.get(name) ?? 0) - material.count);
        }
        step = spendOnRecipe(entry.id, entry.recipe, 1, step?.used ?? budget, forecast, protectedMaterials, step);
        if (!step) break;
      }
      if (step) yield step;
    }
  }

  function reserve(id: string, kind: ItemKind, copies = 1, budget = new Map<string, number>(), forecast = false): CraftingStep | undefined {
    let best: CraftingStep | undefined;
    let bestZenny = Infinity;
    for (const step of reservationOptions(id, kind, copies, budget, forecast)) {
      if (kind !== 'weapon' || forecast) return step;
      const zenny = craftingRoute(step).reduce((sum, entry) => sum + (entry.recipe.zenny ?? Infinity), 0);
      if (!best || zenny < bestZenny) {
        best = step;
        bestZenny = zenny;
      }
    }
    return best;
  }

  type Piece = { itemId: string; slotLabel: string; missingCopies: number };
  function collect(pieces: Piece[], forecast: boolean) {
    let used = new Map<string, number>();
    const steps = new Map<string, NonNullable<ReturnType<typeof reserve>>>();
    // Reserve the other equipment first so weapon upgrade categories spend what's left.
    const ordered = [...pieces].sort((a, b) => Number(a.slotLabel === 'Weapon') - Number(b.slotLabel === 'Weapon'));
    for (const piece of ordered) {
      const kind = piece.slotLabel === 'Weapon' ? 'weapon' : piece.slotLabel === 'Decoration' ? 'decoration' : 'armor';
      const step = reserve(piece.itemId, kind, piece.missingCopies, used, forecast);
      if (!step) {
        if (!forecast) return undefined;
        continue;
      }
      used = step.used;
      steps.set(piece.itemId, step);
    }
    return steps;
  }

  return {
    reserve,
    plan: (pieces: Piece[]) => collect(pieces, false),
    forecast: (pieces: Piece[]) => collect(pieces, false) ?? collect(pieces, true)!,
  };
}

export function craftingRoute(step: CraftingStep): CraftingStep[] {
  return step.prerequisite ? [...craftingRoute(step.prerequisite), step] : [step];
}

export function recordCraftedItem(
  inventory: InventoryState, kind: ItemKind, step: CraftingStep,
): InventoryState {
  const copies = step.copies;
  if (!Number.isSafeInteger(copies) || copies < 1 || (kind !== 'decoration' && copies !== 1)) return inventory;
  const id = step.itemId;
  if ((kind === 'weapon' && inventory.ownedWeaponIds.includes(id))
    || (kind === 'armor' && inventory.ownedArmorIds.includes(id))) return inventory;
  const materials = { ...inventory.materials };
  const stockNames = new Map(Object.keys(materials).map(name => [name.trim().toLowerCase(), name]));
  const weapons = new Set(inventory.ownedWeaponIds);
  for (const entry of craftingRoute(step)) {
    if (entry.shortfall.length || entry.missingPoints > 0) return inventory;
    for (const material of entry.spent) {
      const name = stockNames.get(material.name.trim().toLowerCase());
      if (!name || (materials[name] ?? 0) < material.count) return inventory;
      materials[name] -= material.count;
      if (materials[name] === 0) delete materials[name];
    }
    if (kind === 'weapon') {
      if (entry.recipe.predecessorId && !weapons.delete(entry.recipe.predecessorId)) return inventory;
      weapons.add(entry.itemId);
    }
  }
  if (kind === 'weapon') return { ...inventory, materials, ownedWeaponIds: [...weapons] };
  if (kind === 'armor') return { ...inventory, materials, ownedArmorIds: [...inventory.ownedArmorIds, id] };
  const hadDeco = inventory.ownedDecoIds.includes(id);
  return {
    ...inventory, materials,
    ownedDecoIds: hadDeco ? inventory.ownedDecoIds : [...inventory.ownedDecoIds, id],
    ownedDecoCounts: { ...inventory.ownedDecoCounts, [id]: (hadDeco ? inventory.ownedDecoCounts?.[id] ?? 1 : 0) + copies },
  };
}

export function summarizeCraftingForecast(
  planner: ReturnType<typeof createCraftingPlanner>,
  pieces: Parameters<ReturnType<typeof createCraftingPlanner>['forecast']>[0],
) {
  const steps = planner.forecast(pieces);
  let zenny = 0;
  let incompleteCost = false;
  const missingMaterials = new Map<string, number>();
  for (const piece of pieces) {
    const step = steps.get(piece.itemId);
    if (!step) {
      incompleteCost = true;
      continue;
    }
    for (const routeStep of craftingRoute(step)) {
      if (routeStep.recipe.zenny === undefined || (routeStep.needsPredecessor && !routeStep.prerequisite)) incompleteCost = true;
      zenny += (routeStep.recipe.zenny ?? 0) * (routeStep === step ? piece.missingCopies : 1);
      for (const material of routeStep.shortfall) {
        missingMaterials.set(material.name, (missingMaterials.get(material.name) ?? 0) + material.count);
      }
    }
  }
  return { steps, zenny, incompleteCost, missingMaterials };
}
