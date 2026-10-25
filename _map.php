<?php
/** Maps a products table row to the exact JSON shape the frontend already expects
 *  (same field names as the old data/products.json), so productService.js needs no changes. */
function mf_map_product(array $row): array {
    return [
        'id'              => $row['id'],
        'index'           => (int) $row['idx'],
        'hero'            => $row['hero'],
        'heroName'        => $row['hero_name'],
        'category'        => $row['category'],
        'categorySlug'    => $row['category_slug'],
        'name'            => $row['name'],
        'image'           => $row['image'],
        'galleryImages'   => json_decode($row['gallery_images'], true) ?: [],
        'accentA'         => $row['accent_a'],
        'accentB'         => $row['accent_b'],
        'price'           => (float) $row['price'],
        'discountPercent' => (int) $row['discount_percent'],
        'finalPrice'      => (float) $row['final_price'],
        'discountPrice'   => (float) $row['final_price'],
        'rating'          => (float) $row['rating'],
        'reviewCount'     => (int) $row['review_count'],
        'reviews'         => (int) $row['review_count'],
        'stock'           => $row['stock_status'],
        'badge'           => $row['badge'],
        'featured'        => (bool) $row['featured'],
        'newArrival'      => (bool) $row['new_arrival'],
        'delivery'        => $row['delivery'],
        'description'     => $row['description'],
        'sizes'           => json_decode($row['sizes'], true) ?: [],
        'pageUrl'         => $row['page_url'],
    ];
}
