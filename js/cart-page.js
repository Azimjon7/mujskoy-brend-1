(async function () {
  const root = document.getElementById('cart-root');
  if (!root) return;
  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((r) => (s.onload = r));
  }
  const cart = MBStore.getCart();
  if (!cart.length) {
    root.innerHTML = '<div class="empty-state"><h5>Savat bo‘sh</h5><p>Mahsulot tanlab qo‘shing.</p><a href="shop.html" class="site-btn">Do‘konga o‘tish</a></div>';
    return;
  }
  const products = await MBHelpers.loadProducts({ forceRefresh: true });
  const enriched = cart.map((item, index) => ({ ...item, index, product: products.find(p => p.id === item.productId) || {} }));
  const total = enriched.reduce((sum, item) => sum + (Number(item.product.price) || 0) * item.qty, 0);
  root.innerHTML = `
    <div class="cart-list">
      ${enriched.map(item => `
        <div class="cart-card card">
          <div class="cart-card-inner" style="display:flex;gap:12px;align-items:center;">
            <div style="width:120px;flex:0 0 120px;"><img src="${item.product.image || (item.product.images && item.product.images[0]) || 'img/placeholders/product.svg'}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div><strong style="color:var(--text)">${item.product.name || 'Mahsulot'}</strong><div class="small muted">${item.size || '-'} / ${item.color || '-'}</div></div>
                <div style="text-align:right"><div style="font-weight:800;color:var(--accent);">${Number(item.product.price || 0).toLocaleString('uz-UZ')} so‘m</div><div class="small muted">Jami: ${((Number(item.product.price) || 0) * item.qty).toLocaleString('uz-UZ')} so‘m</div></div>
              </div>
              <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
                <input type="number" min="1" value="${item.qty}" data-index="${item.index}" class="cart-qty-input" style="width:90px;padding:8px;border-radius:8px;border:1px solid var(--border)">
                <a href="#" class="link-btn cart-remove" data-index="${item.index}">O‘chirish</a>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="checkout__order checkout__order--custom mt-4"><div class="total-line"><span>Umumiy summa</span><span>${total.toLocaleString('uz-UZ')} so‘m</span></div><a href="checkout.html" class="site-btn mt-3">Buyurtmaga o‘tish</a></div>`;

  document.querySelectorAll('.cart-qty-input').forEach(input => input.addEventListener('change', function () {
    MBStore.updateQty(Number(this.dataset.index), Number(this.value));
    location.reload();
  }));
  document.querySelectorAll('.cart-remove').forEach(link => link.addEventListener('click', function (e) {
    e.preventDefault();
    MBStore.removeFromCart(Number(this.dataset.index));
    location.reload();
  }));
})();
