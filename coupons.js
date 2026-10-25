

(function () {
  'use strict';

  // Coupon codes are defined and validated server-side in
  // api/coupons/validate.php (source of truth: the `coupons` table). This
  // module is now a thin client around that endpoint — the frontend never
  // decides discount amounts itself.

  async function validateCoupon(rawCode, lines) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { valid: false, message: 'Enter a coupon code.' };
    }

    const payload = {
      code,
      lines: (lines || []).map(l => ({ productId: l.productId, size: l.size, qty: l.qty }))
    };

    try {
      const data = await window.MarvelApi.request('api/coupons/validate.php', { body: payload });
      return {
        valid: true,
        code: data.code,
        discount: data.couponDiscount,
        serverShipping: data.shipping,
        serverTax: data.tax,
        serverTotal: data.total,
        message: `"${data.code}" applied.`
      };
    } catch (e) {
      return { valid: false, message: e.message || 'This coupon code is not valid.' };
    }
  }

  // Merges a validated coupon's server-calculated numbers into the base
  // totals shown on screen. Both server-calculated fields (shipping, tax,
  // total) come straight from the coupon endpoint — nothing is
  // recalculated on the client.
  function computeFinalTotals(baseTotals, coupon) {
    if (!coupon) {
      return Object.assign({}, baseTotals, { couponDiscount: 0 });
    }
    return Object.assign({}, baseTotals, {
      shipping: coupon.serverShipping,
      tax: coupon.serverTax,
      total: coupon.serverTotal,
      couponDiscount: coupon.discount
    });
  }

  window.MarvelCoupons = { validateCoupon, computeFinalTotals };
})();
