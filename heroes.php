<?php
require_once __DIR__ . '/../config/bootstrap.php';

try {
    $pdo = mf_db();
    $stmt = $pdo->query('SELECT DISTINCT hero AS `key`, hero_name AS name FROM products ORDER BY hero_name');
    mf_success($stmt->fetchAll());
} catch (Throwable $e) {
    mf_error('Could not load heroes: ' . $e->getMessage(), 500);
}
