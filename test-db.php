<?php
require_once __DIR__ . '/config/bootstrap.php';

try {
    $pdo = mf_db();
    $productCount = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $userCount    = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    mf_success([
        'connected'      => true,
        'database'       => getenv('MF_DB_NAME') ?: 'marvel_fashion',
        'product_count'  => $productCount,
        'user_count'     => $userCount,
        'server_version' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
    ], 'Connected to MySQL successfully.');
} catch (Throwable $e) {
    mf_error('Database check failed: ' . $e->getMessage(), 500);
}
