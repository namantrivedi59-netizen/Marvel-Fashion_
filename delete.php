<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();
$id = (int) ($body['id'] ?? 0);

$pdo = mf_db();
$stmt = $pdo->prepare('DELETE FROM addresses WHERE id = :id AND user_id = :uid');
$stmt->execute(['id' => $id, 'uid' => $userId]);

mf_success(null, 'Address deleted.');
