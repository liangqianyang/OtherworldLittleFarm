#!/usr/bin/env python3
"""
gen_pixel_art.py —— 千问AI平台文生图 → 像素素材全自动流水线（阶段 2.5）

实测契约（2026-11-13，token-plan key）：
  ① 端点必须用 Token Plan 域名（通用 maas 域名 401）
  ② 兼容模式 /images/generations 不可用（400 url error）；multimodal-generation 端点 403
  ③ 可用：原生异步 POST /api/v1/services/aigc/image-generation/generation
     body: input.messages[{role:user, content:[{text:prompt}]}] + X-DashScope-Async: enable
  ④ 轮询 GET /api/v1/tasks/{id} → SUCCEEDED → output.choices[0].message.content[0].image
  ⑤ 单张约 50 秒

用法：
  python3 tools/gen_pixel_art.py                # 生成全部
  python3 tools/gen_pixel_art.py --only carrot_2 icon_gold   # 只生成指定 id
  python3 tools/gen_pixel_art.py --list         # 只打印提示词，不调 API
  python3 tools/gen_pixel_art.py --model qwen-image-2.1-turbo  # 临时换模型

密钥：读 .secrets/qwen.key（第一行纯 key），该目录已被 .gitignore 忽略。
流程：生成 1024×1024 → 最近邻缩到目标尺寸 → 量化 ≤24 色 → （alpha 类）品红抠透明 → 存 PNG。

依据 docs/assets/pixel-art-prompts.md（§18：16/32px 网格、统一调色板、中英提示词+负面词）。
"""
import json
import os
import sys
import time
import base64
import urllib.request
import urllib.error

# ---- 配置 ----
BASE = "https://token-plan.maas.qianwenaiapi.com"   # Token Plan 专用域名
SUBMIT_URL = f"{BASE}/api/v1/services/aigc/image-generation/generation"
TASK_URL = f"{BASE}/api/v1/tasks"
MODEL = "qwen-image-3.0-pro"      # 对比胜出：俯视构图/配色最合（备选 qwen-image-2.1-turbo 更便宜）
GEN_SIZE = "1024*1024"            # 原生 API 用星号分隔
KEY_FILE = os.path.join(os.path.dirname(__file__), "..", ".secrets", "qwen.key")
ROOT = os.path.join(os.path.dirname(__file__), "..")

NEGATIVE = ("no text, no watermark, no UI elements, no cursor, no badge, no interface, "
            "no anti-aliasing, no blurry, no gradient, no soft shading, no 3D render, no photorealistic")
NEGATIVE_ZH = "无文字、无水印、无界面元素、无光标、无抗锯齿、无模糊、无渐变、无柔和阴影"

# 统一调色板描述（写进每条正向提示词，保证色系一致）
PALETTE = "limited warm earthy palette (dark brown #2a1f16 outline, soil browns, grass greens, golden accents), clean hard pixel edges"

# ---- 素材清单 ----
# (id, 目标px, 输出路径, 透明白背景?, 提示词)
# alpha=True → 品红底生成 + 抠透明（作物/图标叠在地块上必需）
# alpha=False → 满幅（地砖要可平铺）
ASSETS = [
    ("ground_grass", 32, "assets/textures/tiles/ground_grass.png", False,
     "像素画，16位复古农场游戏草地地砖，顶部俯视满幅，深浅两种绿色短草纹理均匀分布，可无缝平铺，无任何边界和装饰。" + PALETTE +
     " pixel art tile, 16-bit retro farm game grass, full-bleed top-down, two-tone green short grass, seamlessly tileable, edge-to-edge"),
    ("plot_soil", 32, "assets/textures/tiles/plot_soil.png", False,
     "像素画，16位复古农场游戏耕地，俯视正方形深棕色泥土地占满画面，几道横向犁沟纹理，满幅无边框无背景。" + PALETTE +
     " pixel art tile, 16-bit retro farm game tilled soil, full-bleed top-down square, dark brown dirt with horizontal furrows, edge-to-edge"),
    ("plot_soil_wet", 32, "assets/textures/tiles/plot_soil_wet.png", False,
     "像素画，16位复古农场游戏湿润耕地，俯视深褐色湿泥土带轻微光泽占满画面，横向犁沟，满幅无背景。" + PALETTE +
     " pixel art tile, 16-bit retro farm game wet tilled soil, full-bleed top-down, dark brown glossy wet dirt with furrows, edge-to-edge"),
    ("carrot_0", 32, "assets/textures/crops/carrot_0.png", True,
     "像素画，16位复古农场游戏，单株胡萝卜嫩芽（两片小绿叶），纯品红色背景，游戏精灵图。" + PALETTE +
     " pixel art sprite, 16-bit retro farm game, single tiny carrot sprout with two small green leaves, isolated on solid magenta background"),
    ("carrot_1", 32, "assets/textures/crops/carrot_1.png", True,
     "像素画，16位复古农场游戏，生长中的胡萝卜植株（绿色羽状叶簇，微露橙色萝卜头），纯品红色背景，游戏精灵图。" + PALETTE +
     " pixel art sprite, 16-bit retro farm game, growing carrot plant with green feathery leaves and orange carrot tip visible, isolated on solid magenta background"),
    ("carrot_2", 32, "assets/textures/crops/carrot_2.png", True,
     "像素画，16位复古农场游戏，成熟胡萝卜（茂盛绿色羽状叶+半根鲜艳橙色胡萝卜露出），纯品红色背景，游戏精灵图。" + PALETTE +
     " pixel art sprite, 16-bit retro farm game, mature harvest-ready carrot, lush green feathery leaves and half vivid orange carrot exposed, isolated on solid magenta background"),
    ("icon_gold", 16, "assets/textures/ui/icon_gold.png", True,
     "像素画，16位复古游戏金币图标，圆形金色硬币，中间简单星形浮雕，深色描边，纯品红色背景，游戏图标。" + PALETTE +
     " pixel art icon, 16-bit retro game gold coin, round golden coin with star emboss and dark outline, isolated on solid magenta background"),
    ("icon_seed", 16, "assets/textures/ui/icon_seed.png", True,
     "像素画，16位复古游戏种子袋图标，小牛皮纸种子袋，袋口折叠，正面画橙色小胡萝卜，纯品红色背景，游戏图标。" + PALETTE +
     " pixel art icon, 16-bit retro game seed packet, small kraft paper bag with folded top and tiny orange carrot drawing, isolated on solid magenta background"),
    ("icon_carrot", 16, "assets/textures/ui/icon_carrot.png", True,
     "像素画，16位复古游戏图标，一根鲜艳橙色胡萝卜带绿色缨子，斜置，深色描边，纯品红色背景，游戏物品图标。" + PALETTE +
     " pixel art icon, 16-bit retro game item icon, single vivid orange carrot with green leafy top, tilted, dark outline, isolated on solid magenta background"),
    # ---- Batch2：探险（旧林地）+ 防守（封印之夜）素材 ----
    ("ground_forest", 32, "assets/textures/tiles/ground_forest.png", False,
     "像素画，16位复古游戏暗色林地地面地砖，顶部俯视满幅，深绿褐色苔藓泥土与散落小树叶纹理均匀分布，色调比普通草地更深更暗，可无缝平铺，无任何边界和装饰。" + PALETTE +
     " pixel art tile, 16-bit retro game dark forest floor, full-bleed top-down, dark green-brown mossy dirt with scattered tiny leaves, seamless tileable, edge-to-edge"),
    ("bush_berry", 32, "assets/textures/adventure/bush_berry.png", True,
     "像素画，16位复古游戏浆果灌木丛精灵图，圆润深绿色灌木上点缀多颗鲜红色小浆果，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game berry bush, round dark green shrub dotted with vivid red berries, dark outline, isolated on solid magenta background"),
    ("herb_patch", 32, "assets/textures/adventure/herb_patch.png", True,
     "像素画，16位复古游戏药草丛精灵图，一小簇鲜绿色药草叶束从土丘长出，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game herb cluster, small bunch of bright green herb leaves growing from a dirt mound, dark outline, isolated on solid magenta background"),
    ("wood_log", 32, "assets/textures/adventure/wood_log.png", True,
     "像素画，16位复古游戏原木堆精灵图，两根横放的棕色圆木叠在一起，截面年轮可见，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game log pile, two stacked brown round logs with visible tree-ring cut ends, dark outline, isolated on solid magenta background"),
    ("slime", 32, "assets/textures/monsters/slime.png", True,
     "像素画，16位复古游戏可爱粘液怪精灵图，圆胖半透明的草绿色史莱姆，两只呆萌大眼睛，底部微扁，滑稽可爱不恐怖，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game cute slime monster, chubby round translucent grass-green blob with two silly big eyes, flat bottom, goofy not scary, dark outline, isolated on solid magenta background"),
    ("slime_elite", 48, "assets/textures/monsters/slime_elite.png", True,
     "像素画，16位复古游戏精英粘液怪精灵图，比普通粘怪更大更胖的紫色史莱姆，头顶小皇冠，呆萌大眼睛，滑稽威风不恐怖，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game elite slime monster, bigger chubbier purple blob wearing a tiny golden crown, silly big eyes, goofy not scary, dark outline, isolated on solid magenta background"),
    ("barn", 64, "assets/textures/adventure/barn.png", True,
     "像素画，16位复古游戏农场谷仓精灵图，正面视角红棕色木板谷仓，白色 X 形大门装饰，三角屋顶，深色描边，纯品红色背景。" + PALETTE +
     " pixel art sprite, 16-bit retro game farm barn, front view red-brown wooden barn with white X-shaped door trim and triangular roof, dark outline, isolated on solid magenta background"),
    ("icon_berry", 16, "assets/textures/ui/icon_berry.png", True,
     "像素画，16位复古游戏图标，一颗鲜红色圆形浆果带小绿叶，深色描边，纯品红色背景，游戏物品图标。" + PALETTE +
     " pixel art icon, 16-bit retro game item icon, single vivid red round berry with tiny green leaf, dark outline, isolated on solid magenta background"),
    ("icon_herb", 16, "assets/textures/ui/icon_herb.png", True,
     "像素画，16位复古游戏图标，一小束鲜绿色药草叶，深色描边，纯品红色背景，游戏物品图标。" + PALETTE +
     " pixel art icon, 16-bit retro game item icon, small bundle of bright green herb leaves tied together, dark outline, isolated on solid magenta background"),
    ("icon_wood", 16, "assets/textures/ui/icon_wood.png", True,
     "像素画，16位复古游戏图标，一根横放棕色圆木带年轮截面，深色描边，纯品红色背景，游戏物品图标。" + PALETTE +
     " pixel art icon, 16-bit retro game item icon, single horizontal brown log with tree-ring end, dark outline, isolated on solid magenta background"),
    ("icon_gel", 16, "assets/textures/ui/icon_gel.png", True,
     "像素画，16位复古游戏图标，一滴半透明草绿色粘液圆球带高光，深色描边，纯品红色背景，游戏物品图标。" + PALETTE +
     " pixel art icon, 16-bit retro game item icon, single translucent grass-green slime gel drop with highlight, dark outline, isolated on solid magenta background"),
]


def load_key() -> str:
    path = os.path.abspath(KEY_FILE)
    if not os.path.exists(path):
        sys.exit(f"✗ 未找到密钥文件 {path}")
    with open(path, "r", encoding="utf-8") as f:
        key = f.readline().strip()
    if not key:
        sys.exit("✗ 密钥文件为空")
    return key


def _submit(key: str, prompt: str, model: str) -> str:
    body = json.dumps({
        "model": model,
        "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
        "parameters": {"size": GEN_SIZE, "n": 1},
    }).encode("utf-8")
    req = urllib.request.Request(SUBMIT_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())["output"]["task_id"]


def _poll(key: str, task_id: str, out_png: str) -> None:
    for _ in range(48):  # 最长 4 分钟
        time.sleep(5)
        req = urllib.request.Request(f"{TASK_URL}/{task_id}", headers={"Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            out = json.loads(resp.read())["output"]
        st = out.get("task_status")
        if st == "SUCCEEDED":
            url = out["choices"][0]["message"]["content"][0]["image"]
            urllib.request.urlretrieve(url, out_png)
            return
        if st in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(f"任务失败 {st}: {json.dumps(out)[:200]}")
    raise RuntimeError("轮询超时（4分钟）")


def gen_image(key: str, prompt: str, out_tmp: str, model: str) -> None:
    full = f"{prompt}\n（负面，严格禁止）：{NEGATIVE_ZH}; {NEGATIVE}"
    task_id = _submit(key, full, model)
    _poll(key, task_id, out_tmp)


def chroma_key(img, tol=90):  # 以左上角点取样背景色 → 按色距抠透明（模型不画纯品红也能适配）
    px = img.load()
    w, h = img.size
    ref = px[2, 2][:3]
    for y in range(h):
        for x in range(w):
            r, g_, b, a = px[x, y]
            if (r - ref[0]) ** 2 + (g_ - ref[1]) ** 2 + (b - ref[2]) ** 2 < tol * tol:
                px[x, y] = (r, g_, b, 0)
    return img


def process(gen_png: str, target_px: int, out_path: str, alpha: bool) -> None:
    from PIL import Image
    img = Image.open(gen_png).convert("RGBA")
    if alpha:
        img = chroma_key(img)
    small = img.resize((target_px, target_px), Image.NEAREST)
    quant = small.quantize(colors=24, method=Image.FASTOCTREE).convert("RGBA")
    dest = os.path.join(ROOT, out_path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    quant.save(dest, "PNG")
    print(f"  → {out_path} ({target_px}×{target_px}, 24色, {'透明底' if alpha else '满幅'})")


def main() -> None:
    args = sys.argv[1:]
    only = args[args.index("--only") + 1:] if "--only" in args else None
    model = args[args.index("--model") + 1] if "--model" in args else MODEL
    if "--list" in args:
        for aid, px, path, alpha, prompt in ASSETS:
            print(f"[{aid}] {px}px alpha={alpha} → {path}\n  {prompt}\n")
        return

    key = load_key()
    tmp = os.path.join(ROOT, ".secrets", "_gen_raw.png")
    targets = [a for a in ASSETS if not only or a[0] in only]
    for aid, px, path, alpha, prompt in targets:
        print(f"[{aid}] 生成中…（{model}）")
        ok = False
        for attempt in (1, 2, 3):
            try:
                gen_image(key, prompt, tmp, model)
                ok = True
                break
            except Exception as e:
                print(f"  第{attempt}次失败：{str(e)[:120]}，重试…")
                time.sleep(5 * attempt)
        if not ok:
            print(f"  ✗ [{aid}] 三次失败，跳过")
            continue
        process(tmp, px, path, alpha)
        time.sleep(2)
    if os.path.exists(tmp):
        os.remove(tmp)
    print("完成。下一步：MCP refresh → point 采样 → Sprite 接入。")


if __name__ == "__main__":
    main()
