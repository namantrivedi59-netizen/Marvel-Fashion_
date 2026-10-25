<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/_map.php';

try {
    $pdo = mf_db();
    $where  = [];
    $params = [];

    if (!empty($_GET['hero'])) {
        $where[] = 'hero = :hero';
        $params['hero'] = $_GET['hero'];
    }
    if (!empty($_GET['category'])) {
        $where[] = 'category_slug = :category';
        $params['category'] = $_GET['category'];
    }
    if (!empty($_GET['featured'])) {
        $where[] = 'featured = 1';
    }
    if (!empty($_GET['newArrival'])) {
        $where[] = 'new_arrival = 1';
    }

    $sql = 'SELECT * FROM products';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY idx ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = array_map('mf_map_product', $stmt->fetchAll());

    mf_success($products);
} catch (Throwable $e) {
    mf_error('Could not load products: ' . $e->getMessage(), 500);
}
