#!/usr/bin/env python3
"""Validate the compact runtime catalog and its references to the full MHRice import."""
import json, sys
from collections import Counter
from pathlib import Path
full_path=Path(sys.argv[1] if len(sys.argv)>1 else 'src/data/generated/mhriceCatalog.json')
app_path=Path(sys.argv[2] if len(sys.argv)>2 else 'src/data/generated/mhriceAppCatalog.json')
full=json.loads(full_path.read_text(encoding='utf-8'))
app=json.loads(app_path.read_text(encoding='utf-8'))
errors=[]
if app['anomalyMaterialSources']!=full['anomalyMaterialSources']:
    errors.append('Runtime anomaly material sources differ from the source catalog.')
if app['trainingHitzones']!=full['trainingHitzones']:
    errors.append('Runtime training hitzones differ from the source catalog.')
if app['affinitySkillEffects']!=full['affinitySkillEffects']:
    errors.append('Runtime affinity skill effects differ from the source catalog.')
if app['craftingCategoryMaterials']!=full['craftingCategoryMaterials']:
    errors.append('Runtime crafting category materials differ from the source catalog.')
category_names={name for group in full['materialCategoryNames'].values() for name in group.values()}
material_names=set(full['materialNames'].values())
for category,materials in app['craftingCategoryMaterials'].items():
    if category not in category_names or any(
        row['name'] not in material_names or type(row['points']) is not int or row['points']<=0
        for row in materials
    ):
        errors.append(f'Invalid crafting category materials for {category}.')
def unique(rows, label):
    ids=[r.get('id') for r in rows]
    dup=sorted({x for x in ids if ids.count(x)>1})
    if dup: errors.append(f'{label}: duplicate IDs {dup[:10]}')
weapons=[w for g in app['weaponClasses'] for w in g['weapons']]
runtime_weapons_by_id={w['id']:w for w in weapons}
for group in full['weaponClasses']:
    if group['name'] not in ('Light Bowgun', 'Heavy Bowgun'):
        continue
    for weapon in group['weapons']:
        runtime_weapon=runtime_weapons_by_id.get(weapon['id'])
        if runtime_weapon is None:
            continue
        source=weapon['source']['base']
        runtime=runtime_weapon['sourceDetails']['base']
        if any(runtime.get(key)!=source.get(key) for key in ('recoil','reload')):
            errors.append(f"Runtime bowgun handling differs from source: {weapon['id']}")
unique(weapons,'weapons'); unique(app['armor'],'armor'); unique(app['skills'],'skills')
unique(app['decorations']+app['rampageDecorations'],'decorations')
for label, keys in (
    ('weapons', [(w['weaponClass'], w['name'].casefold()) for w in weapons]),
    ('decorations', [d['name'].casefold() for d in app['decorations']]),
    ('rampage decorations', [d['name'].casefold() for d in app['rampageDecorations']]),
):
    duplicates = [key for key, count in Counter(keys).items() if count > 1]
    if duplicates: errors.append(f'{label}: duplicate English names {duplicates[:10]}')
if len(app['weaponClasses']) != 14: errors.append('Expected all 14 weapon classes.')
if any(not w.get('name') or not w.get('attack') or not w.get('sourceDetails') for w in weapons): errors.append('Runtime weapon missing name, attack, or source-specific data.')
if any(not a.get('name') or not a.get('slot') for a in app['armor']): errors.append('Runtime armor missing name or slot.')
if any(a['isSelectable'] and not a['nameResolved'] for a in app['armor']):
    errors.append('Selectable armor is missing an English name.')
source_skills={(s['sourceKind'],s['sourceId']) for s in full['skills']}
for armor in full['armor']:
    for s in armor.get('skills',[]):
        if (s['sourceSkillKind'],s['sourceSkillId']) not in source_skills: errors.append(f"Missing armor skill ref {armor['id']} -> {s['skillId']}")
for deco in full['decorations']:
    for s in deco.get('skills',[]):
        if (s['sourceSkillKind'],s['sourceSkillId']) not in source_skills: errors.append(f"Missing decoration skill ref {deco['id']} -> {s['skillId']}")
if any(not d.get('skillName') for d in app['rampageDecorations']): errors.append('Rampage decoration missing linked Rampage skill name.')
source_rampage_flags={r['sourceId']: r['source'].get('weapon_equip_flag') for r in full['rampageDecorations']}
def validate_recipes(section, items_key, counts_key):
    source_rows={row['id']: row for row in full[section]}
    recipe_count=0
    for row in app[section]:
        source=source_rows[row['id']]
        product=source.get('craftingProduct')
        materials=row.get('craftingMaterials')
        if materials != source.get('craftingMaterials') or bool(product) != bool(materials):
            errors.append(f"Missing or mismatched recipe for {row['id']}")
            continue
        if not product:
            continue
        recipe_count+=1
        expected=[(item['Normal'],count) for item,count in zip(product[items_key],product[counts_key],strict=True) if item!='None']
        if expected != [(m['sourceId'],m['count']) for m in materials] or any(not m['name'] or m['count']<=0 for m in materials):
            errors.append(f"Invalid recipe materials for {row['id']}")
    if recipe_count == 0: errors.append(f'No crafting recipes found for {section}.')
    return recipe_count
recipe_counts={
    'armor':validate_recipes('armor','item','item_num'),
    'decorations':validate_recipes('decorations','item_id_list','item_num_list'),
    'rampageDecorations':validate_recipes('rampageDecorations','item_id_list','item_num_list'),
}
source_rampage={row['id']:row for row in full['rampageDecorations']}
for deco in app['rampageDecorations']:
    product=source_rampage[deco['id']].get('craftingProduct')
    if not product:
        errors.append(f"Missing Rampage recipe for {deco['id']}")
        continue
    base_price=source_rampage[deco['id']]['source']['base_price']
    published_prices={3000:6000,4000:8000}
    if base_price not in published_prices or deco.get('craftingZenny')!=published_prices[base_price]:
        errors.append(f"Unverified Rampage crafting price for {deco['id']}: {base_price}")
    kind,category_id=next(iter(product['material_category'].items()))
    name_key=str(category_id+200 if kind=='Mr' else category_id)
    name=full['materialCategoryNames'].get(kind,{}).get(name_key)
    if not name or deco.get('craftingCategory')!={'name':name,'points':product['point']}:
        errors.append(f"Invalid Rampage recipe category for {deco['id']}")
for weapon in weapons:
    for recipe in weapon['crafting']:
        if recipe['kind'] not in ('product','process'):
            continue
        if recipe['kind']=='process' and not weapon.get('craftingPredecessor'):
            errors.append(f"Upgrade missing predecessor for {weapon['id']}")
        for item,count in zip(recipe['materials'],recipe['materialCounts'],strict=True):
            if item=='None' and count==0:
                continue
            if not isinstance(item,dict) or str(item.get('Normal')) not in app['materialNames'] or type(count) is not int or count<=0:
                errors.append(f"Invalid weapon material for {weapon['id']}: {item}, {count}")
        if recipe['materialCategoryNum']>0:
            category=recipe['materialCategory']
            if not isinstance(category,dict) or len(category)!=1:
                errors.append(f"Invalid material category for {weapon['id']}: {category}")
                continue
            kind,category_id=next(iter(category.items()))
            name_key=str(category_id+200 if kind=='Mr' else category_id)
            if name_key not in app['materialCategoryNames'].get(kind,{}):
                errors.append(f"Missing material category name for {weapon['id']}: {category}")
for deco in app['rampageDecorations']:
    flags=deco.get('weaponEquipFlags')
    if (not isinstance(flags, list) or len(flags) != 14 or any(type(flag) is not bool for flag in flags)
            or flags != source_rampage_flags.get(deco['sourceId'])):
        errors.append(f"Invalid Rampage weapon flags for {deco['id']}")
print(json.dumps({'counts':{'weapons':len(weapons),'weaponClasses':len(app['weaponClasses']),'armor':len(app['armor']),'skills':len(app['skills']),'decorations':len(app['decorations']),'rampageDecorations':len(app['rampageDecorations'])},'craftingRecipes':recipe_counts,'unresolvedArmorNames':sum(not a.get('nameResolved',True) for a in app['armor']),'errors':errors},indent=2))
sys.exit(1 if errors else 0)
