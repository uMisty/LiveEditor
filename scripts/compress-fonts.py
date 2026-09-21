"""Regenerate full-glyph WOFF2 assets: pip install 'fonttools[woff]'."""
from pathlib import Path
from fontTools.ttLib import TTFont, woff2

root = Path(__file__).resolve().parent.parent
for name in ("NotoSansSC", "JetBrainsMono"):
    source = root / "assets" / "font-sources" / f"{name}.ttf"
    target = root / "public" / "fonts" / f"{name}.woff2"
    woff2.compress(source, target)
    with TTFont(source) as original, TTFont(target) as compressed:
        assert original.getBestCmap() == compressed.getBestCmap(), name
        assert original.getGlyphOrder() == compressed.getGlyphOrder(), name
        assert original["hmtx"].metrics == compressed["hmtx"].metrics, name
        axes = lambda font: [(a.axisTag, a.minValue, a.defaultValue, a.maxValue)
                             for a in font["fvar"].axes]
        assert axes(original) == axes(compressed), name
        print(f"{name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; "
              f"{len(original.getGlyphOrder()):,} glyphs and variable axes preserved")
