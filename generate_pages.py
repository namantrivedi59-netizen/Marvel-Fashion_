import os

OUT_DIR = "pages"
os.makedirs(OUT_DIR, exist_ok=True)

heroes = {
    "weaver": {
        "name": "Spider-Man",
        "tagline": "Every Street Has A Guardian",
        "accent_a": "#e8283f",
        "accent_b": "#1c5cff",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Sneakers", "Caps", "Accessories"],
    },
    "storm": {
        "name": "Thor",
        "tagline": "Power Meets Style",
        "accent_a": "#4fc3ff",
        "accent_b": "#c7d0da",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Sweatshirts", "Shoes", "Accessories"],
    },
    "forge": {
        "name": "Iron Man",
        "tagline": "Engineered For Greatness",
        "accent_a": "#d4af37",
        "accent_b": "#ff4d2e",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Watches", "Accessories"],
    },
    "sentinel": {
        "name": "Captain America",
        "tagline": "Stand For Something",
        "accent_a": "#2f5fa8",
        "accent_b": "#c8272c",
        "categories": ["Hoodies", "Jackets", "T-Shirts", "Shoes", "Caps", "Accessories"],
    },
    "king": {
        "name": "Black Panther",
        "tagline": "Royalty Is A Way Of Moving",
        "accent_a": "#9b4de8",
        "accent_b": "#c4c8d1",
        "categories": ["Oversized T-Shirts", "Hoodies", "Jackets", "Shoes", "Accessories"],
    },
    "hulk": {
        "name": "Hulk",
        "tagline": "Strongest There Is",
        "accent_a": "#4ade80",
        "accent_b": "#7c3aed",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"],
    },
    "blackwidow": {
        "name": "Black Widow",
        "tagline": "Every Move, Calculated",
        "accent_a": "#d62246",
        "accent_b": "#4a4a52",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"],
    },
    "hawkeye": {
        "name": "Hawkeye",
        "tagline": "Never Miss",
        "accent_a": "#8b5cf6",
        "accent_b": "#4b5563",
        "categories": ["Hoodies", "T-Shirts", "Jackets", "Shoes", "Accessories"],
    },
}

# SAFETY: weaver-* (Spider-Man) and king-* (Black Panther) pages have since
# been hand-upgraded with real photographed <img> product shots — this
# script's product_card() below only knows about the numbered gradient
# placeholder, so a full re-run would silently overwrite those real photos.
# Set ONLY_HEROES to a list of hero keys (e.g. ["hulk", "blackwidow",
# "hawkeye"]) to regenerate just those heroes' pages safely. Leave as None
# only if you are sure no page currently has real photos wired in.
ONLY_HEROES = None

SIZES = ["S", "M", "L", "XL"]

# Real photographed product images on disk, keyed by "hero-categorySlug".
# Mirrors REAL_IMAGES in js/products.js exactly — keep both in sync.
REAL_IMAGES = {
    "weaver-hoodies": [
        "images/Spiderman_hoodies/spider-hoodie-01.jpg",
        "images/Spiderman_hoodies/spider-hoodie-02.jpg",
        "images/Spiderman_hoodies/spider-hoodie-03.jpg",
        "images/Spiderman_hoodies/spider-hoodie-04.jpg",
    ],
    "weaver-t-shirts": [
        "images/Spiderman_t-shirt/spider t-shit_1.jpg",
        "images/Spiderman_t-shirt/spider t-shit_2.jpg",
        "images/Spiderman_t-shirt/spider t-shit_3.jpg",
        "images/Spiderman_t-shirt/spider t-shit_4.jpg",
    ],
    "weaver-jackets": [
        "images/Spiderman_jackets/spider-jacket-01.jpg",
        "images/Spiderman_jackets/spider-jacket-02.jpg",
        "images/Spiderman_jackets/spider-jacket-03.jpg",
        "images/Spiderman_jackets/spider-jacket-04.jpg",
    ],
    "weaver-sneakers": [
        "images/Spiderman_sneakers/spider-sneaker-01.jpg",
        "images/Spiderman_sneakers/spider-sneaker-02.jpg",
        "images/Spiderman_sneakers/spider-sneaker-03.jpg",
        "images/Spiderman_sneakers/spider-sneaker-04.jpg",
    ],
    "weaver-caps": [
        "images/Spiderman_cap/spider-cap-01.jpg",
        "images/Spiderman_cap/spider-cap-02.jpg",
        "images/Spiderman_cap/spider-cap-03.jpg",
        "images/Spiderman_cap/spider-cap-04.jpg",
    ],
    "weaver-accessories": [
        "images/Spiderman_accessories/spider-accessory-01.jpg",
        "images/Spiderman_accessories/spider-accessory-02.jpg",
        "images/Spiderman_accessories/spider-accessory-03.jpg",
        "images/Spiderman_accessories/spider-accessory-04.jpg",
    ],
}

def slugify(text):
    return text.lower().replace(" ", "-")

# Same char-sum hash as charSum() in js/products.js — identical results for
# identical strings in both languages, so discount/rating/stock/delivery
# always agree between a statically generated card and the live catalog.
def char_sum(text):
    return sum(ord(c) for c in text)

def seed_for(hero_key, category_name, index):
    return char_sum(hero_key + category_name) + index

def discount_for(hero_key, category_name, index):
    return 10 + (seed_for(hero_key, category_name, index) % 4) * 5

def rating_for(hero_key, category_name, index):
    rating = 3.8 + (seed_for(hero_key, category_name, index) % 13) * 0.1
    return round(min(5, rating), 1)

def review_count_for(hero_key, category_name, index):
    return 15 + (seed_for(hero_key, category_name, index) % 380)

def stock_for(hero_key, category_name, index):
    roll = seed_for(hero_key, category_name, index) % 10
    if roll == 0:
        return "out-of-stock"
    if roll <= 2:
        return "low-stock"
    return "in-stock"

def delivery_for(category_name):
    if "Jacket" in category_name or "Shoes" in category_name:
        return "5–7 Business Days"
    if "Cap" in category_name or "Watch" in category_name or "Accessor" in category_name:
        return "2–4 Business Days"
    return "3–5 Business Days"

STOCK_LABELS = {"in-stock": "In Stock", "low-stock": "Low Stock", "out-of-stock": "Out of Stock"}

def rating_stars(rating):
    full = int(rating)
    half = 1 if (rating - full) >= 0.5 else 0
    empty = 5 - full - half
    return "★" * full + ("⯨" if half else "") + "☆" * empty

def product_card(hero_key, hero_name, category_name, accent_a, accent_b, index):
    product_id = f"{hero_key}-{slugify(category_name)}-{index}"
    price = 39 + (index * 6) + (5 if "Jacket" in category_name or "Shoes" in category_name else 0)
    discount = discount_for(hero_key, category_name, index)
    final_price = round(price * (100 - discount)) / 100
    rating = rating_for(hero_key, category_name, index)
    reviews = review_count_for(hero_key, category_name, index)
    stock = stock_for(hero_key, category_name, index)
    stock_label = STOCK_LABELS[stock]
    delivery = delivery_for(category_name)
    out_of_stock = stock == "out-of-stock"

    image_key = f"{hero_key}-{slugify(category_name)}"
    images = REAL_IMAGES.get(image_key)
    if images:
        media_html = f'<img src="../{images[index - 1]}" alt="{hero_name} {category_name}" class="product-image">'
    else:
        media_html = f'<span class="placeholder-mark">{index:02d}</span>'

    size_btns = "\n".join(
        f'            <button class="size-btn">{s}</button>' for s in SIZES
    )
    disabled_attr = " disabled" if out_of_stock else ""
    add_label = "Out of Stock" if out_of_stock else "Add To Cart"
    buy_label = "Out of Stock" if out_of_stock else "Buy Now"

    # Card markup for the luxury gallery redesign.
    # NOTE: .product-name, .product-price, .size-btn, .qty-value, .qty-minus,
    # .qty-plus and .add-cart-btn are unchanged so js/product.js keeps working
    # with zero edits. data-product-id lets js/cart.js and js/wishlist.js
    # (both loaded via products.js) resolve this card against the shared
    # product catalog in js/products.js — ids there are built with the exact
    # same {hero_key}-{slug}-{index} pattern as product_id below, so they
    # always match. Discount/rating/stock/delivery below are computed with
    # the exact same formulas as js/products.js (see char_sum/seed_for) so
    # a card's baked-in numbers never disagree with the cart/wishlist pages.
    return f"""
      <div class="product-card{' is-out-of-stock' if out_of_stock else ''}" data-product-id="{product_id}">
        <div class="product-media" style="--accent-a:{accent_a}; --accent-b:{accent_b};">
          <button class="fav-btn" type="button" aria-label="Add to favourites">♡</button>
          {media_html}
          <span class="stock-badge stock-badge--{stock}">{stock_label}</span>
        </div>
        <div class="product-info">
          <div class="product-info-header">
            <div class="product-info-text">
              <h3 class="product-name">{category_name} — Edition {index:02d}</h3>
              <p class="product-subtitle">{hero_name.title()} Collection</p>
              <div class="rating-row" aria-label="{rating} out of 5 stars">
                <span class="rating-stars">{rating_stars(rating)}</span>
                <span class="rating-value">{rating}</span>
                <span class="rating-count">({reviews})</span>
              </div>
            </div>
            <div class="price-block">
              <span class="price-original">${price}.00</span>
              <span class="price-discount-badge">{discount}% OFF</span>
              <span class="price-final">${final_price:.2f}</span>
            </div>
          </div>
          <p class="delivery-note">Estimated delivery: <strong>{delivery}</strong></p>
          <div class="product-sizes">
{size_btns}
          </div>
          <div class="qty-row">
            <button class="qty-btn qty-minus">–</button>
            <span class="qty-value">1</span>
            <button class="qty-btn qty-plus">+</button>
          </div>
          <div class="product-card-actions">
            <button class="add-cart-btn"{disabled_attr}>{add_label}</button>
            <button class="buy-now-btn"{disabled_attr}>{buy_label}</button>
          </div>
        </div>
      </div>"""

def build_page(hero_key, hero, category_name):
    cards = "\n".join(product_card(hero_key, hero["name"], category_name, hero["accent_a"], hero["accent_b"], i) for i in range(1, 5))
    title = f'{hero["name"]} — {category_name}'
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
</head>
<body data-root="../">

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
  <p class="product-hero-sub">{category_name} · {hero['tagline']}</p>
</section>

<div class="product-grid">
{cards}
</div>

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
<script src="../js/fx.js"></script>
</body>
</html>
"""

count = 0
for hero_key, hero in heroes.items():
    if ONLY_HEROES and hero_key not in ONLY_HEROES:
        continue
    for category in hero["categories"]:
        filename = f"{hero_key}-{slugify(category)}.html"
        filepath = os.path.join(OUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(build_page(hero_key, hero, category))
        count += 1

print(f"Generated {count} product pages in {OUT_DIR}/")
