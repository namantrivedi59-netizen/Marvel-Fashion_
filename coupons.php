<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_partials.php';
mf_admin_require_login();
$pdo = mf_admin_db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'create') {
    $code = strtoupper(trim((string) ($_POST['code'] ?? '')));
    $type = (string) ($_POST['type'] ?? 'percent');
    $value = (float) ($_POST['value'] ?? 0);
    $minOrder = (float) ($_POST['min_order'] ?? 0);
    $startDate = $_POST['start_date'] ?: null;
    $expiryDate = $_POST['expiry_date'] ?: null;
    $usageLimit = $_POST['usage_limit'] !== '' ? (int) $_POST['usage_limit'] : null;
    $active = !empty($_POST['active']) ? 1 : 0;

    if ($code !== '' && in_array($type, ['percent', 'flat', 'freeship'], true)) {
        $ins = $pdo->prepare(
            'INSERT INTO coupons (code, type, value, min_order, active, start_date, expiry_date, usage_limit)
             VALUES (:code, :type, :value, :min, :active, :start, :expiry, :limit)
             ON DUPLICATE KEY UPDATE type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
               active=VALUES(active), start_date=VALUES(start_date), expiry_date=VALUES(expiry_date), usage_limit=VALUES(usage_limit)'
        );
        $ins->execute([
            'code' => $code, 'type' => $type, 'value' => $value, 'min' => $minOrder,
            'active' => $active, 'start' => $startDate, 'expiry' => $expiryDate, 'limit' => $usageLimit,
        ]);
    }
    header('Location: coupons.php?saved=1');
    exit;
}

if (($_GET['toggle'] ?? '') !== '' && ctype_digit((string) $_GET['toggle'])) {
    $pdo->prepare('UPDATE coupons SET active = NOT active WHERE id = :id')->execute(['id' => (int) $_GET['toggle']]);
    header('Location: coupons.php');
    exit;
}

$coupons = $pdo->query('SELECT * FROM coupons ORDER BY created_at DESC')->fetchAll();

mf_admin_header('Coupons', count($coupons) . ' coupon' . (count($coupons) === 1 ? '' : 's'), 'coupons.php');
?>

<?php if (!empty($_GET['saved'])): ?><div class="mf-alert info">Coupon saved.</div><?php endif; ?>

<div class="mf-detail-grid">
  <div>
    <div class="mf-table-wrap">
      <table class="mf-table">
        <thead>
          <tr><th>Code</th><th>Discount</th><th>Type</th><th>Min Order</th><th>Window</th><th>Usage</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
        <?php if (!$coupons): ?>
          <tr><td colspan="8" class="mf-table-empty">No coupons yet.</td></tr>
        <?php else: foreach ($coupons as $c):
          $isExpired = !empty($c['expiry_date']) && strtotime($c['expiry_date']) < strtotime('today');
        ?>
          <tr>
            <td><code><?= h($c['code']) ?></code></td>
            <td><?= $c['type'] === 'percent' ? (int) $c['value'] . '%' : ($c['type'] === 'flat' ? mf_admin_money((float) $c['value']) : 'Free Shipping') ?></td>
            <td><?= ucfirst($c['type']) ?></td>
            <td><?= $c['min_order'] > 0 ? mf_admin_money((float) $c['min_order']) : '-' ?></td>
            <td style="font-size:12px;color:var(--steel);">
              <?= $c['start_date'] ? date('d M Y', strtotime($c['start_date'])) : 'Any' ?> &rarr;
              <?= $c['expiry_date'] ? date('d M Y', strtotime($c['expiry_date'])) : 'No expiry' ?>
            </td>
            <td><?= (int) $c['usage_count'] ?><?= $c['usage_limit'] ? ' / ' . (int) $c['usage_limit'] : '' ?></td>
            <td>
              <?php if ($isExpired): ?>
                <span class="mf-badge bad">Expired</span>
              <?php else: ?>
                <?= mf_coupon_status_badge($c) ?>
              <?php endif; ?>
            </td>
            <td><a href="coupons.php?toggle=<?= (int) $c['id'] ?>" class="mf-btn" style="padding:5px 10px;font-size:12px;"><?= $c['active'] ? 'Disable' : 'Enable' ?></a></td>
          </tr>
        <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div>
    <div class="mf-section-title" style="margin-top:0;">Add / Update Coupon</div>
    <div class="mf-card">
      <form method="POST">
        <input type="hidden" name="action" value="create">
        <div class="mf-field"><label>Code</label><input type="text" name="code" required placeholder="e.g. HERO25"></div>
        <div class="mf-field">
          <label>Type</label>
          <select name="type" style="width:100%;background:var(--charcoal-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:14px;">
            <option value="percent">Percent Off</option>
            <option value="flat">Flat Amount Off</option>
            <option value="freeship">Free Shipping</option>
          </select>
        </div>
        <div class="mf-field"><label>Value (% or $)</label><input type="number" step="0.01" name="value" value="0"></div>
        <div class="mf-field"><label>Minimum Order ($)</label><input type="number" step="0.01" name="min_order" value="0"></div>
        <div class="mf-field"><label>Start Date (optional)</label><input type="date" name="start_date"></div>
        <div class="mf-field"><label>Expiry Date (optional)</label><input type="date" name="expiry_date"></div>
        <div class="mf-field"><label>Usage Limit (optional)</label><input type="number" name="usage_limit" placeholder="Unlimited"></div>
        <div class="mf-field">
          <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="active" checked style="width:auto;"> Active</label>
        </div>
        <button type="submit" class="mf-btn primary" style="width:100%;justify-content:center;">Save Coupon</button>
      </form>
      <p style="color:var(--steel);font-size:12px;margin-top:10px;">Using an existing code updates that coupon instead of creating a duplicate.</p>
    </div>
  </div>
</div>

<?php mf_admin_footer(); ?>
