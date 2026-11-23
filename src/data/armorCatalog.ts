import { ArmorItem, ArmorSlot, RankTier } from '../types/sunbreak';

interface ArmorPieceInput {
  id: string;
  name: string;
  slot: ArmorSlot;
  slots: [number, number, number];
  skills: Record<string, number>;
}

function buildSet(
  cfg: {
    rarity: number;
    rankTier: RankTier;
    minMr: number;
    minAr: number;
    defense: number;
    resistances: ArmorItem['resistances'];
    unlockNote: string;
  },
  pieces: ArmorPieceInput[]
): ArmorItem[] {
  return pieces.map((p) => ({
    id: p.id,
    name: p.name,
    slot: p.slot,
    rarity: cfg.rarity,
    rankTier: cfg.rankTier,
    minMr: cfg.minMr,
    minAr: cfg.minAr,
    defense: cfg.defense,
    resistances: cfg.resistances,
    slots: p.slots,
    skills: p.skills,
    unlockNote: cfg.unlockNote,
  }));
}

export const ARMOR_DB: ArmorItem[] = [
  // ======================== HIGH RANK SETS ========================
  ...buildSet(
    {
      rarity: 5,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 50,
      resistances: { fire: -1, water: 0, thunder: 3, ice: -1, dragon: 0 },
      unlockNote: 'HR Ore tree',
    },
    [
      { id: 'helm_ingot_s', name: 'Ingot Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { windproof: 1, thunder_attack: 1 } },
      { id: 'chest_ingot_s', name: 'Ingot Mail S', slot: 'Chest', slots: [1, 0, 0], skills: { thunder_attack: 2 } },
      { id: 'arms_ingot_s', name: 'Ingot Vambraces S', slot: 'Arms', slots: [1, 0, 0], skills: { power_prolonger: 2 } },
      { id: 'waist_ingot_s', name: 'Ingot Coil S', slot: 'Waist', slots: [1, 0, 0], skills: { power_prolonger: 1, windproof: 1 } },
      { id: 'legs_ingot_s', name: 'Ingot Greaves S', slot: 'Legs', slots: [1, 0, 0], skills: { attack_boost: 2, critical_eye: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 6,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 60,
      resistances: { fire: 3, water: -3, thunder: -1, ice: -1, dragon: 0 },
      unlockNote: 'HR Anjanath',
    },
    [
      { id: 'helm_anjanath_s', name: 'Anjanath Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { focus: 1, slugger: 1 } },
      { id: 'chest_anjanath_s', name: 'Anjanath Mail S', slot: 'Chest', slots: [1, 1, 0], skills: { focus: 1, marathon_runner: 1 } },
      { id: 'arms_anjanath_s', name: 'Anjanath Vambraces S', slot: 'Arms', slots: [1, 0, 0], skills: { slugger: 2, attack_boost: 1 } },
      { id: 'waist_anjanath_s', name: 'Anjanath Coil S', slot: 'Waist', slots: [2, 1, 1], skills: { attack_boost: 2 } },
      { id: 'legs_anjanath_s', name: 'Anjanath Greaves S', slot: 'Legs', slots: [1, 1, 0], skills: { agitator: 1, marathon_runner: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 6,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 62,
      resistances: { fire: 3, water: 0, thunder: -2, ice: 0, dragon: -3 },
      unlockNote: 'HR Rathalos',
    },
    [
      { id: 'helm_rathalos_s', name: 'Rathalos Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { attack_boost: 1, partbreaker: 1 } },
      { id: 'chest_rathalos_s', name: 'Rathalos Mail S', slot: 'Chest', slots: [1, 0, 0], skills: { attack_boost: 1, partbreaker: 1, windproof: 1 } },
      { id: 'arms_rathalos_s', name: 'Rathalos Braces S', slot: 'Arms', slots: [2, 0, 0], skills: { attack_boost: 2 } },
      { id: 'waist_rathalos_s', name: 'Rathalos Coil S', slot: 'Waist', slots: [2, 0, 0], skills: { attack_boost: 2, windproof: 1 } },
      { id: 'legs_rathalos_s', name: 'Rathalos Greaves S', slot: 'Legs', slots: [1, 0, 0], skills: { attack_boost: 1, partbreaker: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 7,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 76,
      resistances: { fire: 3, water: -3, thunder: 1, ice: -1, dragon: -2 },
      unlockNote: 'HR Teostra',
    },
    [
      { id: 'helm_teostra_hr', name: 'Kaiser Crown', slot: 'Helm', slots: [1, 0, 0], skills: { critical_eye: 3, critical_boost: 1 } },
      { id: 'chest_teostra_hr', name: 'Kaiser Mail', slot: 'Chest', slots: [1, 0, 0], skills: { masters_touch: 1, critical_eye: 1, teostra_blessing: 1 } },
      { id: 'arms_teostra_hr', name: 'Kaiser Vambraces', slot: 'Arms', slots: [2, 0, 0], skills: { critical_eye: 1, critical_boost: 1, teostra_blessing: 1 } },
      { id: 'waist_teostra_hr', name: 'Kaiser Coil', slot: 'Waist', slots: [2, 0, 0], skills: { masters_touch: 1, critical_eye: 1, teostra_blessing: 1 } },
      { id: 'legs_teostra_hr', name: 'Kaiser Greaves', slot: 'Legs', slots: [1, 1, 0], skills: { masters_touch: 1, critical_boost: 1, teostra_blessing: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 7,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 80,
      resistances: { fire: 2, water: 2, thunder: 2, ice: 2, dragon: 4 },
      unlockNote: 'HR 100 Crimson Glow Valstrax',
    },
    [
      { id: 'helm_valstrax_hr', name: 'Valstrax Helm', slot: 'Helm', slots: [2, 1, 0], skills: { dragonheart: 1, weakness_exploit: 1 } },
      { id: 'chest_valstrax_hr', name: 'Valstrax Mail', slot: 'Chest', slots: [3, 1, 0], skills: { dragonheart: 1, resentment: 1, resuscitate: 1 } },
      { id: 'arms_valstrax_hr', name: 'Valstrax Braces', slot: 'Arms', slots: [2, 0, 0], skills: { dragonheart: 1, weakness_exploit: 2 } },
      { id: 'waist_valstrax_hr', name: 'Valstrax Coil', slot: 'Waist', slots: [2, 1, 0], skills: { dragonheart: 1, resentment: 1, resuscitate: 1 } },
      { id: 'legs_valstrax_hr', name: 'Valstrax Greaves', slot: 'Legs', slots: [3, 1, 0], skills: { dragonheart: 1, resentment: 1, resuscitate: 1 } },
    ]
  ),

  // ======================== EARLY MR (MR 1 - 3) ========================
  ...buildSet(
    {
      rarity: 8,
      rankTier: 'Early MR',
      minMr: 1,
      minAr: 0,
      defense: 94,
      resistances: { fire: 0, water: 0, thunder: 0, ice: -2, dragon: 0 },
      unlockNote: 'MR 1 Velociprey',
    },
    [
      { id: 'helm_velociprey_mr', name: 'Velociprey Helm', slot: 'Helm', slots: [2, 1, 0], skills: { attack_boost: 2, quick_sheathe: 1 } },
      { id: 'chest_velociprey_mr', name: 'Velociprey Mail', slot: 'Chest', slots: [2, 1, 0], skills: { attack_boost: 2, stun_resistance: 1 } },
      { id: 'arms_velociprey_mr', name: 'Velociprey Braces', slot: 'Arms', slots: [2, 0, 0], skills: { attack_boost: 1, critical_eye: 2 } },
      { id: 'waist_velociprey_mr', name: 'Velociprey Tassets', slot: 'Waist', slots: [2, 1, 0], skills: { attack_boost: 1, constitution: 1 } },
      { id: 'legs_velociprey_mr', name: 'Velociprey Greaves', slot: 'Legs', slots: [2, 1, 0], skills: { critical_eye: 2, stun_resistance: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 8,
      rankTier: 'Early MR',
      minMr: 1,
      minAr: 0,
      defense: 98,
      resistances: { fire: -1, water: 0, thunder: 3, ice: -1, dragon: 0 },
      unlockNote: 'MR 1 Ore tree',
    },
    [
      { id: 'helm_ingot_x', name: 'Ingot Helm X', slot: 'Helm', slots: [3, 1, 0], skills: { windproof: 2, thunder_attack: 2 } },
      { id: 'chest_ingot_x', name: 'Ingot Mail X', slot: 'Chest', slots: [2, 1, 0], skills: { thunder_attack: 3, critical_eye: 1 } },
      { id: 'arms_ingot_x', name: 'Ingot Vambraces X', slot: 'Arms', slots: [2, 0, 0], skills: { power_prolonger: 2, thunder_attack: 1 } },
      { id: 'waist_ingot_x', name: 'Ingot Coil X', slot: 'Waist', slots: [2, 1, 0], skills: { power_prolonger: 1, windproof: 1, attack_boost: 1 } },
      { id: 'legs_ingot_x', name: 'Ingot Greaves X', slot: 'Legs', slots: [1, 1, 0], skills: { attack_boost: 2, critical_eye: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 8,
      rankTier: 'Early MR',
      minMr: 1,
      minAr: 0,
      defense: 102,
      resistances: { fire: -2, water: 4, thunder: -3, ice: -1, dragon: 1 },
      unlockNote: 'MR 1 Daimyo Hermitaur',
    },
    [
      { id: 'helm_hermitaur_x', name: 'Hermitaur Helm', slot: 'Helm', slots: [3, 1, 0], skills: { guard: 2, water_attack: 2 } },
      { id: 'chest_hermitaur_x', name: 'Hermitaur Mail', slot: 'Chest', slots: [2, 2, 0], skills: { guard: 1, offensive_guard: 1, defense_boost: 2 } },
      { id: 'arms_hermitaur_x', name: 'Hermitaur Vambraces', slot: 'Arms', slots: [4, 0, 0], skills: { guard_up: 2, guard: 1 } },
      { id: 'waist_hermitaur_x', name: 'Hermitaur Tassets', slot: 'Waist', slots: [3, 1, 0], skills: { offensive_guard: 2, constitution: 1 } },
      { id: 'legs_hermitaur_x', name: 'Hermitaur Greaves', slot: 'Legs', slots: [3, 1, 0], skills: { guard: 1, water_attack: 3 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Early MR',
      minMr: 3,
      minAr: 0,
      defense: 112,
      resistances: { fire: 3, water: -3, thunder: -1, ice: -1, dragon: 0 },
      unlockNote: 'MR 3 Anjanath',
    },
    [
      { id: 'helm_anjanath_x', name: 'Anjanath Helm X', slot: 'Helm', slots: [3, 1, 0], skills: { focus: 2, slugger: 1 } },
      { id: 'chest_anjanath_x', name: 'Anjanath Mail X', slot: 'Chest', slots: [3, 1, 0], skills: { focus: 1, marathon_runner: 2, slugger: 1 } },
      { id: 'arms_anjanath_x', name: 'Anjanath Vambraces X', slot: 'Arms', slots: [2, 1, 0], skills: { slugger: 2, attack_boost: 1 } },
      { id: 'waist_anjanath_x', name: 'Anjanath Coil X', slot: 'Waist', slots: [4, 1, 1], skills: { attack_boost: 2, marathon_runner: 1 } },
      { id: 'legs_anjanath_x', name: 'Anjanath Greaves X', slot: 'Legs', slots: [3, 1, 0], skills: { agitator: 2, fire_attack: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Early MR',
      minMr: 3,
      minAr: 0,
      defense: 114,
      resistances: { fire: -2, water: 1, thunder: -3, ice: 1, dragon: 1 },
      unlockNote: 'MR 3 Nargacuga',
    },
    [
      { id: 'helm_nargacuga_x', name: 'Nargacuga Helm X', slot: 'Helm', slots: [2, 1, 0], skills: { evade_window: 2, pierce_up: 1 } },
      { id: 'chest_nargacuga_x', name: 'Nargacuga Mail X', slot: 'Chest', slots: [4, 0, 0], skills: { critical_eye: 2, evade_window: 1 } },
      { id: 'arms_nargacuga_x', name: 'Nargacuga Braces X', slot: 'Arms', slots: [2, 1, 0], skills: { evade_window: 2, evade_extender: 1 } },
      { id: 'waist_nargacuga_x', name: 'Nargacuga Coil X', slot: 'Waist', slots: [2, 2, 0], skills: { critical_eye: 2, evade_extender: 1 } },
      { id: 'legs_nargacuga_x', name: 'Nargacuga Greaves X', slot: 'Legs', slots: [2, 1, 0], skills: { pierce_up: 2, critical_eye: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Early MR',
      minMr: 3,
      minAr: 0,
      defense: 110,
      resistances: { fire: -1, water: 2, thunder: -3, ice: 1, dragon: 0 },
      unlockNote: 'MR 3 Shogun Ceanataur',
    },
    [
      { id: 'helm_ceanataur_x', name: 'Ceanataur Helm', slot: 'Helm', slots: [3, 1, 0], skills: { critical_eye: 2, razor_sharp: 1 } },
      { id: 'chest_ceanataur_x', name: 'Ceanataur Mail', slot: 'Chest', slots: [2, 2, 0], skills: { razor_sharp: 2, critical_eye: 1 } },
      { id: 'arms_ceanataur_x', name: 'Ceanataur Braces', slot: 'Arms', slots: [3, 1, 0], skills: { handicraft: 1, razor_sharp: 1, speed_sharpening: 1 } },
      { id: 'waist_ceanataur_x', name: 'Ceanataur Tassets', slot: 'Waist', slots: [2, 1, 0], skills: { critical_eye: 2, speed_sharpening: 2 } },
      { id: 'legs_ceanataur_x', name: 'Ceanataur Greaves', slot: 'Legs', slots: [3, 1, 0], skills: { handicraft: 2, critical_eye: 1 } },
    ]
  ),

  // ======================== STORY MR (MR 4 - 6) ========================
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Story MR',
      minMr: 4,
      minAr: 0,
      defense: 118,
      resistances: { fire: 3, water: 0, thunder: -2, ice: 0, dragon: -3 },
      unlockNote: 'MR 4 Rathalos',
    },
    [
      { id: 'helm_rathalos_x', name: 'Rathalos Helm X', slot: 'Helm', slots: [2, 1, 0], skills: { attack_boost: 2, partbreaker: 1 } },
      { id: 'chest_rathalos_x', name: 'Rathalos Mail X', slot: 'Chest', slots: [2, 1, 0], skills: { attack_boost: 1, partbreaker: 2, windproof: 2 } },
      { id: 'arms_rathalos_mr', name: 'Rathalos Braces X', slot: 'Arms', slots: [2, 1, 0], skills: { attack_boost: 2 } },
      { id: 'waist_rathalos_x', name: 'Rathalos Coil X', slot: 'Waist', slots: [2, 0, 0], skills: { attack_boost: 2, windproof: 1 } },
      { id: 'legs_rathalos_x', name: 'Rathalos Greaves X', slot: 'Legs', slots: [2, 1, 0], skills: { partbreaker: 1, critical_boost: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Early MR',
      minMr: 4,
      minAr: 0,
      defense: 116,
      resistances: { fire: -3, water: 1, thunder: 0, ice: 4, dragon: -1 },
      unlockNote: 'MR 4 Lunagaron',
    },
    [
      { id: 'helm_lunagaron_mr', name: 'Lunagaron Helm', slot: 'Helm', slots: [2, 2, 0], skills: { critical_eye: 2, wirebug_whisperer: 1 } },
      { id: 'chest_lunagaron_mr', name: 'Lunagaron Mail', slot: 'Chest', slots: [2, 1, 0], skills: { ice_attack: 3, agitator: 1 } },
      { id: 'arms_lunagaron_mr', name: 'Lunagaron Braces', slot: 'Arms', slots: [2, 2, 0], skills: { agitator: 2, wirebug_whisperer: 1 } },
      { id: 'waist_lunagaron_mr', name: 'Lunagaron Coil', slot: 'Waist', slots: [2, 1, 0], skills: { critical_eye: 2, agitator: 1 } },
      { id: 'legs_lunagaron_mr', name: 'Lunagaron Greaves', slot: 'Legs', slots: [2, 2, 0], skills: { critical_eye: 2, ice_attack: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Story MR',
      minMr: 4,
      minAr: 0,
      defense: 118,
      resistances: { fire: -1, water: 3, thunder: 0, ice: -2, dragon: 2 },
      unlockNote: 'MR 4 Garangolm',
    },
    [
      { id: 'helm_garangolm', name: 'Golm Helm', slot: 'Helm', slots: [4, 1, 0], skills: { charge_master: 1, maximum_might: 1, focus: 1 } },
      { id: 'chest_garangolm', name: 'Golm Mail', slot: 'Chest', slots: [4, 1, 1], skills: { maximum_might: 2, flinch_free: 1 } },
      { id: 'arms_garangolm', name: 'Golm Vambraces', slot: 'Arms', slots: [2, 2, 1], skills: { slugger: 2, stamina_thief: 2 } },
      { id: 'waist_garangolm', name: 'Golm Coil', slot: 'Waist', slots: [3, 2, 0], skills: { flinch_free: 2, tremor_resistance: 2 } },
      { id: 'legs_garangolm', name: 'Golm Greaves', slot: 'Legs', slots: [2, 2, 1], skills: { charge_master: 1, slugger: 1, stamina_thief: 1, spiribirds_call: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Story MR',
      minMr: 4,
      minAr: 0,
      defense: 118,
      resistances: { fire: 0, water: 1, thunder: 4, ice: -3, dragon: 0 },
      unlockNote: 'MR 4 Astalos',
    },
    [
      { id: 'helm_astalos', name: 'Astalos Helm', slot: 'Helm', slots: [2, 1, 0], skills: { critical_eye: 2, stun_resistance: 2 } },
      { id: 'chest_astalos', name: 'Astalos Mail', slot: 'Chest', slots: [3, 1, 0], skills: { thunder_attack: 3, burst: 1 } },
      { id: 'arms_astalos', name: 'Astalos Braces', slot: 'Arms', slots: [2, 2, 0], skills: { burst: 1, evade_window: 2 } },
      { id: 'waist_astalos', name: 'Astalos Coil', slot: 'Waist', slots: [3, 1, 0], skills: { burst: 1, thunder_attack: 2 } },
      { id: 'legs_astalos', name: 'Astalos Greaves', slot: 'Legs', slots: [2, 1, 0], skills: { stun_resistance: 1, critical_eye: 2, critical_element: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Story MR',
      minMr: 4,
      minAr: 0,
      defense: 118,
      resistances: { fire: 0, water: -1, thunder: 4, ice: -3, dragon: 1 },
      unlockNote: 'MR 4 Zinogre',
    },
    [
      { id: 'helm_zinogre_x', name: 'Zinogre Helm X', slot: 'Helm', slots: [2, 1, 0], skills: { critical_eye: 2, latent_power: 1, weakness_exploit: 1 } },
      { id: 'chest_zinogre_x', name: 'Zinogre Mail X', slot: 'Chest', slots: [2, 1, 0], skills: { latent_power: 2, weakness_exploit: 1 } },
      { id: 'arms_zinogre_x', name: 'Zinogre Braces X', slot: 'Arms', slots: [3, 1, 0], skills: { constitution: 2, wirebug_whisperer: 1 } },
      { id: 'waist_zinogre_x', name: 'Zinogre Coil X', slot: 'Waist', slots: [3, 1, 0], skills: { latent_power: 2, critical_eye: 1 } },
      { id: 'legs_zinogre_x', name: 'Zinogre Greaves X', slot: 'Legs', slots: [2, 1, 0], skills: { wirebug_whisperer: 2, latent_power: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 5,
      minAr: 0,
      defense: 132,
      resistances: { fire: -2, water: 2, thunder: 0, ice: 2, dragon: -3 },
      unlockNote: 'MR 5 Malzeno (Kiranico accurate)',
    },
    [
      { id: 'helm_malzeno', name: 'Malzeno Helm', slot: 'Helm', slots: [2, 1, 0], skills: { blood_rite: 1, weakness_exploit: 1, wirebug_whisperer: 1 } },
      { id: 'chest_malzeno', name: 'Malzeno Mail', slot: 'Chest', slots: [2, 1, 0], skills: { blood_rite: 1, weakness_exploit: 1, partbreaker: 1 } },
      { id: 'arms_malzeno', name: 'Malzeno Braces', slot: 'Arms', slots: [3, 1, 0], skills: { attack_boost: 2, partbreaker: 1, blight_resistance: 1 } },
      { id: 'waist_malzeno', name: 'Malzeno Coil', slot: 'Waist', slots: [3, 1, 0], skills: { blood_rite: 2, attack_boost: 1 } },
      { id: 'legs_malzeno', name: 'Malzeno Greaves', slot: 'Legs', slots: [2, 2, 0], skills: { blood_rite: 1, partbreaker: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 5,
      minAr: 0,
      defense: 128,
      resistances: { fire: 3, water: -1, thunder: 0, ice: -2, dragon: -1 },
      unlockNote: 'MR 5 Espinas',
    },
    [
      { id: 'helm_espinas', name: 'Espinas Brain', slot: 'Helm', slots: [3, 1, 0], skills: { foray: 1, speed_sharpening: 2, poison_resistance: 2 } },
      { id: 'chest_espinas', name: 'Espinas Muscle', slot: 'Chest', slots: [3, 1, 0], skills: { foray: 1, partbreaker: 2, paralysis_attack: 1 } },
      { id: 'arms_espinas', name: 'Espinas Consideration', slot: 'Arms', slots: [2, 1, 0], skills: { foray: 1, protective_polish: 2 } },
      { id: 'waist_espinas', name: 'Espinas Bowels', slot: 'Waist', slots: [3, 1, 0], skills: { spare_shot: 2, poison_resistance: 1 } },
      { id: 'legs_espinas', name: 'Espinas Heel', slot: 'Legs', slots: [3, 1, 0], skills: { protective_polish: 1, ballistics: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 5,
      minAr: 0,
      defense: 128,
      resistances: { fire: -3, water: 2, thunder: 2, ice: 1, dragon: -3 },
      unlockNote: 'MR 5 Gore Magala',
    },
    [
      { id: 'helm_gore_x', name: 'Gore Helm', slot: 'Helm', slots: [3, 1, 0], skills: { coalescence: 2, evade_window: 1 } },
      { id: 'chest_gore_x', name: 'Gore Mail', slot: 'Chest', slots: [2, 2, 0], skills: { coalescence: 1, constitution: 2 } },
      { id: 'arms_gore_x', name: 'Gore Vambraces', slot: 'Arms', slots: [3, 1, 0], skills: { evade_window: 2, constitution: 1, speed_eating: 1 } },
      { id: 'waist_gore_x', name: 'Gore Coil', slot: 'Waist', slots: [3, 1, 0], skills: { constitution: 2, handicraft: 1, speed_eating: 1 } },
      { id: 'legs_gore_x', name: 'Gore Greaves', slot: 'Legs', slots: [3, 1, 0], skills: { evade_window: 2, handicraft: 1, speed_eating: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 5,
      minAr: 0,
      defense: 128,
      resistances: { fire: 3, water: 0, thunder: -3, ice: -2, dragon: -1 },
      unlockNote: 'MR 5 Bazelgeuse',
    },
    [
      { id: 'helm_bazel_x', name: 'Bazelgeuse Helm X', slot: 'Helm', slots: [2, 2, 0], skills: { earplugs: 2, guard: 1, artillery: 1 } },
      { id: 'chest_bazel_x', name: 'Bazelgeuse Mail X', slot: 'Chest', slots: [3, 1, 0], skills: { guard_up: 2, load_shells: 1 } },
      { id: 'arms_bazel_x', name: 'Bazelgeuse Braces X', slot: 'Arms', slots: [3, 1, 0], skills: { artillery: 2, guard: 1 } },
      { id: 'waist_bazel_x', name: 'Bazelgeuse Coil X', slot: 'Waist', slots: [2, 2, 0], skills: { agitator: 2, guard: 2 } },
      { id: 'legs_bazel_x', name: 'Bazelgeuse Greaves X', slot: 'Legs', slots: [3, 1, 0], skills: { load_shells: 1, guard_up: 1, earplugs: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 5,
      minAr: 0,
      defense: 130,
      resistances: { fire: 4, water: -3, thunder: 0, ice: -2, dragon: 1 },
      unlockNote: 'MR 5 Rakna-Kadaki',
    },
    [
      { id: 'helm_rakna_x', name: 'Rakna Helm X', slot: 'Helm', slots: [3, 1, 0], skills: { spread_up: 2, reload_speed: 1 } },
      { id: 'chest_rakna_x', name: 'Rakna Mail X', slot: 'Chest', slots: [2, 2, 0], skills: { constitution: 2, stamina_surge: 1 } },
      { id: 'arms_rakna_x', name: 'Rakna Armguards X', slot: 'Arms', slots: [2, 1, 0], skills: { constitution: 2, stamina_surge: 2 } },
      { id: 'waist_rakna_x', name: 'Rakna Coil X', slot: 'Waist', slots: [2, 1, 0], skills: { spread_up: 1, reload_speed: 2 } },
      { id: 'legs_rakna_x', name: 'Rakna Greaves X', slot: 'Legs', slots: [3, 1, 0], skills: { constitution: 2, stamina_surge: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 6,
      minAr: 0,
      defense: 134,
      resistances: { fire: 4, water: -3, thunder: 1, ice: -1, dragon: -2 },
      unlockNote: 'MR 6 Teostra',
    },
    [
      { id: 'helm_kaiser_x', name: 'Kaiser Crown X', slot: 'Helm', slots: [1, 1, 0], skills: { critical_eye: 3, critical_boost: 1, masters_touch: 1 } },
      { id: 'chest_kaiser_x', name: 'Kaiser Mail X', slot: 'Chest', slots: [3, 1, 0], skills: { critical_eye: 2, teostra_blessing: 1, masters_touch: 1 } },
      { id: 'arms_kaiser_x', name: 'Kaiser Vambraces X', slot: 'Arms', slots: [2, 1, 0], skills: { critical_eye: 1, critical_boost: 1, teostra_blessing: 1, ballistics: 1 } },
      { id: 'waist_kaiser_x', name: 'Kaiser Coil X', slot: 'Waist', slots: [3, 1, 0], skills: { critical_eye: 1, teostra_blessing: 2, ballistics: 1 } },
      { id: 'legs_kaiser_x', name: 'Kaiser Greaves X', slot: 'Legs', slots: [2, 1, 0], skills: { masters_touch: 1, critical_boost: 1, teostra_blessing: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 6,
      minAr: 0,
      defense: 134,
      resistances: { fire: -2, water: 2, thunder: -3, ice: 4, dragon: -3 },
      unlockNote: 'MR 6 Kushala Daora',
    },
    [
      { id: 'helm_kushala_x', name: 'Kushala Glare X', slot: 'Helm', slots: [3, 1, 0], skills: { handicraft: 2, kushala_blessing: 1 } },
      { id: 'chest_kushala_x', name: 'Kushala Cista X', slot: 'Chest', slots: [2, 1, 0], skills: { handicraft: 2, recovery_up: 2 } },
      { id: 'arms_kushala_x', name: 'Kushala Grip X', slot: 'Arms', slots: [3, 1, 0], skills: { agitator: 2, kushala_blessing: 2 } },
      { id: 'waist_kushala_x', name: 'Kushala Cocoon X', slot: 'Waist', slots: [3, 1, 0], skills: { normal_rapid_up: 2, pierce_up: 1 } },
      { id: 'legs_kushala_x', name: 'Kushala Crus X', slot: 'Legs', slots: [3, 1, 0], skills: { evade_window: 2, kushala_blessing: 1, agitator: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Story MR',
      minMr: 6,
      minAr: 0,
      defense: 140,
      resistances: { fire: 1, water: 1, thunder: 0, ice: 0, dragon: -3 },
      unlockNote: 'MR 6 Gaismagorm',
    },
    [
      { id: 'helm_archfiend', name: 'Archfiend Armor Cerato', slot: 'Helm', slots: [3, 2, 0], skills: { resentment: 2, weakness_exploit: 1, tune_up: 1 } },
      { id: 'chest_archfiend', name: 'Archfiend Armor Baulo', slot: 'Chest', slots: [3, 2, 0], skills: { resentment: 2, burst: 1 } },
      { id: 'arms_archfiend', name: 'Archfiend Armor Epine', slot: 'Arms', slots: [3, 2, 0], skills: { dereliction: 1, burst: 1 } },
      { id: 'waist_archfiend', name: 'Archfiend Armor Ura', slot: 'Waist', slots: [4, 1, 0], skills: { dereliction: 1, weakness_exploit: 1 } },
      { id: 'legs_archfiend', name: 'Archfiend Armor Sceros', slot: 'Legs', slots: [3, 2, 0], skills: { dereliction: 1, resentment: 1 } },
    ]
  ),

  // ======================== MR 10+ & TITLE UPDATES ========================
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 146,
      resistances: { fire: 4, water: -4, thunder: -2, ice: 1, dragon: 0 },
      unlockNote: 'MR 10 Silver Rathalos',
    },
    [
      { id: 'helm_silver_sol', name: 'Silver Solhelm', slot: 'Helm', slots: [4, 2, 0], skills: { fire_attack: 3, critical_element: 2, windproof: 1 } },
      { id: 'chest_silver_sol', name: 'Silver Solmail', slot: 'Chest', slots: [4, 1, 0], skills: { critical_boost: 1, element_exploit: 1, constitution: 1 } },
      { id: 'arms_silver_sol', name: 'Silver Solbraces', slot: 'Arms', slots: [4, 2, 0], skills: { critical_element: 1, element_exploit: 1, constitution: 2 } },
      { id: 'waist_silver_sol', name: 'Silver Solcoil', slot: 'Waist', slots: [4, 1, 0], skills: { critical_boost: 1, fire_attack: 2, windproof: 2 } },
      { id: 'legs_silver_sol', name: 'Silver Solgreaves', slot: 'Legs', slots: [4, 2, 0], skills: { element_exploit: 1, critical_boost: 1, constitution: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 146,
      resistances: { fire: 3, water: -2, thunder: -3, ice: 1, dragon: 1 },
      unlockNote: 'MR 10 Gold Rathian',
    },
    [
      { id: 'helm_golden_lune', name: 'Golden Lunehelm', slot: 'Helm', slots: [4, 2, 0], skills: { peak_performance: 2, status_trigger: 1 } },
      { id: 'chest_golden_lune', name: 'Golden Lunemail', slot: 'Chest', slots: [4, 2, 0], skills: { defiance: 2, status_trigger: 2 } },
      { id: 'arms_golden_lune', name: 'Golden Lunebraces', slot: 'Arms', slots: [4, 1, 0], skills: { defiance: 2, peak_performance: 1, good_luck: 1 } },
      { id: 'waist_golden_lune', name: 'Golden Lunecoil', slot: 'Waist', slots: [4, 2, 0], skills: { status_trigger: 1, foray: 2 } },
      { id: 'legs_golden_lune', name: 'Golden Lunegreaves', slot: 'Legs', slots: [4, 2, 0], skills: { defiance: 1, foray: 1, critical_boost: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 146,
      resistances: { fire: 0, water: 1, thunder: -2, ice: -2, dragon: 2 },
      unlockNote: 'MR 10 Lucent Nargacuga',
    },
    [
      { id: 'helm_lucent_narga', name: 'Lambent Casque', slot: 'Helm', slots: [4, 2, 0], skills: { adrenaline_rush: 1, sneak_attack: 1, evade_window: 2 } },
      { id: 'chest_lucent_narga', name: 'Lambent Hauberk', slot: 'Chest', slots: [4, 1, 0], skills: { adrenaline_rush: 2, evade_window: 1 } },
      { id: 'arms_lucent_narga', name: 'Lambent Wristrays', slot: 'Arms', slots: [4, 2, 0], skills: { evade_window: 2, adrenaline_rush: 1 } },
      { id: 'waist_lucent_narga', name: 'Lambent Sash', slot: 'Waist', slots: [4, 1, 0], skills: { sneak_attack: 2, agitator: 1 } },
      { id: 'legs_lucent_narga', name: 'Lambent Gaiters', slot: 'Legs', slots: [4, 2, 0], skills: { sneak_attack: 1, agitator: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 146,
      resistances: { fire: 3, water: 0, thunder: -3, ice: -3, dragon: -1 },
      unlockNote: 'MR 10 Seething Bazelgeuse',
    },
    [
      { id: 'helm_seething_bazel', name: 'Pride Helm', slot: 'Helm', slots: [4, 2, 0], skills: { guard: 2, guts: 1, agitator: 2 } },
      { id: 'chest_seething_bazel', name: 'Pride Mail', slot: 'Chest', slots: [4, 1, 0], skills: { guard: 2, guts: 1, partbreaker: 2 } },
      { id: 'arms_seething_bazel', name: 'Pride Vambraces', slot: 'Arms', slots: [4, 2, 0], skills: { artillery: 2, attack_boost: 1, guts: 1 } },
      { id: 'waist_seething_bazel', name: 'Pride Coil', slot: 'Waist', slots: [4, 1, 0], skills: { artillery: 1, agitator: 2 } },
      { id: 'legs_seething_bazel', name: 'Pride Greaves', slot: 'Legs', slots: [4, 2, 0], skills: { guard_up: 2, load_shells: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 148,
      resistances: { fire: 4, water: 2, thunder: -2, ice: -2, dragon: 0 },
      unlockNote: 'MR 10 Violet Mizutsune',
    },
    [
      { id: 'helm_violet_mizu', name: 'Onmyo Hatsumori', slot: 'Helm', slots: [4, 2, 0], skills: { embolden: 1, agitator: 2 } },
      { id: 'chest_violet_mizu', name: 'Onmyo Kariginu', slot: 'Chest', slots: [4, 2, 0], skills: { embolden: 1, burst: 1, offensive_guard: 1 } },
      { id: 'arms_violet_mizu', name: 'Onmyo Tekko', slot: 'Arms', slots: [4, 2, 0], skills: { embolden: 1, agitator: 2 } },
      { id: 'waist_violet_mizu', name: 'Onmyo Obi', slot: 'Waist', slots: [4, 2, 0], skills: { offensive_guard: 2, burst: 1 } },
      { id: 'legs_violet_mizu', name: 'Onmyo Sashinuki', slot: 'Legs', slots: [4, 2, 0], skills: { burst: 1, agitator: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 146,
      resistances: { fire: 4, water: -3, thunder: 1, ice: -2, dragon: -1 },
      unlockNote: 'MR 10 Flaming Espinas',
    },
    [
      { id: 'helm_flaming_espinas', name: 'Flaming Espinas Brain', slot: 'Helm', slots: [3, 2, 0], skills: { attack_boost: 2, razor_sharp: 1, spare_shot: 1 } },
      { id: 'chest_flaming_espinas', name: 'Flaming Espinas Muscle', slot: 'Chest', slots: [4, 1, 0], skills: { attack_boost: 1, foray: 2, razor_sharp: 1, spare_shot: 1 } },
      { id: 'arms_flaming_espinas', name: 'Flaming Espinas Grip', slot: 'Arms', slots: [4, 2, 0], skills: { intrepid_heart: 1, attack_boost: 1, burst: 1 } },
      { id: 'waist_flaming_espinas', name: 'Flaming Espinas Bowels', slot: 'Waist', slots: [4, 1, 0], skills: { razor_sharp: 1, spare_shot: 1, burst: 2 } },
      { id: 'legs_flaming_espinas', name: 'Flaming Espinas Heel', slot: 'Legs', slots: [4, 1, 0], skills: { intrepid_heart: 1, attack_boost: 1, razor_sharp: 1, spare_shot: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 100,
      minAr: 0,
      defense: 148,
      resistances: { fire: 3, water: -3, thunder: -2, ice: 1, dragon: 1 },
      unlockNote: 'MR 100 Scorned Magnamalo',
    },
    [
      { id: 'helm_scorned', name: 'Sinister Grudge Helm', slot: 'Helm', slots: [4, 2, 0], skills: { mail_of_hellfire: 1, hellfire_cloak: 2 } },
      { id: 'chest_scorned', name: 'Sinister Grudge Garb', slot: 'Chest', slots: [4, 1, 0], skills: { mail_of_hellfire: 1, coalescence: 1 } },
      { id: 'arms_scorned', name: 'Sinister Grudge Gauntlets', slot: 'Arms', slots: [3, 2, 0], skills: { hellfire_cloak: 2, resentment: 2 } },
      { id: 'waist_scorned', name: 'Sinister Grudge Tassets', slot: 'Waist', slots: [4, 2, 0], skills: { mail_of_hellfire: 1, coalescence: 1, resentment: 1 } },
      { id: 'legs_scorned', name: 'Sinister Grudge Greaves', slot: 'Legs', slots: [3, 2, 0], skills: { coalescence: 1, wirebug_whisperer: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 10,
      minAr: 0,
      defense: 152,
      resistances: { fire: -4, water: 2, thunder: 0, ice: 5, dragon: -2 },
      unlockNote: 'Velkhana Urgent Quest',
    },
    [
      { id: 'helm_rimeguard', name: 'Rimeguard Helm', slot: 'Helm', slots: [4, 2, 0], skills: { frostcraft: 1, critical_draw: 2, coalescence: 1 } },
      { id: 'chest_rimeguard', name: 'Rimeguard Mail', slot: 'Chest', slots: [4, 2, 0], skills: { frostcraft: 1, focus: 2, quick_sheathe: 1 } },
      { id: 'arms_rimeguard', name: 'Rimeguard Vambraces', slot: 'Arms', slots: [4, 2, 0], skills: { punishing_draw: 2, critical_element: 2 } },
      { id: 'waist_rimeguard', name: 'Rimeguard Coil', slot: 'Waist', slots: [4, 2, 0], skills: { quick_sheathe: 2, focus: 1, critical_draw: 1 } },
      { id: 'legs_rimeguard', name: 'Rimeguard Greaves', slot: 'Legs', slots: [4, 2, 0], skills: { frostcraft: 1, peak_performance: 2 } },
    ]
  ),

  // ======================== ENDGAME AR & RISEN ELDERS ========================
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 10,
      minAr: 50,
      defense: 148,
      resistances: { fire: -3, water: 2, thunder: 2, ice: 1, dragon: -4 },
      unlockNote: 'Chaotic Gore Magala',
    },
    [
      { id: 'helm_chaotic_gore', name: 'Nephilim Helm', slot: 'Helm', slots: [3, 2, 0], skills: { berserk: 1, strife: 1, bloodlust: 1, critical_eye: 1 } },
      { id: 'chest_chaotic_gore', name: 'Nephilim Mail', slot: 'Chest', slots: [3, 2, 0], skills: { strife: 1, bloodlust: 1, resentment: 2 } },
      { id: 'arms_chaotic_gore', name: 'Nephilim Vambraces', slot: 'Arms', slots: [4, 1, 0], skills: { strife: 1, weakness_exploit: 1, critical_eye: 1 } },
      { id: 'waist_chaotic_gore', name: 'Nephilim Tassets', slot: 'Waist', slots: [2, 2, 0], skills: { critical_eye: 2, critical_element: 2, bloodlust: 1 } },
      { id: 'legs_chaotic_gore', name: 'Nephilim Greaves', slot: 'Legs', slots: [4, 1, 0], skills: { berserk: 1, critical_eye: 2, critical_boost: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 110,
      minAr: 111,
      defense: 160,
      resistances: { fire: -4, water: 1, thunder: 2, ice: 0, dragon: 2 },
      unlockNote: 'Risen Chameleos',
    },
    [
      { id: 'helm_risen_mizuha', name: 'Risen Mizuha Cap', slot: 'Helm', slots: [4, 1, 0], skills: { buildup_boost: 1, chameleos_blessing: 2, status_trigger: 1 } },
      { id: 'chest_risen_mizuha', name: 'Risen Mizuha Guard', slot: 'Chest', slots: [3, 2, 0], skills: { buildup_boost: 1, foray: 2 } },
      { id: 'arms_risen_mizuha', name: 'Risen Mizuha Sleeves', slot: 'Arms', slots: [4, 2, 0], skills: { buildup_boost: 1, evade_extender: 1, burst: 1 } },
      { id: 'waist_risen_mizuha', name: 'Risen Mizuha Sash', slot: 'Waist', slots: [3, 2, 1], skills: { status_trigger: 2, chameleos_blessing: 1 } },
      { id: 'legs_risen_mizuha', name: 'Risen Mizuha Gaiters', slot: 'Legs', slots: [3, 2, 1], skills: { evade_window: 2, foray: 1, chameleos_blessing: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 120,
      minAr: 111,
      defense: 160,
      resistances: { fire: -2, water: 2, thunder: -3, ice: 4, dragon: -3 },
      unlockNote: 'MR 120 / AR 111+ Risen Kushala Daora',
    },
    [
      { id: 'helm_risen_kushala', name: 'Risen Kushala Glare', slot: 'Helm', slots: [3, 2, 0], skills: { wirebug_whisperer: 3, wind_mantle: 1, attack_boost: 1 } },
      { id: 'chest_risen_kushala', name: 'Risen Kushala Cista', slot: 'Chest', slots: [3, 1, 0], skills: { wind_mantle: 1, razor_sharp: 2, spare_shot: 2, recovery_up: 1 } },
      { id: 'arms_risen_kushala', name: 'Risen Kushala Grip', slot: 'Arms', slots: [4, 2, 0], skills: { wind_mantle: 1, agitator: 2, handicraft: 1 } },
      { id: 'waist_risen_kushala', name: 'Risen Kushala Cocoon', slot: 'Waist', slots: [3, 1, 1], skills: { kushala_blessing: 2, normal_rapid_up: 2, pierce_up: 1 } },
      { id: 'legs_risen_kushala', name: 'Risen Kushala Crus', slot: 'Legs', slots: [3, 2, 1], skills: { evade_window: 2, attack_boost: 2, recovery_up: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 140,
      minAr: 111,
      defense: 162,
      resistances: { fire: 4, water: -3, thunder: 1, ice: -1, dragon: -2 },
      unlockNote: 'MR 140 / AR 111+ Risen Teostra',
    },
    [
      { id: 'helm_risen_kaiser', name: 'Risen Kaiser Horns', slot: 'Helm', slots: [3, 2, 0], skills: { critical_eye: 3, critical_boost: 1, powder_mantle: 1 } },
      { id: 'chest_risen_kaiser', name: 'Risen Kaiser Mail', slot: 'Chest', slots: [2, 2, 0], skills: { critical_eye: 2, weakness_exploit: 1, powder_mantle: 1 } },
      { id: 'arms_risen_kaiser', name: 'Risen Kaiser Vambraces', slot: 'Arms', slots: [4, 1, 0], skills: { powder_mantle: 1, masters_touch: 2, ballistics: 1 } },
      { id: 'waist_risen_kaiser', name: 'Risen Kaiser Coil', slot: 'Waist', slots: [4, 1, 0], skills: { teostra_blessing: 2, attack_boost: 2, ballistics: 1 } },
      { id: 'legs_risen_kaiser', name: 'Risen Kaiser Greaves', slot: 'Legs', slots: [3, 2, 0], skills: { critical_eye: 2, masters_touch: 1, critical_boost: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 160,
      minAr: 131,
      defense: 170,
      resistances: { fire: 2, water: 2, thunder: 2, ice: 2, dragon: 4 },
      unlockNote: 'MR 160 Risen Crimson Glow Valstrax',
    },
    [
      { id: 'helm_risen_valstrax', name: 'Valstrax Helm - Epoch', slot: 'Helm', slots: [4, 1, 0], skills: { dragon_conversion: 1, weakness_exploit: 1, attack_boost: 1 } },
      { id: 'chest_risen_valstrax', name: 'Valstrax Mail - Epoch', slot: 'Chest', slots: [4, 2, 0], skills: { dragon_conversion: 1, stun_resistance: 2, critical_boost: 1 } },
      { id: 'arms_risen_valstrax', name: 'Valstrax Braces - Epoch', slot: 'Arms', slots: [4, 1, 1], skills: { dragon_conversion: 1, weakness_exploit: 2, stun_resistance: 1 } },
      { id: 'waist_risen_valstrax', name: 'Valstrax Coil - Epoch', slot: 'Waist', slots: [4, 2, 0], skills: { furious: 2, attack_boost: 1, critical_boost: 1 } },
      { id: 'legs_risen_valstrax', name: 'Valstrax Greaves - Epoch', slot: 'Legs', slots: [4, 1, 0], skills: { furious: 1, attack_boost: 2, latent_power: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 180,
      minAr: 131,
      defense: 168,
      resistances: { fire: -3, water: 2, thunder: 2, ice: 1, dragon: -4 },
      unlockNote: 'MR 180 / AR 131+ Risen Shagaru Magala',
    },
    [
      { id: 'helm_virtue', name: 'Virtue Helm', slot: 'Helm', slots: [4, 2, 0], skills: { frenzied_bloodlust: 1, coalescence: 1, critical_eye: 2 } },
      { id: 'chest_virtue', name: 'Virtue Mail', slot: 'Chest', slots: [4, 2, 0], skills: { frenzied_bloodlust: 1, bloodlust: 1, resentment: 1 } },
      { id: 'arms_virtue', name: 'Virtue Braces', slot: 'Arms', slots: [4, 2, 1], skills: { strife: 1, critical_boost: 1, weakness_exploit: 1 } },
      { id: 'waist_virtue', name: 'Virtue Coil', slot: 'Waist', slots: [4, 2, 0], skills: { frenzied_bloodlust: 1, bloodlust: 1, attack_boost: 2 } },
      { id: 'legs_virtue', name: 'Virtue Greaves', slot: 'Legs', slots: [3, 2, 0], skills: { bloodlust: 1, strife: 1, coalescence: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 10,
      minAr: 50,
      defense: 158,
      resistances: { fire: -3, water: 4, thunder: 2, ice: 2, dragon: -3 },
      unlockNote: 'Amatsu Urgent Quest',
    },
    [
      { id: 'helm_tempest', name: 'Tempest Crown', slot: 'Helm', slots: [4, 2, 1], skills: { evade_window: 2, heroics: 2, critical_boost: 1 } },
      { id: 'chest_tempest', name: 'Tempest Robe', slot: 'Chest', slots: [4, 2, 0], skills: { heaven_sent: 1, critical_boost: 1, evade_window: 1 } },
      { id: 'arms_tempest', name: 'Tempest Sleeves', slot: 'Arms', slots: [4, 2, 1], skills: { heaven_sent: 1, evade_window: 2, critical_boost: 1 } },
      { id: 'waist_tempest', name: 'Tempest Obi', slot: 'Waist', slots: [4, 2, 1], skills: { evade_window: 1, power_prolonger: 2 } },
      { id: 'legs_tempest', name: 'Tempest Hakama', slot: 'Legs', slots: [4, 2, 1], skills: { heaven_sent: 1, maximum_might: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'Endgame AR',
      minMr: 10,
      minAr: 80,
      defense: 172,
      resistances: { fire: -2, water: 2, thunder: 2, ice: -1, dragon: -5 },
      unlockNote: 'Primordial Malzeno',
    },
    [
      { id: 'helm_primordial', name: 'Primordial Helm', slot: 'Helm', slots: [4, 4, 0], skills: { blood_rite: 3 } },
      { id: 'chest_primordial', name: 'Primordial Mail', slot: 'Chest', slots: [4, 4, 2], skills: { blood_awakening: 1, burst: 1 } },
      { id: 'arms_primordial', name: 'Primordial Vambraces', slot: 'Arms', slots: [4, 4, 2], skills: { blood_awakening: 1, critical_boost: 1 } },
      { id: 'waist_primordial', name: 'Primordial Coil', slot: 'Waist', slots: [4, 4, 2], skills: { burst: 2, critical_boost: 1 } },
      { id: 'legs_primordial', name: 'Primordial Greaves', slot: 'Legs', slots: [4, 4, 0], skills: { blood_awakening: 1, critical_boost: 1, partbreaker: 3 } },
    ]
  ),

  // ======================== ADDITIONAL LR / HR / STORY MR SETS ========================
  ...buildSet(
    {
      rarity: 1,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 12,
      resistances: { fire: 2, water: 0, thunder: 0, ice: 0, dragon: 0 },
      unlockNote: 'Starter Kamura Set',
    },
    [
      { id: 'helm_kamura_lr', name: 'Kamura Head Scarf', slot: 'Helm', slots: [0, 0, 0], skills: { divine_blessing: 1 } },
      { id: 'chest_kamura_lr', name: 'Kamura Garb', slot: 'Chest', slots: [0, 0, 0], skills: { wirebug_whisperer: 1 } },
      { id: 'arms_kamura_lr', name: 'Kamura Braces', slot: 'Arms', slots: [0, 0, 0], skills: { critical_eye: 1 } },
      { id: 'waist_kamura_lr', name: 'Kamura Obi', slot: 'Waist', slots: [0, 0, 0], skills: { critical_eye: 1 } },
      { id: 'legs_kamura_lr', name: 'Kamura Leggings', slot: 'Legs', slots: [0, 0, 0], skills: { wall_runner: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 4,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 42,
      resistances: { fire: 2, water: 0, thunder: 0, ice: 0, dragon: 0 },
      unlockNote: 'HR Kamura S Set',
    },
    [
      { id: 'helm_kamura_s', name: 'Kamura Head Scarf S', slot: 'Helm', slots: [1, 0, 0], skills: { divine_blessing: 1, resuscitate: 1 } },
      { id: 'chest_kamura_s', name: 'Kamura Garb S', slot: 'Chest', slots: [1, 1, 0], skills: { wirebug_whisperer: 2, wall_runner: 1 } },
      { id: 'arms_kamura_s', name: 'Kamura Braces S', slot: 'Arms', slots: [1, 0, 0], skills: { critical_eye: 2, heroics: 1 } },
      { id: 'waist_kamura_s', name: 'Kamura Obi S', slot: 'Waist', slots: [1, 1, 0], skills: { critical_eye: 1, wirebug_whisperer: 1 } },
      { id: 'legs_kamura_s', name: 'Kamura Leggings S', slot: 'Legs', slots: [1, 0, 0], skills: { wall_runner: 2, resuscitate: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 8,
      rankTier: 'Early MR',
      minMr: 1,
      minAr: 0,
      defense: 80,
      resistances: { fire: 2, water: 0, thunder: 0, ice: 0, dragon: 0 },
      unlockNote: 'MR 1 Kamura Legacy Set',
    },
    [
      { id: 'helm_kamura_legacy', name: 'Kamura Legacy Head Scarf', slot: 'Helm', slots: [2, 0, 0], skills: { divine_blessing: 2, resuscitate: 1 } },
      { id: 'chest_kamura_legacy', name: 'Kamura Legacy Garb', slot: 'Chest', slots: [1, 0, 0], skills: { wirebug_whisperer: 2, wall_runner: 1, critical_eye: 1 } },
      { id: 'arms_kamura_legacy', name: 'Kamura Legacy Braces', slot: 'Arms', slots: [1, 0, 0], skills: { critical_eye: 2, heroics: 1, divine_blessing: 1 } },
      { id: 'waist_kamura_legacy', name: 'Kamura Legacy Obi', slot: 'Waist', slots: [4, 1, 0], skills: { wirebug_whisperer: 1, critical_eye: 1 } },
      { id: 'legs_kamura_legacy', name: 'Kamura Legacy Leggings', slot: 'Legs', slots: [2, 0, 0], skills: { wall_runner: 2, resuscitate: 1, affinity_sliding: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 6,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 24,
      resistances: { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
      unlockNote: 'Guild Cross Starter / Event Set',
    },
    [
      { id: 'helm_guild_cross', name: 'Guild Cross Circlet', slot: 'Helm', slots: [0, 0, 0], skills: { geologist: 1, carving_pro: 1 } },
      { id: 'chest_guild_cross', name: 'Guild Cross Suit', slot: 'Chest', slots: [0, 0, 0], skills: { botanist: 1, hunger_resistance: 1 } },
      { id: 'arms_guild_cross', name: 'Guild Cross Vambraces', slot: 'Arms', slots: [0, 0, 0], skills: { geologist: 1, wirebug_whisperer: 1 } },
      { id: 'waist_guild_cross', name: 'Guild Cross Coil', slot: 'Waist', slots: [0, 0, 0], skills: { botanist: 1, marathon_runner: 1 } },
      { id: 'legs_guild_cross', name: 'Guild Cross Boots', slot: 'Legs', slots: [0, 0, 0], skills: { geologist: 1, wall_runner: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 3,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 30,
      resistances: { fire: 1, water: 1, thunder: 1, ice: 1, dragon: 1 },
      unlockNote: 'Black Belt Defender Set',
    },
    [
      { id: 'helm_black_belt', name: 'Black Belt Helm', slot: 'Helm', slots: [0, 0, 0], skills: { earplugs: 1, recovery_up: 1 } },
      { id: 'chest_black_belt', name: 'Black Belt Mail', slot: 'Chest', slots: [0, 0, 0], skills: { attack_boost: 1, constitution: 1 } },
      { id: 'arms_black_belt', name: 'Black Belt Braces', slot: 'Arms', slots: [0, 0, 0], skills: { constitution: 1, flinch_free: 1 } },
      { id: 'waist_black_belt', name: 'Black Belt Tassets', slot: 'Waist', slots: [0, 0, 0], skills: { attack_boost: 1, earplugs: 1 } },
      { id: 'legs_black_belt', name: 'Black Belt Greaves', slot: 'Legs', slots: [0, 0, 0], skills: { recovery_up: 1, constitution: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 6,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 66,
      resistances: { fire: 1, water: 1, thunder: 1, ice: 1, dragon: 1 },
      unlockNote: 'Black Belt S High Rank Set',
    },
    [
      { id: 'helm_black_belt_s', name: 'Black Belt Helm S', slot: 'Helm', slots: [0, 0, 0], skills: { attack_boost: 2, earplugs: 1, recovery_up: 1 } },
      { id: 'chest_black_belt_s', name: 'Black Belt Mail S', slot: 'Chest', slots: [0, 0, 0], skills: { attack_boost: 1, earplugs: 1, constitution: 1 } },
      { id: 'arms_black_belt_s', name: 'Black Belt Braces S', slot: 'Arms', slots: [0, 0, 0], skills: { constitution: 2, flinch_free: 1 } },
      { id: 'waist_black_belt_s', name: 'Black Belt Tassets S', slot: 'Waist', slots: [0, 0, 0], skills: { attack_boost: 1, earplugs: 1 } },
      { id: 'legs_black_belt_s', name: 'Black Belt Greaves S', slot: 'Legs', slots: [0, 0, 0], skills: { recovery_up: 2 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 1,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 16,
      resistances: { fire: -1, water: 0, thunder: -1, ice: 1, dragon: 0 },
      unlockNote: 'LR Great Izuchi',
    },
    [
      { id: 'helm_izuchi_lr', name: 'Izuchi Helm', slot: 'Helm', slots: [0, 0, 0], skills: { critical_eye: 1 } },
      { id: 'chest_izuchi_lr', name: 'Izuchi Mail', slot: 'Chest', slots: [0, 0, 0], skills: { recovery_speed: 1 } },
      { id: 'arms_izuchi_lr', name: 'Izuchi Braces', slot: 'Arms', slots: [0, 0, 0], skills: { critical_eye: 1 } },
      { id: 'waist_izuchi_lr', name: 'Izuchi Coil', slot: 'Waist', slots: [0, 0, 0], skills: { critical_eye: 1 } },
      { id: 'legs_izuchi_lr', name: 'Izuchi Greaves', slot: 'Legs', slots: [0, 0, 0], skills: { constitution: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 2,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 22,
      resistances: { fire: 3, water: -3, thunder: -1, ice: 0, dragon: 0 },
      unlockNote: 'LR Aknosom',
    },
    [
      { id: 'helm_aknosom_lr', name: 'Aknosom Helm', slot: 'Helm', slots: [0, 0, 0], skills: { quick_sheathe: 1 } },
      { id: 'chest_aknosom_lr', name: 'Aknosom Mail', slot: 'Chest', slots: [0, 0, 0], skills: { quick_sheathe: 1 } },
      { id: 'arms_aknosom_lr', name: 'Aknosom Braces', slot: 'Arms', slots: [0, 0, 0], skills: { fire_attack: 1 } },
      { id: 'waist_aknosom_lr', name: 'Aknosom Coil', slot: 'Waist', slots: [0, 0, 0], skills: { peak_performance: 1 } },
      { id: 'legs_aknosom_lr', name: 'Aknosom Greaves', slot: 'Legs', slots: [0, 0, 0], skills: { quick_sheathe: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 3,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 32,
      resistances: { fire: -2, water: 3, thunder: -3, ice: 1, dragon: 0 },
      unlockNote: 'LR Somnacanth',
    },
    [
      { id: 'helm_somnacanth_lr', name: 'Somnacanth Helm', slot: 'Helm', slots: [0, 0, 0], skills: { bombardier: 1, sleep_attack: 1 } },
      { id: 'chest_somnacanth_lr', name: 'Somnacanth Mail', slot: 'Chest', slots: [0, 0, 0], skills: { divine_blessing: 1 } },
      { id: 'arms_somnacanth_lr', name: 'Somnacanth Braces', slot: 'Arms', slots: [0, 0, 0], skills: { sleep_attack: 1 } },
      { id: 'waist_somnacanth_lr', name: 'Somnacanth Coil', slot: 'Waist', slots: [0, 0, 0], skills: { divine_blessing: 1 } },
      { id: 'legs_somnacanth_lr', name: 'Somnacanth Greaves', slot: 'Legs', slots: [0, 0, 0], skills: { item_prolonger: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 3,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 38,
      resistances: { fire: 0, water: -1, thunder: 4, ice: -3, dragon: 1 },
      unlockNote: 'LR/HR Zinogre & Rathalos/Nargacuga LR',
    },
    [
      { id: 'helm_zinogre_lr', name: 'Zinogre Helm', slot: 'Helm', slots: [0, 0, 0], skills: { latent_power: 1, weakness_exploit: 1 } },
      { id: 'chest_zinogre_lr', name: 'Zinogre Mail', slot: 'Chest', slots: [0, 0, 0], skills: { latent_power: 1, weakness_exploit: 1 } },
      { id: 'arms_zinogre_lr', name: 'Zinogre Braces', slot: 'Arms', slots: [0, 0, 0], skills: { constitution: 1, latent_power: 1 } },
      { id: 'waist_zinogre_lr', name: 'Zinogre Coil', slot: 'Waist', slots: [0, 0, 0], skills: { constitution: 1, latent_power: 1 } },
      { id: 'helm_rathalos_lr', name: 'Rathalos Helm', slot: 'Helm', slots: [0, 0, 0], skills: { attack_boost: 1, partbreaker: 1 } },
      { id: 'legs_nargacuga_lr', name: 'Nargacuga Greaves', slot: 'Legs', slots: [0, 0, 0], skills: { evade_window: 1, evade_extender: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 6,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 64,
      resistances: { fire: 0, water: -1, thunder: 4, ice: -3, dragon: 1 },
      unlockNote: 'HR Zinogre S',
    },
    [
      { id: 'helm_zinogre_s', name: 'Zinogre Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { weakness_exploit: 1, latent_power: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 4,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 48,
      resistances: { fire: 2, water: -1, thunder: 0, ice: -2, dragon: 0 },
      unlockNote: 'HR Rhenoplos S',
    },
    [
      { id: 'helm_rhenoplos_s', name: 'Rhenoplos Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { pierce_up: 2, stun_resistance: 1 } },
      { id: 'chest_rhenoplos_s', name: 'Rhenoplos Mail S', slot: 'Chest', slots: [1, 0, 0], skills: { pierce_up: 1, artillery: 1 } },
      { id: 'arms_rhenoplos_s', name: 'Rhenoplos Braces S', slot: 'Arms', slots: [2, 0, 0], skills: { artillery: 2 } },
      { id: 'legs_rhenoplos_s', name: 'Rhenoplos Greaves S', slot: 'Legs', slots: [1, 1, 0], skills: { tremor_resistance: 2, stun_resistance: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 5,
      rankTier: 'HR',
      minMr: 0,
      minAr: 0,
      defense: 54,
      resistances: { fire: 3, water: -3, thunder: 0, ice: -1, dragon: 0 },
      unlockNote: 'HR Volvidon S & Basarios S',
    },
    [
      { id: 'chest_volvidon_s', name: 'Volvidon Mail S', slot: 'Chest', slots: [1, 0, 0], skills: { rapid_morph: 1, evade_extender: 1 } },
      { id: 'waist_volvidon_s', name: 'Volvidon Coil S', slot: 'Waist', slots: [2, 0, 0], skills: { evade_extender: 2 } },
      { id: 'legs_volvidon_s', name: 'Volvidon Greaves S', slot: 'Legs', slots: [1, 1, 0], skills: { paralysis_attack: 2 } },
      { id: 'helm_basarios_s', name: 'Basarios Helm S', slot: 'Helm', slots: [1, 0, 0], skills: { guard: 1, defense_boost: 2 } },
      { id: 'waist_basarios_s', name: 'Basarios Coil S', slot: 'Waist', slots: [1, 1, 0], skills: { guard: 2, defense_boost: 1 } },
      { id: 'legs_basarios_s', name: 'Basarios Greaves S', slot: 'Legs', slots: [1, 0, 0], skills: { guard: 1, load_shells: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 8,
      rankTier: 'Early MR',
      minMr: 1,
      minAr: 0,
      defense: 94,
      resistances: { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
      unlockNote: 'Early MR Progression Pieces',
    },
    [
      { id: 'helm_hunter_x', name: "Hunter's Helm X", slot: 'Helm', slots: [2, 1, 0], skills: { item_prolonger: 2, stun_resistance: 1 } },
      { id: 'legs_hunter_x', name: "Hunter's Greaves X", slot: 'Legs', slots: [2, 1, 0], skills: { attack_boost: 2, stun_resistance: 1 } },
      { id: 'waist_izuchi_x', name: 'Izuchi Coil X', slot: 'Waist', slots: [2, 1, 0], skills: { critical_eye: 2, recovery_speed: 1 } },
      { id: 'waist_skalda_x', name: 'Skalda Elytra X', slot: 'Waist', slots: [1, 0, 0], skills: { weakness_exploit: 2, poison_attack: 1 } },
      { id: 'helm_basarios_x', name: 'Basarios Helm X', slot: 'Helm', slots: [2, 1, 0], skills: { guard: 2, defense_boost: 2 } },
      { id: 'chest_basarios_x', name: 'Basarios Mail X', slot: 'Chest', slots: [2, 1, 0], skills: { guard: 2, speed_sharpening: 1 } },
      { id: 'arms_basarios_x', name: 'Basarios Vambraces X', slot: 'Arms', slots: [2, 1, 0], skills: { load_shells: 1, guard: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 9,
      rankTier: 'Early MR',
      minMr: 3,
      minAr: 0,
      defense: 110,
      resistances: { fire: 0, water: 3, thunder: -3, ice: 1, dragon: 0 },
      unlockNote: 'MR 3 Jyuratodus, Barioth & MR 4 Almudron',
    },
    [
      { id: 'waist_jyuratodus_x', name: 'Jyuratodus Coil X', slot: 'Waist', slots: [2, 2, 1], skills: { guard: 2, offensive_guard: 1 } },
      { id: 'legs_jyuratodus_x', name: 'Jyuratodus Greaves X', slot: 'Legs', slots: [2, 1, 1], skills: { guard_up: 1, water_attack: 2 } },
      { id: 'helm_barioth_x', name: 'Barioth Helm X', slot: 'Helm', slots: [1, 1, 1], skills: { critical_draw: 2, quick_sheathe: 1, ice_attack: 2 } },
      { id: 'helm_almudron_x', name: 'Almudron Helm X', slot: 'Helm', slots: [2, 2, 0], skills: { rapid_morph: 2, power_prolonger: 1 } },
    ]
  ),
  ...buildSet(
    {
      rarity: 10,
      rankTier: 'MR 10+',
      minMr: 50,
      minAr: 0,
      defense: 146,
      resistances: { fire: 2, water: 0, thunder: 5, ice: -4, dragon: 0 },
      unlockNote: 'MR 50 Furious Rajang',
    },
    [
      { id: 'helm_divine_ire', name: 'Divine Ire Mask', slot: 'Helm', slots: [1, 1, 1], skills: { furious: 1, critical_eye: 1, razor_sharp: 2, spare_shot: 2 } },
    ]
  ),
];
