<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();
$productId = (string) ($body['productId'] ?? '');
if ($productId === '') {
    mf_error('Missing productId.', 422);
}

$pdo = mf_db();
$stmt = $pdo->prepare('SELECT id FROM products WHERE id = :id');
$stmt->execute(['id' => $productId]);
if (!$stmt->fetch()) {
    mf_error('Product not found.', 404);
}

$stmt = $pdo->prepare('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (:uid, :pid)');
$stmt->execute(['uid' => $userId, 'pid' => $productId]);
mf_log_activity('WISHLIST_ADD', $userId, 'Added product ' . $productId . ' to wishlist.', $pdo);

mf_success(null, 'Added to wishlist.');
