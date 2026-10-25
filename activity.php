<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$filterGroups = [
    'all'       => null,
    'login'     => ['LOGIN'],
    'logout'    => ['LOGOUT'],
    'orders'    => ['ORDER_PLACED', 'ORDER_CANCELLED'],
    'cart'      => ['CART_ADD', 'CART_REMOVE'],
    'wishlist'  => ['WISHLIST_ADD', 'WISHLIST_REMOVE'],
    'coupons'   => ['COUPON_APPLIED'],
    'registration' => ['REGISTER'],
];
$filter = $_GET['filter'] ?? 'all';
if (!array_key_exists($filter, $filterGroups)) {
    $filter = 'all';
}

$sql = "SELECT a.*, u.full_name, u.email FROM user_activity a LEFT JOIN users u ON u.id = a.user_id";
$params = [];
if ($filterGroups[$filter] !== null) {
    $actions = $filterGroups[$filter];
    $placeholders = implode(',', array_fill(0, count($actions), '?'));
    $sql .= " WHERE a.action IN ($placeholders)";
    $params = $actions;
}
$sql .= " ORDER BY a.created_at DESC LIMIT 300";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$actionColors = [
    'LOGIN' => 'good', 'LOGOUT' => 'neutral', 'REGISTER' => 'accent',
    'ORDER_PLACED' => 'good', 'ORDER_CANCELLED' => 'bad',
    'WISHLIST_ADD' => 'accent', 'WISHLIST_REMOVE' => 'neutral',
    'CART_ADD' => 'accent', 'CART_REMOVE' => 'neutral',
    'COUPON_APPLIED' => 'warn',
];

mf_admin_header('Activity', 'Live log of logins, logouts, orders, cart & wishlist events', 'activity.php');
?>

<div class="mf-filters">
  <a href="activity.php" class="<?= $filter === 'all' ? 'active' : '' ?>">All</a>
  <a href="activity.php?filter=login" class="<?= $filter === 'login' ? 'active' : '' ?>">Login</a>
  <a href="activity.php?filter=logout" class="<?= $filter === 'logout' ? 'active' : '' ?>">Logout</a>
  <a href="activity.php?filter=orders" class="<?= $filter === 'orders' ? 'active' : '' ?>">Orders</a>
  <a href="activity.php?filter=cart" class="<?= $filter === 'cart' ? 'active' : '' ?>">Cart</a>
  <a href="activity.php?filter=wishlist" class="<?= $filter === 'wishlist' ? 'active' : '' ?>">Wishlist</a>
  <a href="activity.php?filter=coupons" class="<?= $filter === 'coupons' ? 'active' : '' ?>">Coupons</a>
  <a href="activity.php?filter=registration" class="<?= $filter === 'registration' ? 'active' : '' ?>">Registration</a>
</div>

<div class="mf-table-wrap">
  <table class="mf-table">
    <thead><tr><th>Date / Time</th><th>User</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
    <tbody>
    <?php if (!$rows): ?>
      <tr><td colspan="5" class="mf-table-empty">No activity recorded yet. Log in, browse, or place an order on the storefront and it will show up here.</td></tr>
    <?php else: foreach ($rows as $r): ?>
      <tr>
        <td><?= mf_admin_date($r['created_at']) ?></td>
        <td>
          <?php if ($r['user_id']): ?>
            <a href="user_detail.php?id=<?= (int) $r['user_id'] ?>"><?= h($r['full_name'] ?? ('User #' . $r['user_id'])) ?></a>
          <?php else: ?>
            <span style="color:var(--steel);">Unknown</span>
          <?php endif; ?>
        </td>
        <td><span class="mf-badge <?= $actionColors[$r['action']] ?? 'neutral' ?>"><?= h($r['action']) ?></span></td>
        <td style="color:var(--steel);"><?= h($r['description'] ?? '') ?></td>
        <td style="color:var(--steel);font-size:12px;"><?= h($r['ip_address'] ?? '-') ?></td>
      </tr>
    <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<?php mf_admin_footer(); ?>
