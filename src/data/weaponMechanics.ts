import type { BowgunAmmoId, CalculatedBuildStats, WeaponClass, WeaponItem } from '../types/sunbreak';

export function supportsOffensiveGuard(weaponClass: WeaponClass): boolean {
  return ['Great Sword', 'Sword & Shield', 'Lance', 'Gunlance', 'Charge Blade'].includes(weaponClass);
}

type WeaponDetails = {
  charge_axe_bottle_type?: 'Power' | 'StrongElement';
  gun_lance_fire_lv?: number;
  gun_lance_fire_type?: 'Normal' | 'Radial' | 'Diffusion';
  bow_default_charge_lv_limit?: number;
  bow_charge_type_list?: string[];
  rapid_shot_list?: string[];
  base?: {
    recoil?: number;
    reload?: number;
    bullet_equip_flag_list?: boolean[];
    bullet_num_list?: number[];
    bullet_type_list?: string[];
  };
};

function sourceDetails(weapon: WeaponItem): WeaponDetails | undefined {
  return weapon.sourceDetails as WeaponDetails | undefined;
}

export function getChargeBladePhial(weapon: WeaponItem): 'impact' | 'element' | undefined {
  if (weapon.weaponClass !== 'Charge Blade') return undefined;
  const phial = sourceDetails(weapon)?.charge_axe_bottle_type;
  if (phial === 'StrongElement' || /element phial/i.test(weapon.unlockNote)) return 'element';
  if (phial === 'Power' || /impact phial/i.test(weapon.unlockNote)) return 'impact';
  return undefined;
}

export function elementExploitMultiplier(level: number): number {
  return [1, 1.1, 1.125, 1.15][level] ?? 1;
}

// Ground SAED with a charged shield, without a Counter Morph Slash guard point.
// https://kuroyonhon.com/mhrisesb/memo/11.php
export function estimateChargeBladeSaedPhials(
  weapon: WeaponItem,
  stats: Pick<CalculatedBuildStats, 'trueRaw' | 'trueElement' | 'skills'>,
  elementHitzone: number,
  stateMultiplier: number,
  speciesRawMultiplier = 1
) {
  const phial = getChargeBladePhial(weapon);
  if (!phial) return undefined;
  if (phial === 'impact') {
    const artillery = [1, 1.1, 1.2, 1.3][stats.skills.artillery ?? 0] ?? 1;
    return { phial, fixedDamage: Math.round(stats.trueRaw * 0.22 * 1.2 * artillery * stateMultiplier * speciesRawMultiplier) * 5, elementDamage: 0 };
  }
  if (stats.trueElement <= 0) return { phial, fixedDamage: 0, elementDamage: 0 };
  const fixed = stats.trueRaw * 0.08 * stateMultiplier * speciesRawMultiplier;
  const exploit = elementHitzone >= 20 ? elementExploitMultiplier(stats.skills.element_exploit ?? 0) : 1;
  const element = stats.trueElement * 11.25 * 1.3 * elementHitzone / 100 * stateMultiplier * exploit;
  return {
    phial,
    fixedDamage: Math.round(fixed) * 5,
    elementDamage: (Math.round(fixed + element) - Math.round(fixed)) * 5,
  };
}

export function getGunlanceShellingLevel(weapon: WeaponItem): number {
  return sourceDetails(weapon)?.gun_lance_fire_lv ?? 0;
}

export function getGunlanceShellingType(weapon: WeaponItem) {
  const type = sourceDetails(weapon)?.gun_lance_fire_type;
  return type === 'Radial' ? 'Long' : type === 'Diffusion' ? 'Wide' : type;
}

// Sunbreak v15+ Full Burst per shell [fixed, fire] by shelling level (1 through 8).
// https://kuroyonhon.com/mhrisesb/memo/9.php
const FULL_BURST = {
  Normal: { capacity: 6, damage: [[9, 5], [12, 7], [16, 8], [24, 9], [27, 10], [31, 12], [37, 13], [45, 14]] },
  Long: { capacity: 4, damage: [[12, 9], [17, 11], [22, 13], [30, 15], [34, 16], [42, 18], [48, 20], [54, 22]] },
  Wide: { capacity: 2, damage: [[17, 6], [23, 7], [28, 8], [45, 9], [58, 10], [68, 11], [78, 12], [90, 13]] },
} as const;

export function sneakAttackMultiplier(level: number): number {
  const rearBonus = [0, 0.05, 0.10, 0.20][level] ?? 0;
  return 1 + rearBonus * 0.45; // Existing simulator assumption for attacks from behind.
}

export function estimateGunlanceFullBurst(
  weapon: WeaponItem,
  stats: Pick<CalculatedBuildStats, 'skills' | 'sharpness'>,
  fireHitzone: number,
  stateMultiplier: number,
  speciesRawMultiplier = 1
) {
  if (weapon.weaponClass !== 'Gunlance') return undefined;
  const type = getGunlanceShellingType(weapon);
  const profile = type && FULL_BURST[type];
  const damage = profile && profile.damage[getGunlanceShellingLevel(weapon) - 1];
  if (!profile || !damage) return undefined;
  if (stats.sharpness === 'Red') return { shellCount: 0, fixedDamage: 0, fireDamage: 0 };

  const shellCount = profile.capacity + ((stats.skills.load_shells ?? 0) >= 2 ? 1 : 0);
  const artillery = [1, 1.1, 1.2, 1.3][stats.skills.artillery ?? 0] ?? 1;
  const sharpness = stats.sharpness === 'Orange' ? 0.75 : 1;
  const multiplier = artillery * sharpness * stateMultiplier;
  const fixed = damage[0] * multiplier * sneakAttackMultiplier(stats.skills.sneak_attack ?? 0) * speciesRawMultiplier;
  const fire = damage[1] * multiplier * fireHitzone / 100;
  const fixedPerShell = Math.round(fixed);
  return {
    shellCount,
    fixedDamage: fixedPerShell * shellCount,
    fireDamage: (Math.round(fixed + fire) - fixedPerShell) * shellCount,
  };
}

// The first three physical ammo families in the game's BulletType table.
// Pierce uses 7/7/9 motion value per tick in Sunbreak; travel through the target controls the tick count.
// https://kuroyonhon.com/mhrisesb/memo/18.php
const PHYSICAL_AMMO = [
  { first: 1, code: 'Normal', name: 'Normal', skillId: 'normal_rapid_up', mv: [16, 22, 34], hits: [1, 1, 1] },
  { first: 4, code: 'Kantsu', name: 'Pierce', skillId: 'pierce_up', mv: [7, 7, 9], hits: [1, 1, 1] },
  { first: 7, code: 'SanW', name: 'Spread', skillId: 'spread_up', mv: [7, 7, 10], hits: [3, 4, 5] },
] as const;

function listBowgunAmmo(weapon: WeaponItem) {
  if (weapon.weaponClass !== 'Light Bowgun' && weapon.weaponClass !== 'Heavy Bowgun') return [];
  const details = sourceDetails(weapon);
  const data = details?.base;
  if (!data) return [];
  const candidates = PHYSICAL_AMMO.flatMap(({ first, code, name, skillId, mv, hits }) =>
    mv.flatMap((motionValue, offset) => {
      const level = offset + 1;
      const index = first + offset;
      const capacity = data.bullet_num_list?.[index] ?? 0;
      if (!data.bullet_equip_flag_list?.[index] || capacity <= 0) return [];
      const handling = data.bullet_type_list?.[index] ?? '';
      const rapidFire = weapon.weaponClass === 'Light Bowgun' && Boolean(details?.rapid_shot_list?.includes(`${code}${level}`));
      const score = level * 4 + Math.min(capacity, 6)
        + (rapidFire ? 5 : 0) + (handling.includes('MovingShot') ? 2 : 0)
        + (handling.toLowerCase().includes('reload') ? 1 : 0);
      return [{
        id: `${code}${level}` as BowgunAmmoId,
        skillId, rapidFire, label: `${name} Ammo ${level}${rapidFire ? ' (Rapid Fire)' : ''}`, score,
        capacity, level, motionValue, hitsPerProjectile: hits[offset], pierce: code === 'Kantsu',
        autoReload: handling.includes('SingleAuto'),
      }];
    })
  );
  return candidates.sort((a, b) => b.score - a.score);
}

const bowgunAmmoOptions = new WeakMap<WeaponItem, ReturnType<typeof listBowgunAmmo>>();

export function getBowgunAmmoOptions(weapon: WeaponItem) {
  const cached = bowgunAmmoOptions.get(weapon);
  if (cached) return cached;
  const options = listBowgunAmmo(weapon);
  bowgunAmmoOptions.set(weapon, options);
  return options;
}

export type WeaponWithAmmo = WeaponItem & { selectedBowgunAmmo?: BowgunAmmoId };

export function getPrimaryBowgunAmmo(weapon: WeaponWithAmmo, selection = weapon.selectedBowgunAmmo) {
  const options = getBowgunAmmoOptions(weapon);
  return (selection && options.find(ammo => ammo.id === selection)) || options[0];
}

// Pierce 2/3 baseline lookup by MHRice rating (1 = worst). Each skill level improves the rating by one.
// https://docs.google.com/spreadsheets/d/1DLaU_Q9gVsxexQyjJDeYScVAVjDTH51dhyWEDC31PBg/edit
const PIERCE_RECOIL = ['High', 'High', 'Average', 'Low', 'Low', 'Low'] as const;
const PIERCE_RELOAD = ['Slowest', 'Slow', 'Slow', 'Fast', 'Fast', 'Fastest', 'Fastest', 'Fastest'] as const;

function handlingRating<T extends string>(ratings: readonly T[], base: number, skillLevel: number): T {
  return ratings[Math.min(ratings.length, base + Math.min(3, Math.max(0, skillLevel))) - 1];
}

export function getBowgunHandling(weapon: WeaponWithAmmo, skills: Record<string, number> = {}, selection?: BowgunAmmoId) {
  const ammo = getPrimaryBowgunAmmo(weapon, selection);
  const base = sourceDetails(weapon)?.base;
  const recoil = base?.recoil ?? 0;
  const reload = base?.reload ?? 0;
  if (!ammo?.pierce || ammo.level < 2 || !PIERCE_RECOIL[recoil - 1] || !PIERCE_RELOAD[reload - 1]) return;

  const usefulLevels = {
    recoil_down: Math.max(0, PIERCE_RECOIL.findIndex(rating => rating === handlingRating(PIERCE_RECOIL, recoil, 3)) + 1 - recoil),
    reload_speed: Math.max(0, PIERCE_RELOAD.findIndex(rating => rating === handlingRating(PIERCE_RELOAD, reload, 3)) + 1 - reload),
  };
  return {
    usefulLevels,
    recoil: handlingRating(PIERCE_RECOIL, recoil, skills.recoil_down ?? 0),
    reload: handlingRating(PIERCE_RELOAD, reload, skills.reload_speed ?? 0),
  };
}

// Measured in Sunbreak with uncharged HBG shots. Reload timing includes the transition back to firing.
// https://yokkaichinonikki.blog.fc2.com/blog-entry-142.html
const HBG_SHOT_SECONDS = { Low: 32 / 60, Average: 0.8, High: 1.1 };
const HBG_RELOAD_SECONDS = { Fastest: 0.9, Fast: 1.4, Slow: 2.55, Slowest: 3.7 };

export function getBowgunMagazineCycleSeconds(weapon: WeaponWithAmmo, skills: Record<string, number>, selection?: BowgunAmmoId) {
  if (weapon.weaponClass !== 'Heavy Bowgun') return;
  const ammo = getPrimaryBowgunAmmo(weapon, selection);
  if (!ammo || ammo.autoReload) return;
  const handling = getBowgunHandling(weapon, skills, selection);
  if (!handling) return;
  return ammo.capacity * HBG_SHOT_SECONDS[handling.recoil] + HBG_RELOAD_SECONDS[handling.reload];
}

function getBowCharge(weapon: WeaponItem) {
  const details = sourceDetails(weapon);
  const charges = details?.bow_charge_type_list ?? [];
  const limit = details?.bow_default_charge_lv_limit ?? 0;
  return { current: charges[limit - 1], next: limit > 0 ? charges[limit] : undefined, limit };
}

export function bowChargePlusUnlocksLevel(weapon: WeaponItem): boolean {
  return weapon.weaponClass === 'Bow' && /^(Burst|Transfix|Diffusion)Lv\d$/.test(getBowCharge(weapon).next ?? '');
}

export function getRecommendedShot(
  weapon: WeaponWithAmmo,
  bowChargePlus = bowChargePlusUnlocksLevel(weapon),
  selection?: BowgunAmmoId,
): { skillId: string; rapidFire: boolean } | undefined {
  if (weapon.weaponClass === 'Bow') {
    const { current, next } = getBowCharge(weapon);
    const charge = bowChargePlus && bowChargePlusUnlocksLevel(weapon) ? next : current;
    if (charge?.startsWith('Burst')) return { skillId: 'normal_rapid_up', rapidFire: false };
    if (charge?.startsWith('Transfix')) return { skillId: 'pierce_up', rapidFire: false };
    if (charge?.startsWith('Diffusion')) return { skillId: 'spread_up', rapidFire: false };
  }
  return getPrimaryBowgunAmmo(weapon, selection);
}

// Sunbreak arrow values at critical distance, before coatings. Pierce models one tick per arrow.
// https://kuroyonhon.com/mhrisesb/memo/15.php
const BOW_SHOTS = {
  Burst: { label: 'Rapid', motion: [14, 9, 10, 10, 11], hits: [1, 2, 3, 4, 4] },
  Transfix: { label: 'Pierce', motion: [4, 6, 8, 10, 12], hits: [1, 1, 1, 1, 1] },
  Diffusion: { label: 'Spread', motion: [5, 8, 7, 9, 10], hits: [3, 3, 5, 5, 5] },
};

export function getBowShotProfile(weapon: WeaponItem, bowChargePlus: boolean) {
  if (weapon.weaponClass !== 'Bow') return undefined;
  const { current, next, limit } = getBowCharge(weapon);
  const unlocked = bowChargePlus && bowChargePlusUnlocksLevel(weapon);
  const shot = unlocked ? next : current;
  const match = /^(Burst|Transfix|Diffusion)Lv([1-5])$/.exec(shot ?? '');
  if (!match) return undefined;
  const charge = limit + (unlocked ? 1 : 0);
  const rawMultiplier = [0, 0.65, 1, 1.25, 1.35][charge];
  const elementMod = [0, 0.8, 1, 1.1, 1.2][charge];
  if (!rawMultiplier || !elementMod) return undefined;
  const profile = BOW_SHOTS[match[1] as keyof typeof BOW_SHOTS];
  const level = Number(match[2]);
  return {
    charge,
    label: `${profile.label} Lv${level}`,
    motionValue: profile.motion[level - 1] * rawMultiplier,
    hitCount: profile.hits[level - 1],
    elementMod,
    pierce: match[1] === 'Transfix',
  };
}
