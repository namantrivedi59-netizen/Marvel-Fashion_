<?php
/**
 * Marvel Fashion Admin - shared bootstrap.
 * Included at the top of every admin/*.php page.
 *
 * This file makes the admin panel "zero manual SQL": it creates its own
 * admin_users table the first time it's needed and seeds one default admin
 * account if none exists yet. Nothing here ever touches the existing
 * customer tables (users, products, orders, etc.) beyond reading from them.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/config/bootstrap.php'; // for mf_log_activity(), mf_db() helpers already loaded above too

// Default admin credentials, used only the very first time admin_users is empty.
const MF_ADMIN_DEFAULT_USERNAME = 'admin';
const MF_ADMIN_DEFAULT_PASSWORD = 'MarvelAdmin123!';

function mf_admin_ensure_tables(PDO $pdo): void {
    static $checked = false;
    if ($checked) {
        return;
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS admin_users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(60) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_admin_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $count = (int) $pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn();
    if ($count === 0) {
        $hash = password_hash(MF_ADMIN_DEFAULT_PASSWORD, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (:u, :h)');
        $stmt->execute(['u' => MF_ADMIN_DEFAULT_USERNAME, 'h' => $hash]);
    }

    $checked = true;
}

function mf_admin_db(): PDO {
    $pdo = mf_db(); // also ensures user_activity + coupon columns exist (see api/config/database.php)
    mf_admin_ensure_tables($pdo);
    return $pdo;
}

function mf_admin_current(): ?array {
    if (empty($_SESSION['admin_id'])) {
        return null;
    }
    return [
        'id' => (int) $_SESSION['admin_id'],
        'username' => $_SESSION['admin_username'] ?? 'admin',
    ];
}

/** Redirects to login.php if not authenticated as admin. Call at the top of every protected page. */
function mf_admin_require_login(): array {
    $admin = mf_admin_current();
    if (!$admin) {
        header('Location: login.php');
        exit;
    }
    return $admin;
}

function mf_admin_base_url(): string {
    // e.g. /Marvel-Fashion/admin
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
    return rtrim($dir, '/');
}

function h(?string $s): string {
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function mf_admin_money(float $n): string {
    return '$' . number_format($n, 2);
}

function mf_admin_date(?string $s): string {
    if (!$s) {
        return '-';
    }
    $ts = strtotime($s);
    return $ts ? date('d M Y, h:i A', $ts) : $s;
}
