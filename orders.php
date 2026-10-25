<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$filter = $_GET['status'] ?? 'all';
$validStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

$sql = "SELECT o.*, u.full_name, u.email,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o LEFT JOIN users u ON u.id = o.user_id";
$params = [];
if (in_array($filter, $validStatuses, true)) {
    $sql .= " WHERE o.status = :status";
    $params['status'] = $filter;
}
$sql .= " ORDER BY o.created_at DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$orders = $stmt->fetchAll();

mf_admin_header('Orders', count($orders) . ' order' . (count($orders) === 1 ? '' : 's'), 'orders.php');
?>

<div class="mf-filters">
  <a href="orders.php" class="<?= $filter === 'all' ? 'active' : '' ?>">All</a>
  <?php foreach ($validStatuses as $s): ?>
    <a href="orders.php?status=<?= h($s) ?>" class="<?= $filter === $s ? 'active' : '' ?>"><?= ucfirst($s) ?></a>
  <?php endforeach; ?>
</div>

<div class="mf-table-wrap">
  <table class="mf-table">
    <thead>
      <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Coupon</th><th>Total</th><th>Payment</th><th>Status</th></tr>
    </thead>
    <tbody>
    <?php if (!$orders): ?>
      <tr><td colspan="8" class="mf-table-empty">No orders found.</td></tr>
    <?php else: foreach ($orders as $o): ?>
      <tr class="clickable" onclick="location.href='order_detail.php?id=<?= (int) $o['id'] ?>'">
        <td>#<?= (int) $o['id'] ?></td>
        <td><?= h($o['full_name'] ?? 'Guest') ?><br><span style="color:var(--steel);font-size:12px;"><?= h($o['email'] ?? '') ?></span></td>
        <td><?= mf_admin_date($o['created_at']) ?></td>
        <td><?= (int) $o['item_count'] ?></td>
        <td><?= $o['coupon_code'] ? h($o['coupon_code']) . ' (-' . mf_admin_money((float) $o['coupon_discount']) . ')' : '-' ?></td>
        <td><?= mf_admin_money((float) $o['total']) ?></td>
        <td><?= mf_payment_status_badge($o['payment_status']) ?> <span style="color:var(--steel);font-size:11px;"><?= h(strtoupper($o['payment_method'])) ?></span></td>
        <td><?= mf_order_status_badge($o['status']) ?></td>
      </tr>
    <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<?php mf_admin_footer(); ?>
