#!/usr/bin/env python3
"""Deterministic MHRice -> Elgado Forge source catalog importer.
Reads the MHRice extracted game-data JSON and writes an English catalog while
preserving original source records/IDs for future lossless adapters.
"""
import argparse, json, re, hashlib
from pathlib import Path

WEAPONS = {
 'great_sword':'Great Sword','short_sword':'Sword & Shield','hammer':'Hammer','lance':'Lance',
 'long_sword':'Long Sword','slash_axe':'Switch Axe','gun_lance':'Gunlance','dual_blades':'Dual Blades',
 'horn':'Hunting Horn','insect_glaive':'Insect Glaive','charge_axe':'Charge Blade',
 'light_bowgun':'Light Bowgun','heavy_bowgun':'Heavy Bowgun','bow':'Bow'
}
SLOT_KEYS={'Head':'Head','Chest':'Chest','Arm':'Arms','Waist':'Waist','Leg':'Legs'}

def param(section): return section.get('param', []) if isinstance(section,dict) else []
def msg_map(section, pattern=None):
    out={}
    for e in section.get('entries',[]) if isinstance(section,dict) else []:
        name=e.get('name','')
        m=re.search(pattern,name) if pattern else None
        if m:
            try:
                label=e.get('content',['',''])[1] or ''
                if label and not label.startswith('<COLOR'): out[int(m.group(1))]=label
            except Exception: pass
    return out

def key_id(obj):
    if isinstance(obj,dict) and obj:
        k,v=next(iter(obj.items()))
        if isinstance(v,int): return v
    return None

def typed_ref(obj):
    if isinstance(obj,dict) and obj:
        kind,value=next(iter(obj.items()))
        if isinstance(value,int): return kind,value
    return None,None

def unwrap(o):
    """Flatten nested `base` wrappers while retaining specialized outer fields."""
    out={}
    if isinstance(o,dict):
        b=o.get('base')
        if isinstance(b,dict): out.update(unwrap(b))
        for k,v in o.items():
            if k!='base': out[k]=v
    return out

def clean(v):
    if isinstance(v,dict): return {k:clean(x) for k,x in v.items()}
    if isinstance(v,list): return [clean(x) for x in v]
    return v

def attach_crafting_recipe(row, product, items_key, counts_key, material_names):
    materials=[]
    for item,count in zip(product[items_key],product[counts_key],strict=True):
        if item=='None' and count==0:
            continue
        kind,item_id=typed_ref(item)
        if kind!='Normal' or item_id not in material_names or type(count) is not int or count<=0:
            raise ValueError(f"Invalid material in recipe {row['id']}: {item}, {count}")
        materials.append({'sourceId':item_id,'name':material_names[item_id],'count':count})
    row['craftingProduct']=clean(product)
    row['craftingMaterials']=materials

def index_crafting_products(section):
    products={}
    for product in param(section):
        ref=typed_ref(product.get('id'))
        if ref in products:
            raise ValueError(f'Duplicate crafting recipe ID: {ref}')
        products[ref]=product
    return products

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('source'); ap.add_argument('output'); args=ap.parse_args()
    src=Path(args.source); raw=src.read_bytes(); d=json.loads(raw)
    checksum=hashlib.sha256(raw).hexdigest()
    result={'metadata':{'source':'MHRice game-data extraction','sourceUrl':'https://github.com/wwylele/mhrice','dataPage':'https://d2d662ws3kt2jd.cloudfront.net/about.html','sourceSha':d.get('sha'),'sourceSha256':checksum,'locale':'English','localeIndex':1,'importerVersion':'1.0.0'},'weaponClasses':[],'armor':[],'skills':[],'decorations':[],'rampageDecorations':[],'counts':{},'validation':{}}

    # English skill names/details, merge base + MR localized message tables.
    skill_names={'Skill':msg_map(d.get('player_skill_name_msg',{}),r'PlayerSkill_(\d+)_Name$'),'MrSkill':msg_map(d.get('player_skill_name_msg_mr',{}),r'PlayerSkill_(\d+)_Name$')}
    skill_details={'Skill':msg_map(d.get('player_skill_detail_msg',{}),r'PlayerSkill_(\d+)_Detail$'),'MrSkill':msg_map(d.get('player_skill_detail_msg_mr',{}),r'PlayerSkill_(\d+)_Detail$')}
    skill_explains={'Skill':msg_map(d.get('player_skill_explain_msg',{}),r'PlayerSkill_(\d+)_Explain$'),'MrSkill':msg_map(d.get('player_skill_explain_msg_mr',{}),r'PlayerSkill_(\d+)_Explain$')}
    skill_rows=[]
    for p in param(d.get('equip_skill',{})):
        skill_kind,sid=typed_ref(p.get('id'))
        if sid is None: continue
        name_index=sid if skill_kind=='Skill' else 200+sid
        skill_rows.append({'sourceId':sid,'sourceKind':skill_kind,'id':f'{"mr-skill" if skill_kind=="MrSkill" else "skill"}:{sid}','name':skill_names.get(skill_kind,{}).get(name_index,f'Unknown Skill {skill_kind}:{sid}'),'nameResolved':name_index in skill_names.get(skill_kind,{}),'maxLevel':p.get('max_level'),'detail':skill_details.get(skill_kind,{}).get(name_index,''),'description':skill_explains.get(skill_kind,{}).get(name_index,''),'source':clean(p)})
    skill_by_id={(x['sourceKind'],x['sourceId']):x for x in skill_rows}
    result['skills']=skill_rows
    # Part indexes and labels verified against the MHRice monster pages.
    hitzone_parts={
        'mon_primordial_malzeno': ((132,5), ['Head','Torso','Forelegs','Hind Legs','Wings','Tail','Tail Tip']),
        'mon_rathalos': ((2,0), ['Head','Neck','Back','Abdomen','Tail','Wings','Legs']),
    }
    source_monsters={(row['id'],row['sub_id']):row for row in d['monsters']}
    hitzone_fields={
        'sever':'slash','blunt':'strike','shot':'shell','fire':'fire',
        'water':'water','thunder':'elect','ice':'ice','dragon':'dragon',
    }
    result['trainingHitzones']={}
    for monster_id,(source_id,names) in hitzone_parts.items():
        groups=source_monsters[source_id]['meat_data']['meat_container']
        rows=[]
        for part_index,name in enumerate(names):
            for phase,entry in enumerate(groups[part_index]['meat_group_info']):
                row={field:entry[source_field] for field,source_field in hitzone_fields.items()}
                rows.append({'partName':name if phase==0 else f'{name} (Phase {phase})',**row,
                             'isWeakspot':max(row[field] for field in ('sever','blunt','shot'))>=45})
        result['trainingHitzones'][monster_id]=rows
    # Read the game's per-level English messages for the numeric affinity skills.
    affinity_specs={
        'criticalEye': (5, 7, r'Affinity \+(\d+)%'),
        'agitator': (1, 5, r'Attack \+(\d+) and affinity \+(\d+)%\s+while active\.'),
        'weaknessExploit': (7, 3, r'Attacks that hit weak spots\s+have (\d+)% increased affinity\.'),
    }
    skill_messages={row['name']:row['content'][1] for row in d['player_skill_detail_msg']['entries']}
    result['affinitySkillEffects']={}
    for key,(skill_id,levels,pattern) in affinity_specs.items():
        bonuses=[0]
        attack=[0]
        for level in range(levels):
            message=skill_messages.get(f'PlayerSkill_{skill_id:03d}_{level:02d}_Detail','')
            match=re.fullmatch(pattern,message)
            if not match:
                raise ValueError(f'Invalid skill effect message for {key} level {level+1}: {message!r}')
            bonuses.append(int(match.groups()[-1]))
            if key=='agitator':
                attack.append(int(match[1]))
        result['affinitySkillEffects'][key]=bonuses
        if key=='agitator':
            result['affinitySkillEffects']['agitatorAttack']=attack

    # Decorations
    material_names={}
    for key in ['items_name_msg','items_name_msg_mr']:
        material_names.update(msg_map(d.get(key,{}),r'I_(\d+)_Name$'))
    result['materialNames']=material_names
    result['kinsectNames']=sorted({
        name for key in ('insect_name','insect_name_mr')
        for name in msg_map(d.get(key,{}),r'IG_Insect_(\d+)_Name$').values()
    })
    monster_names=msg_map(d.get('monster_names',{}),r'^EnemyIndex(\d+)$')
    monster_names.update(msg_map(d.get('monster_names_mr',{}),r'^EnemyIndex(\d+)_MR$'))
    result['craftingMonsterNames']={}
    for monster in d.get('monsters',[])+d.get('small_monsters',[]):
        kind,source_id=typed_ref(monster['em_type'])
        name=monster_names.get(monster['enemy_type'])
        if name and source_id is not None:
            key=f'{kind}:{source_id}'
            previous=result['craftingMonsterNames'].setdefault(key,name)
            if previous!=name:
                raise ValueError(f'Conflicting monster names for {key}: {previous}, {name}')
    anomaly_sources={}
    for row in param(d.get('mystery_reward_item',{})):
        item_kind,item_id=typed_ref(row['reward_item'])
        monster_kind,monster_id=typed_ref(row['em_type'])
        monster=result['craftingMonsterNames'].get(f'{monster_kind}:{monster_id}')
        material=material_names.get(item_id) if item_kind=='Normal' else None
        if not monster or not material or row.get('is_special_mystery') or row.get('quest_no')!=-1:
            continue
        lower,upper=row['lv_lower_limit'],row['lv_upper_limit']
        entry={'monster':monster}
        if lower>0 and upper>=lower:
            entry.update({'minLevel':lower,'maxLevel':upper})
        sources=anomaly_sources.setdefault(material,[])
        if entry not in sources:
            sources.append(entry)
    result['anomalyMaterialSources']=anomaly_sources
    result['craftingProgress']={
        row['progress_flag']:row for row in d.get('progress',{}).get('param_list',[])
    }
    quest_names={}
    for key in ['quest_village_msg','quest_village_msg_mr','quest_hall_msg','quest_hall_msg_mr','quest_hall_msg_mr2','quest_tutorial_msg','quest_arena_msg','quest_dlc_msg']:
        quest_names.update(msg_map(d.get(key,{}),r'QN(\d+)_01$'))
    result['craftingQuestNames']={
        row['quest_no']:quest_names[row['quest_no']]
        for row in result['craftingProgress'].values() if row['quest_no'] in quest_names
    }
    result['materialCategoryNames']={
        kind:msg_map(d.get(key,{}),r'ICT_Name_(\d+)$')
        for kind,key in [('LrHr','material_category_msg'),('Mr','material_category_msg_mr')]
    }
    category_materials={}
    for item in param(d.get('items',{})):
        kind,item_id=typed_ref(item.get('id'))
        name=material_names.get(item_id) if kind=='Normal' else None
        points=item.get('category_worth',0)
        if not name or points<=0:
            continue
        for category in item['material_category']:
            group,category_id=typed_ref(category)
            if group is None:
                continue
            index=200+category_id if group=='Mr' else category_id
            label=result['materialCategoryNames'].get(group,{}).get(index)
            if label:
                category_materials.setdefault(label,[]).append({'name':name,'points':points})
    result['craftingCategoryMaterials']=category_materials
    deco_products=index_crafting_products(d.get('decorations_product',{}))
    deco_names={}
    for key in ['decorations_name_msg','decorations_name_msg_mr']:
        deco_names.update(msg_map(d.get(key,{}),r'Decorations_(\d+)_Name$'))
    for p in param(d.get('decorations',{})):
        did=key_id(p.get('id'))
        if did is None: continue
        deco_kind=next(iter(p.get('id',{}).keys()),'Deco')
        sk=[]
        for ref,lv in zip(p.get('skill_id_list',[]),p.get('skill_lv_list',[])):
            skill_kind,sid=typed_ref(ref)
            if sid is not None and lv:
                skill_ref_id=f'{"mr-skill" if skill_kind=="MrSkill" else "skill"}:{sid}'
                sk.append({'skillId':skill_ref_id,'sourceSkillId':sid,'sourceSkillKind':skill_kind,'skillName':skill_by_id.get((skill_kind,sid),{}).get('name',f'Unknown Skill {skill_kind}:{sid}'),'level':lv})
        # Decoration localization is keyed by the decoration's source ID, not sort_id.
        # sort_id controls UI ordering and does not identify the localized name.
        name_index=(200+did) if deco_kind=='MrDeco' else did
        result['decorations'].append({'sourceId':did,'id':f'{"mr-deco" if deco_kind=="MrDeco" else "deco"}:{did}','name':deco_names.get(name_index,f'Unknown Decoration {did}'),'nameResolved':name_index in deco_names,'rarity':p.get('rare'),'slotLevel':p.get('decoration_lv'),'skills':sk,'source':clean(p)})
        product=deco_products.get((deco_kind,did))
        if product is not None:
            attach_crafting_recipe(result['decorations'][-1],product,'item_id_list','item_num_list',material_names)

    # Rampage decorations are separate from hunter-skill decorations.
    rampage_products=index_crafting_products(d.get('hyakuryu_decos_product',{}))
    rampage_names={}
    for key in ['hyakuryu_decos_name_msg']:
        rampage_names.update(msg_map(d.get(key,{}),r'HyakuryuDeco_(\d+)_Name$'))
    rampage_skill_names={}
    for key in ['hyakuryu_skill_name_msg','hyakuryu_skill_name_msg_mr']:
        rampage_skill_names.update(msg_map(d.get(key,{}),r'HyakuryuSkill_(\d+)_Name$'))
    rampage_skill_names_by_id={}
    for p_skill in param(d.get('hyakuryu_skill',{})):
        sid=key_id(p_skill.get('id'))
        if sid is not None:
            rampage_skill_names_by_id[sid]=rampage_skill_names.get(sid,f'Unknown Rampage Skill {sid}')
    for p in param(d.get('hyakuryu_decos',{})):
        did=key_id(p.get('id'))
        if did is None: continue
        sid=key_id(p.get('hyakuryu_skill_id'))
        result['rampageDecorations'].append({'sourceId':did,'id':f'rampage-deco:{did}','name':rampage_names.get(did,f'Rampage Decoration {did}'),'skillSourceId':sid,'skillName':rampage_skill_names_by_id.get(sid,f'Unknown Rampage Skill {sid}'),'slotLevel':p.get('decoration_lv'),'rarity':p.get('rare'),'source':clean(p)})
        product=rampage_products.get(typed_ref(p['id']))
        if product is not None:
            row=result['rampageDecorations'][-1]
            attach_crafting_recipe(row,product,'item_id_list','item_num_list',material_names)
            kind,category_id=typed_ref(product['material_category'])
            points=product['point']
            if type(points) is not int or points<0:
                raise ValueError(f"Invalid material points for {row['id']}: {points}")
            if points:
                name_index=200+category_id if kind=='Mr' else category_id
                name=result['materialCategoryNames'].get(kind,{}).get(name_index)
                if not name:
                    raise ValueError(f"Unknown material category for {row['id']}: {product['material_category']}")
                row['craftingCategory']={'name':name,'points':points}

    # Armor: names keyed by individual armor slot + numeric part ID.
    armor_products=index_crafting_products(d.get('armor_product',{}))
    def armor_message(prefix, source_id):
        suffix='_mr' if source_id>=300 else ''
        index=source_id-300 if source_id>=300 else source_id
        entries=d.get(prefix+suffix,{}).get('entries',[])
        if 0<=index<len(entries):
            label=entries[index]['content'][1]
            if label and not label.startswith('<COLOR'):
                return label
        return None

    # Retain the former name lookup solely for compatibility with saved IDs.
    armor_name_maps={}
    for slot in ['Head','Chest','Arm','Waist','Leg']:
        maps={}
        for suffix in ['', '_mr']:
            key=f'armor_{slot.lower()}_name_msg{suffix}'
            maps.update(msg_map(d.get(key,{}),rf'A_{slot}_(\d+)_Name$'))
        armor_name_maps[slot]=maps
    series_names={}
    for key in ['armor_series_name_msg','armor_series_name_msg_mr']:
        series_names.update(msg_map(d.get(key,{}),r'ArmorSeries_Hunter_(\d+)$'))
    series={}
    for p in param(d.get('armor_series',{})):
        sid=p.get('armor_series')
        if sid is not None: series.setdefault(sid,p)
    for p in param(d.get('armor',{})):
        if not p.get('is_valid',False): continue
        slot_obj=p.get('pl_armor_id',{})
        slot,aid=(next(iter(slot_obj.items())) if slot_obj else ('Unknown',None))
        if not isinstance(aid,int): continue
        ss=series.get(p.get('series'),{})
        # Guild Cross uses base armor ID 172 and localization index 170.
        name_index = 170 if aid == 172 and p.get('series') == 170 else aid
        previous_name = armor_name_maps.get(slot, {}).get(name_index)
        if slot == 'Waist' and aid == 170 and p.get('series') == 168:
            previous_name = series_names.get(168)
        previous_name=previous_name or f'Unknown {slot} Armor {aid}'
        # MHRice prepare_armors reads message positions, not numeric label suffixes.
        armor_name=armor_message(f'armor_{slot.lower()}_name_msg',aid)
        skill_list=[]
        for ref,lv in zip(p.get('skill_list',[]),p.get('skill_lv_list',[])):
            skill_kind,sid=typed_ref(ref)
            if sid is not None and lv:
                skill_ref_id=f'{"mr-skill" if skill_kind=="MrSkill" else "skill"}:{sid}'
                skill_list.append({'skillId':skill_ref_id,'sourceSkillId':sid,'sourceSkillKind':skill_kind,'skillName':skill_by_id.get((skill_kind,sid),{}).get('name',f'Unknown Skill {skill_kind}:{sid}'),'level':lv})
        result['armor'].append({'sourceId':aid,'id':f'armor:{slot.lower()}:{aid}','slot':SLOT_KEYS.get(slot,slot),'sourceSlot':slot,'name':armor_name or f'Unknown {slot} Armor {aid}','nameResolved':armor_name is not None,'seriesId':p.get('series'),'seriesName':series_names.get(p.get('series'),f'Armor Series {p.get("series")}'),'rarity':p.get('rare'),'rankGroup':ss.get('difficulty_group'),'defense':p.get('def_val'),'resistances':{'fire':p.get('fire_reg_val'),'water':p.get('water_reg_val'),'thunder':p.get('thunder_reg_val'),'ice':p.get('ice_reg_val'),'dragon':p.get('dragon_reg_val')},'decorationSlots':p.get('decorations_num_list',[]),'skills':skill_list,'source':clean(p)})
        product=armor_products.get((slot,aid))
        row=result['armor'][-1]
        row['seriesName']=armor_message('armor_series_name_msg',row['seriesId']) or f"Armor Series {row['seriesId']}"
        if previous_name!=row['name']:
            row['previousName']=previous_name
        result['armor'][-1]['isSelectable']=bool(armor_name or product or p.get('sort_id'))
        if product is not None and product['material_category']=='None' and product['material_category_num']==0:
            attach_crafting_recipe(result['armor'][-1],product,'item','item_num',material_names)

    # Localization uses the weapon ID. Tree indices are local to each branch.
    for key, display_class in WEAPONS.items():
        section=d.get(key,{})
        bases=param(section.get('base_data',{})); trees=param(section.get('tree',{}))
        tree_by_id={}
        for t in trees:
            wid=key_id(t.get('weapon_id'))
            if wid is not None: tree_by_id[wid]=t
        names={}
        for suffix in ['name','name_mr']:
            names.update(msg_map(section.get(suffix,{}),r'W_[A-Za-z]+_(\d+)_Name$'))
        product_by_id={}
        for section_name in ['product','change','process']:
            for prod in param(section.get(section_name,{})):
                pp=unwrap(prod.get('base',prod))
                pid=key_id(pp.get('id'))
                if pid is not None: product_by_id.setdefault(pid,[]).append({'kind':section_name,'data':clean(prod)})
        rows=[]
        for raw_item in bases:
            p=unwrap(raw_item); wid=key_id(p.get('id'))
            if wid is None: continue
            t=tree_by_id.get(wid)
            tree_index=t.get('index') if t else None
            nm=names.get(wid,'')
            if not nm: nm=f'{display_class} #{wid}'
            tree_record=clean(t) if t else None
            rows.append({'sourceId':wid,'id':f'weapon:{key}:{wid}','name':nm,'nameResolved':bool(nm) and not nm.startswith(f'{display_class} #'),'weaponClass':display_class,'rarity':p.get('rare_type'),'attack':p.get('atk'),'affinity':p.get('critical_rate'),'defenseBonus':p.get('def_bonus'),'elementType':p.get('main_element_type','None'),'elementValue':p.get('main_element_val',0),'slots':p.get('slot_num_list',[]),'rampageSlots':p.get('hyakuryu_slot_num_list',[]),'sharpness':p.get('sharpness_val_list'),'handicraft':p.get('takumi_val_list'),'tree':tree_record,'treeIndex':tree_index,'isSelectable':bool(tree_record) and p.get('atk') is not None,'crafting':product_by_id.get(wid,[]),'source':clean(raw_item)})
        result['weaponClasses'].append({'key':key,'name':display_class,'count':len(rows),'weapons':rows})

    # Validation report: no missing English labels silently replaced by a guessed name.
    all_weapons=[w for c in result['weaponClasses'] for w in c['weapons']]
    result['counts']={'weapons':len(all_weapons),'weaponClasses':len(result['weaponClasses']),'armor':len(result['armor']),'skills':len(result['skills']),'decorations':len(result['decorations']),'rampageDecorations':len(result['rampageDecorations'])}
    result['validation']={
      'selectableWeaponsMissingEnglishName':sum(1 for w in all_weapons if w['isSelectable'] and not w['nameResolved']),
      'nonSelectableWeaponsMissingEnglishName':sum(1 for w in all_weapons if not w['isSelectable'] and not w['nameResolved']),
      'armorMissingEnglishName':sum(1 for a in result['armor'] if not a['nameResolved']),
      'skillsMissingEnglishName':sum(1 for s in result['skills'] if not s['nameResolved']),
      'decorationsMissingEnglishName':sum(1 for x in result['decorations'] if not x['nameResolved']),
      'armorSkillRefsMissing':sum(1 for a in result['armor'] for s in a['skills'] if (s['sourceSkillKind'],s['sourceSkillId']) not in skill_by_id),
      'decorationSkillRefsMissing':sum(1 for x in result['decorations'] for s in x['skills'] if (s['sourceSkillKind'],s['sourceSkillId']) not in skill_by_id),
      'weaponsWithoutTreeNode':sum(1 for w in all_weapons if w['tree'] is None),
      'selectableWeapons':sum(1 for w in all_weapons if w['isSelectable']),
      'nonSelectableWeaponRecords':sum(1 for w in all_weapons if not w['isSelectable']),
    }
    out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    report={'output':str(out),'bytes':out.stat().st_size,'counts':result['counts'],'validation':result['validation'],'sourceSha':d.get('sha'),'sha256':checksum}
    out.with_suffix('.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__': main()
