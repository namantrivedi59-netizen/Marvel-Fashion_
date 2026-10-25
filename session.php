<?php
require_once __DIR__ . '/../config/bootstrap.php';

$userId = mf_current_user_id();
if ($userId === null) {
    mf_success(null, 'No active session.');
}

try {
    $pdo = mf_db();
    $stmt = $pdo->prepare('SELECT id, full_name, email FROM users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        // stale session pointing at a deleted user
        session_destroy();
        mf_success(null, 'No active session.');
    }

    mf_success([
        'id'       => (int) $user['id'],
        'fullName' => $user['full_name'],
        'email'    => $user['email'],
    ]);
} catch (Throwable $e) {
    mf_error('Session check failed: ' . $e->getMessage(), 500);
}
