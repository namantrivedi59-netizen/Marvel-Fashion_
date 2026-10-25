<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();

$pdo = mf_db();
$stmt = $pdo->prepare('DELETE FROM cart_items WHERE user_id = :uid');
$stmt->execute(['uid' => $userId]);
mf_log_activity('CART_REMOVE', $userId, 'Cleared cart.', $pdo);

mf_success(['lines' => [], 'totals' => ['subtotal' => 0, 'discount' => 0, 'shipping' => 0, 'tax' => 0, 'total' => 0]], 'Cart cleared.');
