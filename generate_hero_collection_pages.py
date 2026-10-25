"""
Generates pages/<hero>.html — one scrolling page per hero containing every
category that hero sells (Hoodies, T-Shirts, Jackets, ... in one place).

This does NOT touch or regenerate the existing pages/<hero>-<category>.html
files. It only READS their <div class="product-grid">...</div> block and
re-assembles those exact same product cards (same data-product-id, prices,
ratings, stock — byte-identical) into per-category sections on one page, so
the catalog in js/products.js still matches every card everywhere.
"""

import os
import re

OUT_DIR = "pages"

# Same source-of-truth as generate_pages.py's heroes dict.
heroes = {
    "weaver":     {"name": "Spider-Man",      "tagline": "Every Street Has A Guardian",
                    "accent_a": "#e8283f", "accent_b": "#1c5cff",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Sneakers", "Caps", "Accessories"]},
    "storm":      {"name": "Thor",             "tagline": "Power Meets Style",
                    "accent_a": "#4fc3ff", "accent_b": "#c7d0da",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Sweatshirts", "Shoes", "Accessories"]},
    "forge":      {"name": "Iron Man",         "tagline": "Engineered For Greatness",
                    "accent_a": "#d4af37", "accent_b": "#ff4d2e",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Watches", "Accessories"]},
    "sentinel":   {"name": "Captain America",  "tagline": "Stand For Something",
                    "accent_a": "#2f5fa8", "accent_b": "#c8272c",
                    "categories": ["Hoodies", "Jackets", "T-Shirts", "Shoes", "Caps", "Accessories"]},
    "king":       {"name": "Black Panther",    "tagline": "Royalty Is A Way Of Moving",
                    "accent_a": "#9b4de8", "accent_b": "#c4c8d1",
                    "categories": ["Oversized T-Shirts", "Hoodies", "Jackets", "Shoes", "Accessories"]},
    "hulk":       {"name": "Hulk",             "tagline": "Strongest There Is",
                    "accent_a": "#4ade80", "accent_b": "#7c3aed",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"]},
    "blackwidow": {"name": "Black Widow",      "tagline": "Every Move, Calculated",
                    "accent_a": "#d62246", "accent_b": "#4a4a52",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"]},
    "hawkeye":    {"name": "Hawkeye",          "tagline": "Never Miss",
                    "accent_a": "#8b5cf6", "accent_b": "#4b5563",
                    "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"]},
}

def slugify(text):
    return text.lower().replace(" ", "-")

def extract_product_grid(html):
    match = re.search(r'<div class="product-grid">(.*?)</div>\s*(?=<footer)', html, re.S)
    if not match:
        raise RuntimeError("Couldn't find <div class=\"product-grid\"> block")
    return match.group(1).strip()

def build_category_section(hero_key, category_name):
    slug = slugify(category_name)
    src_path = os.path.join(OUT_DIR, f"{hero_key}-{slug}.html")
    with open(src_path, "r", encoding="utf-8") as f:
        cards = extract_product_grid(f.read())
    return f"""
<section class="hero-category-block" id="{slug}">
  <h2 class="hero-category-heading">{category_name}</h2>
  <div class="product-grid">
{cards}
  </div>
</section>"""

def build_quicknav(hero_key, hero):
    links = "\n".join(
        f'    <a href="#{slugify(c)}" class="cat-btn">{c}</a>' for c in hero["categories"]
    )
    return f"""<div class="hero-quicknav" style="--accent-a:{hero['accent_a']}; --accent-b:{hero['accent_b']};">
{links}
</div>"""

def build_page(hero_key, hero):
    sections = "\n".join(build_category_section(hero_key, c) for c in hero["categories"])
    quicknav = build_quicknav(hero_key, hero)
    title = f'{hero["name"]} — Full Collection'
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | MARVEL FASHION</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/auth.css">
<link rel="stylesheet" href="../css/shop.css">
<link rel="stylesheet" href="../css/aurora.css">
</head>
<body data-root="../" data-aurora="true" data-page="hero-collection">

<nav class="navbar" id="navbar">
  <a href="../index.html" class="nav-logo">MARVEL FASHION</a>
  <ul class="nav-links">
    <li><a href="../index.html#landing" class="nav-link">Home</a></li>
    <li><a href="../index.html#heroes" class="nav-link">Heroes</a></li>
    <li><a href="../index.html#collections" class="nav-link">Collections</a></li>
    <li><a href="../index.html#footer" class="nav-link">Contact</a></li>
    <li>
      <a href="wishlist.html" class="nav-icon-link" aria-label="Wishlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        <span class="nav-icon-badge" data-wishlist-count>0</span>
      </a>
    </li>
    <li>
      <a href="cart.html" class="nav-icon-link" aria-label="Cart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
        <span class="nav-icon-badge" data-cart-count>0</span>
      </a>
    </li>
    <li id="navAuthSlot"><!-- Login link OR "Hi, Username" + Logout, rendered by js/auth.js --></li>
  </ul>
  <button class="nav-burger" id="navBurger" aria-label="Open menu">
    <span></span><span></span><span></span>
  </button>
</nav>

<div class="mobile-menu" id="mobileMenu">
  <a href="../index.html#landing" class="mobile-link">Home</a>
  <a href="../index.html#heroes" class="mobile-link">Heroes</a>
  <a href="../index.html#collections" class="mobile-link">Collections</a>
  <a href="../index.html#footer" class="mobile-link">Contact</a>
  <div class="nav-icon-row">
    <a href="wishlist.html" class="nav-icon-link" aria-label="Wishlist">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      <span class="nav-icon-badge" data-wishlist-count>0</span>
    </a>
    <a href="cart.html" class="nav-icon-link" aria-label="Cart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
      <span class="nav-icon-badge" data-cart-count>0</span>
    </a>
  </div>
  <div id="mobileAuthSlot"><!-- Login link OR "Hi, Username" + Logout, rendered by js/auth.js --></div>
</div>

<section class="product-hero" style="background: radial-gradient(ellipse at 20% 20%, {hero['accent_a']}22, transparent 55%), #0a0a0d;">
  <a href="../index.html#heroes" class="back-link">← Back to Heroes</a>
  <h1 class="product-hero-title" style="color:{hero['accent_a']};">{hero['name']}</h1>
  <p class="product-hero-sub">Full Collection · {hero['tagline']}</p>
</section>

{quicknav}
{sections}

<footer class="footer" id="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-logo">MARVEL FASHION</span>
      <p class="footer-tag">Wear The Legend Within</p>
    </div>
    <div class="footer-links">
      <div class="footer-col">
        <h4>Heroes</h4>
        <a href="../index.html#heroes">Spider-Man</a>
        <a href="../index.html#heroes">Thor</a>
        <a href="../index.html#heroes">Iron Man</a>
        <a href="../index.html#heroes">Captain America</a>
        <a href="../index.html#heroes">Black Panther</a>
        <a href="../index.html#heroes">Hulk</a>
        <a href="../index.html#heroes">Black Widow</a>
        <a href="../index.html#heroes">Hawkeye</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="#">About</a>
        <a href="#">Shipping</a>
        <a href="#">Returns</a>
        <a href="#">Contact</a>
      </div>
    </div>
    <div class="footer-social" aria-label="Social media links">
      <a href="#" class="social-icon" aria-label="Instagram">◎</a>
      <a href="#" class="social-icon" aria-label="Twitter">✕</a>
      <a href="#" class="social-icon" aria-label="TikTok">♪</a>
    </div>
  </div>
  <p class="footer-copyright">© 2026 MARVEL FASHION Fashion. All rights reserved. All characters are original and fictional.</p>
</footer>

<script src="../js/products.js"></script>
<script src="../js/script.js"></script>
<script src="../js/auth.js"></script>
<script src="../js/wishlist.js"></script>
<script src="../js/cart.js"></script>
<script src="../js/product.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="../js/three-bg.js"></script>
<script src="../js/aurora.js"></script>
<script src="../js/fx.js"></script>
</body>
</html>
"""

count = 0
for hero_key, hero in heroes.items():
    filepath = os.path.join(OUT_DIR, f"{hero_key}.html")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(build_page(hero_key, hero))
    count += 1
    print(f"  wrote {filepath}")

print(f"Generated {count} hero collection pages in {OUT_DIR}/")
