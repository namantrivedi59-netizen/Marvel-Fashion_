<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../cart/_map.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();

$addressId = (int) ($body['addressId'] ?? 0);
$paymentMethod = (string) ($body['paymentMethod'] ?? '');
$couponCode = strtoupper(trim((string) ($body['couponCode'] ?? '')));
$buyNow = $body['buyNow'] ?? null; // { productId, size, qty } for "Buy Now" flow
$email = trim((string) ($body['email'] ?? ''));

if (!in_array($paymentMethod, ['card', 'upi', 'netbanking', 'cod'], true)) {
    mf_error('Invalid payment method.', 422);
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    mf_error('A valid contact email is required.', 422);
}

$pdo = mf_db();

$addrStmt = $pdo->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :uid');
$addrStmt->execute(['id' => $addressId, 'uid' => $userId]);
$address = $addrStmt->fetch();
if (!$address) {
    mf_error('Please select a valid delivery address.', 422);
}

// ---- Build the list of lines to order (server is the source of truth for price/stock) ----
if ($buyNow && !empty($buyNow['productId'])) {
    $pStmt = $pdo->prepare('SELECT * FROM products WHERE id = :id');
    $pStmt->execute(['id' => $buyNow['productId']]);
    $row = $pStmt->fetch();
    if (!$row) {
        mf_error('Product not found.', 404);
    }
    require_once __DIR__ . '/../products/_map.php';
    $lines = [[
        'productId' => $row['id'],
        'size'      => $buyNow['size'] ?? null,
        'qty'       => max(1, min(10, (int) ($buyNow['qty'] ?? 1))),
        'product'   => mf_map_product($row),
        'row'       => $row,
    ]];
} else {
    $rawLines = mf_cart_lines($pdo, $userId);
    if (!$rawLines) {
        mf_error('Your cart is empty.', 422);
    }
    // re-fetch raw rows so we have stock_quantity for the transaction below
    $lines = [];
    foreach ($rawLines as $l) {
        $pStmt = $pdo->prepare('SELECT * FROM products WHERE id = :id');
        $pStmt->execute(['id' => $l['productId']]);
        $row = $pStmt->fetch();
        $l['row'] = $row;
        $lines[] = $l;
    }
}

foreach ($lines as $l) {
    if (!$l['row'] || $l['row']['stock_status'] === 'out-of-stock' || (int) $l['row']['stock_quantity'] < $l['qty']) {
        mf_error('"' . $l['product']['name'] . '" no longer has enough stock.', 409);
    }
}

$totals = mf_cart_totals($lines);
$subtotal = $totals['subtotal'];
$discountTotal = $totals['discount'];
$shipping = $totals['shipping'];
$base = $subtotal - $discountTotal;

$couponDiscount = 0.0;
if ($couponCode !== '') {
    $cStmt = $pdo->prepare('SELECT * FROM coupons WHERE code = :code AND active = 1');
    $cStmt->execute(['code' => $couponCode]);
    $coupon = $cStmt->fetch();
    if ($coupon && $base >= (float) $coupon['min_order']) {
        if ($coupon['type'] === 'percent') {
            $couponDiscount = round($base * ((float) $coupon['value'] / 100), 2);
        } elseif ($coupon['type'] === 'flat') {
            $couponDiscount = min($base, (float) $coupon['value']);
        } elseif ($coupon['type'] === 'freeship') {
            $shipping = 0;
        }
    } else {
        $couponCode = '';
    }
}

$afterCoupon = max(0, $base - $couponDiscount);
$tax = round($afterCoupon * 0.08, 2);
$total = round($afterCoupon + $shipping + $tax, 2);

try {
    $pdo->beginTransaction();

    $orderStmt = $pdo->prepare(
        'INSERT INTO orders (user_id, subtotal, discount_total, coupon_code, coupon_discount, shipping, tax, total,
                              payment_method, payment_status, status, address_snapshot)
         VALUES (:uid, :subtotal, :discount, :coupon, :coupon_discount, :shipping, :tax, :total,
                 :method, :pstatus, :status, :addr)'
    );
    $orderStmt->execute([
        'uid' => $userId,
        'subtotal' => $subtotal,
        'discount' => $discountTotal,
        'coupon' => $couponCode !== '' ? $couponCode : null,
        'coupon_discount' => $couponDiscount,
        'shipping' => $shipping,
        'tax' => $tax,
        'total' => $total,
        'method' => $paymentMethod,
        'pstatus' => $paymentMethod === 'cod' ? 'pending' : 'paid', // demo payment: non-COD is marked paid immediately
        'status' => 'placed',
        'addr' => json_encode([
            'fullName' => $address['full_name'],
            'phone'    => $address['phone'],
            'address'  => $address['line1'] . (!empty($address['line2']) ? ', ' . $address['line2'] : ''),
            'city'     => $address['city'],
            'state'    => $address['state'],
            'zip'      => $address['pincode'],
            'email'    => $email,
        ]),
    ]);
    $orderId = (int) $pdo->lastInsertId();

    $itemStmt = $pdo->prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, line_total)
         VALUES (:oid, :pid, :name, :size, :qty, :price, :line_total)'
    );
    $stockSelect = $pdo->prepare('SELECT stock_quantity FROM products WHERE id = :pid FOR UPDATE');
    $stockUpdate = $pdo->prepare('UPDATE products SET stock_quantity = :qty, stock_status = :status WHERE id = :pid');

    foreach ($lines as $l) {
        $itemStmt->execute([
            'oid' => $orderId,
            'pid' => $l['product']['id'],
            'name' => $l['product']['name'],
            'size' => $l['size'] ?? '',
            'qty' => $l['qty'],
            'price' => $l['product']['finalPrice'],
            'line_total' => round($l['product']['finalPrice'] * $l['qty'], 2),
        ]);

        $stockSelect->execute(['pid' => $l['product']['id']]);
        $currentQty = (int) $stockSelect->fetchColumn();
        $newQty = max(0, $currentQty - $l['qty']);
        $newStatus = $newQty <= 0 ? 'out-of-stock' : ($newQty <= 10 ? 'low-stock' : 'in-stock');
        $stockUpdate->execute(['qty' => $newQty, 'status' => $newStatus, 'pid' => $l['product']['id']]);
    }

    if (!$buyNow) {
        $pdo->prepare('DELETE FROM cart_items WHERE user_id = :uid')->execute(['uid' => $userId]);
    }

    $pdo->commit();
    mf_log_activity('ORDER_PLACED', $userId, 'Placed order #' . $orderId . ' for $' . number_format($total, 2) . '.', $pdo);
} catch (Throwable $e) {
    $pdo->rollBack();
    mf_error('Order could not be placed: ' . $e->getMessage(), 500);
}

mf_success(['orderId' => $orderId, 'total' => $total], 'Order placed.', 201);
