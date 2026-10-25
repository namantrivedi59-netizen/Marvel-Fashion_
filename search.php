<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/_map.php';

$q = trim((string) ($_GET['q'] ?? ''));
if ($q === '') {
    mf_success([]);
}

try {
    $pdo = mf_db();
    $like = '%' . $q . '%';
    $stmt = $pdo->prepare(
        'SELECT * FROM products
         WHERE name LIKE :like1 OR hero_name LIKE :like2 OR category LIKE :like3
         ORDER BY idx ASC
         LIMIT 100'
    );
    $stmt->execute(['like1' => $like, 'like2' => $like, 'like3' => $like]);
    mf_success(array_map('mf_map_product', $stmt->fetchAll()));
} catch (Throwable $e) {
    mf_error('Search failed: ' . $e->getMessage(), 500);
}
