<?php
require_once __DIR__ . '/_bootstrap.php';

$pdo = mf_admin_db(); // ensures admin_users exists + default admin is seeded

if (mf_admin_current()) {
    header('Location: index.php');
    exit;
}

$error = '';
$isFirstRun = (int) $pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() === 1;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    $stmt = $pdo->prepare('SELECT id, username, password_hash FROM admin_users WHERE username = :u');
    $stmt->execute(['u' => $username]);
    $row = $stmt->fetch();

    if ($row && password_verify($password, $row['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) $row['id'];
        $_SESSION['admin_username'] = $row['username'];
        header('Location: index.php');
        exit;
    }
    $error = 'Incorrect username or password.';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login · Marvel Fashion</title>
<link rel="stylesheet" href="assets/admin.css">
</head>
<body>
<div class="mf-login-shell">
  <div class="mf-login-card">
    <h1>Marvel Fashion Admin</h1>
    <p class="sub">Sign in to manage your store.</p>

    <?php if ($error): ?>
      <div class="mf-alert error"><?= h($error) ?></div>
    <?php endif; ?>

    <?php if ($isFirstRun): ?>
      <div class="mf-alert info">
        First time here? Use the default login below, then change your password is recommended but not required.<br>
        <strong>Username:</strong> admin&nbsp;&nbsp; <strong>Password:</strong> <?= h(MF_ADMIN_DEFAULT_PASSWORD) ?>
      </div>
    <?php endif; ?>

    <form method="POST">
      <div class="mf-field">
        <label>Username</label>
        <input type="text" name="username" autocomplete="username" required autofocus>
      </div>
      <div class="mf-field">
        <label>Password</label>
        <input type="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="mf-btn primary" style="width:100%;justify-content:center;padding:11px;">Sign In</button>
    </form>
  </div>
</div>
</body>
</html>
