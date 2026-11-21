import { ElementType, MonsterDefinition, MonsterHitzone } from '../types/sunbreak';

function hz(
  partName: string,
  sever: number,
  blunt: number,
  shot: number,
  fire: number,
  water: number,
  thunder: number,
  ice: number,
  dragon: number,
  isWeakspot = sever >= 45 || blunt >= 45 || shot >= 45
): MonsterHitzone {
  return {
    partName,
    sever,
    blunt,
    shot,
    fire,
    water,
    thunder,
    ice,
    dragon,
    isWeakspot,
  };
}

function mon(
  id: string,
  name: string,
  species: string,
  rankLabel: string,
  hpSolo: number,
  enrageDamageMod: number,
  primaryWeakness: ElementType,
  secondaryWeakness: ElementType,
  hitzones: MonsterHitzone[]
): MonsterDefinition {
  return {
    id,
    name,
    species,
    rankLabel,
    hpSolo,
    enrageDamageMod,
    primaryWeakness,
    secondaryWeakness,
    hitzones,
  };
}

export const MONSTERS_DB: MonsterDefinition[] = [
  // Training Grounds
  mon('mon_toadversary', 'Training Toadversary', 'Mechanical Target', 'Training Grounds', 10000, 1.0, 'Water', 'Fire', [
    hz('Head (Weakspot)', 100, 100, 80, 30, 30, 30, 30, 30, true),
    hz('Torso Shell', 45, 45, 45, 20, 20, 20, 20, 20, true),
    hz('Belly', 80, 80, 65, 25, 25, 25, 25, 25, true),
  ]),

  // Endgame & Title Update / Risen Elders
  mon('mon_primordial_malzeno', 'Primordial Malzeno', 'Elder Dragon', 'MR Endgame', 57200, 1.15, 'Dragon', 'Fire', [
    hz('Head', 55, 55, 45, 15, 5, 5, 10, 25, true),
    hz('Forelegs', 45, 45, 35, 15, 5, 5, 10, 20, true),
    hz('Wingarms', 45, 40, 35, 20, 5, 5, 10, 25, true),
    hz('Tail Tip', 50, 40, 45, 15, 0, 0, 10, 20, true),
  ]),
  mon('mon_risen_shagaru', 'Risen Shagaru Magala', 'Elder Dragon', 'MR 180 / AR 131+', 62500, 1.1, 'Dragon', 'Fire', [
    hz('Head', 65, 65, 50, 20, 0, 10, 0, 30, true),
    hz('Wingarms', 55, 50, 45, 20, 0, 10, 0, 25, true),
    hz('Forelegs', 45, 45, 35, 15, 0, 10, 0, 20, true),
    hz('Torso', 35, 35, 30, 10, 0, 5, 0, 15, false),
  ]),
  mon('mon_risen_valstrax', 'Risen Crimson Glow Valstrax', 'Elder Dragon', 'MR 160 / AR 131+', 61800, 1.15, 'Ice', 'Water', [
    hz('Head', 60, 65, 45, 20, 20, 20, 20, 0, true),
    hz('Forelegs', 50, 45, 45, 25, 25, 25, 25, 0, true),
    hz('Wing-Claw', 45, 45, 35, 15, 15, 15, 15, 0, true),
    hz('Chest (Charged)', 65, 65, 35, 30, 30, 30, 30, 0, true),
  ]),
  mon('mon_risen_teostra', 'Risen Teostra', 'Elder Dragon', 'MR 140 / AR 111+', 54500, 1.1, 'Water', 'Ice', [
    hz('Head', 55, 55, 45, 0, 25, 5, 20, 10, true),
    hz('Forelegs', 45, 42, 30, 0, 15, 5, 15, 5, true),
    hz('Wings', 45, 40, 35, 0, 20, 5, 15, 5, true),
    hz('Tail', 40, 35, 45, 0, 15, 5, 15, 5, true),
  ]),
  mon('mon_risen_kushala', 'Risen Kushala Daora', 'Elder Dragon', 'MR 120 / AR 111+', 53200, 1.1, 'Thunder', 'Dragon', [
    hz('Head', 55, 60, 45, 5, 5, 25, 0, 20, true),
    hz('Forelegs', 45, 45, 40, 5, 5, 20, 0, 15, true),
    hz('Tail', 45, 40, 45, 5, 5, 20, 0, 15, true),
  ]),
  mon('mon_risen_chameleos', 'Risen Chameleos', 'Elder Dragon', 'MR 110 / AR 111+', 52800, 1.1, 'Fire', 'Dragon', [
    hz('Head', 55, 55, 45, 30, 0, 10, 5, 20, true),
    hz('Hindlegs', 45, 45, 40, 20, 0, 5, 5, 15, true),
    hz('Tail', 45, 40, 35, 20, 0, 5, 5, 15, true),
  ]),
  mon('mon_amatsu', 'Amatsu', 'Elder Dragon', 'MR Urgent', 55000, 1.1, 'Dragon', 'Fire', [
    hz('Head', 65, 65, 55, 20, 0, 5, 5, 25, true),
    hz('Front Fins', 45, 45, 40, 15, 0, 5, 5, 20, true),
    hz('Chest', 45, 45, 45, 15, 0, 5, 5, 20, true),
  ]),
  mon('mon_velkhana', 'Velkhana', 'Elder Dragon', 'MR 10+ Urgent', 46200, 1.1, 'Fire', 'Dragon', [
    hz('Head', 60, 65, 50, 30, 5, 15, 0, 15, true),
    hz('Forelegs', 45, 45, 35, 20, 5, 10, 0, 10, true),
    hz('Tail', 50, 45, 45, 25, 5, 10, 0, 15, true),
  ]),
  mon('mon_gaismagorm', 'Gaismagorm', 'Elder Dragon', 'MR 6 Story Boss', 49500, 1.1, 'Dragon', 'Thunder', [
    hz('Head', 60, 60, 50, 10, 5, 20, 5, 25, true),
    hz('Forearms', 50, 50, 40, 10, 5, 15, 5, 20, true),
    hz('Back Crystals', 55, 55, 45, 15, 5, 20, 5, 30, true),
  ]),
  mon('mon_malzeno', 'Malzeno', 'Elder Dragon', 'MR 5 Flagship', 41500, 1.15, 'Dragon', 'Fire', [
    hz('Head', 55, 55, 45, 20, 5, 5, 10, 25, true),
    hz('Forelegs', 45, 45, 35, 15, 5, 5, 10, 20, true),
    hz('Wingarms', 45, 40, 40, 20, 5, 5, 10, 20, true),
  ]),
  mon('mon_crimson_valstrax', 'Crimson Glow Valstrax', 'Elder Dragon', 'MR 70+', 44000, 1.15, 'Fire', 'Ice', [
    hz('Head', 55, 60, 45, 20, 20, 20, 20, 0, true),
    hz('Forelegs', 48, 45, 45, 25, 25, 25, 25, 0, true),
    hz('Wings', 45, 45, 35, 15, 15, 15, 15, 0, true),
  ]),
  mon('mon_shagaru_magala', 'Shagaru Magala', 'Elder Dragon', 'MR 6', 39200, 1.1, 'Dragon', 'Fire', [
    hz('Head', 65, 65, 50, 20, 0, 10, 0, 30, true),
    hz('Wingarms', 55, 50, 45, 20, 0, 10, 0, 25, true),
    hz('Forelegs', 45, 45, 35, 15, 0, 10, 0, 20, true),
  ]),
  mon('mon_chaotic_gore', 'Chaotic Gore Magala', 'Demi Elder', 'MR 10+', 44800, 1.1, 'Fire', 'Dragon', [
    hz('Head', 65, 65, 50, 30, 0, 15, 5, 25, true),
    hz('Wingarms', 55, 55, 45, 25, 0, 10, 5, 20, true),
    hz('Forelegs', 45, 45, 35, 20, 0, 10, 5, 15, true),
  ]),
  mon('mon_gore_magala', 'Gore Magala', 'Demi Elder', 'MR 5', 34200, 1.1, 'Fire', 'Dragon', [
    hz('Head', 65, 65, 50, 25, 0, 15, 5, 20, true),
    hz('Wingarms', 50, 50, 45, 20, 0, 10, 5, 15, true),
    hz('Feelers', 70, 70, 55, 30, 0, 15, 5, 25, true),
  ]),
  mon('mon_teostra', 'Teostra', 'Elder Dragon', 'MR 6', 38500, 1.1, 'Water', 'Ice', [
    hz('Head', 55, 55, 45, 0, 25, 5, 20, 10, true),
    hz('Forelegs', 45, 42, 30, 0, 15, 5, 15, 5, true),
    hz('Wings', 45, 40, 35, 0, 20, 5, 15, 5, true),
  ]),
  mon('mon_kushala_daora', 'Kushala Daora', 'Elder Dragon', 'MR 6', 37800, 1.1, 'Thunder', 'Dragon', [
    hz('Head', 55, 60, 45, 5, 5, 25, 0, 20, true),
    hz('Forelegs', 45, 45, 40, 5, 5, 20, 0, 15, true),
    hz('Tail', 45, 40, 45, 5, 5, 20, 0, 15, true),
  ]),
  mon('mon_chameleos', 'Chameleos', 'Elder Dragon', 'MR 6', 38000, 1.1, 'Fire', 'Dragon', [
    hz('Head', 55, 55, 45, 30, 0, 10, 5, 20, true),
    hz('Hindlegs', 45, 45, 40, 20, 0, 5, 5, 15, true),
    hz('Wings', 38, 38, 30, 25, 0, 5, 5, 15, false),
  ]),
  mon('mon_narwa_allmother', 'Narwa the Allmother', 'Elder Dragon', 'MR 30+', 47000, 1.1, 'Dragon', 'Ice', [
    hz('Head', 55, 55, 45, 10, 5, 0, 15, 25, true),
    hz('Thundersac (Belly)', 80, 80, 60, 10, 5, 0, 20, 30, true),
    hz('Front Arms', 48, 48, 40, 10, 5, 0, 15, 20, true),
  ]),
  mon('mon_thunder_narwa', 'Thunder Serpent Narwa', 'Elder Dragon', 'HR / MR Event', 36000, 1.1, 'Dragon', 'Ice', [
    hz('Head', 55, 55, 45, 10, 5, 0, 15, 25, true),
    hz('Thundersac', 80, 80, 65, 10, 5, 0, 20, 30, true),
  ]),
  mon('mon_wind_ibushi', 'Wind Serpent Ibushi', 'Elder Dragon', 'MR 20+', 36500, 1.1, 'Dragon', 'Fire', [
    hz('Head', 55, 55, 45, 20, 5, 10, 5, 25, true),
    hz('Wind Sac (Chest)', 70, 70, 55, 25, 5, 10, 5, 30, true),
    hz('Forearms', 48, 48, 40, 15, 5, 10, 5, 20, true),
  ]),

  // Rare Species, Variants & Endgame Non-Elders
  mon('mon_scorned_magnamalo', 'Scorned Magnamalo', 'Fanged Wyvern', 'MR 100+', 43800, 1.15, 'Water', 'Thunder', [
    hz('Head', 55, 55, 45, 0, 25, 15, 10, 0, true),
    hz('Armblades', 50, 48, 35, 0, 20, 15, 10, 0, true),
    hz('Back (Hellfire)', 60, 60, 50, 0, 25, 20, 10, 0, true),
  ]),
  mon('mon_magnamalo', 'Magnamalo', 'Fanged Wyvern', 'MR 4', 32500, 1.1, 'Water', 'Thunder', [
    hz('Head', 55, 55, 45, 0, 25, 15, 5, 0, true),
    hz('Forelegs (Armblades)', 48, 48, 35, 0, 20, 15, 5, 0, true),
    hz('Back', 55, 55, 45, 0, 20, 15, 5, 0, true),
  ]),
  mon('mon_silver_rathalos', 'Silver Rathalos', 'Flying Wyvern', 'MR 10+', 42800, 1.15, 'Water', 'Thunder', [
    hz('Head (Broken)', 55, 60, 45, 0, 25, 20, 10, 0, true),
    hz('Wings', 45, 40, 35, 0, 20, 15, 5, 0, true),
    hz('Tail Tip', 55, 45, 40, 0, 25, 20, 10, 0, true),
  ]),
  mon('mon_rathalos', 'Rathalos', 'Flying Wyvern', 'MR 4', 30200, 1.1, 'Dragon', 'Thunder', [
    hz('Head', 65, 65, 55, 0, 15, 20, 10, 30, true),
    hz('Wings', 45, 40, 45, 0, 10, 15, 5, 20, true),
    hz('Legs', 45, 45, 45, 0, 10, 15, 5, 15, true),
  ]),
  mon('mon_rathian', 'Gold Rathian', 'Flying Wyvern', 'MR 10+ / MR 70+', 42500, 1.1, 'Thunder', 'Water', [
    hz('Tail Tip', 55, 50, 40, 0, 15, 25, 5, 5, true),
    hz('Wings', 45, 40, 35, 0, 15, 20, 5, 5, true),
    hz('Head (Broken)', 55, 60, 45, 0, 15, 25, 5, 10, true),
  ]),
  mon('mon_green_rathian', 'Rathian', 'Flying Wyvern', 'MR 2', 26800, 1.1, 'Dragon', 'Thunder', [
    hz('Head', 70, 75, 60, 0, 10, 20, 10, 30, true),
    hz('Wings', 45, 40, 40, 0, 10, 15, 5, 20, true),
    hz('Tail', 50, 45, 45, 0, 10, 15, 5, 25, true),
  ]),
  mon('mon_lucent_nargacuga', 'Lucent Nargacuga', 'Flying Wyvern', 'MR 10+', 41800, 1.15, 'Ice', 'Thunder', [
    hz('Head', 60, 65, 50, 10, 5, 15, 25, 5, true),
    hz('Wingblades', 45, 45, 35, 10, 5, 15, 20, 5, true),
    hz('Tail', 55, 50, 45, 10, 5, 15, 25, 5, true),
  ]),
  mon('mon_nargacuga', 'Nargacuga', 'Flying Wyvern', 'MR 3', 28400, 1.1, 'Thunder', 'Fire', [
    hz('Head', 65, 70, 55, 20, 5, 25, 10, 5, true),
    hz('Cutwings', 48, 45, 40, 15, 5, 20, 5, 5, true),
    hz('Tail', 55, 50, 45, 15, 5, 20, 5, 5, true),
  ]),
  mon('mon_violet_mizutsune', 'Violet Mizutsune', 'Leviathan', 'MR 10+', 43200, 1.15, 'Ice', 'Thunder', [
    hz('Head', 55, 58, 45, 0, 0, 15, 25, 10, true),
    hz('Claws', 48, 45, 35, 0, 0, 15, 20, 10, true),
    hz('Tail', 52, 48, 45, 0, 0, 15, 25, 10, true),
  ]),
  mon('mon_mizutsune', 'Mizutsune', 'Leviathan', 'MR 4', 29800, 1.1, 'Thunder', 'Dragon', [
    hz('Head', 65, 70, 50, 5, 0, 25, 10, 20, true),
    hz('Dorsal Fin', 55, 50, 50, 5, 0, 25, 10, 20, true),
    hz('Tail', 50, 45, 45, 5, 0, 20, 10, 15, true),
  ]),
  mon('mon_flaming_espinas', 'Flaming Espinas', 'Flying Wyvern', 'MR 10+', 43500, 1.15, 'Water', 'Ice', [
    hz('Head (Enraged)', 55, 55, 45, 0, 25, 5, 20, 15, true),
    hz('Belly', 48, 48, 40, 0, 20, 5, 15, 10, true),
    hz('Wings', 45, 42, 40, 0, 20, 5, 15, 10, true),
  ]),
  mon('mon_espinas', 'Espinas', 'Flying Wyvern', 'MR 5', 33600, 1.15, 'Ice', 'Dragon', [
    hz('Head (Enraged)', 55, 55, 45, 0, 10, 5, 25, 20, true),
    hz('Belly', 50, 50, 40, 0, 10, 5, 20, 15, true),
    hz('Tail', 45, 40, 40, 0, 10, 5, 20, 15, true),
  ]),
  mon('mon_seething_bazel', 'Seething Bazelgeuse', 'Flying Wyvern', 'MR 10+', 42900, 1.15, 'Ice', 'Dragon', [
    hz('Head (Glowing)', 65, 65, 50, 0, 10, 15, 30, 20, true),
    hz('Tail (Glowing)', 65, 60, 50, 0, 10, 15, 30, 20, true),
    hz('Wings', 45, 40, 45, 0, 5, 15, 20, 15, true),
  ]),
  mon('mon_bazelgeuse', 'Bazelgeuse', 'Flying Wyvern', 'MR 5', 34500, 1.1, 'Thunder', 'Dragon', [
    hz('Head', 65, 70, 55, 0, 10, 25, 15, 20, true),
    hz('Tail', 60, 55, 50, 0, 10, 25, 15, 20, true),
    hz('Wings', 45, 40, 50, 0, 5, 20, 10, 15, true),
  ]),
  mon('mon_furious_rajang', 'Furious Rajang', 'Fanged Beast', 'MR 50+', 39600, 1.15, 'Ice', 'Water', [
    hz('Head', 65, 65, 60, 0, 5, 0, 30, 0, true),
    hz('Torso', 48, 48, 45, 0, 5, 0, 20, 0, true),
    hz('Tail', 55, 55, 50, 0, 5, 0, 25, 0, true),
  ]),
  mon('mon_rajang', 'Rajang', 'Fanged Beast', 'MR 5', 31800, 1.15, 'Ice', 'Water', [
    hz('Head', 65, 65, 60, 0, 5, 0, 30, 0, true),
    hz('Torso', 48, 48, 45, 0, 5, 0, 20, 0, true),
    hz('Tail', 60, 60, 55, 0, 5, 0, 25, 0, true),
  ]),

  // Three Lords & Sunbreak Roster
  mon('mon_lunagaron', 'Lunagaron', 'Fanged Wyvern', 'MR 4', 31200, 1.1, 'Fire', 'Thunder', [
    hz('Head', 60, 65, 50, 25, 5, 20, 0, 15, true),
    hz('Forelegs', 48, 48, 40, 20, 5, 15, 0, 10, true),
    hz('Tail', 50, 45, 45, 20, 5, 15, 0, 10, true),
  ]),
  mon('mon_garangolm', 'Garangolm', 'Fanged Beast', 'MR 4', 33000, 1.1, 'Thunder', 'Fire', [
    hz('Head', 60, 65, 50, 20, 5, 25, 10, 15, true),
    hz('Right Arm (Fire)', 45, 45, 35, 0, 25, 20, 10, 10, true),
    hz('Left Arm (Water)', 45, 45, 35, 25, 0, 25, 10, 10, true),
  ]),
  mon('mon_astalos', 'Astalos', 'Flying Wyvern', 'MR 4', 30600, 1.1, 'Ice', 'Water', [
    hz('Head (Charged)', 68, 70, 55, 10, 15, 0, 30, 10, true),
    hz('Wings (Charged)', 55, 50, 45, 10, 15, 0, 25, 10, true),
    hz('Tail Tip (Charged)', 60, 55, 50, 10, 15, 0, 25, 10, true),
  ]),
  mon('mon_seregios', 'Seregios', 'Flying Wyvern', 'MR 4', 30400, 1.1, 'Thunder', 'Ice', [
    hz('Head', 55, 60, 45, 5, 10, 25, 20, 10, true),
    hz('Legs', 50, 45, 55, 5, 10, 25, 15, 10, true),
    hz('Belly', 45, 45, 45, 5, 10, 20, 15, 10, true),
  ]),
  mon('mon_zinogre', 'Zinogre', 'Fanged Wyvern', 'MR 4', 31000, 1.15, 'Ice', 'Fire', [
    hz('Head', 65, 70, 60, 15, 10, 0, 25, 5, true),
    hz('Back (Charged)', 60, 60, 50, 15, 10, 0, 25, 5, true),
    hz('Forelegs', 45, 45, 35, 10, 5, 0, 20, 5, true),
  ]),
  mon('mon_diablos', 'Diablos', 'Flying Wyvern', 'MR 4', 32800, 1.1, 'Ice', 'Dragon', [
    hz('Belly', 65, 60, 40, 0, 15, 15, 30, 20, true),
    hz('Head', 45, 50, 30, 0, 15, 15, 25, 15, true),
    hz('Tail', 50, 45, 60, 0, 10, 10, 25, 15, true),
  ]),
  mon('mon_tigrex', 'Tigrex', 'Flying Wyvern', 'MR 4', 31600, 1.1, 'Thunder', 'Dragon', [
    hz('Head', 65, 70, 55, 0, 15, 25, 10, 20, true),
    hz('Forelegs', 48, 48, 40, 0, 10, 20, 5, 15, true),
    hz('Tail', 45, 40, 45, 0, 10, 15, 5, 15, true),
  ]),
  mon('mon_barioth', 'Barioth', 'Flying Wyvern', 'MR 3', 28900, 1.1, 'Fire', 'Thunder', [
    hz('Head', 60, 65, 50, 30, 5, 20, 0, 10, true),
    hz('Forelegs (Broken)', 52, 52, 45, 25, 5, 15, 0, 10, true),
    hz('Tail', 50, 45, 45, 25, 5, 15, 0, 10, true),
  ]),
  mon('mon_goss_harag', 'Goss Harag', 'Fanged Beast', 'MR 4', 31200, 1.1, 'Fire', 'Thunder', [
    hz('Head', 65, 70, 55, 30, 5, 20, 0, 10, true),
    hz('Forearms', 48, 48, 40, 25, 5, 15, 0, 10, true),
    hz('Back', 50, 50, 45, 25, 5, 15, 0, 10, true),
  ]),
  mon('mon_magma_almudron', 'Magma Almudron', 'Leviathan', 'MR 4', 32200, 1.1, 'Water', 'Ice', [
    hz('Head', 60, 62, 50, 0, 30, 5, 20, 10, true),
    hz('Tail Tip (Heated)', 65, 65, 55, 0, 30, 5, 20, 10, true),
    hz('Forelegs', 48, 48, 40, 0, 20, 5, 15, 5, true),
  ]),
  mon('mon_almudron', 'Almudron', 'Leviathan', 'MR 4', 30800, 1.1, 'Fire', 'Ice', [
    hz('Head', 60, 62, 50, 30, 0, 10, 20, 10, true),
    hz('Tail Tip', 60, 60, 50, 25, 0, 10, 15, 10, true),
  ]),
  mon('mon_pyre_rakna', 'Pyre Rakna-Kadaki', 'Temnoceran', 'MR 5', 33800, 1.1, 'Water', 'Ice', [
    hz('Head', 58, 60, 45, 0, 25, 5, 20, 5, true),
    hz('Abdomen (Glowing)', 65, 65, 55, 0, 30, 5, 20, 5, true),
    hz('Claws', 45, 45, 35, 0, 20, 5, 15, 5, true),
  ]),
  mon('mon_rakna_kadaki', 'Rakna-Kadaki', 'Temnoceran', 'MR 4', 31400, 1.1, 'Ice', 'Water', [
    hz('Head', 58, 60, 45, 0, 15, 5, 25, 5, true),
    hz('Abdomen', 62, 62, 55, 0, 15, 5, 25, 5, true),
  ]),
  mon('mon_aurora_somnacanth', 'Aurora Somnacanth', 'Leviathan', 'MR 3', 28600, 1.1, 'Fire', 'Thunder', [
    hz('Head', 65, 68, 55, 30, 5, 20, 0, 10, true),
    hz('Tail Fin', 55, 50, 45, 25, 5, 15, 0, 10, true),
  ]),
  mon('mon_somnacanth', 'Somnacanth', 'Leviathan', 'MR 2', 25800, 1.1, 'Thunder', 'Fire', [
    hz('Head', 68, 70, 55, 20, 0, 25, 10, 10, true),
    hz('Neck', 55, 55, 45, 15, 0, 20, 10, 10, true),
  ]),
  mon('mon_bob_bishaten', 'Blood Orange Bishaten', 'Fanged Beast', 'MR 2', 26200, 1.1, 'Water', 'Ice', [
    hz('Head', 65, 68, 55, 0, 25, 10, 20, 10, true),
    hz('Tail', 55, 50, 50, 0, 20, 10, 15, 10, true),
  ]),
  mon('mon_bishaten', 'Bishaten', 'Fanged Beast', 'MR 2', 24600, 1.1, 'Ice', 'Fire', [
    hz('Head', 65, 68, 55, 20, 5, 10, 25, 5, true),
    hz('Tail', 55, 50, 50, 15, 5, 10, 20, 5, true),
  ]),
  mon('mon_shogun_ceanataur', 'Shogun Ceanataur', 'Carapaceon', 'MR 3', 27400, 1.1, 'Thunder', 'Ice', [
    hz('Head', 60, 65, 50, 15, 5, 25, 20, 5, true),
    hz('Claws', 50, 55, 45, 15, 5, 20, 15, 5, true),
  ]),
  mon('mon_daimyo_hermitaur', 'Daimyo Hermitaur', 'Carapaceon', 'MR 1', 23800, 1.1, 'Thunder', 'Ice', [
    hz('Head', 65, 70, 55, 20, 0, 30, 20, 5, true),
    hz('Shell (Blunt)', 25, 55, 20, 15, 0, 25, 15, 5, true),
  ]),
  mon('mon_anjanath', 'Anjanath', 'Brute Wyvern', 'MR 3', 28400, 1.1, 'Water', 'Ice', [
    hz('Head', 65, 65, 55, 0, 25, 15, 20, 10, true),
    hz('Tail', 60, 55, 55, 0, 25, 15, 20, 10, true),
    hz('Legs', 45, 45, 35, 0, 15, 10, 15, 5, true),
  ]),
  mon('mon_tobi_kadachi', 'Tobi-Kadachi', 'Fanged Wyvern', 'MR 2', 25200, 1.1, 'Water', 'Fire', [
    hz('Head', 65, 70, 55, 20, 25, 0, 15, 5, true),
    hz('Tail', 60, 55, 55, 20, 25, 0, 15, 5, true),
  ]),
  mon('mon_khezu', 'Khezu', 'Flying Wyvern', 'MR 2', 24800, 1.1, 'Fire', 'Water', [
    hz('Head', 70, 75, 65, 30, 10, 0, 10, 5, true),
    hz('Neck', 60, 60, 55, 25, 10, 0, 10, 5, true),
  ]),
  mon('mon_barroth', 'Barroth', 'Brute Wyvern', 'MR 2', 24900, 1.1, 'Fire', 'Water', [
    hz('Forelegs', 55, 55, 45, 25, 15, 0, 15, 5, true),
    hz('Tail', 50, 45, 45, 20, 15, 0, 15, 5, true),
  ]),
  mon('mon_pukei', 'Pukei-Pukei', 'Bird Wyvern', 'MR 2', 23900, 1.1, 'Thunder', 'Ice', [
    hz('Head', 75, 80, 70, 15, 5, 25, 20, 5, true),
    hz('Wings', 55, 50, 50, 10, 5, 20, 15, 5, true),
  ]),
  mon('mon_jyuratodus', 'Jyuratodus', 'Piscine Wyvern', 'MR 3', 26900, 1.1, 'Thunder', 'Fire', [
    hz('Head', 65, 70, 55, 20, 0, 25, 10, 5, true),
    hz('Torso', 50, 50, 45, 15, 0, 20, 10, 5, true),
  ]),
  mon('mon_royal_ludroth', 'Royal Ludroth', 'Leviathan', 'MR 1', 22800, 1.1, 'Fire', 'Thunder', [
    hz('Head', 68, 70, 60, 30, 0, 20, 10, 5, true),
    hz('Sponge Mane', 60, 55, 55, 30, 0, 15, 10, 5, true),
  ]),
  mon('mon_basarios', 'Basarios', 'Flying Wyvern', 'MR 2', 26400, 1.1, 'Water', 'Dragon', [
    hz('Chest (Broken / Heated)', 65, 70, 55, 0, 25, 10, 15, 25, true),
    hz('Belly', 45, 48, 35, 0, 20, 10, 10, 20, true),
  ]),
  mon('mon_aknosom', 'Aknosom', 'Bird Wyvern', 'MR 1', 22400, 1.1, 'Water', 'Thunder', [
    hz('Head', 70, 75, 65, 0, 25, 20, 10, 5, true),
    hz('Crest', 60, 60, 55, 0, 25, 20, 10, 5, true),
  ]),
  mon('mon_tetranadon', 'Tetranadon', 'Amphibian', 'MR 1', 23400, 1.1, 'Thunder', 'Fire', [
    hz('Head', 70, 75, 65, 20, 0, 25, 10, 10, true),
    hz('Belly (Inflated)', 80, 80, 70, 20, 0, 25, 10, 10, true),
  ]),
  mon('mon_great_izuchi', 'Great Izuchi', 'Bird Wyvern', 'MR 1', 20500, 1.05, 'Thunder', 'Water', [
    hz('Head', 75, 80, 70, 15, 20, 25, 10, 5, true),
    hz('Tail Tip', 65, 60, 60, 15, 20, 25, 10, 5, true),
  ]),
  mon('mon_great_baggi', 'Great Baggi', 'Bird Wyvern', 'MR 1', 20200, 1.05, 'Fire', 'Thunder', [
    hz('Head', 80, 85, 75, 30, 10, 20, 0, 5, true),
    hz('Torso', 55, 55, 50, 20, 10, 15, 0, 5, true),
  ]),
  mon('mon_great_wroggi', 'Great Wroggi', 'Bird Wyvern', 'MR 1', 20400, 1.05, 'Ice', 'Water', [
    hz('Head', 80, 85, 75, 0, 20, 10, 30, 5, true),
    hz('Poison Sac', 70, 70, 65, 0, 20, 10, 25, 5, true),
  ]),
  mon('mon_arzuros', 'Arzuros', 'Fanged Beast', 'MR 1', 21200, 1.05, 'Fire', 'Ice', [
    hz('Head', 60, 65, 55, 25, 5, 15, 20, 0, true),
    hz('Upper Body / Rear', 55, 55, 50, 25, 5, 15, 20, 0, true),
  ]),
  mon('mon_lagombi', 'Lagombi', 'Fanged Beast', 'MR 1', 21500, 1.05, 'Fire', 'Thunder', [
    hz('Head', 65, 70, 55, 30, 5, 20, 0, 0, true),
    hz('Rear', 55, 55, 50, 25, 5, 15, 0, 0, true),
  ]),
  mon('mon_volvidon', 'Volvidon', 'Fanged Beast', 'MR 2', 22900, 1.05, 'Water', 'Ice', [
    hz('Head', 65, 70, 55, 0, 30, 10, 20, 5, true),
    hz('Upper Body', 50, 55, 45, 0, 25, 10, 15, 5, true),
  ]),
  mon('mon_kulu_ya_ku', 'Kulu-Ya-Ku', 'Bird Wyvern', 'MR 1', 20800, 1.05, 'Water', 'Thunder', [
    hz('Head', 75, 80, 70, 15, 25, 20, 15, 10, true),
    hz('Torso', 55, 55, 50, 15, 20, 15, 15, 10, true),
  ]),
];
