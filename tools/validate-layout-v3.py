#!/usr/bin/env python3
"""world-layout-v3 几何校验（docs/design/world-redesign/v3-clarity-geometry.md §8）。
继承 validate-layout-v2 全部规则（预算数字按 §8 更新）+ 新增 W1-W7 视觉规则。
用法: python3 tools/validate-layout-v3.py [v3|v2]
  v3(默认)=校验 V3 提案; v2=把 V2 冻结几何喂入, W1/W3/W4/W5/W7 必须 FAIL(证明新检查有效)。
"""
import math, sys

PROFILE = sys.argv[1] if len(sys.argv) > 1 else "v3"
MAP_W, MAP_H = 96, 80

if PROFILE == "v3":
    SPAWN = (48, 40)
    REGIONS = {
        "pioneer": (2, 2, 39, 44),
        "fishing": (6, 52, 44, 75),
        "living":  (40, 30, 56, 51),
        "farm":    (61, 34, 84, 62),
        "defense": (57, 6, 90, 28),
        "advGate": (46, 20, 50, 25),
    }
    FOREST_BASE = (2, 2, 35, 44)          # pioneer 深林底(东缘 x36-39 草地过渡带)
    LAKE_WATER = (8, 54, 41, 70)
    LAKE_SAND_RING = 1
    RIVER = [(40, 41, 2, 53)]             # 单段常宽 2
    ROADS = [  # 1 宽石板正交 (id,x0,y0,x1,y1)
        ("trunkH", 10, 40, 84, 40),
        ("northV", 48, 25, 48, 36),
        ("dockV",  36, 41, 36, 52),
        ("defV",   60, 27, 60, 39),
    ]
    PLAZA = (44, 37, 52, 43)
    GATE_PAD = (47, 22, 49, 24)
    SEAL_PAD = (59, 25, 61, 27)
    DOCK_PAD = (35, 52, 38, 53)
    BRIDGE_BASE = (39, 38, 42, 42)        # 造桥改造段(可建画布); 主干 y40 行=预置桥
    DEF_FIELD_W = (43, 25, 47, 29)        # V4 门前布置场西场（踩踏土，北支路 x48 居中）
    DEF_FIELD_E = (49, 25, 53, 29)        # V4 门前布置场东场
    FARM_ZONE_EXT = (58, 34, 84, 62)      # V4 农田带（允许 slab 溢出 farm 区西缘 3 格：紧邻庭院东门）
    HOUSE = (44, 35, 47, 37)
    BARN_FOOT = (66, 36, 69, 39)
    CAMP_CLEARING = (8, 38, 13, 42)
    EXTRA_PLOT = (44, 46, 46, 48)         # 宅旁第 10 块（3×3：4×4 会使出生窗铺装超 W3 预算）
    PLOTS_ORIGIN, PITCH, PLOT_N = (58, 44), 4, 3  # V4: 主阵西移至庭院东门外（原 (62,42)）
    HEDGES = {  # 边界物层(forest 瓦 1 宽)
        "living_U_north": [(x, 30) for x in range(42, 57) if x != 48],
        "living_U_east":  [(56, y) for y in range(30, 52) if y != 40],
        "living_U_south": [(x, 51) for x in range(42, 57)],
        "defense_ruins_a": [(x, y) for y in range(10, 14) for x in range(74, 79)],
        "defense_ruins_b": [(x, y) for y in range(18, 22) for x in range(82, 86)],
        "defense_edge":    [(x, 6) for x in range(66, 73)],
    }
    LANDMARKS = {
        "bed": (48, 38), "barn": (67, 39), "seal": (60, 26), "gate": (48, 23),
        "dock": (37, 53), "gardener": (45, 42), "gatekeeper": (46, 23),
        "tree_near": (36, 36), "rock_near": (35, 38),
    }
    GATHER_GATE = (38, 40)                # 开荒东门=桥西端
    INTERACTABLES = {
        "tree": [(36,36),(34,30),(30,34),(26,28),(22,22),(16,16),(10,10),(6,18),(12,26),(18,34),(28,12),(37,44)],
        "rock": [(35,38),(33,42),(29,38),(24,36),(20,30),(14,20),(8,24),(32,16)],
        "bush": [(37,32),(30,42),(20,42)],
    }
    # 7 视点密度窗 (name, cx, cy, tier)  tier: hub|farm|wild
    WINDOWS = [
        ("spawn", 48, 40, "hub"), ("gate", 48, 23, "hub"), ("seal", 60, 26, "hub"),
        ("farm", 67, 50, "farm"), ("dock", 37, 53, "wild"), ("camp", 10, 40, "wild"),
        ("trunk", 58, 40, "wild"),
    ]
    UI = {"HudChip": (-440, 316, 360, 48), "ToolDock": (310, -262, 588, 104),
          "Backpack": (560, -120, 110, 88), "Gear": (572, 292, 88, 88)}
else:
    SPAWN = (50, 40)
    REGIONS = {
        "living": (34, 32, 56, 48), "farm": (56, 34, 84, 62), "pioneer": (4, 4, 40, 32),
        "fishing": (18, 56, 44, 73), "defense": (58, 6, 90, 32), "advGate": (48, 14, 56, 26),
    }
    FOREST_BASE = None                     # V2: pioneer 草地基底
    LAKE_WATER = (20, 58, 42, 71)
    LAKE_SAND_RING = 2
    RIVER = [(32, 36, 0, 16), (30, 34, 16, 30), (32, 36, 30, 44), (30, 34, 44, 52), (32, 36, 52, 57)]
    ROADS = [
        ("northV", 50, 20, 50, 34), ("altarH", 50, 26, 61, 26), ("westH", 20, 40, 40, 40),
        ("pioneerV", 38, 31, 38, 41), ("eastH", 52, 40, 74, 40), ("farmV", 72, 40, 72, 58),
        ("farmS", 46, 58, 74, 58), ("southV", 48, 44, 48, 54), ("dockH", 42, 54, 49, 54),
    ]
    PLAZA = (40, 36, 52, 46)
    GATE_PAD = (48, 20, 52, 24)
    SEAL_PAD = (58, 26, 62, 30)
    DOCK_PAD = (42, 57, 42, 58)
    BRIDGE_BASE = (30, 38, 38, 44)
    HOUSE = None
    BARN_FOOT = (65, 38, 65, 38)
    CAMP_CLEARING = None
    PLOTS_ORIGIN, PITCH, PLOT_N = (58, 42), 4, 3
    EXTRA_PLOT = None
    HEDGES = {}
    LANDMARKS = {
        "bed": (50, 38), "barn": (65, 38), "seal": (60, 28), "gate": (50, 22),
        "dock": (42, 56), "gardener": (46, 42), "gatekeeper": (54, 36),
        "tree_near": (40, 30), "rock_near": (40, 32),
    }
    GATHER_GATE = (38, 32)
    INTERACTABLES = {
        "tree": [(12,10),(18,14),(24,8),(10,20),(16,24),(22,18),(26,26),(14,30),(8,14),(20,30),(28,12),(40,30)],
        "rock": [(40,32),(12,16),(20,10),(8,24),(24,30),(28,20),(16,8),(6,18)],
        "bush": [(10,28),(22,22),(30,8)],
    }
    WINDOWS = [("spawn", 50, 40, "hub"), ("gate", 50, 22, "hub"), ("seal", 60, 28, "hub"),
               ("farm", 63, 47, "farm"), ("dock", 42, 56, "wild"), ("trunk", 58, 40, "wild")]
    UI = {"WorldHUD": (0, 316, 640, 40), "Intel": (0, 268, 520, 36),
          "ToolDock": (310, -262, 588, 104), "Status": (310, -168, 380, 44), "Gear": (572, 292, 88, 88)}

errors = []
def chk(cond, msg):
    if not cond: errors.append(msg)

def in_rect(p, r): return r is not None and r[0] <= p[0] <= r[2] and r[1] <= p[1] <= r[3]
def rect_cells(r): return [(x, y) for y in range(r[1], r[3]+1) for x in range(r[0], r[2]+1)]
def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])
def seg_cells(seg):  # (x0,x1,y0,y1)
    return [(x, y) for y in range(seg[2], seg[3]+1) for x in range(seg[0], seg[1]+1)]
def road_cells(rd):
    _, x0, y0, x1, y1 = rd
    if y0 == y1: return {(x, y0) for x in range(min(x0, x1), max(x0, x1)+1)}
    return {(x0, y) for y in range(min(y0, y1), max(y0, y1)+1)}

# ---------- 地形网格(供 W 规则) ----------
TEX = {}  # (x,y)->纹理族
def paint(r, tex, where=None):
    for (x, y) in (r if isinstance(r, (set, list)) else rect_cells(r)):
        if 0 <= x < MAP_W and 0 <= y < MAP_H:
            if where is None or where(x, y): TEX[(x, y)] = tex
for name, r in REGIONS.items():
    paint(r, "forest" if name == "pioneer" else "grass")
if PROFILE == "v3":
    paint(FOREST_BASE, "forest")
    paint((36, 2, 39, 44), "grass")  # 东缘草地过渡带(出生窗 2 纹理承诺)
    if CAMP_CLEARING: paint(CAMP_CLEARING, "grass")
for hset in HEDGES.values(): paint(hset, "forest")
lake_ring = []
lw = LAKE_WATER
for y in range(lw[1]-LAKE_SAND_RING, lw[3]+LAKE_SAND_RING+1):
    for x in range(lw[0]-LAKE_SAND_RING, lw[2]+LAKE_SAND_RING+1):
        if not in_rect((x, y), lw) and 0 <= x < MAP_W and 0 <= y < MAP_H: lake_ring.append((x, y))
paint(lake_ring, "sand")
for s in RIVER: paint(seg_cells(s), "water")
paint(lw, "water")
for rd in ROADS: paint(road_cells(rd), "cobble")
paint(PLAZA, "cobble"); paint(GATE_PAD, "cobble"); paint(SEAL_PAD, "cobble"); paint(DOCK_PAD, "cobble")
if PROFILE == "v3":
    paint(DEF_FIELD_W, "dirt"); paint(DEF_FIELD_E, "dirt")  # V4 门前布置场踩踏土
for row in range(PLOT_N):
    for col in range(PLOT_N):
        paint((PLOTS_ORIGIN[0]+col*PITCH, PLOTS_ORIGIN[1]+row*PITCH,
               PLOTS_ORIGIN[0]+col*PITCH+3, PLOTS_ORIGIN[1]+row*PITCH+3), "soil")
if EXTRA_PLOT: paint(EXTRA_PLOT, "soil")
if PROFILE == "v3":  # 主干 y40 跨河行=预置桥(石板)
    for x in (40, 41): TEX[(x, 40)] = "cobble"
plot_slab = (PLOTS_ORIGIN[0], PLOTS_ORIGIN[1],
             PLOTS_ORIGIN[0]+(PLOT_N-1)*PITCH+3, PLOTS_ORIGIN[1]+(PLOT_N-1)*PITCH+3)

# ---------- 继承规则 ----------
for name, r in REGIONS.items():
    chk(0 <= r[0] and r[2] < MAP_W and 0 <= r[1] and r[3] < MAP_H, f"region {name} 越界 {r}")
chk(MAP_W % 16 == 0 and MAP_H % 16 == 0, "MAP 必须整除 CHUNK16")
for name, (mw, mh) in [("farm", (22, 18)), ("pioneer", (34, 28)), ("fishing", (22, 14)), ("living", (8, 8))]:
    r = REGIONS[name]; w, h = r[2]-r[0]+1, r[3]-r[1]+1
    chk(w >= mw and h >= mh, f"region {name} {w}x{h} < 下限 {mw}x{mh}")

river_cells = set(c for s in RIVER for c in seg_cells(s))
farm = REGIONS["farm"]
for (x, y) in river_cells:
    chk(not in_rect((x, y), farm), f"河格({x},{y}) 穿农田")
    chk(not in_rect((x, y), PLAZA), f"河格({x},{y}) 穿枢纽广场")
lv = REGIONS["living"]
river_in_living = [c for c in river_cells if lv[0] <= c[0] <= lv[2] and lv[1] <= c[1] <= lv[3]]
chk(len(river_in_living) >= 12, f"庭院临河段不足: {len(river_in_living)} 格")

all_road = set()
for rd in ROADS: all_road |= road_cells(rd)
for (x, y) in all_road:
    chk(not in_rect((x, y), lw), f"路格({x},{y}) 落入湖水体")
    if not in_rect((x, y), BRIDGE_BASE):
        chk((x, y) not in river_cells, f"路格({x},{y}) 落入河（不在桥基线内）")
for row in range(PLOT_N):
    for col in range(PLOT_N):
        ox, oy = PLOTS_ORIGIN[0]+col*PITCH, PLOTS_ORIGIN[1]+row*PITCH
        for dx in range(4):
            for dy in range(4):
                c = (ox+dx, oy+dy)
                chk(c not in all_road, f"地块格{c} 压路")
                chk(c not in river_cells, f"地块格{c} 压河")
                chk(not in_rect(c, lw), f"地块格{c} 压湖")
                chk(not in_rect(c, PLAZA), f"地块格{c} 压广场")
if EXTRA_PLOT:
    for c in rect_cells(EXTRA_PLOT):
        chk(c not in all_road and c not in river_cells and not in_rect(c, lw) and not in_rect(c, PLAZA),
            f"宅旁块格{c} 与地物冲突")

BUDGET = {"bed": 2, "barn": 99, "seal": 20, "gate": 20, "dock": 18,
          "gardener": 12, "tree_near": 14, "rock_near": 14}   # V4: gatekeeper 改守门边专项规则
for k, lim in BUDGET.items():
    d = dist(SPAWN, LANDMARKS[k])
    chk(d <= lim + 0.15, f"距离 {k}={d:.2f} > 预算 {lim}")
if PROFILE == "v3":
    d = dist(LANDMARKS["gatekeeper"], LANDMARKS["gate"])
    chk(d <= 3.15, f"距离 守门人→门={d:.2f} > 3（V4 守门人守在门台旁）")
extra_center = ((EXTRA_PLOT[0]+EXTRA_PLOT[2])/2, (EXTRA_PLOT[1]+EXTRA_PLOT[3])/2) if EXTRA_PLOT else None
if extra_center:
    d = dist(LANDMARKS["bed"], extra_center)
    chk(d <= 10.15, f"距离 宅旁块(自床)={d:.2f} > 10")
arr_near = (PLOTS_ORIGIN[0]+1.5, PLOTS_ORIGIN[1]+1.5)
d = dist(SPAWN, arr_near)
chk(d <= 18.15, f"距离 农田阵近块={d:.2f} > 18")

chk(in_rect(LANDMARKS["seal"], REGIONS["defense"]), "祭坛不在防守区")
chk(in_rect(LANDMARKS["gate"], REGIONS["advGate"]), "副本门不在 advGate")
chk(in_rect(LANDMARKS["dock"], REGIONS["fishing"]), "码头不在湖区")
chk(in_rect(LANDMARKS["bed"], REGIONS["living"]), "床不在庭院")
chk(in_rect(SPAWN, REGIONS["living"]), "出生点不在庭院")
chk(in_rect(plot_slab[2:], REGIONS["farm"] if PROFILE != "v3" else FARM_ZONE_EXT) and
    in_rect(plot_slab[:2], REGIONS["farm"] if PROFILE != "v3" else FARM_ZONE_EXT), "地块群出 farm 区")
chk(in_rect(BARN_FOOT, REGIONS["farm"]) and not in_rect(LANDMARKS["barn"], PLAZA), "谷仓 footprint 不在农场区/压广场")
if HOUSE: chk(in_rect(HOUSE, REGIONS["living"]), "房 footprint 不在庭院")
if EXTRA_PLOT: chk(in_rect(EXTRA_PLOT, REGIONS["living"]), "宅旁块不在庭院")
for rd in ROADS:
    for c in road_cells(rd):
        chk(not in_rect(c, BARN_FOOT), f"路格{c} 压谷仓 footprint")

pg = REGIONS["pioneer"]
trees, rocks, bushes = INTERACTABLES["tree"], INTERACTABLES["rock"], INTERACTABLES["bush"]
chk(len(trees) >= 10 and len(rocks) >= 8 and len(bushes) >= 3, "采集物数量不足")
camp = CAMP_CLEARING
trunk_band = {c for rd in ROADS if rd[0] == "trunkH" for c in road_cells(rd)} | \
             {(x, y) for y in (39, 40, 41) for x in range(0, MAP_W)}
for kind, arr in INTERACTABLES.items():
    for (x, y) in arr:
        chk(in_rect((x, y), pg), f"{kind}({x},{y}) 出开荒区")
        chk((x, y) not in river_cells, f"{kind}({x},{y}) 压河")
        chk((x, y) not in all_road, f"{kind}({x},{y}) 压路")
        chk(not (camp and in_rect((x, y), camp)), f"{kind}({x},{y}) 压营地")
        chk(y not in (39, 40, 41) or (x, y) not in pg, f"{kind}({x},{y}) 占主干行带 y39-41")
near_gate = [p for arr in INTERACTABLES.values() for p in arr if dist(p, GATHER_GATE) <= 12]
chk(any(p in trees for p in near_gate), "开荒门 12 格内无树")
chk(any(dist(p, GATHER_GATE) <= 12 for p in rocks), "开荒门 12 格内无石")
all_objs = trees + rocks + bushes
chk(len(all_objs) == len(set(all_objs)), "采集物坐标重复")

chk(LANDMARKS["gate"][0] == 48, "副本门不在北支轴 x=48 上（可见性要求）")

# ---------- W1-W7 视觉规则 ----------
W = 24; H_ = 11
def window(cx, cy):
    x0, x1 = cx - W//2, cx - W//2 + W - 1
    y0, y1 = cy - H_//2, cy - H_//2 + H_ - 1
    return [(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1)
            if 0 <= x < MAP_W and 0 <= y < MAP_H]
LAND_FAM = {"grass", "cobble", "soil", "forest", "dirt", "sand"}
TIER = {  # tier -> (纹理上限, 基底名, 基底下限)
    "hub":  (3, "grass", 0.45), "farm": (3, "soil", 0.50), "wild": (3, None, 0.55),
}
for (wname, cx, cy, tier) in WINDOWS:
    win = window(cx, cy)
    n = sum(1 for c in win if TEX.get(c) != "water")  # 陆地分母
    fam = {}
    for c in win:
        t = TEX.get(c, "grass")
        if t == "water": continue
        fam[t] = fam.get(t, 0) + 1
    counted = {k: v for k, v in fam.items() if v >= 12}
    chk(len(counted) <= TIER[tier][0],
        f"W1[{wname}] 纹理种数 {len(counted)}>{TIER[tier][0]}: {counted}")
    grass = fam.get("grass", 0)/n
    soil = fam.get("soil", 0)/n
    forest = fam.get("forest", 0)/n
    n = n or 1
    if tier == "hub":
        chk(grass >= TIER[tier][2], f"W2[{wname}] 草地 {grass:.0%} < 45%")
        pave = (fam.get("cobble", 0)+fam.get("soil", 0)+fam.get("dirt", 0))/n
        chk(pave <= 0.40, f"W3[{wname}] 铺装 {pave:.0%} > 40%")   # V4: 0.35→0.40（农田 slab 西缘/门前布置场贴近枢纽窗属预期观感）
    elif tier == "farm":
        chk(soil >= 0.50, f"W2[{wname}] 土壤基底 {soil:.0%} < 50%")
    else:
        base = max(grass, forest)
        chk(base >= 0.55, f"W2[{wname}] 野外基底 {base:.0%} < 55%")
# W4 路网形态: 全 1 宽(无 2x2 路块)+正交+材质统一 cobble+节点间距>=6
for (x, y) in all_road:
    chk(TEX.get((x, y)) == "cobble", f"W4 路格({x},{y}) 材质非石板")
two_wide = [(x, y) for (x, y) in all_road
            if (x+1, y) in all_road and (x, y+1) in all_road and (x+1, y+1) in all_road]
chk(not two_wide, f"W4 路网存在 2 宽块: {two_wide[:5]}")
nodes = sorted({(rd[1], rd[2]) for rd in ROADS} | {(rd[3], rd[4]) for rd in ROADS},
               key=lambda p: (p[1], p[0]))
trunk_ys = [rd for rd in ROADS if rd[0].endswith("H")]
if PROFILE == "v3":
    junction_xs = sorted(x for rd in ROADS if rd[0] in ("dockV", "defV") for x in (rd[1],))
    gaps = [b-a for a, b in zip(junction_xs, junction_xs[1:])]
    chk(all(g >= 6 for g in gaps), f"W4 支路节点间距 {gaps} < 6")
# W5 分区零重叠 + 非白名单相邻缓冲>=2
names = list(REGIONS)
WHITELIST = {frozenset(["living", "fishing"])}   # 河→湖口水文连续
for i in range(len(names)):
    for j in range(i+1, len(names)):
        a, b = REGIONS[names[i]], REGIONS[names[j]]
        ox = max(0, min(a[2], b[2]) - max(a[0], b[0]) + 1)
        oy = max(0, min(a[3], b[3]) - max(a[1], b[1]) + 1)
        pairname = names[i] + "-" + names[j]
        chk(ox*oy == 0, "W5 区域重叠 " + pairname + " = %d 格" % (ox*oy))
        if frozenset([names[i], names[j]]) in WHITELIST: continue
        gapx = max(a[0]-b[2], b[0]-a[2]) - 1
        gapy = max(a[1]-b[3], b[1]-a[3]) - 1
        if ox > 0 and gapy >= 0 and gapy < 2:   # 上下相邻: 骑缝 2 行条带(位于任一区内)
            x_lo, x_hi = max(a[0], b[0]), min(a[2], b[2])
            yd = min(a[3], b[3]) + 1            # 下区内侧 2 行
            yu = max(a[1], b[1]) - 2            # 上区内侧 2 行
            band = [(x, y) for y in (yd, yd+1, yu, yu+1) for x in range(x_lo, x_hi+1)]
            chk(any(TEX.get(c) == "water" for c in band),
                "W5 " + pairname + " buf-y %d <2 且无水文缓冲" % gapy)
        if oy > 0 and gapx >= 0 and gapx < 2:   # 左右相邻: 骑缝 2 列条带(位于任一区内)
            y_lo, y_hi = max(a[1], b[1]), min(a[3], b[3])
            xr = min(a[2], b[2]) + 1            # 右区内侧 2 列
            xl = max(a[0], b[0]) - 2            # 左区内侧 2 列
            band = [(x, y) for x in (xr, xr+1, xl, xl+1) for y in range(y_lo, y_hi+1)]
            chk(any(TEX.get(c) == "water" for c in band),
                "W5 " + pairname + " buf-x %d <2 且无水文缓冲" % gapx)
# W6 每窗物件预算(主建筑<=2 NPC<=2 路牌<=1)
NPCS = [("gardener", LANDMARKS["gardener"]), ("gatekeeper", LANDMARKS["gatekeeper"])]
BUILDINGS = [("house", HOUSE), ("barn", BARN_FOOT)]
SIGNS = [(49, 36), (60, 38), (37, 51)] if PROFILE == "v3" else [(49, 33), (55, 43), (33, 42), (47, 47)]
for (wname, cx, cy, tier) in WINDOWS:
    win = set(window(cx, cy))
    nb = sum(1 for _, r in BUILDINGS if r and any(in_rect(c, r) for c in win))
    nn = sum(1 for _, p in NPCS if p in win)
    ns = sum(1 for p in SIGNS if p in win)
    chk(nb <= 2, f"W6[{wname}] 主建筑 {nb} > 2")
    chk(nn <= 2, f"W6[{wname}] NPC {nn} > 2")
    sign_lim = 1 if tier == "hub" else 2
    chk(ns <= sign_lim, f"W6[{wname}] 路牌 {ns} > {sign_lim}")
# W7 边界物层: 必须存在且全为 forest 瓦、必需墙齐备
if PROFILE == "v3":
    chk(len(HEDGES) >= 5, f"W7 边界物组不足: {len(HEDGES)}")
    for hname, cells in HEDGES.items():
        for c in cells:
            chk(TEX.get(c) == "forest", f"W7 边界物 {hname}{c} 非 forest 瓦")
    for need in ("living_U_north", "living_U_east", "living_U_south"):
        chk(need in HEDGES, f"W7 缺必需墙 {need}")

# ---------- UI 位置(静表态) ----------
def overlap(a, b):
    return abs(a[0]-b[0]) < (a[2]+b[2])/2 and abs(a[1]-b[1]) < (a[3]+b[3])/2
if PROFILE == "v3":
    chk(not overlap(UI["HudChip"], UI["Gear"]), "顶栏芯片与齿轮重叠")
    chk(not overlap(UI["HudChip"], UI["ToolDock"]), "顶栏芯片与工具坞重叠")
else:
    chk(not overlap(UI["WorldHUD"], UI["Intel"]), "WorldHUD 与情报行重叠")
    chk(not overlap(UI["ToolDock"], UI["Status"]), "工具坞与状态行重叠")

# ---------- ASCII ----------
CHARS = {"water": "~", "sand": ":", "dirt": "#", "stone": "=", "cobble": "=",
         "forest": "T", "grass": "."}
grid = []
for y in range(MAP_H):
    row = []
    for x in range(MAP_W):
        row.append(CHARS.get(TEX.get((x, y), "grass"), "."))
    grid.append(row)
marks = {"S": SPAWN, "B": LANDMARKS["bed"], "G": LANDMARKS["gate"], "A": LANDMARKS["seal"],
         "D": LANDMARKS["dock"], "N": LANDMARKS["barn"], "g": LANDMARKS["gardener"],
         "k": LANDMARKS["gatekeeper"]}
for ch, (x, y) in marks.items():
    if 0 <= x < MAP_W and 0 <= y < MAP_H: grid[y][x] = ch
print("\n".join("".join(row) for row in grid))
print(f"\n==== PROFILE {PROFILE} ====")
if errors:
    print(f"FAIL {len(errors)}:")
    for e in errors[:40]: print("  ✗", e)
    sys.exit(1)
print("ALL PASS ✓")
