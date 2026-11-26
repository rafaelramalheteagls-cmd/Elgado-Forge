import type { WeaponClass } from '../types/sunbreak';

export const SUNBREAK_META_INDEX = 'https://www.reddit.com/r/MonsterHunterMeta/comments/w0d4tf/mhsunbreak_endgame_meta_builds_compilation/';
export const GAMECAT_SET_SEARCH = 'https://gamecat.fun/e/';
export const SUNBREAK_SOLO_PROGRESSION = 'https://mhsbsets.wordpress.com/endgame-progression/';
const BOWGUN_GUIDE = 'https://www.reddit.com/r/MonsterHunterMeta/comments/1447fez/';
const BOW_GUIDE = 'https://steamcommunity.com/sharedfiles/filedetails/?id=2816420719';
const HAMMER_GUIDE = 'https://mhsbsets.wordpress.com/hammer/';
const HEAVEN_SENT_SKILL = 'https://mhrise.kiranico.com/data/skills/932080356';

export const HEAVEN_SENT_3_CLASSES: readonly WeaponClass[] = [
  'Gunlance', 'Insect Glaive', 'Switch Axe', 'Dual Blades', 'Bow',
];

interface CommunityArchetype {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  style?: 'normal-shelling' | 'elemental-phials' | 'elemental-glaive';
  bowgunPierceLevel?: 2 | 3;
  bowShotSkill?: 'normal_rapid_up' | 'spread_up' | 'pierce_up';
  elementRequired?: boolean;
  requiresHeavenSent3?: boolean;
  priorities: Record<string, number>;
  comfort: readonly string[];
  source: string;
  note: string;
}

export const COMMUNITY_ARCHETYPES: readonly CommunityArchetype[] = [
  ...HEAVEN_SENT_3_CLASSES.map(weaponClass => ({
    id: `heaven-sent-3-${weaponClass.toLowerCase().replaceAll(' ', '-')}`,
    name: `${weaponClass} · Heaven-Sent 3`,
    weaponClass,
    requiresHeavenSent3: true,
    priorities: { heaven_sent: 3 },
    comfort: [],
    source: HEAVEN_SENT_SKILL,
    note: 'Requires Heaven-Sent Lv 3 from Tempest Robe, Sleeves, and Hakama. While active, the skill prevents sharpness and stamina consumption.',
  })),
  {
    id: 'rf-pierce-2', name: 'Light Bowgun · Rapid Fire Pierce 2', weaponClass: 'Light Bowgun',
    bowgunPierceLevel: 2,
    priorities: { pierce_up: 3, rapid_fire_up: 3 },
    comfort: ['recoil_down', 'reload_speed', 'spare_shot'],
    source: BOWGUN_GUIDE,
    note: 'Requires Rapid Fire Pierce 2 as the modeled ammo. Recoil and reload targets use the weapon’s base ratings and armor skills.',
  },
  {
    id: 'hbg-pierce-3', name: 'Heavy Bowgun · Pierce 3', weaponClass: 'Heavy Bowgun',
    bowgunPierceLevel: 3,
    priorities: { pierce_up: 3 },
    comfort: ['recoil_down', 'reload_speed', 'spare_shot'],
    source: BOWGUN_GUIDE,
    note: 'Requires Pierce 3 as the modeled ammo. Recoil and reload targets use the weapon’s base ratings and armor skills.',
  },
  ...([
    ['rapid', 'Rapid', 'normal_rapid_up'],
    ['spread', 'Spread', 'spread_up'],
    ['pierce', 'Pierce', 'pierce_up'],
  ] as const).map(([id, name, skill]) => ({
    id: `bow-${id}`, name: `Bow · ${name}`, weaponClass: 'Bow' as const,
    bowShotSkill: skill,
    priorities: { [skill]: 3 },
    comfort: ['constitution', 'stamina_surge', 'evade_extender'],
    source: BOW_GUIDE,
    note: 'Prioritizes the matching shot skill. Stamina skills are flexible because hunt buffs affect stamina use.',
  })),
  {
    id: 'hammer-strength', name: 'Hammer · Strength', weaponClass: 'Hammer',
    priorities: {}, comfort: ['focus', 'wirebug_whisperer', 'evade_extender'],
    source: HAMMER_GUIDE,
    note: 'Favors a charged-hit setup with flexible comfort skills. Choose Strength as the switch skill in game.',
  },
  {
    id: 'hammer-courage', name: 'Hammer · Elemental Courage', weaponClass: 'Hammer',
    elementRequired: true, priorities: {}, comfort: ['focus', 'heaven_sent'],
    source: HAMMER_GUIDE,
    note: 'Favors a matching element for the multi-hit Courage loop. Choose Courage as the switch skill in game.',
  },
  {
    id: 'horn-shockwave', name: 'Hunting Horn · Silkbind Shockwave', weaponClass: 'Hunting Horn',
    priorities: { horn_maestro: 1 }, comfort: ['wirebug_whisperer', 'evade_extender'],
    source: 'https://3geek14.gitlab.io/horn-pub-hh-builds/',
    note: 'Horn Maestro and wirebug recovery support Shockwave uptime. Check the recommended horn’s song list for your hunt.',
  },
  {
    id: 'normal-full-burst',
    name: 'Gunlance · Normal Full Burst',
    weaponClass: 'Gunlance',
    style: 'normal-shelling',
    priorities: { artillery: 3, load_shells: 2 },
    comfort: ['wirebug_whisperer', 'guard', 'razor_sharp'],
    source: 'https://note.com/hebo_gunlancer/n/n8da9886c9032?hl=en',
    note: 'Normal shelling with Artillery and Load Shells. Wirebug recovery, Guard, and sharpness upkeep help sustain the loop.',
  },
  {
    id: 'elemental-saed',
    name: 'Charge Blade · Elemental SAED',
    weaponClass: 'Charge Blade',
    style: 'elemental-phials',
    priorities: { load_shells: 2 },
    comfort: ['guard', 'rapid_morph'],
    source: 'https://mhchargeblade.net/mhr/sunbreak-builds/',
    note: 'Element phials and matching Element Attack. Load Shells helps refill phials. Guard and Rapid Morph support the setup.',
  },
  {
    id: 'rapid-morph',
    name: 'Switch Axe · Morph Loop',
    weaponClass: 'Switch Axe',
    priorities: { rapid_morph: 3 },
    comfort: ['evade_extender', 'power_prolonger'],
    source: 'https://wiggler.pet/rise/endgame/switch_axe',
    note: 'Rapid Morph takes priority. Evade Extender and Power Prolonger support the loop where slots allow.',
  },
  {
    id: 'elemental-tetraseal',
    name: 'Insect Glaive · Elemental Tetraseal',
    weaponClass: 'Insect Glaive',
    style: 'elemental-glaive',
    priorities: {},
    comfort: ['heaven_sent', 'power_prolonger'],
    source: 'https://mhsbsets.wordpress.com/ig/',
    note: 'Matching Element Attack for the ground combo. Heaven-Sent and Power Prolonger are optional ways to keep the loop going.',
  },
  {
    id: 'guard-counter',
    name: 'Lance · Guard & Counter',
    weaponClass: 'Lance',
    priorities: { offensive_guard: 3 },
    comfort: ['guard', 'guard_up', 'embolden'],
    source: 'https://www.mhlance.com/rise/builds/endgame',
    note: 'Offensive Guard rewards well-timed blocks. Guard, Guard Up, and Embolden depend on the matchup.',
  },
];
