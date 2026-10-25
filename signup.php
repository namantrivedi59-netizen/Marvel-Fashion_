<?php
require_once __DIR__ . '/../config/bootstrap.php';

mf_require_method('POST');
$body = mf_body();

$fullName = trim((string) ($body['fullName'] ?? ''));
$email    = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($fullName === '') {
    mf_error('Please enter your full name.', 422);
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    mf_error('Enter a valid email address.', 422);
}
if (strlen($password) < 8) {
    mf_error('Password must be at least 8 characters.', 422);
}

try {
    $pdo = mf_db();

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        mf_error('An account with this email already exists.', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (:name, :email, :hash)');
    $stmt->execute(['name' => $fullName, 'email' => $email, 'hash' => $hash]);
    $userId = (int) $pdo->lastInsertId();

    $_SESSION['user_id'] = $userId;
    mf_log_activity('REGISTER', $userId, 'Customer account registered.', $pdo);

    mf_success([
        'id'       => $userId,
        'fullName' => $fullName,
        'email'    => $email,
    ], 'Account created.', 201);
} catch (Throwable $e) {
    mf_error('Signup failed: ' . $e->getMessage(), 500);
}
