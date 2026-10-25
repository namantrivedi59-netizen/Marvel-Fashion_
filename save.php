<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$userId = mf_require_auth();
$body = mf_body();

$required = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
foreach ($required as $field) {
    if (trim((string) ($body[$field] ?? '')) === '') {
        mf_error("Missing required field: $field", 422);
    }
}

$pdo = mf_db();
$id = isset($body['id']) ? (int) $body['id'] : 0;
$makeDefault = !empty($body['isDefault']);

$pdo->beginTransaction();
try {
    if ($makeDefault) {
        $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :uid')->execute(['uid' => $userId]);
    }

    if ($id > 0) {
        // must belong to this user
        $check = $pdo->prepare('SELECT id FROM addresses WHERE id = :id AND user_id = :uid');
        $check->execute(['id' => $id, 'uid' => $userId]);
        if (!$check->fetch()) {
            mf_error('Address not found.', 404);
        }
        $stmt = $pdo->prepare(
            'UPDATE addresses SET full_name=:fn, phone=:ph, line1=:l1, line2=:l2, city=:city, state=:state, pincode=:pin, is_default=:def
             WHERE id=:id AND user_id=:uid'
        );
        $stmt->execute([
            'fn' => $body['fullName'], 'ph' => $body['phone'], 'l1' => $body['line1'],
            'l2' => $body['line2'] ?? null, 'city' => $body['city'], 'state' => $body['state'],
            'pin' => $body['pincode'], 'def' => $makeDefault ? 1 : 0, 'id' => $id, 'uid' => $userId,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default)
             VALUES (:uid, :fn, :ph, :l1, :l2, :city, :state, :pin, :def)'
        );
        $stmt->execute([
            'uid' => $userId, 'fn' => $body['fullName'], 'ph' => $body['phone'], 'l1' => $body['line1'],
            'l2' => $body['line2'] ?? null, 'city' => $body['city'], 'state' => $body['state'],
            'pin' => $body['pincode'], 'def' => $makeDefault ? 1 : 0,
        ]);
        $id = (int) $pdo->lastInsertId();
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    mf_error('Could not save address: ' . $e->getMessage(), 500);
}

mf_success(['id' => $id], 'Address saved.');
