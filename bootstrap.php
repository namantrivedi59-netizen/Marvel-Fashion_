<?php
/**
 * Marvel Fashion - shared API bootstrap
 * Included at the top of every api/*.php endpoint.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak stack traces to JSON responses
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



require_once __DIR__ . '/database.php';

/** Send a JSON response and stop execution. */
function mf_json(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function mf_success($data = null, string $message = '', int $status = 200): void {
    mf_json(['success' => true, 'data' => $data, 'message' => $message], $status);
}

function mf_error(string $message, int $status = 400): void {
    mf_json(['success' => false, 'message' => $message], $status);
}

/** Parse a JSON request body into an assoc array (falls back to $_POST). */
function mf_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?: [];
}

/** Returns the logged-in user's id, or null. */
function mf_current_user_id(): ?int {
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

/**
 * Record a customer-facing activity event. Logging must never break the
 * underlying request, so failures are written to PHP's error log instead.
 */
function mf_log_activity(string $action, ?int $userId = null, ?string $description = null, ?PDO $pdo = null): void {
    try {
        $pdo = $pdo ?: mf_db();
        $userId = $userId ?? mf_current_user_id();
        $stmt = $pdo->prepare(
            'INSERT INTO user_activity (user_id, action, description, ip_address, user_agent)
             VALUES (:uid, :action, :description, :ip, :ua)'
        );
        $stmt->execute([
            'uid' => $userId,
            'action' => $action,
            'description' => $description,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'ua' => isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 255) : null,
        ]);
    } catch (Throwable $e) {
        error_log('Marvel Fashion activity logging failed: ' . $e->getMessage());
    }
}

/** Ends the request with 401 unless a session user is present. */
function mf_require_auth(): int {
    $id = mf_current_user_id();
    if ($id === null) {
        mf_error('You must be logged in.', 401);
    }
    return $id;
}

function mf_method(): string {
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function mf_require_method(string $method): void {
    if (mf_method() !== $method) {
        mf_error('Method not allowed.', 405);
    }
}
