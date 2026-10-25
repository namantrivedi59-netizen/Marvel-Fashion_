<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$body = mf_body();

$email    = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($email === '' || $password === '') {
    mf_error('Email and password are required.', 422);
}

try {
    $pdo = mf_db();
    $stmt = $pdo->prepare('SELECT id, full_name, email, password_hash FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        mf_error('Invalid email or password.', 401);
    }

    $_SESSION['user_id'] = (int) $user['id'];
    mf_log_activity('LOGIN', (int) $user['id'], 'Customer logged in.', $pdo);

    if (!empty($body['remember'])) {
        // Extend the session cookie lifetime for "remember me".
        $params = session_get_cookie_params();
        setcookie(session_name(), session_id(), time() + 60 * 60 * 24 * 30, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }

    mf_success([
        'id'       => (int) $user['id'],
        'fullName' => $user['full_name'],
        'email'    => $user['email'],
    ], 'Login successful.');
} catch (Throwable $e) {
    mf_error('Login failed: ' . $e->getMessage(), 500);
}
