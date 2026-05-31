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
    <div class="cart-table">
      <table>
        <thead><tr><th>Mahsulot</th><th>Variant</th><th>Narx</th><th>Soni</th><th>Jami</th><th></th></tr></thead>
        <tbody>
          ${enriched.map(item => `
            <tr>
              <td><div class="admin-product-left"><img class="cart-item-img" src="${item.product.image || (item.product.images && item.product.images[0]) || 'img/placeholders/product.svg'}" alt=""><div><strong>${item.product.name || 'Mahsulot'}</strong></div></div></td>
              <td>${item.size || '-'} / ${item.color || '-'}</td>
              <td>${Number(item.product.price || 0).toLocaleString('uz-UZ')} so‘m</td>
              <td><input type="number" min="1" value="${item.qty}" data-index="${item.index}" class="cart-qty-input"></td>
              <td>${((Number(item.product.price) || 0) * item.qty).toLocaleString('uz-UZ')} so‘m</td>
              <td><a href="#" class="link-btn cart-remove" data-index="${item.index}">O‘chirish</a></td>
            </tr>`).join('')}
        </tbody>
      </table>
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
