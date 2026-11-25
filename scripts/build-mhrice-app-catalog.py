#!/usr/bin/env python3
"""Build a compact runtime catalog from the fully audited MHRice import."""
import json, sys
from pathlib import Path
src=Path(sys.argv[1] if len(sys.argv)>1 else 'src/data/generated/mhriceCatalog.json')
out=Path(sys.argv[2] if len(sys.argv)>2 else 'src/data/generated/mhriceAppCatalog.json')
d=json.loads(src.read_text(encoding='utf-8'))
def recipe_mr(flag):
    progress=d['craftingProgress'].get(str(flag),{})
    mr=progress.get('mr')
    return mr['MasterRankProgress'] if isinstance(mr,dict) else 0

def crafting_unlock(flag):
    progress=d['craftingProgress'].get(str(flag))
    if not progress:
        return []
    labels=[]
    for field,kind,label in [('village','VillageProgress','Village'),('hall','HallProgress','Hub'),('mr','MasterRankProgress','MR')]:
        entry=progress[field]
        if isinstance(entry,dict) and entry[kind]>0:
            labels.append(f"{label} {entry[kind]}★")
    quest=progress['quest_no']
    if quest>=0:
        labels.append(f"Complete {d['craftingQuestNames'].get(str(quest),f'quest #{quest}')}")
    if progress['enable_progress_hr_check']:
        labels.append({'Low':'Low Rank','High':'High Rank','HRUnlock':'Hunter Rank cap unlocked'}[progress['progress_hr']])
    if progress['talk_flag']>=0:
        labels.append('Required NPC conversation')
    return labels

def item_unlock(row):
    product=row.get('craftingProduct')
    return recipe_unlock(product) if product else []

def recipe_unlock(product):
    labels=crafting_unlock(product.get('progress_flag'))
    item=product.get('item_flag')
    if isinstance(item,dict) and 'Normal' in item:
        name=d['materialNames'][str(item['Normal'])]
        labels.append(f'Key item: {name}')
    enemy=product.get('enemy_flag')
    if isinstance(enemy,dict) and enemy!={'Em':0}:
        kind,source_id=next(iter(enemy.items()))
        name=d['craftingMonsterNames'].get(f'{kind}:{source_id}')
        if name:
            labels.append(f'Key monster: {name}')
    return labels

def compact_weapon_details(source):
    details={key:source[key] for key in (
        'charge_axe_bottle_type','gun_lance_fire_lv','gun_lance_fire_type',
        'bow_default_charge_lv_limit','bow_charge_type_list','rapid_shot_list',
    ) if key in source}
    base=source.get('base',{})
    ammo={key:base[key][:10] for key in (
        'bullet_equip_flag_list','bullet_num_list','bullet_type_list',
    ) if key in base}
    if ammo:
        ammo.update({key:base[key] for key in ('recoil','reload') if key in base})
        details['base']=ammo
    record=source
    while record and 'base_val' not in record:
        record=record.get('base')
    if record:
        details['base_val']=record['base_val']
    return details

weapons=[]
for group in d['weaponClasses']:
    rows=[]
    def tree_key(kind, index):
        return (json.dumps(kind,sort_keys=True),index)
    tree_names={
        tree_key(w['tree']['tree_type'],w['tree']['index']):w['name']
        for w in group['weapons'] if w.get('tree') and w.get('nameResolved')
    }
    for w in group['weapons']:
        if not w.get('isSelectable') or not w.get('nameResolved'):
            continue
        tree=w.get('tree') or {}
        flags=[]
        for recipe in w.get('crafting',[]):
            base=(recipe.get('data') or {}).get('base') or {}
            flag=base.get('progress_flag')
            if isinstance(flag,int) and flag not in flags: flags.append(flag)
        rows.append({k:w.get(k) for k in ['sourceId','id','name','nameResolved','weaponClass','rarity','attack','affinity','defenseBonus','elementType','elementValue','slots','rampageSlots','sharpness','handicraft','treeIndex']})
        compact_crafting=[]
        for recipe in w.get('crafting',[]):
            base=((recipe.get('data') or {}).get('base') or {})
            compact_crafting.append({'kind':recipe.get('kind'),'progressFlag':base.get('progress_flag'),'materialCategory':base.get('material_category'),'materialCategoryNum':base.get('material_category_num'),'materials':base.get('item'),'materialCounts':base.get('item_num'),'outputs':base.get('output_item'),'outputCounts':base.get('output_item_num')})
            compact_crafting[-1]['unlock']=recipe_unlock(base)
            compact_crafting[-1]['minCraftingMr']=recipe_mr(base.get('progress_flag'))
        rows[-1].update({'treeProgress':{'village':tree.get('village_progress'),'hall':tree.get('hall_progress'),'masterRank':tree.get('mr_progress')},'craftingProgressFlags':flags,'crafting':compact_crafting,'sourceDetails':compact_weapon_details(w['source'])})
        predecessor=tree_names.get(tree_key(tree.get('prev_weapon_type'),tree.get('prev_weapon_index')))
        if predecessor:
            rows[-1]['craftingPredecessor']=predecessor
    weapons.append({'key':group['key'],'name':group['name'],'weapons':rows})
armor=[]
for a in d['armor']:
    armor.append({k:a.get(k) for k in ['sourceId','id','slot','sourceSlot','name','nameResolved','seriesId','seriesName','rarity','rankGroup','defense','resistances','decorationSlots','skills','craftingMaterials']})
    armor[-1]['sourceEquipRestriction'] = a['source'].get('sexual_equipable')
    armor[-1]['sourceUpgrade'] = a['source'].get('id_after_ex_change')
    if 'previousName' in a:
        armor[-1]['previousName'] = a['previousName']
    armor[-1]['isSelectable'] = a['isSelectable']
    if a.get('craftingProduct'):
        armor[-1]['craftingUnlock']=item_unlock(a)
        armor[-1]['minCraftingMr']=recipe_mr(a['craftingProduct']['progress_flag'])
        # MHRice gen_armor.rs uses the armor's value for the forge row.
        armor[-1]['craftingZenny'] = a['source']['value']
skills=[{k:s.get(k) for k in ['sourceId','sourceKind','id','name','maxLevel','description']} for s in d['skills']]
decos=[]
for x in d['decorations']:
    if not x.get('nameResolved') or not x.get('skills'): continue
    decos.append({k:x.get(k) for k in ['sourceId','id','name','rarity','slotLevel','skills','craftingMaterials']})
    if x.get('craftingProduct'):
        decos[-1]['craftingUnlock']=item_unlock(x)
        decos[-1]['minCraftingMr']=recipe_mr(x['craftingProduct']['progress_flag'])
        # MHRice gen_skill.rs doubles the ordinary decoration's base price.
        decos[-1]['craftingZenny'] = 2*x['source']['base_price']
rampage=[
    {**{k:r.get(k) for k in ['sourceId','id','name','skillSourceId','skillName','slotLevel','rarity','craftingMaterials','craftingCategory']},
     'weaponEquipFlags':r['source']['weapon_equip_flag'],'craftingUnlock':item_unlock(r),
     'minCraftingMr':recipe_mr(r['craftingProduct']['progress_flag']) if r.get('craftingProduct') else 0,
     # The published MHRice recipes show 6,000z and 8,000z for the two base price tiers.
     'craftingZenny':2*r['source']['base_price'] if r.get('craftingProduct') else None}
    for r in d['rampageDecorations']
]
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'metadata':d['metadata'],'weaponClasses':weapons,'armor':armor,'skills':skills,'decorations':decos,'rampageDecorations':rampage,'kinsectNames':d['kinsectNames'],'materialNames':d['materialNames'],'materialCategoryNames':d['materialCategoryNames'],'craftingCategoryMaterials':d['craftingCategoryMaterials'],'affinitySkillEffects':d['affinitySkillEffects'],'trainingHitzones':d['trainingHitzones'],'anomalyMaterialSources':d['anomalyMaterialSources']},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'weapons':sum(len(g['weapons']) for g in weapons),'armor':len(armor),'skills':len(skills),'decorations':len(decos),'rampageDecorations':len(rampage)},indent=2))
