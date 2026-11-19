#!/usr/bin/env python3
"""world-layout-v2 几何校验（docs/design/world-redesign/world-layout-v2.md §验收）。
规则来自 layout-v2-pacing.md §2.3/§5.2/R8 与 ui-notes 验收。全部通过才允许进 TerrainData.ts。"""
import math, sys

MAP_W, MAP_H = 96, 80
SPAWN = (50, 40)

REGIONS = {
    "living":  (34, 32, 56, 48),
    "farm":    (56, 34, 84, 62),
    "pioneer": (4, 4, 40, 32),
    "fishing": (18, 56, 44, 73),   # 湖区含沙环；水体 x20-42 y58-71
    "defense": (58, 6, 90, 32),
    "advGate": (48, 14, 56, 26),
}
LAKE_WATER = (20, 58, 42, 71)
RIVER = [  # 5 宽河段 (x0,x1,y0,y1)
    (32, 36, 0, 16), (30, 34, 16, 30), (32, 36, 30, 44), (30, 34, 44, 52), (32, 36, 52, 57),
]
ROADS = [  # 2 宽土路（占 (x,y) 与 (x+1,y) / (x,y+1)）
    ("northV",  50, 20, 50, 34), ("altarH", 50, 26, 61, 26),
    ("westH",  20, 40, 40, 40), ("pioneerV", 38, 31, 38, 41),
    ("eastH",  52, 40, 74, 40), ("farmV", 72, 40, 72, 58),
    ("farmS",  46, 58, 74, 58), ("southV", 48, 44, 48, 54), ("dockH", 42, 54, 49, 54),
]
PLAZA = (40, 36, 52, 46)          # 枢纽石板广场
ALTAR_PAD = (58, 26, 62, 30)      # 祭坛石板台
GATE_PAD = (48, 20, 52, 24)       # 副本门石板台
BRIDGE = (30, 38, 38, 44)         # 西路跨河桥基线（水→土）

LANDMARKS = {
    "bed": (50, 38), "barn": (65, 38), "seal": (60, 28), "gate": (50, 22),
    "dock": (42, 56), "gardener": (46, 42), "gatekeeper": (54, 36),
    "plot_near": (59, 43), "plot_far": (67, 43), "plot_centroid": (63, 45),
    "tree_near": (40, 30), "rock_near": (40, 32),
}
PLOTS_ORIGIN, PITCH, PLOT_N = (58, 42), 4, 3

INTERACTABLES = {
    "tree": [(12,10),(18,14),(24,8),(10,20),(16,24),(22,18),(26,26),(14,30),(8,14),(20,30),(28,12),(40,30)],
    "rock": [(40,32),(12,16),(20,10),(8,24),(24,30),(28,20),(16,8),(6,18)],
    "bush": [(10,28),(22,22),(30,8)],
}

errors, warns = [], []
def chk(cond, msg):
    (errors if not cond else []).append(msg) if not cond else None

def in_rect(p, r): return r[0] <= p[0] <= r[2] and r[1] <= p[1] <= r[3]
def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])

# 1) 地图边界
for name, r in REGIONS.items():
    chk(0 <= r[0] and r[2] < MAP_W and 0 <= r[1] and r[3] < MAP_H, f"region {name} 越界 {r}")
chk(MAP_W % 16 == 0 and MAP_H % 16 == 0, "MAP 必须整除 CHUNK16")

# 2) 面积下限（pacing R8）
for name, (mw, mh) in [("farm", (22, 18)), ("pioneer", (34, 28)), ("fishing", (22, 14)), ("living", (8, 8))]:
    r = REGIONS[name]; w, h = r[2]-r[0]+1, r[3]-r[1]+1
    chk(w >= mw and h >= mh, f"region {name} {w}x{h} < 下限 {mw}x{mh}")

# 3) 河不穿农田/湖体/广场/地块
for seg in RIVER:
    for x in range(seg[0], seg[2+1-1]+0) if False else []:
        pass
def seg_cells(seg):
    return [(x, y) for y in range(seg[2], seg[3]+1) for x in range(seg[0], seg[1]+1)]
river_cells = set(c for s in RIVER for c in seg_cells(s))
farm = REGIONS["farm"]
for (x, y) in river_cells:
    chk(not (farm[0] <= x <= farm[2] and farm[1] <= y <= farm[3]), f"河格({x},{y}) 穿农田")
    chk(not in_rect((x, y), PLAZA), f"河格({x},{y}) 穿枢纽广场")
    chk(not in_rect((x, y), LAKE_WATER) or y >= 57, f"河格({x},{y}) 异常入湖")
# 河必须穿过 living（庭院改造段，造桥玩法依赖）
lv = REGIONS["living"]
river_in_living = [c for c in river_cells if lv[0] <= c[0] <= lv[2] and lv[1] <= c[1] <= lv[3]]
chk(len(river_in_living) >= 12, f"庭院临河段不足: {len(river_in_living)} 格（造桥/平台玩法依赖）")

# 4) 路网连通性：每条路至少一端接广场或另一条路；路不穿水体（桥基线除外）
def road_cells(rd):
    _, x0, y0, x1, y1 = rd
    if y0 == y1: return {(x, y) for x in range(min(x0,x1), max(x0,x1)+1) for y in (y0, y0+1)}
    return {(x0, y) for y in range(min(y0,y1), max(y0,y1)+1) for x in (x0, x0+1)}
all_road = set()
for rd in ROADS: all_road |= road_cells(rd)
for (x, y) in all_road:
    chk(not in_rect((x, y), LAKE_WATER), f"路格({x},{y}) 落入湖水体")
    if not (BRIDGE[0] <= x <= BRIDGE[2] and BRIDGE[1] <= y <= BRIDGE[3]):
        chk((x, y) not in river_cells, f"路格({x},{y}) 落入河（不在桥基线内）")
    chk(not (PLOTS_ORIGIN[0] <= x <= PLOTS_ORIGIN[0]+ (PLOT_N-1)*PITCH + 2 and
             PLOTS_ORIGIN[1] <= y <= PLOTS_ORIGIN[1] + (PLOT_N-1)*PITCH + 2) or rdname_ok if False else True, "")
# 地块与路不重叠
for row in range(PLOT_N):
    for col in range(PLOT_N):
        ox, oy = PLOTS_ORIGIN[0]+col*PITCH, PLOTS_ORIGIN[1]+row*PITCH
        for dx in range(3):
            for dy in range(3):
                c = (ox+dx, oy+dy)
                chk(c not in all_road, f"地块格{c} 压路")
                chk(not (c in river_cells), f"地块格{c} 压河")
                chk(not (LAKE_WATER[0] <= c[0] <= LAKE_WATER[2] and LAKE_WATER[1] <= c[1] <= LAKE_WATER[3]), f"地块格{c} 压湖")
                chk(not in_rect(c, PLAZA), f"地块格{c} 压广场")

# 5) 距离预算（pacing §2.3，直线格，从 SPAWN）
BUDGET = {"bed": 2, "plot_near": 10, "plot_far": 18, "barn": 99, "seal": 20, "gate": 20,
          "dock": 18, "gardener": 12, "gatekeeper": 12, "tree_near": 14, "rock_near": 14}
for k, lim in BUDGET.items():
    d = dist(SPAWN, LANDMARKS[k])
    chk(d <= lim + 0.15, f"距离 {k}={d:.2f} > 预算 {lim}")

# 6) 地标合法落位
chk(in_rect(LANDMARKS["seal"], REGIONS["defense"]), "祭坛不在防守区")
chk(in_rect(LANDMARKS["gate"], REGIONS["advGate"]), "副本门不在 advGate")
chk(in_rect(LANDMARKS["dock"], REGIONS["fishing"]), "码头不在湖区")
chk(in_rect(LANDMARKS["bed"], REGIONS["living"]), "床不在庭院")
chk(in_rect(SPAWN, REGIONS["living"]), "出生点不在庭院")
chk(in_rect((PLOTS_ORIGIN[0]+2*(PLOT_N-1)+2, PLOTS_ORIGIN[1]+2*(PLOT_N-1)+2), REGIONS["farm"]), "地块群出界")
chk(not in_rect(LANDMARKS["barn"], PLAZA) and in_rect(LANDMARKS["barn"], REGIONS["farm"]), "谷仓不在农场区")

# 7) 采集物密度与合法性（pacing §6.4）
gate = LANDMARKS["gate"] if False else (38, 32)   # 开荒区南门
trees, rocks, bushes = INTERACTABLES["tree"], INTERACTABLES["rock"], INTERACTABLES["bush"]
chk(len(trees) >= 10, f"树 {len(trees)} < 10")
chk(len(rocks) >= 8, f"石 {len(rocks)} < 8")
chk(len(bushes) >= 3, f"灌木 {len(bushes)} < 3")
pg = REGIONS["pioneer"]
for kind, arr in INTERACTABLES.items():
    for (x, y) in arr:
        chk(in_rect((x, y), pg), f"{kind}({x},{y}) 出开荒区")
        chk((x, y) not in river_cells, f"{kind}({x},{y}) 压河")
        chk((x, y) not in all_road, f"{kind}({x},{y}) 压路（pioneerV 穿 y31-41 注意）")
near_gate = [p for arr in INTERACTABLES.values() for p in arr if dist(p, gate) <= 12]
chk(any(p in trees for p in near_gate) or any(dist(p, gate) <= 12 for p in trees), "门 12 格内无树")
chk(any(dist(p, gate) <= 12 for p in rocks), "门 12 格内无石")
all_objs = trees + rocks + bushes
chk(len(all_objs) == len(set(all_objs)), "采集物坐标重复")

# 8) 副本门主路可见性：门在 northV 轴线上
chk(LANDMARKS["gate"][0] in (50, 51), "副本门不在北主路轴线上（可见性要求）")

# 9) UI 关键位（ui-notes）
ui = {"ToolDock": (310, -262), "ToolDockStatus": (310, -168), "WorldHUD": (0, 316), "Intel": (0, 268), "Gear": (572, 292)}
overlap = []
def rects_overlap(a, b, aw, ah, bw, bh):
    return abs(a[0]-b[0]) < (aw+bw)/2 and abs(a[1]-b[1]) < (ah+bh)/2
chk(not rects_overlap(ui["WorldHUD"], ui["Intel"], 640, 40, 520, 36), "WorldHUD 与情报行重叠")
chk(not rects_overlap(ui["ToolDock"], ui["ToolDockStatus"], 588, 104, 460, 44), "工具坞与状态行重叠")
chk(not rects_overlap(ui["Gear"], ui["WorldHUD"], 88, 88, 640, 40), "齿轮与顶栏重叠")

# ---------- ASCII 鸟瞰 ----------
CHARS = {"water": "~", "sand": ":", "dirt": "#", "stone": "=", "forest": "T", "grass": "."}
grid = [["."]*MAP_W for _ in range(MAP_H)]
def paint(r, ch):
    if isinstance(r, (set, list)):
        for (x, y) in r:
            if 0 <= x < MAP_W and 0 <= y < MAP_H: grid[y][x] = ch
        return
    for y in range(r[1], r[3]+1):
        for x in range(r[0], r[2]+1):
            if 0 <= x < MAP_W and 0 <= y < MAP_H: grid[y][x] = ch
for name, r in REGIONS.items():
    if name == "pioneer": paint(r, "T")
for s in RIVER: paint(seg_cells(s), "~")
paint((LAKE_WATER[0], LAKE_WATER[1], LAKE_WATER[2], LAKE_WATER[3]), "~")
fr = REGIONS["fishing"]
for y in range(fr[1], fr[3]+1):
    for x in range(fr[0], fr[2]+1):
        if grid[y][x] == ".": grid[y][x] = ":"
for rd in ROADS: paint(road_cells(rd), "#")
paint(BRIDGE, "#")
paint(PLAZA, "="); paint(ALTAR_PAD, "="); paint(GATE_PAD, "=")
marks = {"S": SPAWN, "B": LANDMARKS["bed"], "G": LANDMARKS["gate"], "A": LANDMARKS["seal"],
         "D": LANDMARKS["dock"], "N": LANDMARKS["barn"], "P": (59, 43), "g": LANDMARKS["gardener"], "k": LANDMARKS["gatekeeper"]}
for (x, y) in trees: marks["t"] = marks.get("t", (0,0)) if False else (x, y)  # 只标最后一棵
for ch, (x, y) in marks.items():
    if 0 <= x < MAP_W and 0 <= y < MAP_H: grid[y][x] = ch
print("\n".join("".join(row) for row in grid))

print("\n==== RESULT ====")
if errors:
    print(f"FAIL {len(errors)}:")
    for e in errors: print("  ✗", e)
    sys.exit(1)
print("ALL PASS ✓")
