import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CRAFTING_CATEGORY_MATERIALS, getEquipmentProgression, getWeaponCraftingOptions } from '../src/data/mhriceAdapter';
import { EMPTY_Q_ARMOR } from '../src/data/quriousDefaults';
import { ARMOR_DB, DECORATIONS_DB, META_BUILD_TEMPLATES, STARTER_LOADOUT, WEAPONS_DB, getWeaponById } from '../src/data/sunbreakDb';
import { createCraftingPlanner, recordCraftedItem, summarizeCraftingForecast } from '../src/engine/craftingPlanner';
import { calculateBuildStats, decorationFits, DEFAULT_SIM_CONFIG, evaluateMetaRecommendations, getUnlockedIdsForRank, preferOwnedArmorVariants, RECOMMENDATION_TEMPLATES, resolveDecorationSlots, resolveWeaponSharpness, simulateTrainingDps } from '../src/engine/damageCalculator';
import { optimizeTemplateTalisman } from '../src/engine/ownedBuildOptimizer';
import { createDefaultInventory, DEFAULT_HUNTER_PROFILE, mergeImportedDecorations, mergeImportedEquipment, mergeSteamProfile, parseBuildsBackup, parseCharmOrInventoryPayload, partitionBuildsBackup } from '../src/utils/storageAndShare';

test('a damaged complete decoration export preserves the previous inventory', () => {
  const blaze = DECORATIONS_DB.find(item => item.name === 'Blaze Jewel 1');
  assert.ok(blaze);
  const inventory = {
    ...createDefaultInventory(),
    ownedDecoIds: [blaze.id],
    ownedDecoCounts: { [blaze.id]: 5 },
  };
  const snapshot = {
    schema: 'elgado-forge-reframework-v1',
    exporterRevision: 2,
    decorationCountsComplete: true,
  };
  const damaged = parseCharmOrInventoryPayload(JSON.stringify({
    ...snapshot,
    decorations: [{ name: 'Unknown Catalog Jewel', quantity: 1 }, { name: blaze.name, quantity: null }],
  }));
  assert.equal(damaged.decorationCountsComplete, false);
  assert.deepEqual(damaged.decorationImportIssues, ['Unknown Catalog Jewel', 'Blaze Jewel 1 (invalid quantity)']);
  assert.deepEqual(mergeImportedDecorations(inventory, damaged, true), {
    ownedDecoIds: [blaze.id],
    ownedDecoCounts: { [blaze.id]: 5 },
  });

  const complete = parseCharmOrInventoryPayload(JSON.stringify({
    ...snapshot, decorations: [{ name: blaze.name, quantity: 1 }],
  }));
  assert.equal(complete.decorationCountsComplete, true);
  assert.equal(mergeImportedDecorations(inventory, complete, true).ownedDecoCounts[blaze.id], 1);
});

test('HBG Pierce DPS uses the fire-and-reload cycle and untimed ammo keeps magazine damage', () => {
  const heavy = WEAPONS_DB.find(item => item.name === 'Kamura H. Bowgun V');
  const light = WEAPONS_DB.find(item => item.name === 'Silver Shooter');
  assert.ok(heavy && light);
  const loadout = {
    ...STARTER_LOADOUT,
    weaponId: heavy.id,
    weaponClass: heavy.weaponClass,
    bowgunAmmo: 'Kantsu3' as const,
    talisman: { ...STARTER_LOADOUT.talisman, skill1Id: '', skill1Level: 0, skill2Id: '', skill2Level: 0 },
  };
  const base = simulateTrainingDps(loadout, DEFAULT_SIM_CONFIG);
  const tuned = simulateTrainingDps({
    ...loadout,
    talisman: { ...loadout.talisman, skill1Id: 'recoil_down', skill1Level: 3, skill2Id: 'reload_speed', skill2Level: 3 },
  }, DEFAULT_SIM_CONFIG);
  assert.equal(tuned.comboDamage, base.comboDamage);
  assert.ok(base.comboDamage > 0);
  assert.ok(tuned.cycleSeconds !== undefined && base.cycleSeconds !== undefined && tuned.cycleSeconds < base.cycleSeconds);
  assert.ok(tuned.dps !== undefined && base.dps !== undefined && tuned.dps > base.dps);

  const untimed = simulateTrainingDps({
    ...loadout, weaponId: light.id, weaponClass: light.weaponClass, bowgunAmmo: 'Kantsu2',
  }, DEFAULT_SIM_CONFIG);
  assert.equal(untimed.dps, undefined);
  assert.equal(untimed.estimatedClearSeconds, undefined);
  assert.ok(untimed.comboDamage > 0);
  assert.deepEqual(untimed.timeline, []);
});

test('crafting picks the cheaper upgrade and falls back to direct forging when needed', () => {
  const cleaver = WEAPONS_DB.find(item => item.name === 'Kamura Cleaver V');
  assert.ok(cleaver);
  const recipes = getWeaponCraftingOptions(cleaver.id);
  const forge = recipes.find(recipe => recipe.kind === 'product');
  const upgrade = recipes.find(recipe => recipe.kind === 'process');
  assert.ok(forge && upgrade?.predecessorId);
  const inventory = {
    ...createDefaultInventory(),
    ownedWeaponIds: [upgrade.predecessorId],
    materials: Object.fromEntries(recipes.flatMap(recipe => recipe.materials.map(material => [material.name, 100]))),
  };
  const pieces = [{ itemId: cleaver.id, slotLabel: 'Weapon', missingCopies: 1 }];
  const cheapest = summarizeCraftingForecast(createCraftingPlanner(inventory, 999), pieces);
  assert.equal(cheapest.zenny, 8000);
  assert.equal(cheapest.steps.get(cleaver.id)?.recipe.predecessorId, upgrade.predecessorId);
  const forgeOnly = createCraftingPlanner({
    ...inventory,
    ownedWeaponIds: [],
    materials: Object.fromEntries(forge.materials.map(material => [material.name, material.count])),
  }, 999);
  assert.equal(summarizeCraftingForecast(forgeOnly, pieces).zenny, 12000);
});

test('Offensive Guard responds to uptime for Lance and gives no damage to Insect Glaive', () => {
  const glaive = WEAPONS_DB.find(item => item.name === 'Defender Glaive I');
  const lance = WEAPONS_DB.find(item => item.weaponClass === 'Lance');
  const guardian = DECORATIONS_DB.find(item => item.name === 'Guardian Jewel 3');
  assert.ok(glaive && lance && guardian);
  const loadout = {
    ...STARTER_LOADOUT,
    weaponId: glaive.id,
    weaponClass: glaive.weaponClass,
    talisman: { ...STARTER_LOADOUT.talisman, slots: [3, 0, 0] as [number, number, number] },
  };
  const noGuard = { ...loadout, decorations: { ...loadout.decorations, talisman: [] } };
  const withGuard = { ...loadout, decorations: { ...loadout.decorations, talisman: [guardian.id] } };
  const glaiveStats = calculateBuildStats(withGuard, { offensiveGuardUptime: 100 });
  assert.ok(glaiveStats.skills.offensive_guard > 0);
  assert.equal(glaiveStats.trueRaw, calculateBuildStats(noGuard).trueRaw);
  const lanceBuild = { ...withGuard, weaponId: lance.id, weaponClass: lance.weaponClass };
  assert.ok(calculateBuildStats(lanceBuild, { offensiveGuardUptime: 100 }).trueRaw
    > calculateBuildStats(lanceBuild, { offensiveGuardUptime: 0 }).trueRaw);
});

test('Weakness Exploit caps affinity before weighting normal and weakspot hits', () => {
  const weapon = WEAPONS_DB.find(item => item.name === "L'Apothéose");
  assert.ok(weapon);
  const armor = Object.fromEntries((['Helm', 'Chest', 'Arms', 'Waist', 'Legs'] as const).map(slot => {
    const piece = ARMOR_DB.filter(item => item.slot === slot && item.isSelectable !== false)
      .sort((a, b) => (b.skills.critical_eye ?? 0) - (a.skills.critical_eye ?? 0))[0];
    return [`${slot.toLowerCase()}Id`, piece.id];
  }));
  const loadout = {
    ...STARTER_LOADOUT,
    ...armor,
    weaponId: weapon.id,
    weaponClass: weapon.weaponClass,
    decorations: { weapon: [], helm: [], chest: [], arms: [], waist: [], legs: [], talisman: [] },
    talisman: {
      ...STARTER_LOADOUT.talisman, skill1Id: 'weakness_exploit', skill1Level: 3, skill2Id: '', skill2Level: 0,
    },
  };
  const [normal, mixed, weakspot] = [0, 50, 100].map(wexUptime => calculateBuildStats(loadout, { wexUptime }));
  assert.equal(normal.totalAffinity, 85);
  assert.equal(weakspot.totalAffinity, 100);
  assert.equal(mixed.totalAffinity, 93);
  assert.equal(mixed.weakspotAffinity, 100);
  assert.ok(Math.abs(mixed.effectiveRaw - (normal.effectiveRaw + weakspot.effectiveRaw) / 2) < 0.1);
});

test('Steam sync keeps imported or manually entered ranks', () => {
  const current = { ...DEFAULT_HUNTER_PROFILE, hr: 160, mr: 61, ar: 79 };
  const merged = mergeSteamProfile(current, {
    ok: true, source: 'steam-web-api', steamId64: 'test-id', personaName: 'Hunter', avatarUrl: '',
    playtimeHours: 100, achievementsUnlocked: 42, achievementsTotal: 100,
    estimatedHr: 100, estimatedMr: 30, estimatedAr: 50, milestones: [],
  }, '2026-11-24T00:00:00Z');
  assert.deepEqual([merged.hr, merged.mr, merged.ar], [160, 61, 79]);
  assert.deepEqual(merged.steamEstimatedRanks, { hr: 100, mr: 30, ar: 50 });
  assert.equal(merged.achievementsUnlocked, 42);
});

test('build backup restores legacy builds and skips corrupt rows and duplicate IDs', () => {
  const { quriousArmor, quriousWeapon, ...legacy } = { ...STARTER_LOADOUT, id: 'legacy-build' };
  const valid = { ...STARTER_LOADOUT, id: 'new-backup-build' };
  const backup = parseBuildsBackup(JSON.stringify([
    STARTER_LOADOUT, valid, legacy, valid, { ...valid, decorations: { ...valid.decorations, helm: [42] } },
  ]));
  assert.ok(backup);
  assert.deepEqual(backup.invalidRows, [5]);
  const restored = partitionBuildsBackup(backup.builds, [STARTER_LOADOUT]);
  assert.deepEqual(restored.added.map(build => build.id), [valid.id, legacy.id]);
  assert.equal(restored.duplicates.length, 2);
  assert.equal(restored.added[1].quriousWeapon.attackLevel, 0);
  assert.equal(restored.added[1].quriousArmor.Helm.skillAddedPoints, 0);
  assert.equal(parseBuildsBackup('{"materials":{}}'), null);
});

test('unreadable equipment rows protect only the affected inventory lists', () => {
  const inventory = { ...createDefaultInventory(), ownedWeaponIds: [WEAPONS_DB[0].id], ownedArmorIds: [ARMOR_DB[0].id] };
  const weapon = WEAPONS_DB[1];
  const snapshot = { schema: 'elgado-forge-reframework-v1' };
  const damaged = parseCharmOrInventoryPayload(JSON.stringify({
    ...snapshot, weapons: [{ name: 'Unknown catalog weapon' }, { name: weapon.name }], ownedArmorIds: [],
  }));
  assert.deepEqual(damaged.weaponImportIssues, ['Unknown catalog weapon']);
  assert.deepEqual(mergeImportedEquipment(inventory, damaged, true), {
    ownedWeaponIds: [...inventory.ownedWeaponIds, weapon.id], ownedArmorIds: [],
  });
  const malformedArmor = parseCharmOrInventoryPayload(JSON.stringify({
    ...snapshot, ownedWeaponIds: [weapon.id], ownedArmorIds: [null],
  }));
  assert.deepEqual(malformedArmor.armorImportIssues, ['ownedArmorIds #1']);
  assert.deepEqual(mergeImportedEquipment(inventory, malformedArmor, true), {
    ownedWeaponIds: [weapon.id], ownedArmorIds: inventory.ownedArmorIds,
  });
});

test('Dragon Conversion applies the ranged rate and consumes resistances on Red Scroll', () => {
  const weapon = WEAPONS_DB.find(item => item.name === 'Dark Filament+');
  assert.ok(weapon);
  const armor = Object.fromEntries(ARMOR_DB.filter(item => item.name.includes('Epoch') && item.skills.dragon_conversion)
    .map(item => [`${item.slot.toLowerCase()}Id`, item.id]));
  const loadout = {
    ...STARTER_LOADOUT, armsId: '', legsId: '', ...armor,
    weaponId: weapon.id, weaponClass: weapon.weaponClass,
    quriousArmor: EMPTY_Q_ARMOR,
    talisman: { ...STARTER_LOADOUT.talisman, skill1Id: '', skill1Level: 0, skill2Id: '', skill2Level: 0 },
    decorations: { weapon: [], helm: [], chest: [], arms: [], waist: [], legs: [], talisman: [] },
  };
  const blue = calculateBuildStats({ ...loadout, scrollMode: 'Blue' });
  const red = calculateBuildStats({ ...loadout, scrollMode: 'Red' });
  const chargedRed = calculateBuildStats({ ...loadout, scrollMode: 'Red' }, { dragonConversionCharged: true });
  assert.equal(red.skills.dragon_conversion, 3);
  const resistance = Object.values(blue.resistances).reduce((sum, value) => sum + Math.max(0, value), 0);
  assert.equal(red.trueElement - blue.trueElement, Math.floor(resistance * 8 / 100));
  assert.ok(chargedRed.trueElement > red.trueElement);
  assert.ok(Object.values(red.resistances).every(value => value === 0));
});

test('Agitator averages damage after applying the affinity cap in each state', () => {
  const weapon = WEAPONS_DB.find(item => item.name === "L'Apothéose");
  assert.ok(weapon);
  const loadout = {
    ...STARTER_LOADOUT, weaponId: weapon.id, weaponClass: weapon.weaponClass,
    helmId: '', chestId: '', armsId: '', waistId: '', legsId: '',
    decorations: { weapon: [], helm: [], chest: [], arms: [], waist: [], legs: [], talisman: [] },
    quriousWeapon: { ...STARTER_LOADOUT.quriousWeapon, affinityLevel: 2 },
    talisman: { ...STARTER_LOADOUT.talisman, skill1Id: 'critical_eye', skill1Level: 7, skill2Id: 'agitator', skill2Level: 5 },
  };
  const [inactive, mixed, active] = [0, 50, 100].map(agitatorUptime =>
    calculateBuildStats(loadout, { monsterState: 'Normal', agitatorUptime, wexUptime: 0 })
  );
  assert.equal(inactive.totalAffinity, 95);
  assert.equal(active.totalAffinity, 100);
  assert.equal(mixed.totalAffinity, 98);
  assert.ok(Math.abs(mixed.effectiveRaw - (inactive.effectiveRaw + active.effectiveRaw) / 2) < 0.11);
});

test('recording a weapon upgrade spends its materials and consumes the starting weapon once', () => {
  const weapon = WEAPONS_DB.find(item => item.name === 'Torci Da Lavater');
  assert.ok(weapon);
  const recipe = getWeaponCraftingOptions(weapon.id).find(option => option.kind === 'process');
  assert.ok(recipe?.predecessorId && recipe.category?.name);
  const categoryMaterial = CRAFTING_CATEGORY_MATERIALS[recipe.category.name][0];
  const inventory = {
    ...createDefaultInventory(),
    ownedWeaponIds: [recipe.predecessorId],
    materials: {
      ...Object.fromEntries(recipe.materials.map(material => [material.name, material.count])),
      [categoryMaterial.name]: Math.ceil(recipe.category.points / categoryMaterial.points),
    },
  };
  const step = createCraftingPlanner(inventory, 999).reserve(weapon.id, 'weapon');
  assert.ok(step);
  const after = recordCraftedItem(inventory, 'weapon', step);
  assert.deepEqual(after.ownedWeaponIds, [weapon.id]);
  assert.deepEqual(after.materials, {});
  assert.equal(recordCraftedItem(after, 'weapon', step), after);
  assert.equal(inventory.materials['Afflicted Claw'], 5);
});

test('MHRice Handicraft expands the gauge before changing damage multipliers', () => {
  const weapon = WEAPONS_DB.find(item => item.name === 'Scarlet Lamplance+');
  assert.ok(weapon);
  const [base, first, second, max] = [0, 1, 2, 5].map(level => resolveWeaponSharpness(weapon, level));
  assert.equal(base.tier, 'White');
  assert.deepEqual(first.gauge?.slice(-2), [60, 0]);
  assert.equal(first.tier, 'White');
  assert.deepEqual(second.gauge?.slice(-2), [60, 10]);
  assert.equal(second.tier, 'Purple');
  assert.deepEqual(max.gauge?.slice(-2), [60, 40]);
});

test('all curated templates have legal slots and keep equivalent owned Rakna variants', () => {
  assert.equal(RECOMMENDATION_TEMPLATES.length, META_BUILD_TEMPLATES.length);
  const hbg = RECOMMENDATION_TEMPLATES.find(template => template.id === 'meta_hbg_story_mr');
  assert.ok(hbg);
  assert.equal(preferOwnedArmorVariants(hbg.loadout, ['armor:head:331']).helmId, 'armor:head:331');
  assert.ok(RECOMMENDATION_TEMPLATES.some(template => template.id === 'meta_bow_story_mr'));
  for (const template of RECOMMENDATION_TEMPLATES) {
    const slots = resolveDecorationSlots(template.loadout);
    for (const key of Object.keys(slots) as Array<keyof typeof slots>) {
      assert.ok(template.loadout.decorations[key].every((id, index) => !id || decorationFits(id, slots[key][index])),
        `Invalid ${key} decoration in ${template.id}`);
    }
    assert.notEqual(template.loadout.rampageDecoId, 'ramp_anti_elder');
  }
  const inventory = createDefaultInventory();
  const template = RECOMMENDATION_TEMPLATES.find(item => item.id === 'meta_gs_early_mr');
  assert.ok(template);
  const weapon = getWeaponById(template.loadout.weaponId);
  assert.ok(weapon);
  const compare = calculateBuildStats(optimizeTemplateTalisman(template.loadout, weapon, inventory));
  const meta = evaluateMetaRecommendations(DEFAULT_HUNTER_PROFILE, inventory, 'Great Sword', 'All', optimizeTemplateTalisman)
    .find(item => item.template.id === template.id);
  assert.equal(compare.effectiveRaw, meta?.stats.effectiveRaw);
  assert.ok(!calculateBuildStats(STARTER_LOADOUT).overcappedSkills.includes('weakness_exploit'));
});

test('rank-only unlocks exclude gated or unverified equipment', () => {
  const armor = ARMOR_DB.find(item => item.name === 'Valstrax Helm - Epoch');
  const weapon = WEAPONS_DB.find(item => item.name === 'Torci Da Lavater');
  assert.ok(armor && weapon);
  assert.equal(getEquipmentProgression(armor, 10, 0), 'locked');
  assert.equal(getEquipmentProgression(armor, 160, 0), 'unverified');
  assert.equal(getEquipmentProgression(weapon, 10, 0), 'unverified');
  assert.equal(getEquipmentProgression(weapon, 10, 0, { 'Afflicted Claw': 5 }), 'confirmed');
  const unlocks = getUnlockedIdsForRank(10, 0);
  assert.ok(unlocks.weaponIds.length > 0);
  assert.ok(!unlocks.weaponIds.includes(weapon.id));
  assert.ok(!unlocks.armorIds.includes(armor.id));
});
