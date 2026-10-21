#!/usr/bin/env python3
"""Generate placeholder Expo assets for TutorKids.

Run from the mobile/ directory:
    python3 scripts/generate-assets.py

This creates the PNG assets referenced by app.json. Replace them later with
professional branding assets.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = Path(__file__).parent.parent / "assets"
ASSETS_DIR.mkdir(exist_ok=True)

# Brand colors
PRIMARY = "#2e7d32"
BACKGROUND = "#ffffff"
ACCENT = "#1b5e20"


def make_font(size: int) -> ImageFont.FreeTypeFont:
    """Try to load a nice font, fallback to default if none available."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/roboto/Roboto-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw_rounded_background(draw: ImageDraw.Draw, size: int, color: str, radius: int) -> None:
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=color)


def render_logo(size: int, bg_color: str, transparent: bool = False, radius_ratio: float = 0.22) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else bg_color)
    draw = ImageDraw.Draw(img)

    if not transparent:
        radius = int(size * radius_ratio)
        draw_rounded_background(draw, size, PRIMARY, radius)

    # Draw "TK" text in white, centered
    text = "TK"
    font_size = int(size * 0.45)
    font = make_font(font_size)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1] - int(size * 0.03)  # optical center
    draw.text((x, y), text, font=font, fill="white")
    return img


def generate() -> None:
    # App icon (iOS + Android legacy)
    icon = render_logo(1024, PRIMARY)
    icon.save(ASSETS_DIR / "icon.png", "PNG")

    # Adaptive icon foreground (transparent background)
    adaptive = render_logo(1024, "#00000000", transparent=True)
    adaptive.save(ASSETS_DIR / "adaptive-icon.png", "PNG")

    # Splash screen
    splash_w, splash_h = 1242, 2438
    splash = Image.new("RGB", (splash_w, splash_h), BACKGROUND)
    draw = ImageDraw.Draw(splash)

    # Draw a centered rounded square logo on the splash
    logo_size = int(min(splash_w, splash_h) * 0.35)
    logo = render_logo(logo_size, PRIMARY)
    x = (splash_w - logo_size) // 2
    y = (splash_h - logo_size) // 2 - int(splash_h * 0.05)
    splash.paste(logo, (x, y), logo)

    # Brand name below the logo
    brand_text = "TutorKids"
    font_size = int(splash_w * 0.08)
    font = make_font(font_size)
    bbox = draw.textbbox((0, 0), brand_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    tx = (splash_w - text_w) // 2 - bbox[0]
    ty = y + logo_size + int(splash_h * 0.04)
    draw.text((tx, ty), brand_text, font=font, fill=PRIMARY)

    splash.save(ASSETS_DIR / "splash.png", "PNG")

    # Web favicon
    favicon = render_logo(32, PRIMARY)
    favicon.save(ASSETS_DIR / "favicon.png", "PNG")

    # Notification icon: simple white icon on transparent, 96x96
    notif = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    ndraw = ImageDraw.Draw(notif)
    font = make_font(52)
    bbox = ndraw.textbbox((0, 0), "TK", font=font)
    nw = bbox[2] - bbox[0]
    nh = bbox[3] - bbox[1]
    nx = (96 - nw) // 2 - bbox[0]
    ny = (96 - nh) // 2 - bbox[1]
    ndraw.text((nx, ny), "TK", font=font, fill="white")
    notif.save(ASSETS_DIR / "notification-icon.png", "PNG")

    print(f"Generated assets in {ASSETS_DIR}:")
    for path in sorted(ASSETS_DIR.glob("*.png")):
        print(f"  - {path.name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    generate()
