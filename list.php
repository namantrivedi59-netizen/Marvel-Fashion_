<?php
require_once __DIR__ . '/../config/bootstrap.php';

$userId = mf_require_auth();
$pdo = mf_db();
$stmt = $pdo->prepare('SELECT * FROM addresses WHERE user_id = :uid ORDER BY is_default DESC, created_at DESC');
$stmt->execute(['uid' => $userId]);
$rows = $stmt->fetchAll();
$addresses = array_map(function ($r) {
    return [
        'id'        => (int) $r['id'],
        'fullName'  => $r['full_name'],
        'phone'     => $r['phone'],
        'line1'     => $r['line1'],
        'line2'     => $r['line2'],
        'city'      => $r['city'],
        'state'     => $r['state'],
        'pincode'   => $r['pincode'],
        'isDefault' => (bool) $r['is_default'],
    ];
}, $rows);
mf_success($addresses);
