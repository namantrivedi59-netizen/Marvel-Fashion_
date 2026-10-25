<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../products/_map.php';

$userId = mf_require_auth();
$pdo = mf_db();
$stmt = $pdo->prepare(
    'SELECT p.* FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = :uid ORDER BY w.created_at DESC'
);
$stmt->execute(['uid' => $userId]);
mf_success(array_map('mf_map_product', $stmt->fetchAll()));
