<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$totalUsers = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$recentUsers = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY')->fetchColumn();

$orderCounts = $pdo->query("SELECT status, COUNT(*) c FROM orders GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);
$totalOrders = array_sum($orderCounts);
$totalSales = (float) $pdo->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status = 'paid'")->fetchColumn();

$totalProducts = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$productStock = $pdo->query("SELECT stock_status, COUNT(*) c FROM products GROUP BY stock_status")->fetchAll(PDO::FETCH_KEY_PAIR);

$activeCartItems = (int) $pdo->query('SELECT COUNT(*) FROM cart_items')->fetchColumn();
$wishlistItems = (int) $pdo->query('SELECT COUNT(*) FROM wishlist_items')->fetchColumn();

$totalCoupons = (int) $pdo->query('SELECT COUNT(*) FROM coupons')->fetchColumn();
$activeCoupons = (int) $pdo->query("SELECT COUNT(*) FROM coupons WHERE active = 1 AND (expiry_date IS NULL OR expiry_date >= CURDATE())")->fetchColumn();
$expiredCoupons = (int) $pdo->query("SELECT COUNT(*) FROM coupons WHERE expiry_date IS NOT NULL AND expiry_date < CURDATE()")->fetchColumn();

$recentActivity = [];

$recentOrders = $pdo->query(
    "SELECT o.id, o.total, o.status, o.payment_status, o.created_at, u.full_name
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT 6"
)->fetchAll();

mf_admin_header('Dashboard', 'A quick look at what\'s happening in your store.', 'index.php');
?>

<div class="mf-section-title"><span class="accent-dot"></span>Users</div>
<div class="mf-grid cols-3">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Total Users</div><div class="value"><?= $totalUsers ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Registered Users</div><div class="value"><?= $totalUsers ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">New This Week</div><div class="value"><?= $recentUsers ?></div></div>
</div>

<div class="mf-section-title"><span class="accent-dot"></span>Orders</div>
<div class="mf-grid cols-4">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Total Orders</div><div class="value"><?= $totalOrders ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Pending / Placed</div><div class="value"><?= (int) ($orderCounts['placed'] ?? 0) ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Processing / Shipped</div><div class="value"><?= (int) ($orderCounts['processing'] ?? 0) + (int) ($orderCounts['shipped'] ?? 0) ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Delivered</div><div class="value"><?= (int) ($orderCounts['delivered'] ?? 0) ?></div></div>
</div>
<div class="mf-grid cols-3" style="margin-top:16px;">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Cancelled</div><div class="value"><?= (int) ($orderCounts['cancelled'] ?? 0) ?></div></div>
  <div class="mf-card mf-stat" style="grid-column:span 2;"><div class="accent-bar"></div><div class="label">Total Sales (Paid Orders)</div><div class="value"><?= mf_admin_money($totalSales) ?></div></div>
</div>

<div class="mf-section-title"><span class="accent-dot"></span>Products</div>
<div class="mf-grid cols-3">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Total Products</div><div class="value"><?= $totalProducts ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">In Stock</div><div class="value"><?= (int) ($productStock['in-stock'] ?? 0) + (int) ($productStock['low-stock'] ?? 0) ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Out of Stock</div><div class="value"><?= (int) ($productStock['out-of-stock'] ?? 0) ?></div></div>
</div>

<div class="mf-section-title"><span class="accent-dot"></span>Shopping Activity</div>
<div class="mf-grid cols-2">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Active Cart Items</div><div class="value"><?= $activeCartItems ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Wishlist Items</div><div class="value"><?= $wishlistItems ?></div></div>
</div>

<div class="mf-section-title"><span class="accent-dot"></span>Coupons</div>
<div class="mf-grid cols-3">
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Total Coupons</div><div class="value"><?= $totalCoupons ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Active</div><div class="value"><?= $activeCoupons ?></div></div>
  <div class="mf-card mf-stat"><div class="accent-bar"></div><div class="label">Expired</div><div class="value"><?= $expiredCoupons ?></div></div>
</div>

<div class="mf-detail-grid" style="margin-top:30px;">
  <div>
    <div class="mf-section-title" style="margin-top:0;"><span class="accent-dot"></span>Recent Orders</div>
    <div class="mf-table-wrap">
      <table class="mf-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
        <?php if (!$recentOrders): ?>
          <tr><td colspan="6" class="mf-table-empty">No orders yet.</td></tr>
        <?php else: foreach ($recentOrders as $o): ?>
          <tr class="clickable" onclick="location.href='order_detail.php?id=<?= (int) $o['id'] ?>'">
            <td>#<?= (int) $o['id'] ?></td>
            <td><?= h($o['full_name'] ?? 'Guest') ?></td>
            <td><?= mf_admin_money((float) $o['total']) ?></td>
            <td><?= mf_order_status_badge($o['status']) ?></td>
            <td><?= mf_payment_status_badge($o['payment_status']) ?></td>
            <td><?= mf_admin_date($o['created_at']) ?></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>
  <div>
    <div class="mf-section-title" style="margin-top:0;"><span class="accent-dot"></span>Recent Activity</div>
    <div class="mf-table-wrap">
      <table class="mf-table">
        <thead><tr><th>User</th><th>Action</th><th>When</th></tr></thead>
        <tbody>
        <?php if (!$recentActivity): ?>
          <tr><td colspan="3" class="mf-table-empty">No activity yet.</td></tr>
        <?php else: foreach ($recentActivity as $a): ?>
          <tr>
            <td><?= h($a['full_name'] ?? 'Unknown') ?></td>
            <td><span class="mf-badge accent"><?= h($a['action']) ?></span></td>
            <td><?= mf_admin_date($a['created_at']) ?></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php mf_admin_footer(); ?>
