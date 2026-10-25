<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$id = (int) ($_GET['id'] ?? 0);
$validOrderStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
$validPaymentStatuses = ['pending', 'paid', 'failed'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newStatus = (string) ($_POST['status'] ?? '');
    $newPaymentStatus = (string) ($_POST['payment_status'] ?? '');
    if (in_array($newStatus, $validOrderStatuses, true) && in_array($newPaymentStatus, $validPaymentStatuses, true)) {
        $currentStmt = $pdo->prepare('SELECT user_id, status FROM orders WHERE id = :id');
        $currentStmt->execute(['id' => $id]);
        $currentOrder = $currentStmt->fetch();

        $upd = $pdo->prepare('UPDATE orders SET status = :s, payment_status = :ps WHERE id = :id');
        $upd->execute(['s' => $newStatus, 'ps' => $newPaymentStatus, 'id' => $id]);

        if ($currentOrder && $newStatus === 'cancelled' && $currentOrder['status'] !== 'cancelled') {
            mf_log_activity('ORDER_CANCELLED', (int) $currentOrder['user_id'], 'Order #' . $id . ' was cancelled by admin.', $pdo);
        }
    }
    header('Location: order_detail.php?id=' . $id . '&updated=1');
    exit;
}

$stmt = $pdo->prepare('SELECT o.*, u.full_name, u.email FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = :id');
$stmt->execute(['id' => $id]);
$order = $stmt->fetch();

if (!$order) {
    mf_admin_header('Order Not Found', '', 'orders.php');
    echo '<a href="orders.php" class="mf-back">&larr; Back to Orders</a><div class="mf-card">No order found with that ID.</div>';
    mf_admin_footer();
    exit;
}

$items = $pdo->prepare('SELECT oi.*, p.image, p.hero_name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = :id');
$items->execute(['id' => $id]);
$items = $items->fetchAll();

$address = json_decode($order['address_snapshot'], true) ?: [];

mf_admin_header('Order #' . $order['id'], 'Placed ' . mf_admin_date($order['created_at']), 'orders.php');
?>
<a href="orders.php" class="mf-back">&larr; Back to Orders</a>

<?php if (!empty($_GET['updated'])): ?>
  <div class="mf-alert info">Order updated.</div>
<?php endif; ?>

<div class="mf-detail-grid">
  <div>
    <div class="mf-section-title" style="margin-top:0;">Customer</div>
    <div class="mf-card" style="margin-bottom:18px;">
      <dl class="mf-kv">
        <dt>Name</dt><dd><?= h($address['fullName'] ?? $order['full_name'] ?? '-') ?></dd>
        <dt>Email</dt><dd><?= h($address['email'] ?? $order['email'] ?? '-') ?></dd>
        <dt>Phone</dt><dd><?= h($address['phone'] ?? '-') ?></dd>
        <dt>Address</dt><dd><?= h($address['address'] ?? '-') ?>, <?= h($address['city'] ?? '') ?>, <?= h($address['state'] ?? '') ?> <?= h($address['zip'] ?? '') ?></dd>
      </dl>
    </div>

    <div class="mf-section-title">Order Items</div>
    <div class="mf-table-wrap" style="margin-bottom:18px;">
      <table class="mf-table">
        <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
        <tbody>
        <?php foreach ($items as $it): ?>
          <tr>
            <td class="mf-cell-product">
              <?php if ($it['image']): ?><img class="mf-thumb" src="../<?= h($it['image']) ?>" alt=""><?php endif; ?>
              <div><div class="name"><?= h($it['product_name']) ?></div><div class="meta"><?= h($it['hero_name'] ?? '') ?></div></div>
            </td>
            <td><?= h($it['size'] ?: '-') ?></td>
            <td><?= (int) $it['quantity'] ?></td>
            <td><?= mf_admin_money((float) $it['unit_price']) ?></td>
            <td><?= mf_admin_money((float) $it['line_total']) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div>
    <div class="mf-section-title" style="margin-top:0;">Payment &amp; Totals</div>
    <div class="mf-card" style="margin-bottom:18px;">
      <dl class="mf-kv">
        <dt>Payment Method</dt><dd><?= h(strtoupper($order['payment_method'])) ?></dd>
        <dt>Payment Status</dt><dd><?= mf_payment_status_badge($order['payment_status']) ?></dd>
        <dt>Order Status</dt><dd><?= mf_order_status_badge($order['status']) ?></dd>
      </dl>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">
      <dl class="mf-kv">
        <dt>Subtotal</dt><dd><?= mf_admin_money((float) $order['subtotal']) ?></dd>
        <dt>Item Discount</dt><dd>-<?= mf_admin_money((float) $order['discount_total']) ?></dd>
        <dt>Coupon</dt><dd><?= $order['coupon_code'] ? h($order['coupon_code']) . ' (-' . mf_admin_money((float) $order['coupon_discount']) . ')' : '-' ?></dd>
        <dt>Shipping</dt><dd><?= mf_admin_money((float) $order['shipping']) ?></dd>
        <dt>Tax</dt><dd><?= mf_admin_money((float) $order['tax']) ?></dd>
        <dt><strong>Total</strong></dt><dd><strong><?= mf_admin_money((float) $order['total']) ?></strong></dd>
      </dl>
    </div>

    <div class="mf-section-title">Update Status</div>
    <div class="mf-card">
      <form method="POST">
        <div class="mf-field">
          <label>Order Status</label>
          <select name="status" style="width:100%;background:var(--charcoal-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:14px;">
            <?php foreach ($validOrderStatuses as $s): ?>
              <option value="<?= h($s) ?>" <?= $order['status'] === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="mf-field">
          <label>Payment Status</label>
          <select name="payment_status" style="width:100%;background:var(--charcoal-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:14px;">
            <?php foreach ($validPaymentStatuses as $s): ?>
              <option value="<?= h($s) ?>" <?= $order['payment_status'] === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <button type="submit" class="mf-btn primary" style="width:100%;justify-content:center;">Save Changes</button>
      </form>
    </div>
  </div>
</div>

<?php mf_admin_footer(); ?>
