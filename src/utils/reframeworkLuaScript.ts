export const REFRAMEWORK_LUA_FILENAME = 'elgado_forge_sync.lua';
export const REFRAMEWORK_EXPORT_FILENAME = 'elgado_forge_export.json';

export const REFRAMEWORK_LUA_SCRIPT = String.raw`-- Elgado Forge Sync Exporter for Monster Hunter Rise: Sunbreak (Steam)
-- Install path: <MHRise Steam Folder>/reframework/autorun/elgado_forge_sync.lua
-- Exports: Material Item Box, Talismans, Weapons, Armor, Decorations, and HR/MR/AR.

local OUTPUT_FILE = "elgado_forge_export.json"
local SCHEMA_VERSION = "elgado-forge-reframework-v1"

local status_msg = "Ready. Load your hunter save in Kamura or Elgado, then click Export."
local last_summary = nil
local last_json_cache = ""

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

local function expand_talisman_slots(sl_list)
    if sl_list == nil then return { 0, 0, 0 } end
    local count = list_count(sl_list)
    if count >= 4 then
        -- MHRise stores slot counts per level: [lv1_count, lv2_count, lv3_count, lv4_count]
        local c1 = tonumber(list_get(sl_list, 0) or 0) or 0
        local c2 = tonumber(list_get(sl_list, 1) or 0) or 0
        local c3 = tonumber(list_get(sl_list, 2) or 0) or 0
        local c4 = tonumber(list_get(sl_list, 3) or 0) or 0
        local expanded = {}
        for _ = 1, math.floor(c4) do expanded[#expanded + 1] = 4 end
        for _ = 1, math.floor(c3) do expanded[#expanded + 1] = 3 end
        for _ = 1, math.floor(c2) do expanded[#expanded + 1] = 2 end
        for _ = 1, math.floor(c1) do expanded[#expanded + 1] = 1 end
        return { expanded[1] or 0, expanded[2] or 0, expanded[3] or 0 }
    end
    local sl1 = tonumber(list_get(sl_list, 0) or 0) or 0
    local sl2 = tonumber(list_get(sl_list, 1) or 0) or 0
    local sl3 = tonumber(list_get(sl_list, 2) or 0) or 0
    return { math.floor(sl1), math.floor(sl2), math.floor(sl3) }
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
    if not item_box then return materials, 0 end

    local inv_list = safe_call(item_box, "get_InventoryList") or safe_field(item_box, "_InventoryList")
    local total = list_count(inv_list)
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

    local equip_box = safe_call(dm, "get_PlEquipBox") or safe_field(dm, "_PlEquipBox")
    if not equip_box then return weapons, armor, talismans end

    local inv_list = safe_call(equip_box, "get_WeaponArmorInventoryList")
        or safe_call(equip_box, "get_InventoryList")
        or safe_field(equip_box, "_WeaponArmorInventoryList")
        or safe_field(equip_box, "_InventoryList")

    local total = list_count(inv_list)
    for i = 0, total - 1 do
        local eq = list_get(inv_list, i)
        if eq then
            local id_type = safe_call(eq, "get_IdType") or safe_field(eq, "_IdType")
            local id_type_num = tonumber(id_type)
            local enum_str = safe_call(id_type, "ToString")
            local type_str = tostring(enum_str or id_type or "")

            -- Type checks: Weapon (1), Armor (2), Talisman (3), Kinsect/Insect (4)
            local is_insect = (id_type_num == 4) or type_str:find("Insect") or type_str:find("Bug") or safe_call(eq, "isInsect") == true
            local is_talisman = (not is_insect) and ((id_type_num == 3) or type_str:find("Talisman") or safe_call(eq, "isTalisman") == true)
            local is_weapon = (not is_insect) and (not is_talisman) and ((id_type_num == 1) or type_str:find("Weapon") or safe_call(eq, "isWeapon") == true)
            local is_armor = (not is_insect) and (not is_talisman) and (not is_weapon) and ((id_type_num == 2) or type_str:find("Armor") or safe_call(eq, "isArmor") == true)

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
                local name = resolve_weapon_name(eq)
                if name ~= "" and not seen_weapons[name] then
                    seen_weapons[name] = true
                    weapons[#weapons + 1] = name
                end
            elseif is_armor then
                local name = resolve_armor_name(eq)
                if name ~= "" and not seen_armor[name] then
                    seen_armor[name] = true
                    armor[#armor + 1] = name
                end
            end
        end
    end

    return weapons, armor, talismans
end

local function resolve_deco_name_by_id(deco_id)
    if deco_id == nil or deco_id == 0 then return "" end
    local resolved = safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.DecorationsId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.DecorationsId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.HyakuryuDecoId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.ContentsIdSystem.HyakuryuDecoId)", deco_id)
        or safe_static_call("snow.data.DataShortcut", "getName(snow.data.DataDef.PlDecorationsId)", deco_id)
    return clean_str(resolved)
end

local function resolve_deco_name(entry)
    if entry == nil then return "" end
    local deco_id = safe_call(entry, "get_DecorationsId")
        or safe_call(entry, "get_DecoId")
        or safe_call(entry, "get_HyakuryuDecoId")
        or safe_call(entry, "get_Id")
        or safe_field(entry, "_DecorationsId")
        or safe_field(entry, "_DecoId")
        or safe_field(entry, "_HyakuryuDecoId")
        or safe_field(entry, "_Id")
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
    local total_num = safe_call(entry, "get_TotalNum") or safe_field(entry, "_TotalNum")
    if type(total_num) == "number" and total_num > 0 and total_num <= 999 then return math.floor(total_num) end

    local box_num = safe_call(entry, "get_PossessionNum")
        or safe_call(entry, "get_HaveNum")
        or safe_call(entry, "get_Count")
        or safe_call(entry, "get_Num")
        or safe_call(entry, "get_StockNum")
        or safe_call(entry, "get_InventoryNum")
        or safe_call(entry, "get_BoxNum")
        or safe_field(entry, "_PossessionNum")
        or safe_field(entry, "_HaveNum")
        or safe_field(entry, "_Count")
        or safe_field(entry, "_Num")
        or safe_field(entry, "_StockNum")
        or safe_field(entry, "_InventoryNum")
        or 0

    local eq_num = safe_call(entry, "get_EquippedNum") or safe_field(entry, "_EquippedNum") or 0
    if type(box_num) ~= "number" or box_num < 0 or box_num > 999 then box_num = 0 end
    if type(eq_num) ~= "number" or eq_num < 0 or eq_num > 999 then eq_num = 0 end
    return math.floor(math.max(box_num, eq_num))
end

local function is_excluded_deco_member(lname)
    return lname:find("slot")
        or lname:find("talisman")
        or lname:find("material")
        or lname:find("scrap")
        or lname:find("flag")
        or lname:find("unlock")
        or lname:find("point")
        or lname:find("skill")
        or lname:find("recipe")
        or lname:find("product")
        or lname:find("quest")
        or lname:find("weapon")
        or lname:find("armor")
        or lname:find("preset")
        or lname:find("category")
end

local function scan_decorations_box(dm)
    local decos = {}
    local seen_counts = {}
    local visited_containers = {}
    local visited_lists = {}
    local containers = {}

    local function add_container(obj)
        if obj == nil or type(obj) == "number" or type(obj) == "string" or type(obj) == "boolean" then return end
        local key = tostring(obj)
        if visited_containers[key] then return end
        visited_containers[key] = true
        containers[#containers + 1] = obj
    end

    local function scan_deco_list(inv_list)
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
                local qty = read_deco_count(entry)
                if qty > 0 and qty <= 999 then
                    local name = resolve_deco_name(entry)
                    if name ~= "" then
                        list_counts[name] = (list_counts[name] or 0) + qty
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

        -- Reflection discovery of decoration sub-boxes only (strictly excludes material/weapon/flag objects)
        local ok_td, td = pcall(function() return root:get_type_definition() end)
        if ok_td and td ~= nil then
            local ok_m, methods = pcall(function() return td:get_methods() end)
            if ok_m and methods ~= nil then
                for _, m in ipairs(methods) do
                    local ok_n, mname = pcall(function() return m:get_name() end)
                    local ok_p, nparams = pcall(function() return m:get_num_params() end)
                    if ok_n and ok_p and type(mname) == "string" and nparams == 0 then
                        local lm = mname:lower()
                        if (lm:find("deco") or lm:find("hyakuryudeco")) and (lm:find("box") or lm:find("data") or lm:find("info")) and (not is_excluded_deco_member(lm)) then
                            local ok_c, res = pcall(function() return m:call(root) end)
                            if ok_c and res ~= nil then
                                add_container(res)
                            end
                        end
                    end
                end
            end
            local ok_f, fields = pcall(function() return td:get_fields() end)
            if ok_f and fields ~= nil then
                for _, f in ipairs(fields) do
                    local ok_n, fname = pcall(function() return f:get_name() end)
                    if ok_n and type(fname) == "string" then
                        local lf = fname:lower()
                        if (lf:find("deco") or lf:find("hyakuryudeco")) and (lf:find("box") or lf:find("data") or lf:find("info")) and (not is_excluded_deco_member(lf)) then
                            local ok_d, res = pcall(function() return f:get_data(root) end)
                            if ok_d and res ~= nil then
                                add_container(res)
                            end
                        end
                    end
                end
            end
        end
    end

    local explicit_lists = {
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
                scan_deco_list(safe_call(container, "get_" .. lname) or safe_field(container, "_" .. lname))
            end
        end

        -- Reflection discovery of decoration list/array on container
        local ok_td, td = pcall(function() return container:get_type_definition() end)
        if ok_td and td ~= nil then
            local ok_m, methods = pcall(function() return td:get_methods() end)
            if ok_m and methods ~= nil then
                for _, m in ipairs(methods) do
                    local ok_n, mname = pcall(function() return m:get_name() end)
                    local ok_p, nparams = pcall(function() return m:get_num_params() end)
                    if ok_n and ok_p and type(mname) == "string" and nparams == 0 then
                        local lm = mname:lower()
                        local relevant = lm:find("deco") or ((not is_root) and (lm:find("list") or lm:find("inventory") or lm:find("stock")))
                        if relevant and (not is_excluded_deco_member(lm)) then
                            local ok_c, res = pcall(function() return m:call(container) end)
                            if ok_c and res ~= nil and list_count(res) > 0 then
                                scan_deco_list(res)
                            end
                        end
                    end
                end
            end
            local ok_f, fields = pcall(function() return td:get_fields() end)
            if ok_f and fields ~= nil then
                for _, f in ipairs(fields) do
                    local ok_n, fname = pcall(function() return f:get_name() end)
                    if ok_n and type(fname) == "string" then
                        local lf = fname:lower()
                        local relevant = lf:find("deco") or ((not is_root) and (lf:find("list") or lf:find("inventory") or lf:find("stock")))
                        if relevant and (not is_excluded_deco_member(lf)) then
                            local ok_d, res = pcall(function() return f:get_data(container) end)
                            if ok_d and res ~= nil and list_count(res) > 0 then
                                scan_deco_list(res)
                            end
                        end
                    end
                end
            end
        end
    end

    -- Fallback: query typed enum IDs against any 1-arg deco count getter on PlEquipBox / DataManager
    if next(seen_counts) == nil then
        local enum_types = {
            "snow.data.DataDef.DecorationsId",
            "snow.data.ContentsIdSystem.DecorationsId",
            "snow.data.DataDef.HyakuryuDecoId",
            "snow.data.ContentsIdSystem.HyakuryuDecoId",
        }
        local fallback_targets = {}
        if equip_box ~= nil then fallback_targets[#fallback_targets + 1] = equip_box end
        if dm ~= nil then fallback_targets[#fallback_targets + 1] = dm end
        if equip_dm ~= nil then fallback_targets[#fallback_targets + 1] = equip_dm end
        if deco_dm ~= nil then fallback_targets[#fallback_targets + 1] = deco_dm end

        for _, target in ipairs(fallback_targets) do
            local ok_td, td = pcall(function() return target:get_type_definition() end)
            if ok_td and td ~= nil then
                local ok_m, methods = pcall(function() return td:get_methods() end)
                if ok_m and methods ~= nil then
                    for _, m in ipairs(methods) do
                        local ok_n, mname = pcall(function() return m:get_name() end)
                        local ok_p, nparams = pcall(function() return m:get_num_params() end)
                        if ok_n and ok_p and type(mname) == "string" and nparams == 1 then
                            local lm = mname:lower()
                            if (lm:find("deco") or lm:find("hyakuryudeco")) and (lm:find("num") or lm:find("count") or lm:find("have")) and (not is_excluded_deco_member(lm)) then
                                for _, etype in ipairs(enum_types) do
                                    local etd = sdk.find_type_definition(etype)
                                    if etd ~= nil then
                                        local ok_ef, efields = pcall(function() return etd:get_fields() end)
                                        if ok_ef and efields ~= nil then
                                            for _, ef in ipairs(efields) do
                                                local ok_ev, eval = pcall(function() return ef:get_data(nil) end)
                                                if ok_ev and type(eval) == "number" and eval > 0 then
                                                    local ok_cnt, cnt = pcall(function() return m:call(target, eval) end)
                                                    if ok_cnt and type(cnt) == "number" and cnt > 0 and cnt <= 999 then
                                                        local dname = resolve_deco_name_by_id(eval)
                                                        if dname ~= "" then
                                                            seen_counts[dname] = math.max(seen_counts[dname] or 0, math.floor(cnt))
                                                        end
                                                    end
                                                end
                                            end
                                        end
                                    end
                                end
                            end
                        end
                    end
                end
            end
        end
    end

    for name, qty in pairs(seen_counts) do
        decos[#decos + 1] = {
            name = name,
            quantity = qty,
        }
    end
    table.sort(decos, function(a, b) return a.name < b.name end)

    return decos
end

local function build_snapshot()
    local dm = sdk.get_managed_singleton("snow.data.DataManager")
    if not dm then
        return nil, "DataManager singleton unavailable. Load into Kamura or Elgado first."
    end

    local profile = read_ranks(dm)
    local materials, mat_count = scan_item_box(dm)
    local weapons, armor, talismans = scan_equipment_box(dm)
    local decorations = scan_decorations_box(dm)

    local payload = {
        schema = SCHEMA_VERSION,
        exportedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        profile = profile,
        materials = materials,
        talismans = talismans,
        weapons = weapons,
        armor = armor,
        decorations = decorations,
    }

    last_summary = {
        hr = profile.hr,
        mr = profile.mr,
        ar = profile.ar,
        materials = mat_count,
        talismans = #talismans,
        weapons = #weapons,
        armor = #armor,
        decorations = #decorations,
    }

    return payload, nil
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
                local ok = pcall(json.dump_file, OUTPUT_FILE, payload)
                last_json_cache = serialize_payload(payload)
                if ok then
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
                last_json_cache = serialize_payload(payload)
                local copied = false
                if sdk and type(sdk.copy_to_clipboard) == "function" then
                    local ok, res = pcall(sdk.copy_to_clipboard, last_json_cache)
                    copied = ok and (res ~= false)
                end
                if not copied and imgui and type(imgui.set_clipboard_text) == "function" then
                    local ok = pcall(imgui.set_clipboard_text, last_json_cache)
                    copied = ok
                end
                if copied then
                    status_msg = "Copied JSON snapshot to clipboard! Paste or drop into Elgado Forge."
                else
                    pcall(json.dump_file, OUTPUT_FILE, payload)
                    status_msg = "Saved reframework/data/" .. OUTPUT_FILE .. " (clipboard unavailable on this REFramework build)."
                end
            end
        end

        if imgui and type(imgui.text_colored) == "function" then
            local ok = pcall(imgui.text_colored, status_msg, 0xFF53A8D4)
            if not ok then
                imgui.text(status_msg)
            end
        else
            imgui.text(status_msg)
        end

        if last_summary then
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
