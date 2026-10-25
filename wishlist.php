<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$userId = (int) ($_GET['user_id'] ?? 0);

$sql = "SELECT w.id, w.user_id, w.created_at,
               u.full_name, u.email,
               p.id AS product_id, p.name, p.image, p.hero_name, p.final_price
        FROM wishlist_items w
        JOIN users u ON u.id = w.user_id
        JOIN products p ON p.id = w.product_id";
$params = [];
if ($userId > 0) {
    $sql .= " WHERE w.user_id = :uid";
    $params['uid'] = $userId;
}
$sql .= " ORDER BY w.created_at DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$filteredUserName = null;
if ($userId > 0 && $rows) {
    $filteredUserName = $rows[0]['full_name'];
}

mf_admin_header('Wishlist', count($rows) . ' wishlist item' . (count($rows) === 1 ? '' : 's'), 'wishlist.php');
?>

<?php if ($userId > 0): ?>
  <div class="mf-filters">
    <a href="wishlist.php" class="active">&larr; Showing wishlist for <?= h($filteredUserName ?? ('User #' . $userId)) ?> — clear filter</a>
  </div>
<?php endif; ?>

<div class="mf-table-wrap">
  <table class="mf-table">
    <thead>
      <tr><th>User</th><th>Product</th><th>Price</th><th>Added</th></tr>
    </thead>
    <tbody>
    <?php if (!$rows): ?>
      <tr><td colspan="4" class="mf-table-empty">No wishlist items yet.</td></tr>
    <?php else: foreach ($rows as $r): ?>
      <tr>
        <td><a href="user_detail.php?id=<?= (int) $r['user_id'] ?>"><?= h($r['full_name']) ?></a><br><span style="color:var(--steel);font-size:12px;"><?= h($r['email']) ?></span></td>
        <td class="mf-cell-product">
          <img class="mf-thumb" src="../<?= h($r['image']) ?>" alt="">
          <div><div class="name"><?= h($r['name']) ?></div><div class="meta"><?= h($r['hero_name']) ?></div></div>
        </td>
        <td><?= mf_admin_money((float) $r['final_price']) ?></td>
        <td><?= mf_admin_date($r['created_at']) ?></td>
      </tr>
    <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<?php mf_admin_footer(); ?>
