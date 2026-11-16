#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""像素 UI 美术小样生成器（风格定稿用，不进游戏包）。
输出：docs/design/ui-preview/{sprites/,preview_mock.png,asset_sheet.png}
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(OUT, 'sprites')
os.makedirs(SPR, exist_ok=True)

# ---------------- 调色板（暖色田园系，24 色） ----------------
PAL = {
    'K': (36, 24, 18, 255),      # 描边暖黑
    'H': (230, 194, 104, 255),   # 草帽亮
    'h': (181, 133, 79, 255),    # 草帽暗
    'S': (242, 196, 155, 255),   # 皮肤
    's': (217, 160, 110, 255),   # 皮肤暗
    'W': (240, 234, 216, 255),   # 布白
    'R': (192, 80, 62, 255),     # 红衣
    'B': (74, 109, 167, 255),    # 背带裤蓝
    'b': (53, 80, 126, 255),     # 蓝暗
    'G': (138, 92, 52, 255),     # 木棕
    'g': (94, 58, 32, 255),      # 木深
    'M': (184, 188, 196, 255),   # 金属亮
    'm': (122, 128, 136, 255),   # 金属暗
    'Y': (242, 193, 78, 255),    # 金
    'y': (207, 154, 46, 255),    # 金暗
    'w': (255, 240, 179, 255),   # 金高光
    'T': (78, 143, 60, 255),     # 叶
    't': (53, 104, 42, 255),     # 叶暗
    'L': (111, 174, 78, 255),    # 叶亮
    'D': (154, 160, 168, 255),   # 石亮
    'd': (110, 116, 124, 255),   # 石暗
    'E': (29, 29, 29, 255),      # 眼
    'P': (232, 154, 138, 255),   # 腮红
    'O': (74, 123, 192, 255),    # 水
    'o': (51, 94, 150, 255),     # 水暗
    'F': (232, 120, 140, 255),   # 花
    'C': (245, 245, 240, 255),   # 纯白
}


def sprite(rows):
    w = len(rows[0]); h = len(rows)
    assert all(len(r) == w for r in rows), 'row width mismatch'
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                px[x, y] = PAL[ch]
    return img


# ---------------- 主角（农夫，16×24） ----------------
HAT = [
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '..HHHHHHHHHHHH..',
    '..HhhhhhhhhhhH..',
]
FACE_DOWN = [
    '...SSSSSSSSSS...',
    '...SSESSSSESS...',
    '...SSSSSSSSSS...',
    '....SSssssSS....',
]
FACE_SIDE = [
    '....SSSSSSSS....',
    '....SSSSSESS....',
    '....SSSSSSSS....',
    '.....SssssS.....',
]
HAIR_BACK = [
    '...GGGGGGGGGG...',
    '...GGGGGGGGGG...',
    '....ssssssss....',
]
BODY_DOWN = [
    '....WWWWWWWW....',
    '...WWBWWWWBWW...',
    '...WWBWWWWBWW...',
    '...sWBBBBBBWs...',
    '....BBBBBBBB....',
    '....BBBBBBBB....',
    '....BbBBBBbB....',
]
BODY_SIDE = [
    '....WWWWWWWW....',
    '....WWWWWBWW....',
    '....WWWWWBWW....',
    '.....WBBBBS.....',
    '....BBBBBBBB....',
    '....BBBBBBBB....',
    '....bBBBBBb.....',
]
BODY_BACK = [
    '....WWWWWWWW....',
    '....WBBWWBBW....',
    '....WBBWWBBW....',
    '....WBBBBBBW....',
    '....BBBBBBBB....',
    '....BBBBBBBB....',
    '....BbBBBBbB....',
]
LEGS_STAND = [
    '....bbb..bbb....',
    '....bbb..bbb....',
    '....bbb..bbb....',
    '....ggg..ggg....',
    '....ggg..ggg....',
]
LEGS_SIDE_STAND = [
    '.....bbb.bbb....',
    '.....bbb.bbb....',
    '.....bbb.bbb....',
    '.....ggg.ggg....',
    '.....ggg.ggg....',
]
LEGS_A = [
    '....bbb..bbb....',
    '...bbb....bbb...',
    '...ggg....ggg...',
    '..ggg......ggg..',
    '................',
]
LEGS_B = [
    '................',
    '....bbb..bbb....',
    '...bbb....bbb...',
    '...ggg....ggg...',
    '...ggg....ggg...',
]


def char_frame(face, legs):
    return sprite(HAT + face + BODY_DOWN + legs)  # body 默认 down


def build_character():
    imgs = {}
    imgs['player_down_0'] = sprite(HAT + FACE_DOWN + BODY_DOWN + LEGS_STAND)
    imgs['player_down_1'] = sprite(HAT + FACE_DOWN + BODY_DOWN + LEGS_A)
    imgs['player_down_2'] = sprite(HAT + FACE_DOWN + BODY_DOWN + LEGS_B)
    side0 = sprite(HAT + FACE_SIDE + BODY_SIDE + LEGS_SIDE_STAND)
    side1 = sprite(HAT + FACE_SIDE + BODY_SIDE + LEGS_A)
    side2 = sprite(HAT + FACE_SIDE + BODY_SIDE + LEGS_B)
    imgs['player_right_0'] = side0
    imgs['player_right_1'] = side1
    imgs['player_right_2'] = side2
    for k in ('player_right_0', 'player_right_1', 'player_right_2'):
        imgs[k.replace('right', 'left')] = imgs[k].transpose(Image.FLIP_LEFT_RIGHT)
    imgs['player_up_0'] = sprite(HAT + HAIR_BACK + BODY_BACK + LEGS_STAND)
    imgs['player_up_1'] = sprite(HAT + HAIR_BACK + BODY_BACK + LEGS_A)
    imgs['player_up_2'] = sprite(HAT + HAIR_BACK + BODY_BACK + LEGS_B)
    return imgs


# ---------------- 图标（12×12） ----------------
ICON_HOE = sprite([
    '..........MM',
    '.........KM.',
    '........KG..',
    '.......KG...',
    '......KG....',
    '.....KG.....',
    '....KG......',
    '...KG.......',
    '..KG........',
    '.GK.........',
    '.K..........',
    '............',
])
ICON_SHOVEL = sprite([
    '.........KK.',
    '........KGK.',
    '.......KG...',
    '......KG....',
    '.....KG.....',
    '....KG......',
    '...MG.......',
    '..MMM.......',
    '.MMMM.......',
    'MMMM........',
    'MM..........',
    '............',
])
ICON_PLANK = sprite([
    '............',
    '............',
    '.GGGGGGGGGG.',
    '.Gggggggggg.',
    '.GGGGGGGGGG.',
    '............',
    '.GGGGGGGGGG.',
    '.GggggggggG.',
    '.GGGGGGGGGG.',
    '............',
    '............',
    '............',
])
ICON_HAMMER = sprite([
    '....MMMMMM..',
    '...MMMMMMMM.',
    '...MMmmmmMM.',
    '...MMMMMMMM.',
    '....MM..MM..',
    '.....KGGK...',
    '.....KG.....',
    '.....KG.....',
    '.....KG.....',
    '.....KG.....',
    '....ggg.....',
    '............',
])
ICON_STAIRS = sprite([
    '............',
    '.MM......MM.',
    '.MM.MMMM.MM.',
    '.MM......MM.',
    '.MM.MMMM.MM.',
    '.MM......MM.',
    '.MM.MMMM.MM.',
    '.MM......MM.',
    '.MM.MMMM.MM.',
    '.mm......mm.',
    '............',
    '............',
])

ICON_UNDO = sprite([
    '...CCCC.....',
    '..C....CC...',
    '.C.....CCC..',
    '.C.....CCC..',
    '.C....CCC...',
    '.C......C...',
    '.C......C...',
    '..C.....C...',
    '...CCCCC....',
    '............',
    '............',
    '............',
])
ICON_UNDO = sprite([
    '...CCCCC....',
    '..C.....C...',
    '.C......C...',
    '.C..........',
    '.C..........',
    '.C......CC..',
    '.C.....CCC..',
    '..C...CCC...',
    '...CCCCC....',
    '............',
    '............',
    '............',
])
ICON_COIN = sprite([
    '............',
    '...yYYYYy...',
    '..YYYwwYYY..',
    '.YYww...yYY.',
    '.YwY...yyYY.',
    '.YY....yyYY.',
    '.yY....yyYy.',
    '.yyY..yYYy..',
    '..yYYYYYy...',
    '...yyyyyy...',
    '............',
    '............',
])
ICON_WOOD = sprite([
    '............',
    '..KKKKKKK...',
    '.KGgggggggK.',
    '.GHHHHHHGg..',
    '.GHhHHhHGg..',
    '.GHHHHHHGg..',
    '.GHhHHhHGg..',
    '.KGggggggK..',
    '..KKKKKKK...',
    '............',
    '............',
    '............',
])

ICON_STONE = sprite([
    '............',
    '....DDDD....',
    '..DDDDDDD...',
    '.DDwDDDDDD..',
    '.DDDDDdDDD..',
    '.DDDDddddd..',
    '..DDddddd...',
    '...ddddd....',
    '............',
    '............',
    '............',
    '............',
])
ICON_HEART = sprite([
    '............',
    '..FF...FF...',
    '.FFFF.FFFF..',
    '.FFFFFFFFF..',
    '.FFFFFFFFF..',
    '..FFFFFFF...',
    '...FFFFF....',
    '....FFF.....',
    '.....F......',
    '............',
    '............',
    '............',
])
ICON_MOON = sprite([
    '............',
    '....CCCC....',
    '..CCCCC.....',
    '.CCCC.......',
    '.CCC........',
    '.CCC........',
    '.CCCC.......',
    '..CCCCC.w...',
    '....CCCCCw..',
    '.......ww...',
    '............',
    '............',
])
ICON_ARROW = sprite([
    '.....YY.....',
    '....YYYY....',
    '...YYYYYY...',
    '..YYyyyyYY..',
    '.YYy....yYY.',
    '.YYy....yYY.',
    '..YY....YY..',
    '...YY..YY...',
    '....YYYY....',
    '.....YY.....',
    '............',
    '............',
])

ICON_SEAL = sprite([
    '............',
    '.wCCCCCCCCw.',
    '.wCyyyyyyCw.',
    '.wCy....yCw.',
    '.wCy.RR.yCw.',
    '.wCyRRRRyCw.',
    '.wCyRRR.yCw.',
    '.wCy.RR.yCw.',
    '.wCyyyyyyCw.',
    '.wCCCCCCCCw.',
    '............',
    '............',
])

# ---------------- 场景元素 ----------------
TREE = sprite([
    '.....TTTTT......',
    '...TTTLTTTT.....',
    '..TTLLTLTTTT....',
    '.TTTLTTTTTTTT...',
    '.TLTTTTtTTTTT...',
    'TTTTTttTTTTTt...',
    'TTtTTTTTTtTTt...',
    '.TTtTTTTTTTt....',
    '.TTTTTttTTTT....',
    '..TTTTTTTTT.....',
    '...ttTTTtt......',
    '.....GG.........',
    '.....GG.........',
    '.....Gg.........',
    '.....Gg.........',
    '....gGGg........',
])

FLOWER = sprite([
    '.F.F.',
    '.YYY.',
    'FYYYF',
    '.YYY.',
    '.F.F.',
])


def tile(colors, speckle, w=16, h=16, n=26):
    import random
    rnd = random.Random(7)
    img = Image.new('RGBA', (w, h), colors[0])
    px = img.load()
    for _ in range(n):
        x, y = rnd.randrange(w), rnd.randrange(h)
        px[x, y] = colors[rnd.randrange(1, len(colors))]
    for _ in range(n // 3):
        x, y = rnd.randrange(w - 1), rnd.randrange(h)
        px[x, y] = speckle
    return img


GRASS = tile([(106, 168, 79, 255), (96, 152, 70, 255), (118, 180, 88, 255)], (88, 140, 64, 255))
WATER = tile([(74, 123, 192, 255), (66, 112, 178, 255), (86, 136, 205, 255)], (140, 176, 224, 255))
PATH = tile([(217, 196, 138, 255), (205, 183, 126, 255), (228, 208, 150, 255)], (186, 164, 108, 255))
SOIL = tile([(139, 94, 60, 255), (126, 84, 52, 255), (152, 104, 68, 255)], (110, 72, 44, 255))


# ---------------- UI 面板/按钮（程序化） ----------------
def panel(w, h, fill=(232, 213, 168, 255), border=(94, 58, 32, 255), ink=(36, 24, 18, 255), radius=3):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=fill, outline=ink, width=2)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=max(1, radius - 1), outline=border, width=1)
    d.line([(4, 3), (w - 5, 3)], fill=(246, 232, 196, 255), width=1)  # 顶部高光
    return img


def btn(w, h, pressed=False, green=(93, 165, 75), dark=(53, 104, 42)):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = tuple(max(0, c - 25) for c in green) if pressed else green
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=4, fill=body + (255,), outline=(36, 24, 18, 255), width=2)
    if not pressed:
        d.rounded_rectangle([2, 2, w - 3, h // 2], radius=3, fill=(118, 186, 98, 255))
        d.rounded_rectangle([2, 2, w - 3, h - 3], radius=2, outline=dark + (255,), width=1)
    return img


def slot(sel=False):
    s = 22
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (62, 46, 34, 235) if not sel else (86, 64, 44, 245)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=3, fill=bg, outline=(20, 14, 10, 255), width=2)
    d.rounded_rectangle([2, 2, s - 3, s - 3], radius=2, outline=(110, 84, 58, 255), width=1)
    if sel:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=3, outline=(242, 193, 78, 255), width=2)
    return img


# ---------------- 字体 ----------------
def load_font(size):
    for path, idx in (('/System/Library/Fonts/PingFang.ttc', 0),
                      ('/System/Library/Fonts/STHeiti_Light.ttc', 0),
                      ('/System/Library/Fonts/Hiragino Sans GB.ttc', 0)):
        try:
            return ImageFont.truetype(path, size, index=idx)
        except Exception:
            continue
    return ImageFont.load_default()


def main():
    chars = build_character()
    icons = {
        'icon_hoe': ICON_HOE, 'icon_shovel': ICON_SHOVEL, 'icon_plank': ICON_PLANK,
        'icon_hammer': ICON_HAMMER, 'icon_stairs': ICON_STAIRS, 'icon_undo': ICON_UNDO,
        'icon_coin': ICON_COIN, 'icon_wood': ICON_WOOD, 'icon_stone': ICON_STONE,
        'icon_heart': ICON_HEART, 'icon_moon': ICON_MOON, 'icon_arrow': ICON_ARROW,
        'icon_seal': ICON_SEAL,
    }
    tiles = {'tile_grass': GRASS, 'tile_water': WATER, 'tile_path': PATH, 'tile_soil': SOIL}
    misc = {'tree': TREE, 'flower': FLOWER}
    all_sprites = {}
    all_sprites.update(chars)
    all_sprites.update(icons)
    all_sprites.update(tiles)
    all_sprites.update(misc)
    for name, im in all_sprites.items():
        im.save(os.path.join(SPR, name + '.png'))

    # ---------- 假游戏截图（320×180 逻辑，×4 输出） ----------
    S = 4
    LW, LH = 320, 180
    mock = Image.new('RGBA', (LW * S, LH * S), (20, 20, 24, 255))
    d = ImageDraw.Draw(mock)

    def paste(im, x, y, scale=1):
        mock.alpha_composite(im.resize((im.width * scale * S, im.height * scale * S), Image.NEAREST), (x * S, y * S))

    def put_tile(t, tx, ty):
        paste(t, tx * 16, ty * 16)

    # 地形
    for ty in range(12):
        for tx in range(20):
            put_tile(GRASS, tx, ty)
    # 河（左，col 3-5）
    for ty in range(12):
        for tx in (3, 4, 5):
            put_tile(WATER, tx, ty)
    # 路（行 7）
    for tx in range(6, 20):
        put_tile(PATH, tx, 7)
    # 农田角
    for ty in (9, 10):
        for tx in (8, 9, 10):
            put_tile(SOIL, tx, ty)
    # 花/树
    paste(FLOWER, 116, 64); paste(FLOWER, 250, 60); paste(FLOWER, 60, 150)
    paste(TREE, 16, 52); paste(TREE, 268, 56); paste(TREE, 120, 36)
    # NPC（复用现有 png，洋红底抠透明）
    npc = Image.open(os.path.join(OUT, '..', '..', '..', 'assets', 'textures', 'npc', 'npc_gardener.png')).convert('RGBA')
    npx = npc.load()
    for yy in range(npc.height):
        for xx in range(npc.width):
            r, g, b, a = npx[xx, yy]
            if r > 180 and g < 90 and b > 140:
                npx[xx, yy] = (r, g, b, 0)
    paste(npc, 216, 96)

    # 玩家（站姿，站在路上）
    paste(chars['player_down_0'], 148, 96)

    # ---- UI 覆盖层（×4 坐标） ----
    f26 = load_font(26)
    f20 = load_font(20)

    # 顶部资源条
    bar = panel(150, 24)
    paste(bar, 6, 5)
    paste(ICON_COIN, 10, 11)
    d.text((26 * S, 11 * S), '128', font=f20, fill=(60, 40, 24, 255))
    paste(ICON_WOOD, 56, 11)
    d.text((72 * S, 11 * S), '36', font=f20, fill=(60, 40, 24, 255))
    paste(ICON_STONE, 96, 11)
    d.text((112 * S, 11 * S), '12', font=f20, fill=(60, 40, 24, 255))
    paste(ICON_HEART, 132, 11)
    d.text((148 * S, 11 * S), '5', font=f20, fill=(60, 40, 24, 255))
    # 昼夜 chip
    chip = panel(52, 24, fill=(36, 24, 18, 235), border=(110, 84, 58, 255))
    paste(chip, 262, 5)
    paste(ICON_MOON, 266, 11)
    d.text((282 * S, 11 * S), '夜', font=f20, fill=(240, 234, 216, 255))

    # 工具坞（右下，6 槽，第 4 个选中）
    dock_x, dock_y = 172, 150
    icons_order = [ICON_HOE, ICON_SHOVEL, ICON_PLANK, ICON_HAMMER, ICON_STAIRS, ICON_UNDO]
    for i, ic in enumerate(icons_order):
        sx = dock_x + i * 24
        paste(slot(sel=(i == 3)), sx, dock_y)
        paste(ic, sx + 5, dock_y + 5)

    # 情境按钮（NPC 头顶）
    b = btn(52, 20)
    paste(b, 208, 76)
    d.text((216 * S, 80 * S), '钓鱼', font=f20, fill=(255, 255, 255, 255))

    # 指南针（右上，昼夜签下方）
    paste(ICON_ARROW, 296, 40)

    # 对话框（左下）
    dlg = panel(150, 44, fill=(240, 226, 188, 250))
    paste(dlg, 8, 128)
    portrait = npc.crop((14, 8, 38, 32)).resize((24, 24), Image.NEAREST)
    paste(portrait, 12, 134)
    d.text((42 * S, 132 * S), '园艺师·温妮', font=f20, fill=(120, 78, 40, 255))
    d.text((42 * S, 146 * S), '今天的河水很安静，', font=f20, fill=(70, 48, 30, 255))
    d.text((42 * S, 158 * S), '适合钓鱼。', font=f20, fill=(70, 48, 30, 255))

    mock.save(os.path.join(OUT, 'preview_mock.png'))

    # ---------- 素材总览图 ----------
    names = list(all_sprites.keys())
    cols, cell, z = 8, 160, 6
    rows_n = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell, rows_n * cell + 40), (24, 24, 30, 255))
    ds = ImageDraw.Draw(sheet)
    f18 = load_font(18)
    for i, name in enumerate(names):
        im = all_sprites[name]
        zim = im.resize((im.width * z, im.height * z), Image.NEAREST)
        cx = (i % cols) * cell
        cy = (i // cols) * cell
        if zim.width > cell - 8 or zim.height > cell - 28:
            k = min((cell - 8) / zim.width, (cell - 28) / zim.height)
            zim = zim.resize((int(zim.width * k), int(zim.height * k)), Image.NEAREST)
        sheet.alpha_composite(zim, (cx + (cell - zim.width) // 2, cy + (cell - 28 - zim.height) // 2))
        ds.text((cx + cell // 2 - len(name) * 5, cy + cell - 24), name, font=f18, fill=(200, 200, 205, 255))
    sheet.save(os.path.join(OUT, 'asset_sheet.png'))
    print('OK', len(all_sprites), 'sprites ->', OUT)


if __name__ == '__main__':
    main()
