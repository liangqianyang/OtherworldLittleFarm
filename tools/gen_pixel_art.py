#!/usr/bin/env python3
"""
gen_pixel_art.py —— 千问AI平台文生图 → 像素素材全自动流水线（阶段 2.5）

用法：
  python3 tools/gen_pixel_art.py                # 生成全部 8 张
  python3 tools/gen_pixel_art.py --only carrot_2 icon_gold   # 只生成指定 id
  python3 tools/gen_pixel_art.py --list         # 只打印提示词，不调 API（dry run）

密钥：读 .secrets/qwen.key（第一行纯 key），该目录已被 .gitignore 忽略。
流程：qwen-image 生成 1024×1024 → Pillow 最近邻缩到目标尺寸 → 量化 ≤24 色 → 存 PNG。

依据 docs/assets/pixel-art-prompts.md（§18：16/32px 网格、统一调色板、中英提示词+负面词）。
"""
import json
import os
import sys
import time
import base64
import urllib.request

# ---- 配置 ----
API_BASE = "https://maas.qianwenaiapi.com/compatible-mode/v1/images/generations"
MODEL = "qwen-image-3.0"          # 备选: qwen-image-2.1-turbo(便宜快)/3.0-pro(最贵最好)
GEN_SIZE = "1024x1024"
KEY_FILE = os.path.join(os.path.dirname(__file__), "..", ".secrets", "qwen.key")
ROOT = os.path.join(os.path.dirname(__file__), "..")

NEGATIVE_ZH = "抗锯齿、模糊、柔和阴影、渐变、3D渲染、照片、高细节、文字、水印、边框"
NEGATIVE_EN = "anti-aliasing, blurry, soft shading, gradient, smooth, 3D render, photorealistic, high detail, text, watermark, border, noise"

# 统一调色板描述（写进每条正向提示词，保证色系一致）
PALETTE = "limited warm earthy palette (dark brown #2a1f16 outline, soil browns, grass greens, golden accents), clean hard edges, no anti-aliasing"

# ---- 素材清单（与提示词表一一对应）----
ASSETS = [
    # id, 目标px, 输出路径, 正向提示词（中+英+调色板）
    ("ground_grass", 32, "assets/textures/tiles/ground_grass.png",
     "像素画，16位复古农场游戏草地地砖，顶部俯视图，深浅两种绿色短草纹理均匀分布，可无缝拼接，无花朵无装饰。" + PALETTE +
     " pixel art, 16-bit retro farm game grass tile, top-down, two-tone green short grass, seamlessly tileable, no decorations"),
    ("plot_soil", 32, "assets/textures/tiles/plot_soil.png",
     "像素画，16位复古农场游戏耕地，俯视正方形深棕色泥土地，浅色木质边框，内部几道横向犁沟纹理。" + PALETTE +
     " pixel art, 16-bit retro farm game soil plot, top-down square, dark brown tilled dirt, light wooden border, horizontal plow furrows"),
    ("plot_soil_wet", 32, "assets/textures/tiles/plot_soil_wet.png",
     "像素画，16位复古农场游戏湿润耕地，俯视正方形深褐色湿泥土带轻微光泽点，浅色木质边框，横向犁沟。" + PALETTE +
     " pixel art, 16-bit retro farm game wet soil plot, top-down square, dark brown glossy wet dirt, light wooden border, plow furrows"),
    ("carrot_0", 32, "assets/textures/crops/carrot_0.png",
     "像素画，16位复古农场游戏，单株胡萝卜嫩芽，两片小绿叶从深棕土壤中冒出，非常小，居中。" + PALETTE +
     " pixel art, 16-bit retro farm game, single tiny carrot sprout, two small green leaves emerging from dark soil, centered"),
    ("carrot_1", 32, "assets/textures/crops/carrot_1.png",
     "像素画，16位复古农场游戏，生长中的胡萝卜植株，一簇绿色羽状叶子明显长大，土里微微露出橙色胡萝卜头顶。" + PALETTE +
     " pixel art, 16-bit retro farm game, growing carrot plant, cluster of green feathery leaves, tip of orange carrot barely visible above soil"),
    ("carrot_2", 32, "assets/textures/crops/carrot_2.png",
     "像素画，16位复古农场游戏，成熟胡萝卜，茂盛绿色羽状叶加半根鲜艳橙色胡萝卜露出土壤，诱人。" + PALETTE +
     " pixel art, 16-bit retro farm game, mature harvest-ready carrot, lush green feathery leaves, half of vivid orange carrot exposed above soil"),
    ("icon_gold", 16, "assets/textures/ui/icon_gold.png",
     "像素画，16位复古游戏金币图标，圆形金色硬币，中间简单星形浮雕，深色描边，透明背景。" + PALETTE +
     " pixel art, 16-bit retro game gold coin icon, round golden coin, simple star emboss, dark outline, transparent background"),
    ("icon_seed", 16, "assets/textures/ui/icon_seed.png",
     "像素画，16位复古游戏种子袋图标，小牛皮纸种子袋，袋口折叠，正面画橙色小胡萝卜图案，透明背景。" + PALETTE +
     " pixel art, 16-bit retro game seed packet icon, small kraft paper bag with folded top, tiny orange carrot drawing on front, transparent background"),
]


def load_key() -> str:
    path = os.path.abspath(KEY_FILE)
    if not os.path.exists(path):
        sys.exit(f"✗ 未找到密钥文件 {path}\n  请把千问平台 API Key 纯文本写入该文件第一行（此目录已 gitignore）")
    with open(path, "r", encoding="utf-8") as f:
        key = f.readline().strip()
    if not key:
        sys.exit("✗ 密钥文件为空")
    return key


def gen_image(key: str, prompt: str, out_tmp: str) -> None:
    body = json.dumps({
        "model": MODEL,
        "prompt": f"{prompt}\n负面（必须避免）：{NEGATIVE_ZH}; negative prompt: {NEGATIVE_EN}",
        "n": 1,
        "size": GEN_SIZE,
    }).encode("utf-8")
    req = urllib.request.Request(API_BASE, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    item = data["data"][0]
    if "b64_json" in item and item["b64_json"]:
        with open(out_tmp, "wb") as f:
            f.write(base64.b64decode(item["b64_json"]))
    elif "url" in item:
        urllib.request.urlretrieve(item["url"], out_tmp)
    else:
        sys.exit(f"✗ 响应里既无 b64_json 也无 url: {json.dumps(data)[:300]}")


def process(gen_png: str, target_px: int, out_path: str) -> None:
    from PIL import Image
    img = Image.open(gen_png).convert("RGBA")
    # 最近邻缩到目标像素（保证像素网格干净）
    small = img.resize((target_px, target_px), Image.NEAREST)
    # 量化 ≤24 色适配调色板约束 + 包体
    quant = small.quantize(colors=24, method=Image.MEDIANCUT).convert("RGBA")
    dest = os.path.join(ROOT, out_path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    quant.save(dest, "PNG")
    print(f"  → {out_path} ({target_px}×{target_px}, 24色)")


def main() -> None:
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        i = args.index("--only")
        only = args[i + 1:]
    if "--list" in args:
        for aid, px, path, prompt in ASSETS:
            print(f"[{aid}] {px}px → {path}\n  {prompt}\n")
        return

    key = load_key()
    tmp = os.path.join(ROOT, ".secrets", "_gen_raw.png")
    targets = [a for a in ASSETS if not only or a[0] in only]
    for aid, px, path, prompt in targets:
        print(f"[{aid}] 生成中…（{MODEL} {GEN_SIZE}）")
        ok = False
        for attempt in (1, 2, 3):
            try:
                gen_image(key, prompt, tmp)
                ok = True
                break
            except Exception as e:  # 限流/网络抖动重试
                print(f"  第{attempt}次失败：{e}，重试…")
                time.sleep(5 * attempt)
        if not ok:
            print(f"  ✗ [{aid}] 三次失败，跳过（其余继续）")
            continue
        process(tmp, px, path)
        time.sleep(2)  # 温和限速
    os.remove(tmp) if os.path.exists(tmp) else None
    print("完成。下一步：MCP refresh → point 采样 → Sprite 接入。")


if __name__ == "__main__":
    main()
