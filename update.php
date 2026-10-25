<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/_map.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();

$productId = (string) ($body['productId'] ?? '');
$size      = (string) ($body['size'] ?? '');
$qty       = max(1, min(10, (int) ($body['qty'] ?? 1)));

$pdo = mf_db();
$stmt = $pdo->prepare('UPDATE cart_items SET quantity = :qty WHERE user_id = :uid AND product_id = :pid AND size = :size');
$stmt->execute(['qty' => $qty, 'uid' => $userId, 'pid' => $productId, 'size' => $size]);

$lines = mf_cart_lines($pdo, $userId);
mf_success(['lines' => $lines, 'totals' => mf_cart_totals($lines)]);
