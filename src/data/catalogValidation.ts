import { MHRICE_ARMOR_DB as ARMOR_DB, MHRICE_DECORATIONS_DB as DECORATIONS_DB, MHRICE_SKILLS_DB as SKILLS_DB, MHRICE_WEAPONS_DB as WEAPONS_DB } from './mhriceAdapter';

export interface CatalogValidationIssue {
  severity: 'error' | 'warning';
  catalog: 'weapons' | 'armor' | 'decorations' | 'skills';
  id: string;
  message: string;
}

const duplicateIds = (ids: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
};

/** Run in tests/development after any catalog import or manual data change. */
export function validateCatalogs(): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const skillIds = new Set(SKILLS_DB.map((skill) => skill.id));

  for (const id of duplicateIds(WEAPONS_DB.map((item) => item.id))) {
    issues.push({ severity: 'error', catalog: 'weapons', id, message: 'Duplicate weapon ID.' });
  }
  for (const id of duplicateIds(ARMOR_DB.map((item) => item.id))) {
    issues.push({ severity: 'error', catalog: 'armor', id, message: 'Duplicate armor ID.' });
  }
  for (const id of duplicateIds(DECORATIONS_DB.map((item) => item.id))) {
    issues.push({ severity: 'error', catalog: 'decorations', id, message: 'Duplicate decoration ID.' });
  }
  for (const id of duplicateIds(SKILLS_DB.map((item) => item.id))) {
    issues.push({ severity: 'error', catalog: 'skills', id, message: 'Duplicate skill ID.' });
  }

  for (const weapon of WEAPONS_DB) {
    if (!weapon.name.trim() || weapon.raw <= 0) {
      issues.push({ severity: 'error', catalog: 'weapons', id: weapon.id, message: 'Weapon name or displayed attack is invalid.' });
    }
    if (weapon.slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot > 4)) {
      issues.push({ severity: 'error', catalog: 'weapons', id: weapon.id, message: 'Weapon decoration slot level is outside 0–4.' });
    }
  }

  for (const armor of ARMOR_DB) {
    for (const skillId of Object.keys(armor.skills)) {
      if (!skillIds.has(skillId)) {
        issues.push({ severity: 'error', catalog: 'armor', id: armor.id, message: `Unknown armor skill ID: ${skillId}.` });
      }
    }
    if (armor.slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot > 4)) {
      issues.push({ severity: 'error', catalog: 'armor', id: armor.id, message: 'Armor decoration slot level is outside 0–4.' });
    }
  }

  for (const decoration of DECORATIONS_DB) {
    if (!decoration.isRampage && !skillIds.has(decoration.skillId)) {
      issues.push({ severity: 'error', catalog: 'decorations', id: decoration.id, message: `Unknown skill ID: ${decoration.skillId}.` });
    }
    for (const sourceSkill of decoration.sourceSkills ?? []) {
      if (!skillIds.has(sourceSkill.skillId)) {
        issues.push({ severity: 'error', catalog: 'decorations', id: decoration.id, message: `Unknown additional skill ID: ${sourceSkill.skillId}.` });
      }
    }
    if (decoration.isRampage && !decoration.skillName) {
      issues.push({ severity: 'error', catalog: 'decorations', id: decoration.id, message: 'Rampage decoration has no linked Rampage skill name.' });
    }
    if (![1, 2, 3, 4].includes(decoration.slotLevel)) {
      issues.push({ severity: 'error', catalog: 'decorations', id: decoration.id, message: 'Decoration slot level is outside 1–4.' });
    }
  }

  return issues;
}

export const CATALOG_COUNTS = {
  weapons: WEAPONS_DB.length,
  armorPieces: ARMOR_DB.length,
  decorations: DECORATIONS_DB.length,
  skills: SKILLS_DB.length,
} as const;
