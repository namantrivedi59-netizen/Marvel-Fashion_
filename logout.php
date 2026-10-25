<?php
require_once __DIR__ . '/../config/bootstrap.php';

$userId = mf_current_user_id();
if ($userId !== null) {
    mf_log_activity('LOGOUT', $userId, 'Customer logged out.');
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

mf_success(null, 'Logged out.');
