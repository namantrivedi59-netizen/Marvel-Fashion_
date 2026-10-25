<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = :id');
$stmt->execute(['id' => $id]);
$user = $stmt->fetch();

if (!$user) {
    mf_admin_header('User Not Found', '', 'users.php');
    echo '<a href="users.php" class="mf-back">&larr; Back to Users</a><div class="mf-card">No user found with that ID.</div>';
    mf_admin_footer();
    exit;
}

$orders = $pdo->prepare('SELECT id, total, status, payment_status, created_at FROM orders WHERE user_id = :id ORDER BY created_at DESC');
$orders->execute(['id' => $id]);
$orders = $orders->fetchAll();

$wishlist = $pdo->prepare(
    'SELECT p.id, p.name, p.image, p.hero_name, p.final_price, w.created_at
     FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = :id ORDER BY w.created_at DESC'
);
$wishlist->execute(['id' => $id]);
$wishlist = $wishlist->fetchAll();

$cart = $pdo->prepare(
    'SELECT p.id, p.name, p.image, p.hero_name, p.final_price, c.size, c.quantity, c.created_at
     FROM cart_items c JOIN products p ON p.id = c.product_id
     WHERE c.user_id = :id ORDER BY c.created_at DESC'
);
$cart->execute(['id' => $id]);
$cart = $cart->fetchAll();

$addresses = $pdo->prepare('SELECT * FROM addresses WHERE user_id = :id ORDER BY is_default DESC, created_at DESC');
$addresses->execute(['id' => $id]);
$addresses = $addresses->fetchAll();

mf_admin_header($user['full_name'], 'User #' . $user['id'], 'users.php');
?>
<a href="users.php" class="mf-back">&larr; Back to Users</a>

<div class="mf-detail-grid">
  <div>
    <div class="mf-card" style="margin-bottom:18px;">
      <div class="mf-section-title" style="margin-top:0;">Account Information</div>
      <dl class="mf-kv">
        <dt>Full Name</dt><dd><?= h($user['full_name']) ?></dd>
        <dt>Email</dt><dd><?= h($user['email']) ?></dd>
        <dt>User ID</dt><dd>#<?= (int) $user['id'] ?></dd>
        <dt>Joined</dt><dd><?= mf_admin_date($user['created_at']) ?></dd>
        <dt>Last Updated</dt><dd><?= mf_admin_date($user['updated_at']) ?></dd>
      </dl>
    </div>

    <div class="mf-section-title">Orders (<?= count($orders) ?>)</div>
    <div class="mf-table-wrap" style="margin-bottom:18px;">
      <table class="mf-table">
        <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
        <?php if (!$orders): ?>
          <tr><td colspan="5" class="mf-table-empty">No orders yet.</td></tr>
        <?php else: foreach ($orders as $o): ?>
          <tr class="clickable" onclick="location.href='order_detail.php?id=<?= (int) $o['id'] ?>'">
            <td>#<?= (int) $o['id'] ?></td>
            <td><?= mf_admin_money((float) $o['total']) ?></td>
            <td><?= mf_order_status_badge($o['status']) ?></td>
            <td><?= mf_payment_status_badge($o['payment_status']) ?></td>
            <td><?= mf_admin_date($o['created_at']) ?></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>

    <div class="mf-section-title">Wishlist (<?= count($wishlist) ?>) <a href="wishlist.php?user_id=<?= (int) $user['id'] ?>" class="mf-btn" style="padding:4px 10px;font-size:11px;">Open in Wishlist</a></div>
    <div class="mf-table-wrap" style="margin-bottom:18px;">
      <table class="mf-table">
        <thead><tr><th>Product</th><th>Price</th><th>Added</th></tr></thead>
        <tbody>
        <?php if (!$wishlist): ?>
          <tr><td colspan="3" class="mf-table-empty">Wishlist is empty.</td></tr>
        <?php else: foreach ($wishlist as $w): ?>
          <tr>
            <td class="mf-cell-product">
              <img class="mf-thumb" src="../<?= h($w['image']) ?>" alt="">
              <div><div class="name"><?= h($w['name']) ?></div><div class="meta"><?= h($w['hero_name']) ?></div></div>
            </td>
            <td><?= mf_admin_money((float) $w['final_price']) ?></td>
            <td><?= mf_admin_date($w['created_at']) ?></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>

    <div class="mf-section-title">Cart (<?= count($cart) ?>) <a href="carts.php?user_id=<?= (int) $user['id'] ?>" class="mf-btn" style="padding:4px 10px;font-size:11px;">Open in Carts</a></div>
    <div class="mf-table-wrap">
      <table class="mf-table">
        <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Price</th><th>Added</th></tr></thead>
        <tbody>
        <?php if (!$cart): ?>
          <tr><td colspan="5" class="mf-table-empty">Cart is empty.</td></tr>
        <?php else: foreach ($cart as $c): ?>
          <tr>
            <td class="mf-cell-product">
              <img class="mf-thumb" src="../<?= h($c['image']) ?>" alt="">
              <div><div class="name"><?= h($c['name']) ?></div><div class="meta"><?= h($c['hero_name']) ?></div></div>
            </td>
            <td><?= h($c['size'] ?: '-') ?></td>
            <td><?= (int) $c['quantity'] ?></td>
            <td><?= mf_admin_money((float) $c['final_price']) ?></td>
            <td><?= mf_admin_date($c['created_at']) ?></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div>
    <div class="mf-section-title" style="margin-top:0;">Addresses (<?= count($addresses) ?>)</div>
    <?php if (!$addresses): ?>
      <div class="mf-card">No saved addresses.</div>
    <?php else: foreach ($addresses as $a): ?>
      <div class="mf-card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong><?= h($a['full_name']) ?></strong>
          <?php if ($a['is_default']): ?><span class="mf-badge accent">Default</span><?php endif; ?>
        </div>
        <div style="color:var(--steel);font-size:13.5px;line-height:1.6;">
          <?= h($a['phone']) ?><br>
          <?= h($a['line1']) ?><?= $a['line2'] ? ', ' . h($a['line2']) : '' ?><br>
          <?= h($a['city']) ?>, <?= h($a['state']) ?> <?= h($a['pincode']) ?>
        </div>
      </div>
    <?php endforeach; endif; ?>
  </div>
</div>

<?php mf_admin_footer(); ?>
