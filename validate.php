<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../cart/_map.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();
$code = strtoupper(trim((string) ($body['code'] ?? '')));

if ($code === '') {
    mf_error('Enter a coupon code.', 422);
}

$pdo = mf_db();
$stmt = $pdo->prepare('SELECT * FROM coupons WHERE code = :code AND active = 1');
$stmt->execute(['code' => $code]);
$coupon = $stmt->fetch();
if (!$coupon) {
    mf_error('Invalid or expired coupon code.', 404);
}

// Checkout can be for the user's cart OR a single "Buy Now" item that never
// touched the cart table — the caller tells us which lines it's showing.
// Falls back to the server cart if no explicit lines are sent.
require_once __DIR__ . '/../products/_map.php';
if (!empty($body['lines']) && is_array($body['lines'])) {
    $lines = [];
    $pStmt = $pdo->prepare('SELECT * FROM products WHERE id = :id');
    foreach ($body['lines'] as $l) {
        if (empty($l['productId'])) {
            continue;
        }
        $pStmt->execute(['id' => $l['productId']]);
        $row = $pStmt->fetch();
        if (!$row) {
            continue;
        }
        $lines[] = [
            'productId' => $row['id'],
            'size'      => $l['size'] ?? null,
            'qty'       => max(1, min(10, (int) ($l['qty'] ?? 1))),
            'product'   => mf_map_product($row),
        ];
    }
} else {
    $lines = mf_cart_lines($pdo, $userId);
}

if (!$lines) {
    mf_error('Your cart is empty.', 422);
}
$totals = mf_cart_totals($lines);
$base = $totals['subtotal'] - $totals['discount']; // discounted subtotal

if ($base < (float) $coupon['min_order']) {
    mf_error('This coupon requires a minimum order of $' . number_format((float) $coupon['min_order'], 2) . '.', 422);
}

$couponDiscount = 0.0;
$freeShipping = false;
if ($coupon['type'] === 'percent') {
    $couponDiscount = round($base * ((float) $coupon['value'] / 100), 2);
} elseif ($coupon['type'] === 'flat') {
    $couponDiscount = min($base, (float) $coupon['value']);
} elseif ($coupon['type'] === 'freeship') {
    $freeShipping = true;
}

$shipping = $freeShipping ? 0 : $totals['shipping'];
$afterCoupon = max(0, $base - $couponDiscount);
$tax = round($afterCoupon * 0.08, 2);
$total = round($afterCoupon + $shipping + $tax, 2);

mf_log_activity('COUPON_APPLIED', $userId, 'Applied coupon ' . $code . '.', $pdo);

mf_success([
    'code'           => $code,
    'couponDiscount' => $couponDiscount,
    'shipping'       => $shipping,
    'tax'            => $tax,
    'total'          => $total,
], 'Coupon applied.');
