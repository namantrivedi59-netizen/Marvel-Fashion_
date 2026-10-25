<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$search = trim((string) ($_GET['q'] ?? ''));

$sql = "SELECT u.id, u.full_name, u.email, u.created_at,
               (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
               (SELECT COUNT(*) FROM wishlist_items w WHERE w.user_id = u.id) AS wishlist_count,
               (SELECT COUNT(*) FROM cart_items c WHERE c.user_id = u.id) AS cart_count
        FROM users u";
$params = [];
if ($search !== '') {
    $sql .= " WHERE u.full_name LIKE :q OR u.email LIKE :q";
    $params['q'] = '%' . $search . '%';
}
$sql .= " ORDER BY u.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();

mf_admin_header('Users', count($users) . ' registered customer' . (count($users) === 1 ? '' : 's'), 'users.php');
?>

<form method="GET" class="mf-filters">
  <input type="text" name="q" class="mf-search" placeholder="Search by name or email…" value="<?= h($search) ?>">
  <button type="submit" class="mf-btn">Search</button>
  <?php if ($search !== ''): ?><a href="users.php" class="mf-btn" style="text-decoration:none;">Clear</a><?php endif; ?>
</form>

<div class="mf-table-wrap">
  <table class="mf-table">
    <thead>
      <tr><th>ID</th><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Wishlist</th><th>Cart Items</th></tr>
    </thead>
    <tbody>
    <?php if (!$users): ?>
      <tr><td colspan="7" class="mf-table-empty">No users found.</td></tr>
    <?php else: foreach ($users as $u): ?>
      <tr class="clickable" onclick="location.href='user_detail.php?id=<?= (int) $u['id'] ?>'">
        <td>#<?= (int) $u['id'] ?></td>
        <td><?= h($u['full_name']) ?></td>
        <td><?= h($u['email']) ?></td>
        <td><?= mf_admin_date($u['created_at']) ?></td>
        <td><?= (int) $u['order_count'] ?></td>
        <td><?= (int) $u['wishlist_count'] ?></td>
        <td><?= (int) $u['cart_count'] ?></td>
      </tr>
    <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<?php mf_admin_footer(); ?>
