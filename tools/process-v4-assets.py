#!/usr/bin/env python3
"""V4 素材后处理：绿底 chroma-key → despill → alpha bbox 裁剪 → NEAREST 降采样 → 目标画布。
用法：python3 tools/process-v4-assets.py   （先跑 aigc_image 生成 11 张源图）"""
from PIL import Image
import os

# (源图, 目标路径, 宽, 高, key 阈值 g, 全局 alpha 缩放 0-255)
JOBS = [
    ("aigc-outputs/image-20261119-142953.png", "assets/textures/world/house.png", 128, 112, 140, 255),
    ("aigc-outputs/image-20261119-143000.png", "assets/textures/npc/npc_fisher.png", 48, 48, 140, 255),
    ("aigc-outputs/image-20261119-143008.png", "assets/textures/world/defense_flytrap.png", 32, 48, 140, 255),
    ("aigc-outputs/image-20261119-143015.png", "assets/textures/world/defense_glow.png", 32, 48, 140, 255),
    ("aigc-outputs/image-20261119-143022.png", "assets/textures/world/fence.png", 32, 32, 140, 255),
    ("aigc-outputs/image-20261119-143030.png", "assets/textures/world/spike_trap.png", 32, 24, 140, 255),
    ("aigc-outputs/image-20261119-143037.png", "assets/textures/world/flower_patch.png", 32, 32, 140, 255),
    ("aigc-outputs/image-20261119-143107.png", "assets/textures/world/mushroom.png", 24, 24, 140, 255),
    ("aigc-outputs/image-20261119-143132.png", "assets/textures/world/grass_tuft.png", 24, 20, 175, 255),
    ("aigc-outputs/image-20261119-143207.png", "assets/textures/world/butterfly.png", 24, 20, 140, 255),
    ("aigc-outputs/image-20261119-143115.png", "assets/textures/world/fish_shadow.png", 48, 24, 140, 160),
]


def key_green(img: Image.Image, gthr: int) -> Image.Image:
    """纯绿底→全透明；绿色溢出像素 despill（压 g、提 r/b）。"""
    img = img.convert("RGBA")
    px = img.load()
    W, H = img.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if g > gthr and r < 110 and b < 110:
                px[x, y] = (0, 0, 0, 0)
            elif g > r + 30 and g > b + 30:
                px[x, y] = (min(r + 10, 255), min(max(r, b) + 20, 255), min(b + 10, 255), a)
    return img


def process(src: str, dst: str, w: int, h: int, gthr: int, ascale: int) -> None:
    img = key_green(Image.open(src), gthr)
    bb = img.split()[3].getbbox()
    if bb:
        img = img.crop(bb)
    sw, sh = img.size
    scale = min(w / sw, h / sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    img = img.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(img, ((w - nw) // 2, (h - nh) // 2), img)
    if ascale != 255:
        r, g, b, a = canvas.split()
        a = a.point(lambda v: v * ascale // 255)
        canvas = Image.merge("RGBA", (r, g, b, a))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    canvas.save(dst)
    print(f"ok {dst} <- {src} ({sw}x{sh} -> {nw}x{nh} @ {w}x{h}, alpha {ascale})")


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    for j in JOBS:
        process(*j)
    print("done")
