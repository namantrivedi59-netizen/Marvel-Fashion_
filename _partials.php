<?php
declare(strict_types=1);

function mf_admin_nav_items(): array {
    return [
        ['index.php', 'Dashboard', '&#9635;'],
        ['users.php', 'Users', '&#128100;'],
        ['orders.php', 'Orders', '&#128230;'],
        ['products.php', 'Products', '&#128465;'],
        ['carts.php', 'Carts', '&#128722;'],
        ['wishlist.php', 'Wishlist', '&#9825;'],
        ['coupons.php', 'Coupons', '&#127991;'],
        ['activity.php', 'Activity', '&#128200;'],
    ];
}

function mf_admin_header(string $title, string $subtitle = '', string $active = ''): void {
    $admin = mf_admin_current();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= h($title) ?> · Marvel Fashion Admin</title>
<link rel="stylesheet" href="assets/admin.css">
</head>
<body>
<div class="mf-admin-shell">
  <aside class="mf-sidebar" id="mfSidebar">
    <div class="mf-sidebar-brand">
      <div class="dot"></div>
      <div>
        <span>Marvel Fashion</span>
        <small>Admin Dashboard</small>
      </div>
    </div>
    <nav class="mf-nav">
      <?php foreach (mf_admin_nav_items() as [$href, $label, $icon]): ?>
        <a href="<?= h($href) ?>" class="<?= $active === $href ? 'active' : '' ?>">
          <span class="icon"><?= $icon ?></span><?= h($label) ?>
        </a>
      <?php endforeach; ?>
      <div class="mf-nav-section">
        <a href="../index.html" target="_blank"><span class="icon">&#8599;</span>View Storefront</a>
        <a href="logout.php"><span class="icon">&#9211;</span>Logout</a>
      </div>
    </nav>
  </aside>
  <main class="mf-main">
    <div class="mf-topbar">
      <div>
        <h1><?= h($title) ?></h1>
        <?php if ($subtitle): ?><div class="sub"><?= h($subtitle) ?></div><?php endif; ?>
      </div>
      <div class="mf-admin-user">
        Signed in as <strong><?= h($admin['username'] ?? '') ?></strong>
      </div>
    </div>
    <?php
}

function mf_admin_footer(): void {
    ?>
  </main>
</div>
</body>
</html>
<?php
}

function mf_stock_badge(string $status): string {
    $map = [
        'in-stock'     => ['good', 'In Stock'],
        'low-stock'    => ['warn', 'Low Stock'],
        'out-of-stock' => ['bad', 'Out of Stock'],
    ];
    [$cls, $label] = $map[$status] ?? ['neutral', $status];
    return '<span class="mf-badge ' . $cls . '">' . h($label) . '</span>';
}

function mf_order_status_badge(string $status): string {
    $map = [
        'placed'     => ['neutral', 'Placed'],
        'processing' => ['warn', 'Processing'],
        'shipped'    => ['accent', 'Shipped'],
        'delivered'  => ['good', 'Delivered'],
        'cancelled'  => ['bad', 'Cancelled'],
    ];
    [$cls, $label] = $map[$status] ?? ['neutral', $status];
    return '<span class="mf-badge ' . $cls . '">' . h($label) . '</span>';
}

function mf_payment_status_badge(string $status): string {
    $map = [
        'paid'    => ['good', 'Paid'],
        'pending' => ['warn', 'Pending'],
        'failed'  => ['bad', 'Failed'],
    ];
    [$cls, $label] = $map[$status] ?? ['neutral', $status];
    return '<span class="mf-badge ' . $cls . '">' . h($label) . '</span>';
}

function mf_coupon_status_badge(array $coupon): string {
    if (!$coupon['active']) {
        return '<span class="mf-badge neutral">Disabled</span>';
    }
    return '<span class="mf-badge good">Active</span>';
}
