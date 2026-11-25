#!/usr/bin/env python3
"""Validate the generated Elgado Forge MHRice source catalog."""
import json, sys
from pathlib import Path
p=Path(sys.argv[1] if len(sys.argv)>1 else 'src/data/generated/mhriceCatalog.json')
d=json.loads(p.read_text(encoding='utf-8'))
errors=[]
def unique(label, rows):
    ids=[x['id'] for x in rows]
    if len(ids)!=len(set(ids)): errors.append(f'{label}: duplicate IDs')
all_weapons=[w for c in d['weaponClasses'] for w in c['weapons']]
unique('weapons',all_weapons); unique('armor',d['armor']); unique('skills',d['skills']); unique('decorations',d['decorations']); unique('rampage decorations',d['rampageDecorations'])
if len(d['weaponClasses'])!=14: errors.append('expected 14 weapon classes')
if len([w for w in all_weapons if w['isSelectable']])!=d['counts']['weapons']-d['validation']['nonSelectableWeaponRecords']: errors.append('selectable weapon count mismatch')
if any(not w['tree'] or w['attack'] is None or not w['nameResolved'] for w in all_weapons if w['isSelectable']): errors.append('selectable weapon missing tree, attack or English name')
skill_ids={s['id'] for s in d['skills']}
for group,rows in [('armor',d['armor']),('decorations',d['decorations'])]:
    for row in rows:
        for skill in row['skills']:
            if skill['skillId'] not in skill_ids: errors.append(f'{group} {row["id"]}: missing skill {skill["skillId"]}')
if d['validation']['armorSkillRefsMissing'] or d['validation']['decorationSkillRefsMissing']: errors.append('reported missing skill references')
print(json.dumps({'file':str(p),'counts':d['counts'],'validation':d['validation'],'errors':errors},indent=2))
if errors: raise SystemExit(1)
