<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

$id = (string) ($_GET['id'] ?? '');
$validStock = ['in-stock', 'low-stock', 'out-of-stock'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $price = (float) ($_POST['price'] ?? 0);
    $discount = max(0, min(100, (int) ($_POST['discount_percent'] ?? 0)));
    $stockQty = max(0, (int) ($_POST['stock_quantity'] ?? 0));
    $stockStatus = (string) ($_POST['stock_status'] ?? 'in-stock');
    if (!in_array($stockStatus, $validStock, true)) {
        $stockStatus = 'in-stock';
    }
    $finalPrice = round($price * (1 - $discount / 100), 2);

    $upd = $pdo->prepare(
        'UPDATE products SET price = :price, discount_percent = :disc, final_price = :final,
         stock_quantity = :qty, stock_status = :status WHERE id = :id'
    );
    $upd->execute([
        'price' => $price, 'disc' => $discount, 'final' => $finalPrice,
        'qty' => $stockQty, 'status' => $stockStatus, 'id' => $id,
    ]);
    header('Location: product_detail.php?id=' . urlencode($id) . '&updated=1');
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM products WHERE id = :id');
$stmt->execute(['id' => $id]);
$p = $stmt->fetch();

if (!$p) {
    mf_admin_header('Product Not Found', '', 'products.php');
    echo '<a href="products.php" class="mf-back">&larr; Back to Products</a><div class="mf-card">No product found with that ID.</div>';
    mf_admin_footer();
    exit;
}

$gallery = json_decode($p['gallery_images'], true) ?: [$p['image']];
$sizes = json_decode($p['sizes'], true) ?: [];

mf_admin_header($p['name'], $p['hero_name'] . ' · ' . $p['category'], 'products.php');
?>
<a href="products.php" class="mf-back">&larr; Back to Products</a>

<?php if (!empty($_GET['updated'])): ?>
  <div class="mf-alert info">Product updated.</div>
<?php endif; ?>

<div class="mf-detail-grid">
  <div>
    <div class="mf-card" style="margin-bottom:18px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        <?php foreach ($gallery as $img): ?>
          <img class="mf-thumb-lg" src="../<?= h($img) ?>" alt="">
        <?php endforeach; ?>
      </div>
      <dl class="mf-kv">
        <dt>Product ID</dt><dd><code><?= h($p['id']) ?></code></dd>
        <dt>Name</dt><dd><?= h($p['name']) ?></dd>
        <dt>Hero</dt><dd><?= h($p['hero_name']) ?></dd>
        <dt>Category</dt><dd><?= h($p['category']) ?></dd>
        <dt>Sizes</dt><dd><?= h(implode(', ', $sizes)) ?></dd>
        <dt>Badge</dt><dd><?= $p['badge'] ? h($p['badge']) : '-' ?></dd>
        <dt>Rating</dt><dd>&#9733; <?= number_format((float) $p['rating'], 1) ?> (<?= (int) $p['review_count'] ?> reviews)</dd>
        <dt>Delivery</dt><dd><?= h($p['delivery']) ?></dd>
        <dt>Featured</dt><dd><?= $p['featured'] ? 'Yes' : 'No' ?></dd>
        <dt>New Arrival</dt><dd><?= $p['new_arrival'] ? 'Yes' : 'No' ?></dd>
      </dl>
      <div class="mf-section-title">Description</div>
      <p style="color:var(--steel);font-size:13.5px;line-height:1.6;"><?= h($p['description']) ?></p>
    </div>
  </div>

  <div>
    <div class="mf-section-title" style="margin-top:0;">Edit Price &amp; Stock</div>
    <div class="mf-card">
      <form method="POST">
        <div class="mf-field">
          <label>Price ($)</label>
          <input type="number" step="0.01" name="price" value="<?= h((string) $p['price']) ?>" required>
        </div>
        <div class="mf-field">
          <label>Discount (%)</label>
          <input type="number" min="0" max="100" name="discount_percent" value="<?= h((string) $p['discount_percent']) ?>">
        </div>
        <div class="mf-field">
          <label>Current Final Price</label>
          <input type="text" value="<?= h(mf_admin_money((float) $p['final_price'])) ?>" disabled style="opacity:.6;">
        </div>
        <div class="mf-field">
          <label>Stock Quantity</label>
          <input type="number" min="0" name="stock_quantity" value="<?= h((string) $p['stock_quantity']) ?>">
        </div>
        <div class="mf-field">
          <label>Stock Status</label>
          <select name="stock_status" style="width:100%;background:var(--charcoal-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:14px;">
            <?php foreach ($validStock as $s): ?>
              <option value="<?= h($s) ?>" <?= $p['stock_status'] === $s ? 'selected' : '' ?>><?= ucwords(str_replace('-', ' ', $s)) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <button type="submit" class="mf-btn primary" style="width:100%;justify-content:center;">Save Changes</button>
      </form>
    </div>
  </div>
</div>

<?php mf_admin_footer(); ?>
