#!/usr/bin/env python3
"""Re-tone the reference landing artwork from Bitplaza orange to Amplify emerald.

One-off, kept in the repo so the artwork can be regenerated if the accent changes.
Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §5.

- Hue is rotated by a fixed amount (orange #FA6A3C -> emerald #10A37F).
- Saturation is untouched. Value is optionally scaled, weighted by saturation, so
  saturated pixels darken while neutral ones (the hero's white foot) do not move.
- Alpha is copied byte-for-byte.
- section-glow and grain are saved lossless (lossy posterizes low alpha into rings
  and blanks grain); hero-ground has no alpha and is lossy q90, as the reference's is.
"""
from __future__ import annotations

import argparse
import colorsys
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
DEFAULT_SRC = (
    Path.home()
    / "Documents/Bitcoin Culture Hub/Opten/bitcoinculturehub/public/images/opportunity-engine"
)
OUT = REPO / "public/images/landing"


def hue(hex_color: str) -> float:
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(r, g, b)[0]


def hue_shift(nudge_degrees: float) -> int:
    """Rotation in PIL units (hue stored as 0-255 for 0-360 degrees).

    The reference's brightest pixels are amber, ~15 degrees yellower than its
    orange, so a straight orange->emerald rotation lands them on cyan. The nudge
    pulls the whole rotation back toward green.
    """
    turn = (hue("#10A37F") - hue("#FA6A3C") + nudge_degrees / 360) % 1.0
    return round(turn * 256) % 256


def retone(img: Image.Image, value_scale: float, shift: int) -> Image.Image:
    alpha = img.getchannel("A") if img.mode == "RGBA" else None
    hsv = np.asarray(img.convert("RGB").convert("HSV")).astype(np.float64)
    hsv[..., 0] = (hsv[..., 0] + shift) % 256
    saturation = hsv[..., 1] / 255.0
    hsv[..., 2] = np.clip(
        np.round(hsv[..., 2] * (1.0 - (1.0 - value_scale) * saturation)), 0, 255
    )
    out = Image.frombytes("HSV", img.size, hsv.astype(np.uint8).tobytes()).convert("RGB")
    if alpha is not None:
        out.putalpha(alpha)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument(
        "--hero-value", type=float, default=0.82,
        help="value scale for saturated hero pixels (1.0 = unchanged)",
    )
    parser.add_argument(
        "--glow-value", type=float, default=0.9,
        help="value scale for the section glow (1.0 = unchanged)",
    )
    parser.add_argument(
        "--hue-nudge", type=float, default=-7.0,
        help="degrees added to the orange->emerald rotation (negative = greener)",
    )
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    shift = hue_shift(args.hue_nudge)

    hero_src = Image.open(args.src / "hero-ground.webp")
    hero = retone(hero_src, args.hero_value, shift)
    hero.save(OUT / "hero-ground.webp", "WEBP", quality=90, method=6)

    glow_src = Image.open(args.src / "section-glow.webp")
    glow = retone(glow_src, args.glow_value, shift)
    glow.save(OUT / "section-glow.webp", "WEBP", lossless=True, quality=100, method=6)

    shutil.copyfile(args.src / "grain.webp", OUT / "grain.webp")

    # Self-checks: same geometry, and the glow's alpha survived untouched.
    assert hero.size == hero_src.size, "hero-ground changed size"
    reread = Image.open(OUT / "section-glow.webp")
    assert reread.size == glow_src.size, "section-glow changed size"
    assert reread.mode == "RGBA", "section-glow lost its alpha channel"
    assert np.array_equal(
        np.asarray(reread.getchannel("A")), np.asarray(glow_src.getchannel("A"))
    ), "section-glow alpha changed"

    for name in ("hero-ground.webp", "section-glow.webp", "grain.webp"):
        print(f"{name}: {(OUT / name).stat().st_size / 1024:.0f} KB")
    print(f"hue shift: {shift}/256")


if __name__ == "__main__":
    main()
