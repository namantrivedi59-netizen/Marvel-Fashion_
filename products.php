<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$search = trim((string) ($_GET['q'] ?? ''));
$stockFilter = $_GET['stock'] ?? 'all';
$validStock = ['in-stock', 'low-stock', 'out-of-stock'];

$sql = "SELECT id, name, hero_name, category, image, price, final_price, discount_percent, stock_status, stock_quantity, rating, featured FROM products WHERE 1=1";
$params = [];
if ($search !== '') {
    $sql .= " AND (name LIKE :q OR hero_name LIKE :q OR category LIKE :q)";
    $params['q'] = '%' . $search . '%';
}
if (in_array($stockFilter, $validStock, true)) {
    $sql .= " AND stock_status = :stock";
    $params['stock'] = $stockFilter;
}
$sql .= " ORDER BY hero_name, category, idx";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();

mf_admin_header('Products', count($products) . ' product' . (count($products) === 1 ? '' : 's'), 'products.php');
?>

<form method="GET" class="mf-filters">
  <input type="text" name="q" class="mf-search" placeholder="Search by name, hero, category…" value="<?= h($search) ?>">
  <?php if ($stockFilter !== 'all'): ?><input type="hidden" name="stock" value="<?= h($stockFilter) ?>"><?php endif; ?>
  <button type="submit" class="mf-btn">Search</button>
</form>
<div class="mf-filters">
  <a href="products.php<?= $search ? '?q=' . urlencode($search) : '' ?>" class="<?= $stockFilter === 'all' ? 'active' : '' ?>">All</a>
  <?php foreach ($validStock as $s): $qs = array_filter(['q' => $search ?: null, 'stock' => $s]); ?>
    <a href="products.php?<?= http_build_query($qs) ?>" class="<?= $stockFilter === $s ? 'active' : '' ?>"><?= ucwords(str_replace('-', ' ', $s)) ?></a>
  <?php endforeach; ?>
</div>

<div class="mf-table-wrap">
  <table class="mf-table">
    <thead>
      <tr><th>Product</th><th>Category</th><th>Hero</th><th>Price</th><th>Discount</th><th>Stock</th><th>Rating</th></tr>
    </thead>
    <tbody>
    <?php if (!$products): ?>
      <tr><td colspan="7" class="mf-table-empty">No products found.</td></tr>
    <?php else: foreach ($products as $p): ?>
      <tr class="clickable" onclick="location.href='product_detail.php?id=<?= urlencode($p['id']) ?>'">
        <td class="mf-cell-product">
          <img class="mf-thumb" src="../<?= h($p['image']) ?>" alt="">
          <div><div class="name"><?= h($p['name']) ?></div><?php if ($p['featured']): ?><span class="mf-badge accent" style="margin-top:2px;">Featured</span><?php endif; ?></div>
        </td>
        <td><?= h($p['category']) ?></td>
        <td><?= h($p['hero_name']) ?></td>
        <td>
          <?php if ((int) $p['discount_percent'] > 0): ?>
            <span style="text-decoration:line-through;color:var(--steel);"><?= mf_admin_money((float) $p['price']) ?></span>
            <?= mf_admin_money((float) $p['final_price']) ?>
          <?php else: ?>
            <?= mf_admin_money((float) $p['price']) ?>
          <?php endif; ?>
        </td>
        <td><?= (int) $p['discount_percent'] ?>%</td>
        <td><?= mf_stock_badge($p['stock_status']) ?> <span style="color:var(--steel);font-size:12px;"><?= (int) $p['stock_quantity'] ?></span></td>
        <td>&#9733; <?= number_format((float) $p['rating'], 1) ?></td>
      </tr>
    <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>

<?php mf_admin_footer(); ?>
