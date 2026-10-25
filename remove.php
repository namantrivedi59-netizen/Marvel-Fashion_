<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();
$productId = (string) ($body['productId'] ?? '');

$pdo = mf_db();
$stmt = $pdo->prepare('DELETE FROM wishlist_items WHERE user_id = :uid AND product_id = :pid');
$stmt->execute(['uid' => $userId, 'pid' => $productId]);
mf_log_activity('WISHLIST_REMOVE', $userId, 'Removed product ' . $productId . ' from wishlist.', $pdo);

mf_success(null, 'Removed from wishlist.');
