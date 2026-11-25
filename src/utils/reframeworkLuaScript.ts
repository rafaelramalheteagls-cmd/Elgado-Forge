import { DECORATION_NAMES_BY_GAME_ID } from '../data/mhriceDecorationIds';
import catalog from '../data/generated/mhriceAppCatalog.json';

export const REFRAMEWORK_LUA_FILENAME = 'elgado_forge_sync.lua';
export const REFRAMEWORK_EXPORT_FILENAME = 'elgado_forge_export.json';

export const REFRAMEWORK_LUA_SCRIPT = String.raw`-- Elgado Forge Sync Exporter for Monster Hunter Rise: Sunbreak (Steam)
-- Install path: <MHRise Steam Folder>/reframework/autorun/elgado_forge_sync.lua
-- Exports: Material Item Box, Talismans, Weapons, Armor, Decorations, and HR/MR/AR.

local OUTPUT_FILE = "elgado_forge_export.json"
local SCHEMA_VERSION = "elgado-forge-reframework-v1"
local kinsect_names = {
${catalog.kinsectNames.map(name => `    [${JSON.stringify(name)}] = true,`).join('\n')}
}
local decoration_names_by_id = {
${Array.from(DECORATION_NAMES_BY_GAME_ID, ([id, name]) => `    [${id}] = ${JSON.stringify(name)},`).join('\n')}
}

local status_msg = "Ready. Load your hunter save in Kamura or Elgado, then click Export."
local last_summary = nil

local function safe_call(obj, method_name, ...)
    if obj == nil then return nil end
    local ok, res = pcall(function(...)
        return obj:call(method_name, ...)
    end, ...)
    if ok then return res end
    return nil
end

local function safe_field(obj, field_name)
    if obj == nil then return nil end
    local ok, res = pcall(function()
        return obj:get_field(field_name)
    end)
    if ok then return res end
    return nil
end

local function safe_static_call(type_name, method_name, ...)
    local ok, res = pcall(function(...)
        local td = sdk.find_type_definition(type_name)
        if not td then return nil end
        local method = td:get_method(method_name)
        if not method then return nil end
        return method:call(nil, ...)
    end, ...)
    if ok then return res end
    return nil
end

local function clean_str(val)
    if val == nil then return "" end
    local s = tostring(val)
    if s == "" or s:find("^System%.") or s:find("^#") or s == "None" or s == "---" then
        return ""
    end
    return s
end

-- Pure-Lua JSON encoder fallback so clipboard export works on every REFramework version
local function escape_json_str(s)
    s = tostring(s)
    s = s:gsub("\\", "\\\\")
         :gsub('"', '\\"')
         :gsub("\n", "\\n")
         :gsub("\r", "\\r")
         :gsub("\t", "\\t")
    return '"' .. s .. '"'
end

local function is_array(tbl)
    if type(tbl) ~= "table" then return false end
    local i = 0
    for _ in pairs(tbl) do
        i = i + 1
        if tbl[i] == nil then return false end
    end
    return i > 0
end

local function encode_json(val)
    local t = type(val)
    if t == "nil" then return "null" end
    if t == "boolean" then return val and "true" or "false" end
    if t == "number" then
        if val ~= val or val == math.huge or val == -math.huge then return "0" end
        return tostring(val)
    end
    if t == "string" then return escape_json_str(val) end
    if t == "table" then
        if is_array(val) then
            local parts = {}
            for i = 1, #val do
                parts[#parts + 1] = encode_json(val[i])
            end
            return "[" .. table.concat(parts, ",") .. "]"
        else
            local parts = {}
            for k, v in pairs(val) do
                parts[#parts + 1] = escape_json_str(k) .. ":" .. encode_json(v)
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
    end
    return "null"
end

local function list_count(list)
    if list == nil then return 0 end
    if type(list) == "table" then return #list end
    local c = safe_call(list, "get_Count")
    if type(c) == "number" then return c end
    local len = safe_call(list, "get_Length")
    if type(len) == "number" then return len end
    local sz = safe_call(list, "get_Size")
    if type(sz) == "number" then return sz end
    local ok_sz, m_sz = pcall(function() return list:get_size() end)
    if ok_sz and type(m_sz) == "number" then return m_sz end
    local size = safe_field(list, "_size")
    if type(size) == "number" then return size end
    return 0
end

local function list_get(list, idx)
    if list == nil then return nil end
    if type(list) == "table" then return list[idx + 1] end
    local item = safe_call(list, "get_Item", idx)
    if item ~= nil then return item end
    local items = safe_field(list, "_items")
    if items ~= nil then
        local ok, elem = pcall(function() return items:get_element(idx) end)
        if ok and elem ~= nil then return elem end
    end
    local ok_direct, direct_elem = pcall(function() return list:get_element(idx) end)
    if ok_direct and direct_elem ~= nil then return direct_elem end
    return nil
end

local function resolve_item_name(item_id)
    local name = safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.ItemId)", item_id)
        or safe_static_call("snow.data.DataShortcut", "getName", item_id)
    return clean_str(name)
end

local function resolve_skill_name(skill_id)
    if skill_id == nil or skill_id == 0 then return "" end
    local name = safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.PlEquipSkillId)", skill_id)
        or safe_static_call("snow.data.DataShortcut", "getName", skill_id)
    return clean_str(name)
end

local function resolve_weapon_name(equip_work)
    local name = safe_call(equip_work, "getName")
        or safe_call(equip_work, "get_Name")
    if clean_str(name) ~= "" then return clean_str(name) end

    local w_data = safe_call(equip_work, "get_PlWeaponData")
    if w_data ~= nil then
        local d_name = safe_call(w_data, "getName") or safe_call(w_data, "get_Name")
        if clean_str(d_name) ~= "" then return clean_str(d_name) end
    end

    local id_val = safe_call(equip_work, "get_Id") or safe_field(equip_work, "_Id")
    if id_val ~= nil then
        local resolved = safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.WeaponId)", id_val)
            or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.PlWeaponId)", id_val)
            or safe_static_call("snow.data.DataShortcut", "getName", id_val)
        if clean_str(resolved) ~= "" then return clean_str(resolved) end
    end
    return ""
end

local function resolve_armor_name(equip_work)
    local name = safe_call(equip_work, "getName")
        or safe_call(equip_work, "get_Name")
    if clean_str(name) ~= "" then return clean_str(name) end

    local a_data = safe_call(equip_work, "get_PlArmorData")
    if a_data ~= nil then
        local d_name = safe_call(a_data, "getName") or safe_call(a_data, "get_Name")
        if clean_str(d_name) ~= "" then return clean_str(d_name) end
    end

    local id_val = safe_call(equip_work, "get_Id") or safe_field(equip_work, "_Id")
    if id_val ~= nil then
        local resolved = safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.ArmorId)", id_val)
            or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.PlArmorId)", id_val)
            or safe_static_call("snow.data.DataShortcut", "getName", id_val)
        if clean_str(resolved) ~= "" then return clean_str(resolved) end
    end
    return ""
end

local ARMOR_ID_SLOTS = { "head", "chest", "arm", "waist", "leg" }

local function resolve_armor_catalog_id(equip_work)
    local function decode(value)
        local raw_id = tonumber(value)
        if not raw_id then return nil end
        local offset = raw_id - 0x0C100000
        local slot = ARMOR_ID_SLOTS[math.floor(offset / 0x100000) + 1]
        local index = offset % 0x100000
        if not slot or index > 0xFFFF or index ~= math.floor(index) then return nil end
        return "armor:" .. slot .. ":" .. tostring(math.floor(index))
    end
    -- EquipmentInventoryData exposes the typed armor ID separately from IdVal.
    local direct = decode(safe_call(equip_work, "get_ArmorId"))
        or decode(safe_call(equip_work, "get_IdVal") or safe_field(equip_work, "_IdVal"))
        or decode(safe_call(equip_work, "get_Id") or safe_field(equip_work, "_Id"))
    if direct then return direct end
    local armor_data = safe_call(equip_work, "get_PlArmorData")
    return decode(safe_call(armor_data, "get_PlArmorId") or safe_field(armor_data, "_PlArmorId"))
end

local function describe_armor_id_members(equip_work)
    local ok, td = pcall(function() return equip_work:get_type_definition() end)
    if not ok or not td then return nil end
    local ok_name, type_name = pcall(function() return td:get_full_name() end)
    local diagnostic = { type = ok_name and type_name or "unknown", members = {} }
    local function collect(members, kind)
        for _, member in ipairs(members or {}) do
            local ok_member, name = pcall(function() return member:get_name() end)
            if ok_member and type(name) == "string" then
                local lower = name:lower()
                if lower:find("armor") or lower:find("id") or lower:find("sex") then
                    diagnostic.members[#diagnostic.members + 1] = kind .. " " .. name
                end
            end
        end
    end
    local ok_methods, methods = pcall(function() return td:get_methods() end)
    if ok_methods then collect(methods, "method") end
    local ok_fields, fields = pcall(function() return td:get_fields() end)
    if ok_fields then collect(fields, "field") end
    return diagnostic
end

local function expand_talisman_slots(sl_list)
    if sl_list == nil then return { 0, 0, 0 } end
    local count = list_count(sl_list)
    if count >= 4 then
        -- A five-entry array starts with a Lv0 bucket; the four-entry form starts at Lv1.
        local offset = count >= 5 and 1 or 0
        local expanded = {}
        for level = 4, 1, -1 do
            local copies = tonumber(list_get(sl_list, level - 1 + offset)) or 0
            for _ = 1, math.min(3 - #expanded, math.floor(copies)) do
                expanded[#expanded + 1] = level
            end
        end
        return { expanded[1] or 0, expanded[2] or 0, expanded[3] or 0 }
    end
    local sl1 = tonumber(list_get(sl_list, 0) or 0) or 0
    local sl2 = tonumber(list_get(sl_list, 1) or 0) or 0
    local sl3 = tonumber(list_get(sl_list, 2) or 0) or 0
    return { math.floor(sl1), math.floor(sl2), math.floor(sl3) }
end

local function is_rampage_deco(id)
    return id ~= nil and id > 0x00100000 and id <= 0x0010FFFF
end

local function add_equipped_rampage_deco(eq, ids)
    local list = safe_field(eq, "_HyakuryuDecoIdList")
        or safe_call(eq, "getHyakuryuDecoIdList()")
        or safe_call(eq, "get_HyakuryuDecoIdList")
    local id = nil
    for index = 0, list_count(list) - 1 do
        local candidate = tonumber(list_get(list, index))
        if is_rampage_deco(candidate) then
            id = candidate
            break
        end
    end
    id = id or tonumber(safe_field(eq, "_HyakuryuDecoId") or safe_call(eq, "get_HyakuryuDecoId"))
    if not is_rampage_deco(id) then
        id = tonumber(safe_field(eq, "_WeaponHyakuryuDecoId") or safe_call(eq, "get_WeaponHyakuryuDecoId"))
    end
    if is_rampage_deco(id) then ids[id] = (ids[id] or 0) + 1 end
end

local function read_ranks(dm)
    local hr, mr, ar = 1, 0, 0
    local hunter_name = "Elgado Hunter"

    local progress = sdk.get_managed_singleton("snow.progress.ProgressManager")
    local rank_val = safe_call(dm, "get_HunterRank") or safe_call(progress, "get_HunterRank") or safe_field(dm, "_HunterRank")
    if type(rank_val) == "number" and rank_val > 0 then hr = rank_val end

    local mr_val = safe_call(dm, "get_MasterRank") or safe_call(progress, "get_MasterRank") or safe_field(dm, "_MasterRank")
    if type(mr_val) == "number" and mr_val >= 0 then mr = mr_val end

    local mystery = safe_call(dm, "get_MysteryResearchData") or safe_field(dm, "_MysteryResearchData")
    local ar_val = safe_call(mystery, "get_ResearchLevel")
        or safe_field(mystery, "_ResearchLevel")
        or safe_call(progress, "get_MysteryResearchLevel")
        or safe_call(dm, "get_MysteryResearchLevel")
    if type(ar_val) == "number" and ar_val >= 0 then ar = ar_val end

    local player_info = safe_call(dm, "get_PlayerName") or safe_field(dm, "_PlayerName")
    if clean_str(player_info) ~= "" then hunter_name = clean_str(player_info) end

    return {
        hunterName = hunter_name,
        hr = hr,
        mr = mr,
        ar = ar,
    }
end

local function scan_item_box(dm)
    local materials = {}
    local item_box = safe_call(dm, "get_PlItemBox") or safe_field(dm, "_PlItemBox")
    if not item_box then return nil, 0 end

    local inv_list = safe_call(item_box, "get_InventoryList") or safe_field(item_box, "_InventoryList")
    local total = list_count(inv_list)
    if total <= 0 then return nil, 0 end
    local count_added = 0

    for i = 0, total - 1 do
        local entry = list_get(inv_list, i)
        if entry then
            local num = safe_call(entry, "get_Count") or safe_call(entry, "get_Num") or safe_field(entry, "_Num") or safe_field(entry, "_Count") or 0
            if type(num) == "number" and num > 0 then
                local item_id = safe_call(entry, "get_Id") or safe_call(entry, "get_ItemId") or safe_field(entry, "_Id") or safe_field(entry, "_ItemId")
                if item_id ~= nil and item_id ~= 0 then
                    local name = resolve_item_name(item_id)
                    if name ~= "" then
                        materials[name] = (materials[name] or 0) + math.floor(num)
                        count_added = count_added + 1
                    end
                end
            end
        end
    end
    return materials, count_added
end

local function scan_equipment_box(dm)
    local weapons, armor, talismans = {}, {}, {}
    local seen_weapons, seen_armor = {}, {}
    local armor_diagnostics = nil
    local equipped_decorations = {}
    local equipment_with_deco_lists = 0
    local scanned_equipment = {}

    local equip_box = safe_call(dm, "get_PlEquipBox") or safe_field(dm, "_PlEquipBox")
    if not equip_box then return nil, nil, nil, nil, equipped_decorations, equipment_with_deco_lists end

    local inv_list = safe_call(equip_box, "get_WeaponArmorInventoryList")
        or safe_call(equip_box, "get_InventoryList")
        or safe_field(equip_box, "_WeaponArmorInventoryList")
        or safe_field(equip_box, "_InventoryList")

    local total = list_count(inv_list)
    if total <= 0 then return nil, nil, nil, nil, equipped_decorations, equipment_with_deco_lists end
    for i = 0, total - 1 do
        local eq = list_get(inv_list, i)
        if eq then
            local id_type = safe_call(eq, "get_IdType") or safe_field(eq, "_IdType")
            local id_type_num = tonumber(id_type)
            local enum_str = safe_call(id_type, "ToString")
            local type_str = tostring(enum_str or id_type or ""):lower()

            -- Type checks: Weapon (1), Armor (2), Talisman (3), Kinsect/Insect (4)
            local is_insect = (id_type_num == 4) or type_str:find("insect") or type_str:find("bug") or safe_call(eq, "isInsect") == true
            local is_talisman = (not is_insect) and ((id_type_num == 3) or type_str:find("talisman") or safe_call(eq, "isTalisman") == true)
            local is_weapon = (not is_insect) and (not is_talisman) and ((id_type_num == 1) or type_str:find("weapon") or safe_call(eq, "isWeapon") == true)
            local is_armor = (not is_insect) and (not is_talisman) and (not is_weapon) and ((id_type_num == 2) or type_str:find("armor") or safe_call(eq, "isArmor") == true)
            local weapon_name = is_weapon and resolve_weapon_name(eq) or ""
            is_weapon = is_weapon and not kinsect_names[weapon_name]

            if (is_weapon or is_armor or is_talisman) and not scanned_equipment[eq] then
                scanned_equipment[eq] = true
                local deco_ids = safe_field(eq, "_DecoIdList") or safe_call(eq, "getDecoIdList()")
                if deco_ids then
                    equipment_with_deco_lists = equipment_with_deco_lists + 1
                    for slot = 0, list_count(deco_ids) - 1 do
                        local id = tonumber(list_get(deco_ids, slot))
                        if id and id >= 1 and id <= 1000 then
                            equipped_decorations[id] = (equipped_decorations[id] or 0) + 1
                        end
                    end
                end
                if is_weapon then
                    add_equipped_rampage_deco(eq, equipped_decorations)
                end
            end

            if is_talisman then
                local sk_list = safe_call(eq, "get_TalismanSkillIdList") or safe_field(eq, "_TalismanSkillIdList")
                local lv_list = safe_call(eq, "get_TalismanSkillLvList") or safe_field(eq, "_TalismanSkillLvList")
                local sl_list = safe_call(eq, "get_TalismanDecoSlotNumList") or safe_field(eq, "_TalismanDecoSlotNumList")

                local s1_id = list_get(sk_list, 0)
                local s2_id = list_get(sk_list, 1)
                local l1 = tonumber(list_get(lv_list, 0) or 0) or 0
                local l2 = tonumber(list_get(lv_list, 1) or 0) or 0

                local s1_name = resolve_skill_name(s1_id)
                local s2_name = resolve_skill_name(s2_id)
                local slots = expand_talisman_slots(sl_list)

                if s1_name ~= "" and l1 > 0 then
                    talismans[#talismans + 1] = {
                        skill1 = s1_name,
                        skill1Level = math.floor(l1),
                        skill2 = s2_name,
                        skill2Level = math.floor(l2),
                        slots = slots,
                    }
                end
            elseif is_weapon then
                local name = weapon_name
                if name ~= "" and not seen_weapons[name] then
                    seen_weapons[name] = true
                    weapons[#weapons + 1] = name
                end
            elseif is_armor then
                local name = resolve_armor_name(eq)
                local id = resolve_armor_catalog_id(eq)
                if not id and not armor_diagnostics then
                    armor_diagnostics = describe_armor_id_members(eq)
                end
                local key = id or name
                if key ~= "" and not seen_armor[key] then
                    seen_armor[key] = true
                    armor[#armor + 1] = id and { id = id, name = name } or name
                end
            end
        end
    end

    return weapons, armor, talismans, armor_diagnostics, equipped_decorations, equipment_with_deco_lists
end

local function resolve_deco_name_by_id(deco_id)
    if deco_id == nil or deco_id == 0 then return "" end
    local resolved = safe_static_call("snow.data.DataShortcut", "getName(snow.equip.DecorationsId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.DecorationsId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.DecorationsId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.HyakuryuDecoId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.HyakuryuDecoId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.PlDecorationsId)", deco_id)
    return clean_str(resolved)
end

local function read_deco_id(entry)
    return safe_call(entry, "get_DecorationsId")
        or safe_call(entry, "get_DecoId")
        or safe_call(entry, "get_HyakuryuDecoId")
        or safe_call(entry, "get_Id")
        or safe_field(entry, "_DecorationsId")
        or safe_field(entry, "_DecoId")
        or safe_field(entry, "_HyakuryuDecoId")
        or safe_field(entry, "_Id")
end

local function resolve_deco_name(entry, deco_id)
    if deco_id ~= nil then
        local resolved = resolve_deco_name_by_id(deco_id)
        if resolved ~= "" then return resolved end
    end

    local data_obj = safe_call(entry, "get_DecorationsData")
        or safe_call(entry, "get_DecoData")
        or safe_call(entry, "get_HyakuryuDecoData")
        or safe_field(entry, "_DecorationsData")
    if data_obj ~= nil then
        local d_name = clean_str(safe_call(data_obj, "getName") or safe_call(data_obj, "get_Name"))
        if d_name ~= "" then return d_name end
    end

    local direct = clean_str(safe_call(entry, "getName") or safe_call(entry, "get_Name"))
    if direct ~= "" then return direct end

    return ""
end

local function read_deco_count(entry)
    -- DecorationsInventoryData exposes getCount(), distinct from get_Count().
    local count = safe_call(entry, "getCount()")
    if type(count) == "number" and count >= 0 and count <= 999 then return math.floor(count) end

    local total_num = safe_call(entry, "get_TotalNum") or safe_field(entry, "_TotalNum")
    if type(total_num) == "number" and total_num > 0 and total_num <= 999 then return math.floor(total_num) end

    local box_num = safe_call(entry, "get_PossessionNum")
        or safe_call(entry, "get_HaveNum")
        or safe_call(entry, "get_StockNum")
        or safe_call(entry, "get_InventoryNum")
        or safe_call(entry, "get_BoxNum")
        or safe_field(entry, "_PossessionNum")
        or safe_field(entry, "_HaveNum")
        or safe_field(entry, "_StockNum")
        or safe_field(entry, "_InventoryNum")
        or safe_field(entry, "_BoxNum")
        or safe_call(entry, "get_Count")
        or safe_call(entry, "get_Num")
        or safe_field(entry, "_Count")
        or safe_field(entry, "_Num")
        or 0

    local eq_num = safe_call(entry, "get_EquippedNum") or safe_field(entry, "_EquippedNum") or 0
    if type(box_num) ~= "number" or box_num < 0 or box_num > 999 then box_num = 0 end
    if type(eq_num) ~= "number" or eq_num < 0 or eq_num > 999 then eq_num = 0 end
    return math.floor(math.max(box_num, eq_num))
end

local function scan_decorations_box(dm, equipped_decorations)
    local decos = {}
    local seen_counts = {}
    local loose_counts = {}
    local names_by_id = {}
    local visited_containers = {}
    local visited_lists = {}
    local containers = {}
    local found_list = false
    local sample_entry = nil
    local count_samples = {}
    local sampled_names = {}

    local function add_container(obj)
        if obj == nil or type(obj) == "number" or type(obj) == "string" or type(obj) == "boolean" then return end
        local key = tostring(obj)
        if visited_containers[key] then return end
        visited_containers[key] = true
        containers[#containers + 1] = obj
    end

    local function scan_deco_list(inv_list, is_primary_list)
        if inv_list == nil then return end
        local list_key = tostring(inv_list)
        if visited_lists[list_key] then return end
        visited_lists[list_key] = true

        local total = list_count(inv_list)
        if total <= 0 then return end

        local list_counts = {}
        for i = 0, total - 1 do
            local entry = list_get(inv_list, i)
            -- Only read managed decoration objects (skip raw int/bitflag arrays like material categories)
            if entry ~= nil and type(entry) ~= "number" and type(entry) ~= "boolean" and type(entry) ~= "string" then
                sample_entry = sample_entry or entry
                local qty = read_deco_count(entry)
                local deco_id = read_deco_id(entry)
                local name = qty > 0 and resolve_deco_name(entry, deco_id) or ""
                if name ~= "" then
                    local numeric_id = tonumber(deco_id)
                    if numeric_id then names_by_id[numeric_id] = name end
                    if not sampled_names[name] and (#count_samples < 2 or name == "Blaze Jewel 1") then
                        sampled_names[name] = true
                        if name == "Blaze Jewel 1" then sample_entry = entry end
                        local sample = { name = name, id = numeric_id, exported = qty, getters = {}, fields = {} }
                        for _, method in ipairs({ "getCount()", "getRemainingCount()" }) do
                            local value = safe_call(entry, method)
                            if type(value) == "number" then sample.getters[method] = value end
                        end
                        -- Read the same explicitly named count properties used by the exporter.
                        for _, key in ipairs({ "TotalNum", "PossessionNum", "HaveNum", "StockNum",
                            "InventoryNum", "BoxNum", "Count", "Num", "EquippedNum" }) do
                            local value = safe_call(entry, "get_" .. key)
                            if type(value) == "number" then sample.getters[key] = value end
                            value = safe_field(entry, "_" .. key)
                            if type(value) == "number" then sample.fields[key] = value end
                        end
                        count_samples[#count_samples + 1] = sample
                    end
                    if qty <= 999 then
                        found_list = true
                        list_counts[name] = (list_counts[name] or 0) + qty
                        if is_primary_list and safe_call(entry, "isAnyEquipmentApplied()") == false then
                            loose_counts[name] = (loose_counts[name] or 0) + qty
                        end
                    end
                end
            end
        end

        for name, qty in pairs(list_counts) do
            seen_counts[name] = math.max(seen_counts[name] or 0, qty)
        end
    end

    local equip_box = safe_call(dm, "get_PlEquipBox") or safe_field(dm, "_PlEquipBox")
    local equip_dm = sdk.get_managed_singleton("snow.data.EquipDataManager")
    local deco_dm = sdk.get_managed_singleton("snow.data.DecorationsDataManager")

    local roots = {}
    if dm ~= nil then roots[#roots + 1] = dm end
    if equip_box ~= nil then roots[#roots + 1] = equip_box end
    if equip_dm ~= nil then roots[#roots + 1] = equip_dm end
    if deco_dm ~= nil then roots[#roots + 1] = deco_dm end

    local explicit_boxes = {
        "PlDecorationsBox", "PlDecoBox", "DecorationsBox", "DecoBox",
        "PlHyakuryuDecoBox", "HyakuryuDecoBox", "HyakuryuDecorationsBox",
    }

    for _, root in ipairs(roots) do
        add_container(root)
        for _, bname in ipairs(explicit_boxes) do
            add_container(safe_call(root, "get_" .. bname) or safe_field(root, "_" .. bname))
        end

    end

    local explicit_lists = {
        "NonFilteredDecorationsInventoryList",
        "DecoInventoryList", "DecorationsInventoryList", "HyakuryuDecoInventoryList",
        "HyakuryuDecorationsInventoryList", "PlDecorationsInfoList", "PlDecoInfoList",
        "DecoBoxList", "DecorationsList", "DecoList", "DecoStockList",
        "InventoryList", "StockList",
    }

    for _, container in ipairs(containers) do
        local is_root = (container == dm or container == equip_box or container == equip_dm)
        for _, lname in ipairs(explicit_lists) do
            local is_deco_specific = lname:lower():find("deco") ~= nil
            if (not is_root) or is_deco_specific then
                scan_deco_list(
                    safe_call(container, "get_" .. lname) or safe_field(container, "_" .. lname),
                    lname == "NonFilteredDecorationsInventoryList"
                )
            end
        end

    end

    for _, sample in ipairs(count_samples) do
        sample.box = seen_counts[sample.name] or 0
    end

    local equipped_by_name = {}
    for id, qty in pairs(equipped_decorations) do
        local name = names_by_id[id] or decoration_names_by_id[id] or resolve_deco_name_by_id(id)
        if name ~= "" then equipped_by_name[name] = (equipped_by_name[name] or 0) + qty end
    end

    for name, qty in pairs(equipped_by_name) do
        -- The box may already contain rows for equipped decorations. Only add
        -- stock explicitly identified as loose, and keep the larger observed total.
        seen_counts[name] = math.max(seen_counts[name] or 0, (loose_counts[name] or 0) + qty)
        found_list = true
    end

    for _, sample in ipairs(count_samples) do
        sample.loose = loose_counts[sample.name] or 0
        sample.equipped = equipped_by_name[sample.name] or 0
        sample.exported = seen_counts[sample.name] or 0
    end

    for name, qty in pairs(seen_counts) do
        decos[#decos + 1] = {
            name = name,
            quantity = qty,
        }
    end
    table.sort(decos, function(a, b) return a.name < b.name end)

    local diagnostic = nil
    if not found_list or sample_entry then
        diagnostic = {}
        local seen_types = {}
        add_container(sample_entry)
        for _, container in ipairs(containers) do
            local ok, td = pcall(function() return container:get_type_definition() end)
            if ok and td and not seen_types[tostring(td)] then
                seen_types[tostring(td)] = true
                local ok_name, type_name = pcall(function() return td:get_full_name() end)
                local entry = { type = ok_name and type_name or "unknown", members = {} }
                -- Inspect metadata only. Never call a game method discovered here.
                local function add_member(member, kind)
                    local ok_member, name = pcall(function() return member:get_name() end)
                    if not ok_member or type(name) ~= "string" then return end
                    local lower = name:lower()
                    if lower:find("deco") or lower:find("stock")
                        or (container == sample_entry and (lower:find("num") or lower:find("count")
                            or lower:find("equip") or lower:find("id") or lower:find("name"))) then
                        local detail = kind .. " " .. name
                        if kind == "method" and container == sample_entry then
                            local ok_params, count = pcall(function() return member:get_num_params() end)
                            if ok_params and type(count) == "number" then detail = detail .. " [" .. count .. " params]" end
                        end
                        entry.members[#entry.members + 1] = detail
                    end
                end
                local ok_methods, methods = pcall(function() return td:get_methods() end)
                if ok_methods then
                    for _, method in ipairs(methods or {}) do add_member(method, "method") end
                end
                local ok_fields, fields = pcall(function() return td:get_fields() end)
                if ok_fields then
                    for _, field in ipairs(fields or {}) do add_member(field, "field") end
                end
                diagnostic[#diagnostic + 1] = entry
            end
        end
    end
    return decos, found_list, diagnostic, count_samples
end

local function build_snapshot()
    local dm = sdk.get_managed_singleton("snow.data.DataManager")
    if not dm then
        return nil, "DataManager singleton unavailable. Load into Kamura or Elgado first."
    end

    local profile = read_ranks(dm)
    local materials, mat_count = scan_item_box(dm)
    local weapons, armor, talismans, armor_diagnostics, equipped_decorations, equipment_with_deco_lists = scan_equipment_box(dm)
    local decorations, found_decorations, decoration_diagnostics, decoration_count_samples =
        scan_decorations_box(dm, equipped_decorations)
    local equipped_decoration_ids = {}
    for id, quantity in pairs(equipped_decorations) do
        equipped_decoration_ids[#equipped_decoration_ids + 1] = { id = id, quantity = quantity }
    end
    table.sort(equipped_decoration_ids, function(a, b) return a.id < b.id end)

    local payload = {
        schema = SCHEMA_VERSION,
        exporterRevision = 2,
        exportedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        profile = profile,
        materials = materials,
        talismans = talismans,
        weapons = weapons,
        armor = armor,
        armorDiagnostics = armor_diagnostics,
        decorations = found_decorations and decorations or nil,
        decorationCountsComplete = found_decorations == true,
        decorationCountSamples = decoration_count_samples,
        decorationEquipmentListsRead = equipment_with_deco_lists,
        equippedDecorationIdCounts = equipped_decoration_ids,
        decorationDiagnostics = decoration_diagnostics,
    }

    last_summary = {
        hr = profile.hr,
        mr = profile.mr,
        ar = profile.ar,
        materials = mat_count,
        talismans = talismans and #talismans or 0,
        weapons = weapons and #weapons or 0,
        armor = armor and #armor or 0,
        decorations = #decorations,
        found_decorations = found_decorations,
    }

    return payload, nil
end

local function save_payload(payload)
    if not json or type(json.dump_file) ~= "function" then return false end
    local ok, result = pcall(json.dump_file, OUTPUT_FILE, payload)
    return ok and result ~= false
end

local function serialize_payload(payload)
    if json and type(json.dump_string) == "function" then
        local ok, str = pcall(json.dump_string, payload)
        if ok and type(str) == "string" and #str > 2 then
            return str
        end
    end
    return encode_json(payload)
end

re.on_draw_ui(function()
    if imgui.collapsing_header("Elgado Forge Sync Exporter") then
        imgui.text("Exports Materials, Talismans, Weapons, Armor, Decorations & HR/MR/AR.")

        if imgui.button("Export to JSON File (reframework/data)") then
            local payload, err = build_snapshot()
            if err then
                status_msg = "Error: " .. err
            else
                if save_payload(payload) then
                    status_msg = string.format(
                        "Saved reframework/data/%s (%d materials, %d talismans, %d weapons, %d armor, %d decos)",
                        OUTPUT_FILE,
                        last_summary.materials,
                        last_summary.talismans,
                        last_summary.weapons,
                        last_summary.armor,
                        last_summary.decorations
                    )
                else
                    status_msg = "Failed writing file. Try Copy JSON to Clipboard instead."
                end
            end
        end

        imgui.same_line()

        if imgui.button("Export & Copy JSON to Clipboard") then
            local payload, err = build_snapshot()
            if err then
                status_msg = "Error: " .. err
            else
                local clipboard_json = serialize_payload(payload)
                local copied = false
                if sdk and type(sdk.copy_to_clipboard) == "function" then
                    local ok, res = pcall(sdk.copy_to_clipboard, clipboard_json)
                    copied = ok and (res ~= false)
                end
                if not copied and imgui and type(imgui.set_clipboard_text) == "function" then
                    local ok = pcall(imgui.set_clipboard_text, clipboard_json)
                    copied = ok
                end
                if copied then
                    status_msg = "Copied JSON snapshot to clipboard! Paste or drop into Elgado Forge."
                elseif save_payload(payload) then
                    status_msg = "Saved reframework/data/" .. OUTPUT_FILE .. " (clipboard unavailable)."
                else
                    status_msg = "Could not copy or save the snapshot."
                end
            end
        end

        imgui.text(status_msg)

        if last_summary then
            if not last_summary.found_decorations then
                imgui.text("Decoration list unavailable. Existing decoration inventory will be kept.")
            end
            imgui.text(string.format(
                "Last Scan -> HR %d | MR %d | AR %d | Materials: %d | Talismans: %d | Weapons: %d | Armor: %d | Decos: %d",
                last_summary.hr,
                last_summary.mr,
                last_summary.ar,
                last_summary.materials,
                last_summary.talismans,
                last_summary.weapons,
                last_summary.armor,
                last_summary.decorations
            ))
        end
    end
end)
`;

export const SAMPLE_REFRAMEWORK_EXPORT_JSON = JSON.stringify(
  {
    schema: 'elgado-forge-reframework-v1',
    exportedAt: '2026-11-20T18:00:00Z',
    profile: {
      hunterName: 'Elgado Hunter',
      hr: 312,
      mr: 185,
      ar: 241,
    },
    materials: {
      'Primordial Bloodstone': 3,
      'Silver-rimmed Shard': 14,
      'Risen Dragonbone': 9,
      'Afflicted Direhorn': 18,
      'Afflicted Cortex': 24,
      'Sovereign Jewel': 12,
      'Pure Dragon Blood': 22,
      'Eltalite Ore': 48,
      'Adamantine Jewel': 16,
      'Melding Pudding': 11,
    },
    talismans: [
      {
        skill1: 'Frostcraft',
        skill1Level: 3,
        skill2: 'Weakness Exploit',
        skill2Level: 2,
        slots: [2, 2, 0],
      },
      {
        skill1: 'Berserk',
        skill1Level: 2,
        skill2: 'Mail of Hellfire',
        skill2Level: 1,
        slots: [2, 2, 1],
      },
    ],
    weapons: [
      'Silver Slicing Scythe',
      'Primal Twin Blades',
      'Sovereign Lance',
    ],
    armor: [
      'Risen Kaiser Horns',
      'Primal Mail',
      'Primal Vambraces',
      'Virtue Coil',
      'Primal Greaves',
    ],
    decorations: [
      { name: 'Attack Jewel+ 4', quantity: 3 },
      { name: 'Expert Jewel+ 4', quantity: 2 },
      { name: 'Tenderizer Jewel 2', quantity: 3 },
    ],
  },
  null,
  2
);

export function downloadReFrameworkLuaScript(): void {
  const blob = new Blob([REFRAMEWORK_LUA_SCRIPT], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = REFRAMEWORK_LUA_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
