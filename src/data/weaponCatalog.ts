import {
  DamageType,
  ElementType,
  RankTier,
  SharpnessTier,
  WeaponClass,
  WeaponItem,
} from '../types/sunbreak';

function wp(
  id: string,
  name: string,
  weaponClass: WeaponClass,
  rarity: number,
  rankTier: RankTier,
  minMr: number,
  minAr: number,
  raw: number,
  elementType: ElementType,
  elementValue: number,
  affinity: number,
  defenseBonus: number,
  sharpness: SharpnessTier,
  slots: [number, number, number],
  rampageSlot: number,
  damageType: DamageType,
  unlockNote: string,
  handicraftBonusSharpness?: SharpnessTier,
  handicraftThreshold?: number
): WeaponItem {
  return {
    id,
    name,
    weaponClass,
    rarity,
    rankTier,
    minMr,
    minAr,
    raw,
    elementType,
    elementValue,
    affinity,
    defenseBonus,
    sharpness,
    handicraftBonusSharpness,
    handicraftThreshold,
    slots,
    rampageSlot,
    damageType,
    unlockNote,
  };
}

export const WEAPONS_DB: WeaponItem[] = [
  // ==========================================
  // 1. GREAT SWORD
  // ==========================================
  wp('gs_nargacuga_hr', 'Dark of Night', 'Great Sword', 7, 'HR', 0, 0, 190, 'None', 0, 35, 0, 'White', [2, 0, 0], 1, 'Sever', 'High Rank Nargacuga'),
  wp('gs_tigrex_hr', 'Tigrex Great Sword', 'Great Sword', 7, 'HR', 0, 0, 220, 'None', 0, -15, 0, 'White', [1, 0, 0], 1, 'Sever', 'High Rank Tigrex'),
  wp('gs_velociprey_mr', 'Executioner+', 'Great Sword', 8, 'Early MR', 1, 0, 280, 'None', 0, 0, 20, 'Blue', [2, 1, 0], 2, 'Sever', 'MR 1 Ore & Carapace tree', 'White', 2),
  wp('gs_nargacuga_mr', 'Avidya Great Sword', 'Great Sword', 10, 'Story MR', 4, 0, 310, 'None', 0, 40, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Nargacuga'),
  wp('gs_royal_order', "Royal Order's Great Sword", 'Great Sword', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order'),
  wp('gs_kamura_legacy', 'Fine Kamura Cleaver', 'Great Sword', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Afflicted Material upgrade'),
  wp('gs_tigrex_mr', 'Tigrex Jawblade+', 'Great Sword', 10, 'Story MR', 6, 0, 350, 'None', 0, -20, 0, 'Purple', [1, 0, 0], 2, 'Sever', 'MR Tigrex'),
  wp('gs_gaismagorm', 'Abyssal Wing', 'Great Sword', 10, 'Story MR', 6, 0, 350, 'Dragon', 24, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'MR 6 Gaismagorm'),
  wp('gs_malzeno', "Duke's Greatsword", 'Great Sword', 10, 'Story MR', 5, 0, 320, 'Dragon', 32, 0, 0, 'Purple', [4, 0, 0], 2, 'Sever', 'MR 5 Malzeno'),
  wp('gs_lucent_narga', 'Midnight Cleaver', 'Great Sword', 10, 'MR 10+', 10, 0, 330, 'Poison', 28, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Lucent Nargacuga'),
  wp('gs_flaming_espinas', 'Kaktusschwert', 'Great Sword', 10, 'MR 10+', 10, 0, 330, 'Fire', 44, 15, 0, 'Purple', [3, 1, 0], 2, 'Sever', 'MR 10 Flaming Espinas'),
  wp('gs_velkhana', 'Winged Seraphyd', 'Great Sword', 10, 'MR 10+', 10, 0, 320, 'Ice', 55, 0, 0, 'Purple', [4, 2, 0], 3, 'Sever', 'Velkhana Urgent Quest'),
  wp('gs_scorned_magnamalo', 'Darkness of Karma', 'Great Sword', 10, 'MR 10+', 100, 0, 340, 'Blast', 31, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'MR 100 Scorned Magnamalo'),
  wp('gs_chaotic_gore', 'Feral Deathblow', 'Great Sword', 10, 'Endgame AR', 10, 50, 330, 'Dragon', 32, 25, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'Chaotic Gore Magala'),
  wp('gs_amatsu', 'Abyssal Gale Greatsword', 'Great Sword', 10, 'Endgame AR', 10, 50, 350, 'Water', 38, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('gs_primordial', 'Epochal Greatsword', 'Great Sword', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 40, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno Urgent Quest'),

  // ==========================================
  // 2. LONG SWORD
  // ==========================================
  wp('ls_nargacuga_hr', 'Deepest Night', 'Long Sword', 7, 'HR', 0, 0, 180, 'None', 0, 40, 0, 'White', [2, 0, 0], 1, 'Sever', 'High Rank Nargacuga'),
  wp('ls_rathian_mr', 'Wyvern Blade "Blossom"+', 'Long Sword', 9, 'Early MR', 2, 0, 290, 'Poison', 28, 0, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Rathian', 'Purple', 2),
  wp('ls_lunagaron_mr', 'Icefeather Long Sword', 'Long Sword', 9, 'Early MR', 4, 0, 310, 'Ice', 34, 0, 0, 'Purple', [2, 1, 0], 2, 'Sever', 'MR Lunagaron'),
  wp('ls_kamura_mr', 'Fine Kamura Heirloom', 'Long Sword', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Kamura Upgrade'),
  wp('ls_royal_order', "Royal Order's Claymore", 'Long Sword', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order'),
  wp('ls_malzeno', "Duke's Long Sword", 'Long Sword', 10, 'Story MR', 5, 0, 320, 'Dragon', 32, 0, 0, 'Purple', [4, 0, 0], 2, 'Sever', 'MR 5 Malzeno'),
  wp('ls_zinogre', "Despot's Boltbreaker+", 'Long Sword', 10, 'Story MR', 6, 0, 320, 'Thunder', 42, 0, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Zinogre'),
  wp('ls_mizutsune', 'Tamanowo-no-Onna', 'Long Sword', 10, 'Story MR', 6, 0, 310, 'Water', 44, 15, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Mizutsune', 'Purple', 2),
  wp('ls_lucent_narga', 'Abyssal Shredder', 'Long Sword', 10, 'MR 10+', 10, 0, 330, 'Poison', 34, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'Lucent Nargacuga'),
  wp('ls_flaming_espinas', 'Kakuserosen', 'Long Sword', 10, 'MR 10+', 10, 0, 330, 'Fire', 55, 15, 0, 'Purple', [3, 1, 0], 2, 'Sever', 'MR 10 Flaming Espinas'),
  wp('ls_violet_mizu', 'Dazzling Scythe', 'Long Sword', 10, 'MR 10+', 10, 0, 320, 'Fire', 38, 10, 0, 'Purple', [2, 2, 2], 3, 'Sever', 'Violet Mizutsune'),
  wp('ls_velkhana', 'Reverent Frostblade', 'Long Sword', 10, 'MR 10+', 10, 0, 320, 'Ice', 50, 0, 0, 'Purple', [4, 2, 0], 3, 'Sever', 'Velkhana Urgent Quest'),
  wp('ls_gold_rathian', 'Wyvern Blade "Luna"', 'Long Sword', 10, 'MR 10+', 70, 0, 320, 'Poison', 41, 10, 0, 'White', [4, 1, 0], 2, 'Sever', 'MR 70 Gold Rathian', 'Purple', 2),
  wp('ls_scorned_magnamalo', "Karma's Edge", 'Long Sword', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'MR 100 Scorned Magnamalo'),
  wp('ls_chaotic_gore', 'Finality of the Fallen', 'Long Sword', 10, 'Endgame AR', 10, 50, 330, 'Dragon', 34, 25, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'Chaotic Gore Magala Urgent Quest'),
  wp('ls_amatsu', 'Abyssal Gale Long Sword', 'Long Sword', 10, 'Endgame AR', 10, 50, 350, 'Water', 38, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('ls_primordial', 'Silver Slicing Scythe', 'Long Sword', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 46, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno Urgent Quest'),

  // ==========================================
  // 3. SWORD & SHIELD
  // ==========================================
  wp('sns_hininja_hr', 'Hi Ninja Sword', 'Sword & Shield', 7, 'HR', 0, 0, 200, 'None', 0, 100, 0, 'Blue', [1, 1, 1], 1, 'Sever', 'High Rank Ninja Tree'),
  wp('sns_royal_order', "Royal Order's Sword+", 'Sword & Shield', 10, 'Early MR', 3, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order'),
  wp('sns_wroggi_mr', 'Dirty Graf+', 'Sword & Shield', 9, 'Early MR', 2, 0, 300, 'Poison', 40, 0, 0, 'White', [4, 1, 0], 2, 'Sever', 'MR Great Wroggi', 'Purple', 2),
  wp('sns_mizutsune', 'Kurenawi Ougi+', 'Sword & Shield', 10, 'Story MR', 6, 0, 310, 'Water', 48, 15, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Mizutsune', 'Purple', 2),
  wp('sns_zinogre', "Despot's Crookbolt+", 'Sword & Shield', 10, 'Story MR', 6, 0, 320, 'Thunder', 46, 0, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Zinogre'),
  wp('sns_kushala', "Daora's Razor", 'Sword & Shield', 10, 'Story MR', 6, 0, 310, 'Ice', 48, 10, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR Kushala Daora', 'Purple', 2),
  wp('sns_teostra', "Teostra's Emblem", 'Sword & Shield', 10, 'Story MR', 6, 0, 320, 'Blast', 44, 0, 0, 'Purple', [2, 1, 0], 2, 'Sever', 'MR Teostra'),
  wp('sns_valstrax', 'Crimson Heart', 'Sword & Shield', 10, 'MR 10+', 70, 0, 320, 'Dragon', 60, 0, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR 70 Crimson Glow Valstrax'),
  wp('sns_gold_rathian', 'Lunatic Briar', 'Sword & Shield', 10, 'MR 10+', 70, 0, 320, 'Poison', 48, 10, 0, 'White', [4, 1, 0], 2, 'Sever', 'MR 70 Gold Rathian', 'Purple', 2),
  wp('sns_lucent_narga', 'Midnight Edge', 'Sword & Shield', 10, 'MR 10+', 10, 0, 330, 'Poison', 34, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'Lucent Nargacuga'),
  wp('sns_flaming_espinas', 'Kaktusmesser', 'Sword & Shield', 10, 'MR 10+', 10, 0, 330, 'Fire', 48, 15, 0, 'Purple', [4, 1, 0], 2, 'Sever', 'MR 10 Flaming Espinas'),
  wp('sns_violet_mizu', 'Vicious Blade', 'Sword & Shield', 10, 'MR 10+', 10, 0, 320, 'Fire', 42, 10, 0, 'Purple', [2, 2, 2], 3, 'Sever', 'Violet Mizutsune'),
  wp('sns_velkhana', 'Avarice Iceblade', 'Sword & Shield', 10, 'MR 10+', 10, 0, 320, 'Ice', 56, 0, 0, 'Purple', [4, 2, 0], 3, 'Sever', 'Velkhana Urgent Quest'),
  wp('sns_scorned_magnamalo', 'Tormented Soul Edge', 'Sword & Shield', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'MR 100 Scorned Magnamalo'),
  wp('sns_amatsu', 'Abyssal Gale Sword', 'Sword & Shield', 10, 'Endgame AR', 10, 50, 350, 'Water', 44, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('sns_primordial', 'Radiant Sword', 'Sword & Shield', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 48, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno'),

  // ==========================================
  // 4. DUAL BLADES
  // ==========================================
  wp('db_nargacuga_hr', 'Night Wings', 'Dual Blades', 7, 'HR', 0, 0, 170, 'None', 0, 40, 0, 'White', [2, 0, 0], 1, 'Sever', 'High Rank Nargacuga'),
  wp('db_mud_almudron_mr', 'Mud Ripper+', 'Dual Blades', 9, 'Early MR', 4, 0, 290, 'Water', 58, 0, 0, 'White', [2, 2, 0], 2, 'Sever', 'MR Almudron', 'Purple', 1),
  wp('db_magma_almudron', 'Magma Shredders', 'Dual Blades', 10, 'Story MR', 6, 0, 300, 'Fire', 60, 0, 0, 'White', [2, 2, 0], 3, 'Sever', 'MR Magma Almudron', 'Purple', 1),
  wp('db_narwa', 'Twin Thunderblades', 'Dual Blades', 10, 'MR 10+', 30, 0, 310, 'Thunder', 66, 0, 0, 'White', [0, 0, 0], 2, 'Sever', 'MR 30 Narwa the Allmother', 'Purple', 3),
  wp('db_zinogre', "Despot's Blitz+", 'Dual Blades', 10, 'Story MR', 6, 0, 310, 'Thunder', 52, 0, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Zinogre'),
  wp('db_valstrax', 'Crimson Twinblades', 'Dual Blades', 10, 'MR 10+', 70, 0, 310, 'Dragon', 68, 0, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR 70 Crimson Glow Valstrax'),
  wp('db_chameleos', 'Chameleos Twin Blades', 'Dual Blades', 10, 'Story MR', 6, 0, 320, 'Poison', 42, 0, 0, 'White', [3, 1, 0], 2, 'Sever', 'MR Chameleos', 'Purple', 2),
  wp('db_silver_rathalos', 'Silver Wyvern Blades', 'Dual Blades', 10, 'Endgame AR', 10, 30, 300, 'Fire', 64, 35, 0, 'Purple', [2, 1, 0], 2, 'Sever', 'Silver Rathalos'),
  wp('db_kushala', 'Daora Twin Ice', 'Dual Blades', 10, 'Endgame AR', 10, 40, 300, 'Ice', 62, 10, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR Kushala Daora', 'Purple', 2),
  wp('db_lagombi_mr', 'Snow Sisters+', 'Dual Blades', 9, 'Early MR', 2, 0, 290, 'Ice', 56, 0, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Lagombi', 'Purple', 2),
  wp('db_flaming_espinas', 'Kaktuszwillinge', 'Dual Blades', 10, 'MR 10+', 10, 0, 310, 'Fire', 52, 15, 0, 'Purple', [3, 1, 0], 2, 'Sever', 'Flaming Espinas'),
  wp('db_chaotic_gore', 'Shangri-La / Hades', 'Dual Blades', 10, 'Endgame AR', 10, 50, 320, 'Dragon', 42, 25, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'Chaotic Gore Magala'),
  wp('db_amatsu', 'Abyssal Gale Twinblades', 'Dual Blades', 10, 'Endgame AR', 10, 50, 330, 'Water', 56, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('db_primordial', 'Primordial Twin Blades', 'Dual Blades', 10, 'Endgame AR', 10, 80, 310, 'Dragon', 56, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno'),

  // ==========================================
  // 5. LANCE
  // ==========================================
  wp('lance_diablos_hr', 'Diablos Lance', 'Lance', 7, 'HR', 0, 0, 230, 'None', 0, -25, 20, 'Blue', [0, 0, 0], 1, 'Sever', 'High Rank Diablos'),
  wp('lance_hermitaur_mr', 'Great Shogun Lance+', 'Lance', 9, 'Early MR', 1, 0, 310, 'None', 0, 0, 40, 'White', [3, 2, 0], 2, 'Sever', 'MR Daimyo Hermitaur', 'Purple', 2),
  wp('lance_royal_order', "Royal Order's Spear+", 'Lance', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order'),
  wp('lance_kushala', "Daora's Fang+", 'Lance', 10, 'Story MR', 6, 0, 310, 'Ice', 50, 10, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR Kushala Daora', 'Purple', 2),
  wp('lance_velkhana', 'Immaculate Ice Lance', 'Lance', 10, 'MR 10+', 10, 0, 320, 'Ice', 58, 0, 0, 'Purple', [4, 2, 0], 3, 'Sever', 'Velkhana Urgent Quest'),
  wp('lance_mizutsune', "Harbinger's Spear", 'Lance', 10, 'Story MR', 6, 0, 310, 'Water', 50, 15, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Mizutsune', 'Purple', 2),
  wp('lance_astalo', 'Astalos Bolt Lance', 'Lance', 10, 'Story MR', 5, 0, 310, 'Thunder', 54, 15, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Astalos'),
  wp('lance_flaming_espinas', 'Kaktuslanze', 'Lance', 10, 'MR 10+', 10, 0, 330, 'Fire', 52, 15, 0, 'Purple', [4, 0, 0], 2, 'Sever', 'MR 10 Flaming Espinas'),
  wp('lance_silver_rathalos', 'Silver Prominence', 'Lance', 10, 'MR 10+', 10, 0, 320, 'Fire', 56, 35, 0, 'Purple', [2, 1, 0], 2, 'Sever', 'Silver Rathalos'),
  wp('lance_lucent_narga', 'Midnight Lance', 'Lance', 10, 'MR 10+', 10, 0, 330, 'Poison', 36, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'Lucent Nargacuga'),
  wp('lance_valstrax', 'Crimson Lance', 'Lance', 10, 'MR 10+', 70, 0, 320, 'Dragon', 62, 0, 0, 'White', [2, 0, 0], 3, 'Sever', 'Crimson Glow Valstrax'),
  wp('lance_amatsu', 'Abyssal Gale Lance', 'Lance', 10, 'Endgame AR', 10, 50, 350, 'Water', 48, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('lance_primordial', 'Sovereign Lance', 'Lance', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 50, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno'),

  // ==========================================
  // 6. GUNLANCE
  // ==========================================
  wp('gl_cornpopper_hr', 'Mighty Cornpopper', 'Gunlance', 7, 'HR', 0, 0, 190, 'None', 0, 0, 0, 'Blue', [3, 1, 0], 1, 'Sever', 'High Rank Cornpopper'),
  wp('gl_rakna_mr', 'Torci da Lavater+', 'Gunlance', 10, 'Story MR', 5, 0, 310, 'Fire', 38, 25, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'MR Rakna-Kadaki (Normal Lv8)'),
  wp('gl_kamura', 'Fine Kamura Gunlance', 'Gunlance', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Kamura Upgrade'),
  wp('gl_gold_rathian', 'Ortlinde+', 'Gunlance', 10, 'MR 10+', 70, 0, 320, 'Poison', 44, 10, 0, 'White', [4, 1, 0], 2, 'Sever', 'MR 70 Gold Rathian (Normal Lv8)', 'Purple', 2),
  wp('gl_malzeno', "Duke's Gunlance", 'Gunlance', 10, 'Story MR', 5, 0, 320, 'Dragon', 36, 0, 0, 'Purple', [4, 0, 0], 2, 'Sever', 'MR Malzeno (Long Lv8)'),
  wp('gl_gaismagorm', 'Abyssal Gunlance', 'Gunlance', 10, 'Story MR', 6, 0, 350, 'Dragon', 26, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Gaismagorm (Wide Lv8)'),
  wp('gl_cornpopper_mr', 'Mighty Cornpopper+', 'Gunlance', 10, 'Early MR', 2, 0, 310, 'None', 0, 0, 0, 'White', [3, 2, 0], 2, 'Sever', 'MR Cornpopper (Wide Lv8)'),
  wp('gl_chaotic_gore', 'Feral Gunlance', 'Gunlance', 10, 'Endgame AR', 10, 50, 330, 'Dragon', 36, 25, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'Chaotic Gore Magala (Long Lv8)'),
  wp('gl_bazeldgeuse', 'Bazelgeuse Buster+', 'Gunlance', 10, 'MR 10+', 10, 0, 340, 'Blast', 35, -10, 0, 'Purple', [3, 1, 0], 3, 'Sever', 'Seething Bazelgeuse (Wide Lv8)'),
  wp('gl_scorned_magnamalo', 'Tormented Gunlance', 'Gunlance', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'Scorned Magnamalo (Long Lv8)'),
  wp('gl_amatsu', 'Raging Tempest Gunlance', 'Gunlance', 10, 'Endgame AR', 10, 50, 350, 'Water', 40, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu (Lv8 Normal Shelling)'),
  wp('gl_primordial', 'Primordial Gunlance', 'Gunlance', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 46, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno (Long Lv8)'),

  // ==========================================
  // 7. HAMMER
  // ==========================================
  wp('ham_nargacuga_hr', 'Night Eternal', 'Hammer', 7, 'HR', 0, 0, 180, 'None', 0, 45, 0, 'White', [2, 0, 0], 1, 'Blunt', 'High Rank Nargacuga'),
  wp('ham_garangolm_mr', 'Golm Hammer+', 'Hammer', 9, 'Early MR', 4, 0, 330, 'None', 0, 0, 30, 'Blue', [4, 2, 0], 2, 'Blunt', 'MR Garangolm', 'White', 2),
  wp('ham_royal_order', "Royal Order's Hammer+", 'Hammer', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Blunt', 'Follower Survey Royal Order'),
  wp('ham_kamura', 'Fine Kamura Hammer', 'Hammer', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Blunt', 'MR 10 Kamura Upgrade'),
  wp('ham_flaming_espinas', 'Kaktushammer', 'Hammer', 10, 'MR 10+', 10, 0, 330, 'Fire', 52, 15, 0, 'Purple', [3, 1, 0], 2, 'Blunt', 'Flaming Espinas'),
  wp('ham_rakna', 'Pyre Hammer', 'Hammer', 10, 'MR 10+', 10, 0, 320, 'Fire', 56, 20, 0, 'White', [3, 2, 0], 3, 'Blunt', 'Pyre Rakna-Kadaki'),
  wp('ham_mizutsune', 'Ame-no-Uzume+', 'Hammer', 10, 'Story MR', 6, 0, 310, 'Water', 54, 15, 0, 'White', [2, 1, 0], 2, 'Blunt', 'MR Mizutsune', 'Purple', 2),
  wp('ham_narwa', 'Thunderlord Hammer', 'Hammer', 10, 'MR 10+', 30, 0, 320, 'Thunder', 60, 0, 0, 'White', [0, 0, 0], 2, 'Blunt', 'Narwa the Allmother', 'Purple', 3),
  wp('ham_aurora_somna', 'Aurora Ice Hammer', 'Hammer', 10, 'Story MR', 4, 0, 310, 'Ice', 64, 0, 0, 'White', [2, 1, 0], 3, 'Blunt', 'MR Aurora Somnacanth'),
  wp('ham_velkhana', 'Glacial Hammer', 'Hammer', 10, 'MR 10+', 10, 0, 320, 'Ice', 58, 0, 0, 'Purple', [4, 2, 0], 3, 'Blunt', 'Velkhana Urgent Quest'),
  wp('ham_valstrax', 'Crimson Crusher', 'Hammer', 10, 'Endgame AR', 70, 0, 320, 'Dragon', 66, 0, 0, 'White', [2, 0, 0], 3, 'Blunt', 'MR 70 Crimson Glow Valstrax'),
  wp('ham_scorned', 'Doomed Soul Hammer', 'Hammer', 10, 'MR 10+', 100, 0, 340, 'Blast', 34, 0, 0, 'Purple', [3, 2, 0], 2, 'Blunt', 'MR 100 Scorned Magnamalo'),
  wp('ham_amatsu', 'Abyssal Gale Hammer', 'Hammer', 10, 'Endgame AR', 10, 50, 350, 'Water', 48, -20, 0, 'Purple', [0, 0, 0], 3, 'Blunt', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('ham_primordial', 'Primordial Hammer', 'Hammer', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 52, 0, 0, 'Purple', [4, 4, 4], 3, 'Blunt', 'Primordial Malzeno'),

  // ==========================================
  // 8. HUNTING HORN
  // ==========================================
  wp('hh_rampage_hr', 'Rampage Agitato', 'Hunting Horn', 7, 'HR', 0, 0, 210, 'None', 0, 0, 0, 'Blue', [0, 0, 0], 1, 'Blunt', 'High Rank Rampage'),
  wp('hh_kamura_mr', 'Fine Kamura Chorus', 'Hunting Horn', 10, 'Story MR', 10, 0, 320, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Blunt', 'MR 10 Kamura Tree (Atk Up + Heal)'),
  wp('hh_malzeno', "Duke's Horn", 'Hunting Horn', 10, 'Story MR', 5, 0, 320, 'Dragon', 38, 0, 0, 'Purple', [4, 0, 0], 2, 'Blunt', 'MR Malzeno (Sharpness Regen)'),
  wp('hh_flaming_espinas', 'Kaktusflute', 'Hunting Horn', 10, 'MR 10+', 10, 0, 330, 'Fire', 56, 15, 0, 'Purple', [3, 1, 0], 2, 'Blunt', 'Flaming Espinas (Fire Elem)'),
  wp('hh_narwa', 'Allmother Thunder Horn', 'Hunting Horn', 10, 'MR 10+', 30, 0, 320, 'Thunder', 68, 0, 0, 'White', [0, 0, 0], 2, 'Blunt', 'Narwa the Allmother', 'Purple', 3),
  wp('hh_aurora_somna', 'Frost Song Horn', 'Hunting Horn', 10, 'Story MR', 4, 0, 310, 'Ice', 66, 0, 0, 'White', [2, 1, 0], 3, 'Blunt', 'Aurora Somnacanth'),
  wp('hh_velkhana', 'Serene Frost Horn', 'Hunting Horn', 10, 'MR 10+', 10, 0, 320, 'Ice', 58, 0, 0, 'Purple', [4, 2, 0], 3, 'Blunt', 'Velkhana Urgent Quest'),
  wp('hh_valstrax', 'Crimson Horn', 'Hunting Horn', 10, 'MR 10+', 70, 0, 320, 'Dragon', 68, 0, 0, 'White', [2, 0, 0], 3, 'Blunt', 'Crimson Glow Valstrax'),
  wp('hh_scorned', 'Tormented Soul Horn', 'Hunting Horn', 10, 'MR 10+', 100, 0, 340, 'Blast', 34, 0, 0, 'Purple', [3, 2, 0], 2, 'Blunt', 'MR 100 Scorned Magnamalo'),
  wp('hh_amatsu', 'Gale Horn of the Heavens', 'Hunting Horn', 10, 'Endgame AR', 10, 50, 350, 'Water', 44, -20, 0, 'Purple', [0, 0, 0], 3, 'Blunt', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('hh_primordial', 'Primordial Horn', 'Hunting Horn', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 54, 0, 0, 'Purple', [4, 4, 4], 3, 'Blunt', 'Primordial Malzeno'),

  // ==========================================
  // 9. SWITCH AXE
  // ==========================================
  wp('sa_nargacuga_hr', "Night's Crescent", 'Switch Axe', 7, 'HR', 0, 0, 180, 'Poison', 24, 40, 0, 'White', [2, 0, 0], 1, 'Sever', 'High Rank Nargacuga'),
  wp('sa_ore_mr', 'Grand Chaos+', 'Switch Axe', 9, 'Early MR', 1, 0, 310, 'None', 0, 0, 0, 'White', [3, 1, 0], 2, 'Sever', 'MR Ore Tree (Power Phial)'),
  wp('sa_almudron', 'Maelstrom Switch Axe', 'Switch Axe', 10, 'Story MR', 6, 0, 310, 'Fire', 64, 0, 0, 'White', [2, 2, 0], 3, 'Sever', 'MR Magma Almudron (Element Phial)', 'Purple', 1),
  wp('sa_mud_almudron', 'Almudron Water Axe', 'Switch Axe', 10, 'Story MR', 4, 0, 310, 'Water', 60, 0, 0, 'White', [2, 2, 0], 3, 'Sever', 'MR Almudron (Element Phial)', 'Purple', 1),
  wp('sa_narwa', 'Thunderstorm Switch Axe', 'Switch Axe', 10, 'MR 10+', 30, 0, 310, 'Thunder', 68, 0, 0, 'White', [0, 0, 0], 2, 'Sever', 'Narwa the Allmother (Element Phial)', 'Purple', 3),
  wp('sa_lagombi_mr', 'Snowflake Switch Axe', 'Switch Axe', 9, 'Early MR', 2, 0, 300, 'Ice', 60, 0, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Lagombi (Element Phial)'),
  wp('sa_kushala', "Daora's Janah+", 'Switch Axe', 10, 'Story MR', 6, 0, 310, 'Ice', 54, 15, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR Kushala Daora (Element Phial)', 'Purple', 2),
  wp('sa_valstrax', 'Crimson Switch Axe', 'Switch Axe', 10, 'MR 10+', 70, 0, 320, 'Dragon', 66, 0, 0, 'White', [2, 0, 0], 3, 'Sever', 'Crimson Glow Valstrax (Element Phial)'),
  wp('sa_death_stench', 'Death Stench Axe+', 'Switch Axe', 10, 'Story MR', 6, 0, 310, 'Dragon', 58, 0, 0, 'Purple', [3, 1, 0], 3, 'Sever', 'MR Meowcenaries (Element Phial)'),
  wp('sa_flaming_espinas', 'Kaktusbeil', 'Switch Axe', 10, 'MR 10+', 10, 0, 330, 'Fire', 48, 15, 0, 'Purple', [3, 1, 0], 2, 'Sever', 'Flaming Espinas (Power Phial)'),
  wp('sa_scorned_magnamalo', 'Cursed Axe', 'Switch Axe', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'Scorned Magnamalo (Power Phial)'),
  wp('sa_reconqueress', 'Reconqueress+', 'Switch Axe', 10, 'Story MR', 6, 0, 340, 'None', 0, 0, 0, 'White', [3, 1, 0], 2, 'Sever', 'MR Exhaust Phial Switch Axe', 'Purple', 2),
  wp('sa_amatsu', 'Abyssal Gale Switch Axe', 'Switch Axe', 10, 'Endgame AR', 10, 50, 350, 'Water', 48, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('sa_primordial', 'Phantasmal Switch Axe', 'Switch Axe', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 48, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno'),

  // ==========================================
  // 10. CHARGE BLADE
  // ==========================================
  wp('cb_rajang_hr', 'Rajang Charge Blade', 'Charge Blade', 7, 'HR', 0, 0, 230, 'Thunder', 24, -15, 0, 'Green', [0, 0, 0], 1, 'Sever', 'High Rank Rajang'),
  wp('cb_kamura_mr', 'Fine Kamura C. Blade', 'Charge Blade', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Kamura (Impact Phial)'),
  wp('cb_rakna', 'Crimson Veil Charge Blade', 'Charge Blade', 10, 'MR 10+', 10, 0, 320, 'Fire', 68, 25, 0, 'White', [3, 1, 0], 3, 'Sever', 'MR Pyre Rakna-Kadaki (Element Phial)', 'Purple', 2),
  wp('cb_fish_mr', 'Vaik Charge Blade+', 'Charge Blade', 9, 'Early MR', 2, 0, 310, 'Water', 64, 0, 0, 'White', [3, 1, 0], 2, 'Sever', 'MR Vaik Water (Element Phial)'),
  wp('cb_narwa', 'Narwa Thunder CB', 'Charge Blade', 10, 'MR 10+', 30, 0, 310, 'Thunder', 66, 0, 0, 'White', [0, 0, 0], 2, 'Sever', 'Narwa the Allmother (Element Phial)', 'Purple', 3),
  wp('cb_auroracanth', 'Rimefrost Charge Blade', 'Charge Blade', 10, 'Story MR', 6, 0, 310, 'Ice', 74, 0, 0, 'White', [2, 1, 0], 3, 'Sever', 'MR Aurora Somnacanth (Element Phial)'),
  wp('cb_valstrax', 'Crimson Charge Blade', 'Charge Blade', 10, 'MR 10+', 70, 0, 320, 'Dragon', 68, 0, 0, 'White', [2, 0, 0], 3, 'Sever', 'Crimson Glow Valstrax (Element Phial)'),
  wp('cb_gaismagorm', 'Abyssal Charge Blade', 'Charge Blade', 10, 'Story MR', 6, 0, 350, 'Dragon', 28, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Gaismagorm (Impact Phial)'),
  wp('cb_gold_rathian', 'Luna Eostre', 'Charge Blade', 10, 'MR 10+', 70, 0, 320, 'Poison', 44, 10, 0, 'White', [4, 1, 0], 2, 'Sever', 'Gold Rathian (Impact Phial)', 'Purple', 2),
  wp('cb_scorned_magnamalo', 'Tormented Charge Blade', 'Charge Blade', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'Scorned Magnamalo (Impact Phial)'),
  wp('cb_amatsu', 'Abyssal Gale Charge Blade', 'Charge Blade', 10, 'Endgame AR', 10, 50, 350, 'Water', 48, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu (Impact Phial)'),
  wp('cb_primordial', 'Primordial Charge Blade', 'Charge Blade', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 50, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno (Impact Phial)'),

  // ==========================================
  // 11. INSECT GLAIVE
  // ==========================================
  wp('ig_nargacuga_hr', 'Evening Calm', 'Insect Glaive', 7, 'HR', 0, 0, 180, 'None', 0, 40, 0, 'White', [2, 0, 0], 1, 'Sever', 'High Rank Nargacuga'),
  wp('ig_kamura_mr', 'Fine Kamura Glaive', 'Insect Glaive', 10, 'Story MR', 10, 0, 330, 'None', 0, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'MR 10 Kamura Tree'),
  wp('ig_gore', 'Stahlfaktum+', 'Insect Glaive', 10, 'Story MR', 6, 0, 320, 'Dragon', 35, 20, 0, 'White', [2, 0, 0], 2, 'Sever', 'MR Gore Magala', 'Purple', 2),
  wp('ig_flaming_espinas', 'Kaktusglefe', 'Insect Glaive', 10, 'MR 10+', 10, 0, 330, 'Fire', 50, 15, 0, 'Purple', [3, 1, 0], 2, 'Sever', 'Flaming Espinas'),
  wp('ig_silver_rathalos', 'Silver Wyvern Glaive', 'Insect Glaive', 10, 'MR 10+', 10, 0, 320, 'Fire', 52, 35, 0, 'Purple', [2, 1, 0], 2, 'Sever', 'Silver Rathalos'),
  wp('ig_mizutsune', 'Ame-no-Wohakari', 'Insect Glaive', 10, 'Story MR', 6, 0, 310, 'Water', 50, 15, 0, 'White', [2, 1, 0], 2, 'Sever', 'MR Mizutsune', 'Purple', 2),
  wp('ig_zinogre', "Despot's Bolt Glaive", 'Insect Glaive', 10, 'Story MR', 6, 0, 320, 'Thunder', 48, 0, 0, 'Purple', [2, 0, 0], 2, 'Sever', 'MR Zinogre'),
  wp('ig_kushala', "Daora's Samudra+", 'Insect Glaive', 10, 'Story MR', 6, 0, 310, 'Ice', 52, 10, 0, 'White', [2, 0, 0], 3, 'Sever', 'MR Kushala Daora', 'Purple', 2),
  wp('ig_lucent_narga', 'Midnight Glaive', 'Insect Glaive', 10, 'MR 10+', 10, 0, 330, 'Poison', 34, 0, 0, 'Purple', [4, 2, 0], 2, 'Sever', 'Lucent Nargacuga'),
  wp('ig_scorned_magnamalo', 'Tormented Glaive', 'Insect Glaive', 10, 'MR 10+', 100, 0, 340, 'Blast', 32, 0, 0, 'Purple', [3, 2, 0], 2, 'Sever', 'Scorned Magnamalo'),
  wp('ig_amatsu', 'Abyssal Gale Glaive', 'Insect Glaive', 10, 'Endgame AR', 10, 50, 350, 'Water', 44, -20, 0, 'Purple', [0, 0, 0], 3, 'Sever', 'Amatsu Urgent Quest + Silkbind +10%'),
  wp('ig_primordial', 'Regal Wing Glaive', 'Insect Glaive', 10, 'Endgame AR', 10, 80, 320, 'Dragon', 44, 0, 0, 'Purple', [4, 4, 4], 3, 'Sever', 'Primordial Malzeno'),

  // ==========================================
  // 12. LIGHT BOWGUN
  // ==========================================
  wp('lbg_nargacuga_hr', 'Night Owl', 'Light Bowgun', 7, 'HR', 0, 0, 180, 'None', 0, 40, 0, 'White', [2, 0, 0], 1, 'Shot', 'High Rank Nargacuga (RF Pierce 2)'),
  wp('lbg_royal_order', "Royal Order's Crossbow+", 'Light Bowgun', 10, 'Early MR', 3, 0, 320, 'None', 0, 10, 50, 'White', [2, 1, 0], 2, 'Shot', 'Royal Order (RF Pierce 2)'),
  wp('lbg_malzeno', 'Silver Duke LBG', 'Light Bowgun', 10, 'Story MR', 6, 0, 340, 'None', 0, 0, 0, 'White', [2, 0, 0], 2, 'Shot', 'MR Malzeno (Rapid Pierce 2)'),
  wp('lbg_gaismagorm', 'Abyssal Hailstorm', 'Light Bowgun', 10, 'Story MR', 6, 0, 360, 'None', 0, -20, 0, 'White', [0, 0, 0], 3, 'Shot', 'Gaismagorm (Spread 3 / Shrapnel)'),
  wp('lbg_silver_rathalos', 'Silver Rathalos LBG', 'Light Bowgun', 10, 'MR 10+', 10, 0, 330, 'Fire', 40, 35, 0, 'White', [2, 1, 0], 2, 'Shot', 'Silver Rathalos (RF Piercing Fire)'),
  wp('lbg_violet_mizu', 'Dazzling LBG', 'Light Bowgun', 10, 'MR 10+', 10, 0, 330, 'Fire', 38, 10, 0, 'White', [2, 2, 2], 3, 'Shot', 'Violet Mizutsune (Pierce 2 / Fire)'),
  wp('lbg_daimyo_mr', 'Hermitaur Cannon+', 'Light Bowgun', 9, 'Early MR', 2, 0, 310, 'Water', 36, 0, 30, 'White', [3, 1, 0], 2, 'Shot', 'Daimyo Hermitaur (RF Piercing Water)'),
  wp('lbg_khezu_mr', 'Khezu Syringe+', 'Light Bowgun', 9, 'Early MR', 2, 0, 310, 'Thunder', 38, 0, 0, 'White', [3, 1, 0], 2, 'Shot', 'MR Khezu (RF Piercing Thunder)'),
  wp('lbg_lunagaron', 'Lunagaron Ice LBG', 'Light Bowgun', 10, 'Story MR', 4, 0, 320, 'Ice', 42, 0, 0, 'White', [2, 1, 0], 2, 'Shot', 'MR Lunagaron (RF Piercing Ice)'),
  wp('lbg_chaotic_gore', 'Wicked LBG', 'Light Bowgun', 10, 'Endgame AR', 10, 50, 350, 'None', 0, 25, 0, 'White', [2, 0, 0], 2, 'Shot', 'Chaotic Gore Magala (Pierce 2/3)'),
  wp('lbg_amatsu', 'Abyssal Gale LBG', 'Light Bowgun', 10, 'Endgame AR', 10, 50, 360, 'Water', 44, -20, 0, 'White', [0, 0, 0], 3, 'Shot', 'Amatsu (RF Water / Pierce)'),
  wp('lbg_primordial', 'Vigilant Crossbow', 'Light Bowgun', 10, 'Endgame AR', 10, 80, 330, 'None', 0, 0, 0, 'White', [4, 4, 4], 3, 'Shot', 'Primordial Malzeno (Rapid Pierce 2)'),

  // ==========================================
  // 13. HEAVY BOWGUN
  // ==========================================
  wp('hbg_zinogre_hr', "Despot's Paroxysm", 'Heavy Bowgun', 7, 'HR', 0, 0, 210, 'None', 0, 10, 0, 'White', [1, 0, 0], 1, 'Shot', 'High Rank Zinogre (Spread 3)'),
  wp('hbg_garangolm_mr', 'Golm Heavy Cannon+', 'Heavy Bowgun', 9, 'Early MR', 4, 0, 340, 'None', 0, 0, 30, 'White', [4, 2, 0], 2, 'Shot', 'MR Garangolm (Spread 3 / Sticky)'),
  wp('hbg_gaismagorm', 'Abyssal Tremor HBG', 'Heavy Bowgun', 10, 'Story MR', 6, 0, 370, 'None', 0, -20, 0, 'White', [0, 0, 0], 3, 'Shot', 'Gaismagorm (Spread 3)'),
  wp('hbg_rakna', 'Pyre Spider Cannon', 'Heavy Bowgun', 10, 'MR 10+', 10, 0, 330, 'Fire', 44, 25, 0, 'White', [3, 1, 0], 3, 'Shot', 'Pyre Rakna-Kadaki (Piercing Fire)'),
  wp('hbg_mizutsune', 'Foxfire Heavy Cannon', 'Heavy Bowgun', 10, 'Story MR', 6, 0, 320, 'Water', 44, 15, 0, 'White', [2, 1, 0], 2, 'Shot', 'MR Mizutsune (Piercing Water)'),
  wp('hbg_narwa', 'Allmother Thunder HBG', 'Heavy Bowgun', 10, 'MR 10+', 30, 0, 330, 'Thunder', 46, 0, 0, 'White', [0, 0, 0], 2, 'Shot', 'Narwa the Allmother (Piercing Thunder)'),
  wp('hbg_aurora_somna', 'Aurora Frost Cannon', 'Heavy Bowgun', 10, 'Story MR', 4, 0, 320, 'Ice', 48, 0, 0, 'White', [2, 1, 0], 3, 'Shot', 'Aurora Somnacanth (Piercing Ice)'),
  wp('hbg_seething_bazel', 'Bazelgeuse Heavy Mortar', 'Heavy Bowgun', 10, 'MR 10+', 10, 0, 360, 'None', 0, -10, 0, 'White', [3, 1, 0], 3, 'Shot', 'Seething Bazelgeuse (Sticky / Cluster)'),
  wp('hbg_chaotic_gore', 'Despot Chaos Cannon', 'Heavy Bowgun', 10, 'Endgame AR', 10, 50, 350, 'None', 0, 25, 0, 'White', [2, 0, 0], 3, 'Shot', 'Chaotic Gore Magala (Pierce/Spread 3)'),
  wp('hbg_amatsu', 'Abyssal Gale HBG', 'Heavy Bowgun', 10, 'Endgame AR', 10, 50, 360, 'Water', 46, -20, 0, 'White', [0, 0, 0], 3, 'Shot', 'Amatsu (Piercing Water / Pierce 3)'),
  wp('hbg_primordial', 'Primordial Heavy Crossbow', 'Heavy Bowgun', 10, 'Endgame AR', 10, 80, 340, 'None', 0, 0, 0, 'White', [4, 4, 4], 3, 'Shot', 'Primordial Malzeno (Crouch Pierce 3)'),

  // ==========================================
  // 14. BOW
  // ==========================================
  wp('bow_rampage_hr', 'Rampage Bow S', 'Bow', 7, 'HR', 0, 0, 200, 'None', 0, 0, 0, 'White', [0, 0, 0], 1, 'Shot', 'High Rank Rampage'),
  wp('bow_kamura_mr', 'Fine Kamura Bow', 'Bow', 10, 'Story MR', 10, 0, 320, 'None', 0, 0, 0, 'White', [4, 2, 0], 2, 'Shot', 'MR 10 Kamura Tree (Rapid)'),
  wp('bow_silver_rathalos', 'Hyperion', 'Bow', 10, 'MR 10+', 10, 20, 320, 'Fire', 54, 35, 0, 'White', [2, 1, 0], 2, 'Shot', 'Silver Rathalos (Fire Pierce/Rapid)'),
  wp('bow_flaming_espinas', 'Kaktusbogen', 'Bow', 10, 'MR 10+', 10, 0, 320, 'Fire', 50, 15, 0, 'White', [3, 1, 0], 2, 'Shot', 'Flaming Espinas (Fire Spread)'),
  wp('bow_hermitaur_mr', "Daimyo's Bow+", 'Bow', 9, 'Early MR', 2, 0, 310, 'Water', 48, 0, 30, 'White', [4, 1, 0], 2, 'Shot', 'MR Daimyo Hermitaur (Water Spread)'),
  wp('bow_mizutsune', "Heaven's Breath+", 'Bow', 10, 'Story MR', 6, 0, 310, 'Water', 48, 15, 0, 'White', [2, 1, 0], 2, 'Shot', 'MR Mizutsune (Water Pierce)'),
  wp('bow_khezu_mr', 'Khezu Bow+', 'Bow', 9, 'Early MR', 2, 0, 300, 'Thunder', 54, 0, 0, 'White', [3, 1, 0], 2, 'Shot', 'MR Khezu (Thunder Spread)'),
  wp('bow_narwa', 'Desire of Thunder', 'Bow', 10, 'MR 10+', 30, 0, 310, 'Thunder', 56, 0, 0, 'White', [0, 0, 0], 2, 'Shot', 'Narwa the Allmother (Thunder Rapid)'),
  wp('bow_lunagaron', 'Lunagaron Ice Bow', 'Bow', 10, 'Story MR', 4, 0, 310, 'Ice', 50, 0, 0, 'White', [2, 1, 0], 2, 'Shot', 'MR Lunagaron (Ice Rapid)'),
  wp('bow_kushala', "Heaven's Hail+", 'Bow', 10, 'Story MR', 6, 0, 300, 'Ice', 54, 10, 0, 'White', [2, 0, 0], 3, 'Shot', 'MR Kushala Daora (Ice Pierce)'),
  wp('bow_valstrax', 'Crimson Bow', 'Bow', 10, 'MR 10+', 70, 0, 310, 'Dragon', 58, 0, 0, 'White', [2, 0, 0], 3, 'Shot', 'Crimson Glow Valstrax (Dragon Pierce)'),
  wp('bow_chaotic_gore', 'Strife Bow of Chaos', 'Bow', 10, 'Endgame AR', 10, 50, 310, 'Dragon', 44, 25, 0, 'White', [2, 0, 0], 2, 'Shot', 'Chaotic Gore Magala (Berserk + Strife Meta)'),
  wp('bow_amatsu', 'Abyssal Gale Bow', 'Bow', 10, 'Endgame AR', 10, 50, 340, 'Water', 48, -20, 0, 'White', [0, 0, 0], 3, 'Shot', 'Amatsu (Water Rapid)'),
  wp('bow_primordial', 'Primordial Bow', 'Bow', 10, 'Endgame AR', 10, 80, 310, 'Dragon', 46, 0, 0, 'White', [4, 4, 4], 3, 'Shot', 'Primordial Malzeno (Dragon Rapid)'),

  // ==========================================
  // 15. PROGRESSION, KAMURA, DEFENDER & STORY TREES
  // ==========================================
  // Great Sword
  wp('gs_kamura_1', 'Kamura Cleaver I', 'Great Sword', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Great Sword'),
  wp('gs_kamura_2', 'Kamura Cleaver II', 'Great Sword', 1, 'HR', 0, 0, 60, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Kamura Great Sword II'),
  wp('gs_defender_1', 'Defender Great Sword I', 'Great Sword', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Great Sword'),
  wp('gs_izuchi_1', 'Izuchi Blade I', 'Great Sword', 1, 'HR', 0, 0, 70, 'None', 0, 10, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Great Izuchi Great Sword'),
  wp('gs_steel_sword', 'Steel Sword', 'Great Sword', 2, 'HR', 0, 0, 90, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Iron Ore Great Sword'),
  wp('gs_jawblade_1', 'Jawblade I', 'Great Sword', 1, 'HR', 0, 0, 80, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Bone Great Sword'),
  wp('gs_tetranadon_1', 'Tetranadon Edge I', 'Great Sword', 2, 'HR', 0, 0, 100, 'Water', 15, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Tetranadon Great Sword'),

  // Long Sword
  wp('ls_guardian_1', 'Guardian Sword I', 'Long Sword', 1, 'HR', 0, 0, 90, 'None', 0, 5, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Guild Starter Long Sword'),
  wp('ls_defender_1', 'Defender Long Sword I', 'Long Sword', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Long Sword'),
  wp('ls_wind_thief_1', 'Wind Thief Scimitar I', 'Long Sword', 1, 'HR', 0, 0, 80, 'None', 0, 10, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Great Izuchi Long Sword'),
  wp('ls_hand_me_down_1', 'Hand-Me-Down Sword I', 'Long Sword', 3, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Kamura Village Heirloom Long Sword'),
  wp('ls_iron_katana_1', 'Iron Katana I', 'Long Sword', 1, 'HR', 0, 0, 70, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Ore Tree Long Sword'),
  wp('ls_serrated_jaw_1', 'Serrated Jaw I', 'Long Sword', 1, 'HR', 0, 0, 80, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Bone Tree Long Sword'),
  wp('ls_bone_scythe_1', 'Bone Scythe I', 'Long Sword', 2, 'HR', 0, 0, 100, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Bone Scythe Long Sword'),
  wp('ls_cawscythe_1', 'Cawscythe I', 'Long Sword', 2, 'HR', 0, 0, 100, 'None', 0, 15, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Sinister Cloth Long Sword'),

  // Sword & Shield
  wp('sns_kamura_1', 'Kamura Sword I', 'Sword & Shield', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Sword & Shield'),
  wp('sns_defender_1', 'Defender Sword I', 'Sword & Shield', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Sword & Shield'),

  // Dual Blades
  wp('db_kamura_1', 'Kamura Glintblades I', 'Dual Blades', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Dual Blades'),
  wp('db_defender_1', 'Defender Dual Blades I', 'Dual Blades', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Dual Blades'),

  // Lance
  wp('lance_kamura_3', 'Kamura Spear III', 'Lance', 2, 'HR', 0, 0, 100, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Kamura Spear upgrade'),
  wp('lance_champion_2', 'Champion Lance II', 'Lance', 6, 'HR', 0, 0, 220, 'None', 0, 0, 0, 'Blue', [1, 0, 0], 1, 'Sever', 'High Rank Champion Lance'),
  wp('lance_aknosom_1', 'Aknosom Pike I', 'Lance', 2, 'HR', 0, 0, 90, 'Fire', 16, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Aknosom Lance'),
  wp('lance_hard_bone', 'Hard Bone Lance', 'Lance', 3, 'HR', 0, 0, 130, 'None', 0, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Bone Tree Lance'),
  wp('lance_paladin_1', 'Paladin Lance I', 'Lance', 3, 'HR', 0, 0, 120, 'None', 0, 0, 15, 'Green', [1, 0, 0], 0, 'Sever', 'Ore Tree Paladin Lance'),

  // Gunlance
  wp('gl_kamura_1', 'Kamura Gunlance I', 'Gunlance', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Gunlance'),
  wp('gl_kamura_5', 'Kamura Gunlance V', 'Gunlance', 4, 'HR', 0, 0, 160, 'None', 0, 0, 0, 'Blue', [1, 0, 0], 1, 'Sever', 'High Rank Kamura Gunlance'),
  wp('gl_kamura_warrior', 'Kamura Warrior Gunlance', 'Gunlance', 8, 'Early MR', 1, 0, 280, 'None', 0, 0, 0, 'White', [3, 1, 0], 2, 'Sever', 'Early Master Rank Kamura Gunlance'),
  wp('gl_defender_1', 'Defender Gunlance I', 'Gunlance', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Gunlance'),
  wp('gl_champion', 'Champion Gunlance', 'Gunlance', 6, 'HR', 0, 0, 220, 'None', 0, 0, 0, 'Blue', [1, 0, 0], 1, 'Sever', 'High Rank Champion Gunlance'),
  wp('gl_iron_1', 'Iron Gunlance I', 'Gunlance', 1, 'HR', 0, 0, 70, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Iron Ore Gunlance'),
  wp('gl_aknosom_1', 'Aknosom Gunlance I', 'Gunlance', 2, 'HR', 0, 0, 90, 'Fire', 18, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Aknosom Gunlance'),
  wp('gl_baggi_2', 'Baggi Gunlance II', 'Gunlance', 2, 'HR', 0, 0, 110, 'Sleep', 15, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Great Baggi Sleep Gunlance'),
  wp('gl_lagomberator_2', 'Lagomberator II', 'Gunlance', 2, 'HR', 0, 0, 110, 'Ice', 18, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Lagombi Ice Gunlance'),
  wp('gl_fiore_nulo_1', 'Fiore Nulo I', 'Gunlance', 2, 'HR', 0, 0, 100, 'None', 0, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Bnahabra Insect Gunlance'),
  wp('gl_ukiyo_1', 'Ukiyo no Yamiwo I', 'Gunlance', 3, 'HR', 0, 0, 130, 'Water', 20, 10, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Mizutsune Water Gunlance'),
  wp('gl_araknalance', 'Araknalance', 'Gunlance', 7, 'HR', 0, 0, 190, 'Fire', 22, 25, 0, 'White', [2, 1, 0], 1, 'Sever', 'HR Rakna-Kadaki Gunlance'),
  wp('gl_scarlet_lamplance', 'Scarlet Lamplance+', 'Gunlance', 9, 'Early MR', 4, 0, 310, 'Fire', 28, 30, 0, 'White', [3, 1, 0], 2, 'Sever', 'MR Rakna-Kadaki Gunlance', 'Purple', 2),
  wp('gl_royal_order', "Royal Order's Pledge", 'Gunlance', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order Gunlance'),

  // Hammer
  wp('ham_kamura_1', 'Kamura Hammer I', 'Hammer', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Blunt', 'Base Kamura Hammer'),
  wp('ham_defender_1', 'Defender Hammer I', 'Hammer', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Blunt', 'Defender progression Hammer'),

  // Hunting Horn
  wp('hh_kamura_1', 'Kamura Chorus I', 'Hunting Horn', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Blunt', 'Base Kamura Hunting Horn'),
  wp('hh_defender_1', 'Defender Horn I', 'Hunting Horn', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Blunt', 'Defender progression Hunting Horn'),
  wp('hh_fortissimo_plus', 'Fortissimo+', 'Hunting Horn', 4, 'HR', 0, 0, 160, 'None', 0, 0, 0, 'Blue', [1, 1, 0], 1, 'Blunt', 'Ore Tree Hunting Horn'),
  wp('hh_flammenkornett_plus', 'Forte Flammenkornett+', 'Hunting Horn', 8, 'Early MR', 3, 0, 310, 'Fire', 32, -15, 0, 'White', [2, 0, 0], 2, 'Blunt', 'MR Anjanath Hunting Horn'),

  // Switch Axe
  wp('sa_kamura_2', 'Kamura Iron Axe II', 'Switch Axe', 1, 'HR', 0, 0, 60, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Kamura Switch Axe II'),
  wp('sa_defender_1', 'Defender Switch Axe I', 'Switch Axe', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Switch Axe'),
  wp('sa_axenosom_2', 'Axenosom II', 'Switch Axe', 2, 'HR', 0, 0, 110, 'Fire', 18, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Aknosom Fire Switch Axe'),
  wp('sa_elite_2', 'Elite Switch Axe II', 'Switch Axe', 3, 'HR', 0, 0, 130, 'None', 0, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Ore Tree Switch Axe'),
  wp('sa_hidden_2', 'Hidden Axe II', 'Switch Axe', 4, 'HR', 0, 0, 140, 'Poison', 16, 35, 0, 'Blue', [1, 0, 0], 1, 'Sever', 'Nargacuga Switch Axe'),
  wp('sa_bone_1', 'Bone Axe I', 'Switch Axe', 1, 'HR', 0, 0, 80, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Bone Tree Switch Axe'),
  wp('sa_sleepy_shellslice_1', 'Sleepy Shellslice I', 'Switch Axe', 2, 'HR', 0, 0, 90, 'Sleep', 14, 0, 15, 'Green', [0, 0, 0], 0, 'Sever', 'Shell-studded Sleep Switch Axe'),
  wp('sa_infernal_1', 'Infernal Axe I', 'Switch Axe', 3, 'HR', 0, 0, 120, 'Dragon', 18, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Sinister Cloth Dragon Switch Axe'),
  wp('sa_royal_order', "Royal Order's Axe", 'Switch Axe', 10, 'Story MR', 5, 0, 320, 'None', 0, 10, 50, 'Purple', [2, 1, 0], 2, 'Sever', 'Follower Survey Royal Order Switch Axe'),

  // Charge Blade
  wp('cb_kamura_1', 'Kamura C. Blade I', 'Charge Blade', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Charge Blade'),
  wp('cb_defender_1', 'Defender Charge Blade I', 'Charge Blade', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Charge Blade'),
  wp('cb_poisonous_veil_1', 'Poisonous Veil I', 'Charge Blade', 2, 'HR', 0, 0, 90, 'Poison', 20, 0, 0, 'Green', [1, 0, 0], 0, 'Sever', 'Pukei-Pukei Poison Charge Blade'),

  // Insect Glaive
  wp('ig_kamura_1', 'Kamura Glaive I', 'Insect Glaive', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Yellow', [0, 0, 0], 0, 'Sever', 'Base Kamura Insect Glaive'),
  wp('ig_defender_1', 'Defender Glaive I', 'Insect Glaive', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Sever', 'Defender progression Insect Glaive'),
  wp('ig_malzeno', "Duke's Scepter", 'Insect Glaive', 10, 'Story MR', 5, 0, 320, 'Dragon', 32, 0, 0, 'Purple', [4, 0, 0], 2, 'Sever', 'MR 5 Malzeno Insect Glaive'),

  // Light Bowgun
  wp('lbg_kamura_1', 'Kamura L. Bowgun I', 'Light Bowgun', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Base Kamura Light Bowgun'),
  wp('lbg_defender_1', 'Defender Light Bowgun I', 'Light Bowgun', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Defender progression Light Bowgun'),

  // Heavy Bowgun
  wp('hbg_kamura_1', 'Kamura H. Bowgun I', 'Heavy Bowgun', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Base Kamura Heavy Bowgun'),
  wp('hbg_kamura_5', 'Kamura H. Bowgun V', 'Heavy Bowgun', 4, 'HR', 0, 0, 170, 'None', 0, 0, 0, 'Blue', [1, 0, 0], 1, 'Shot', 'High Rank Kamura Heavy Bowgun'),
  wp('hbg_defender_1', 'Defender Heavy Bowgun I', 'Heavy Bowgun', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Defender progression Heavy Bowgun'),
  wp('hbg_arzuros_1', 'Arzuros Gun I', 'Heavy Bowgun', 1, 'HR', 0, 0, 80, 'None', 0, 0, 10, 'Green', [0, 0, 0], 0, 'Shot', 'Arzuros Heavy Bowgun'),
  wp('hbg_bone_1', 'Bone Gun I', 'Heavy Bowgun', 1, 'HR', 0, 0, 80, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Bone Tree Heavy Bowgun'),
  wp('hbg_rajang_cyclone', 'Rajang Cyclone', 'Heavy Bowgun', 9, 'Early MR', 4, 0, 340, 'Thunder', 26, -15, 0, 'White', [1, 0, 0], 2, 'Shot', 'MR Rajang Sticky / Thunder Heavy Bowgun'),

  // Bow
  wp('bow_kamura_1', 'Kamura Iron Bow I', 'Bow', 1, 'HR', 0, 0, 50, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Base Kamura Bow'),
  wp('bow_defender_1', 'Defender Bow I', 'Bow', 2, 'HR', 0, 0, 110, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Defender progression Bow'),
  wp('bow_iron_1', 'Iron Bow I', 'Bow', 1, 'HR', 0, 0, 70, 'None', 0, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Iron Ore Bow'),
  wp('bow_arko_nulo_1', 'Arko Nulo I', 'Bow', 2, 'HR', 0, 0, 90, 'None', 0, 0, 0, 'Green', [1, 0, 0], 0, 'Shot', 'Bnahabra Insect Bow'),
  wp('bow_felyne_1', 'Felyne Bow I', 'Bow', 2, 'HR', 0, 0, 90, 'Paralysis', 14, 0, 0, 'Green', [1, 0, 0], 0, 'Shot', 'Felyne Paralysis Bow'),
  wp('bow_chaos_1', 'Chaos Bow I', 'Bow', 2, 'HR', 0, 0, 100, 'Poison', 16, 0, 0, 'Green', [0, 0, 0], 0, 'Shot', 'Mushroom Spread Bow'),
  wp('bow_dark_filament', 'Dark Filament+', 'Bow', 9, 'Early MR', 3, 0, 300, 'Fire', 32, 10, 0, 'White', [2, 1, 0], 2, 'Shot', 'MR Prominence Fire Bow'),
  wp('bow_thundering_strikebow', 'Thundering Strikebow', 'Bow', 9, 'Early MR', 3, 0, 290, 'Thunder', 36, 15, 0, 'White', [2, 0, 0], 2, 'Shot', 'MR Tobi-Kadachi Rapid Thunder Bow'),
  wp('bow_royal_order', "Royal Order's Bow", 'Bow', 10, 'Story MR', 5, 0, 310, 'None', 0, 10, 50, 'White', [2, 1, 0], 2, 'Shot', 'Follower Survey Royal Order Bow'),
];
