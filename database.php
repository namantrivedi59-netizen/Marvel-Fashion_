<?php
/**
 * Marvel Fashion - Database connection (PDO)
 * XAMPP defaults: host localhost, port 3306, user root, no password.
 * Override via environment variables if your local setup differs.
 */

function mf_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('MF_DB_HOST') ?: 'localhost';
    $port = getenv('MF_DB_PORT') ?: '3306';
    $db   = getenv('MF_DB_NAME') ?: 'marvel_fashion';
    $user = getenv('MF_DB_USER') ?: 'root';
    $pass = getenv('MF_DB_PASS');

    if ($pass === false) {
        $pass = '';
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $e->getMessage(),
        ]);
        exit;
    }

    mf_ensure_activity_table($pdo);
    mf_ensure_coupon_columns($pdo);

    return $pdo;
}

function mf_ensure_coupon_columns(PDO $pdo): void {
    static $checked = false;

    if ($checked) {
        return;
    }

    $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();

    $existing = $pdo->prepare(
        "SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = :db
         AND TABLE_NAME = 'coupons'"
    );

    $existing->execute(['db' => $dbName]);

    $cols = array_column($existing->fetchAll(), 'COLUMN_NAME');

    if (!in_array('start_date', $cols, true)) {
        $pdo->exec(
            'ALTER TABLE coupons ADD COLUMN start_date DATE NULL AFTER min_order'
        );
    }

    if (!in_array('expiry_date', $cols, true)) {
        $pdo->exec(
            'ALTER TABLE coupons ADD COLUMN expiry_date DATE NULL AFTER start_date'
        );
    }

    if (!in_array('usage_limit', $cols, true)) {
        $pdo->exec(
            'ALTER TABLE coupons ADD COLUMN usage_limit INT UNSIGNED NULL AFTER expiry_date'
        );
    }

    if (!in_array('usage_count', $cols, true)) {
        $pdo->exec(
            'ALTER TABLE coupons ADD COLUMN usage_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER usage_limit'
        );
    }

    $checked = true;
}

function mf_ensure_activity_table(PDO $pdo): void {
    static $checked = false;

    if ($checked) {
        return;
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS user_activity (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NULL,
            action VARCHAR(30) NOT NULL,
            description VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_activity_user (user_id),
            INDEX idx_activity_action (action),
            INDEX idx_activity_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $checked = true;
}