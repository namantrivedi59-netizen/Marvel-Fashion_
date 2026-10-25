<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();
$id = (int) ($body['id'] ?? 0);

$pdo = mf_db();
$check = $pdo->prepare('SELECT id FROM addresses WHERE id = :id AND user_id = :uid');
$check->execute(['id' => $id, 'uid' => $userId]);
if (!$check->fetch()) {
    mf_error('Address not found.', 404);
}

$pdo->beginTransaction();
$pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :uid')->execute(['uid' => $userId]);
$pdo->prepare('UPDATE addresses SET is_default = 1 WHERE id = :id')->execute(['id' => $id]);
$pdo->commit();

mf_success(null, 'Default address updated.');
