(async function () {
  const root = document.getElementById("cart-root");
  if (!root) return;

  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((resolve) => (s.onload = resolve));
  }

  const cart = MBStore.getCart();
  if (!cart.length) {
    root.innerHTML = `
      <div class="empty-state">
        <img src="img/placeholders/product.svg" alt="placeholder">
        <h5>Savat bo'sh</h5>
        <p>Mahsulot tanlab savatga qo'shing.</p>
        <a href="shop.html" class="site-btn">Do'konga o'tish</a>
      </div>
    `;
    return;
  }

  const products = await MBHelpers.loadProducts({ forceRefresh: true });
  const enriched = cart.map((item, index) => {
    const product = products.find((p) => String(p.id) === String(item.productId)) || {};
    const qty = Math.max(1, Number(item.qty || 1));
    const price = Number(product.price || 0);
    return {
      ...item,
      index,
      qty,
      product,
      price,
      lineTotal: price * qty,
    };
  });
  const total = enriched.reduce((sum, item) => sum + item.lineTotal, 0);

  root.innerHTML = `
    <div class="cart-list">
      ${enriched.map((item) => {
        const product = item.product;
        const image = product.image || (product.images && product.images[0]) || "img/placeholders/product.svg";
        return `
          <article class="cart-card">
            <a class="cart-card__image" href="product-details.html?id=${encodeURIComponent(product.id || item.productId)}">
              <img src="${image}" alt="${MBHelpers.escapeHtml(product.name || "Mahsulot")}">
            </a>
            <div class="cart-card__body">
              <div class="cart-card__top">
                <div>
                  <h3>${MBHelpers.escapeHtml(product.name || "Mahsulot")}</h3>
                  <p>${MBHelpers.escapeHtml(item.size || "-")} / ${MBHelpers.escapeHtml(item.color || "-")}</p>
                </div>
                <div class="cart-card__price">
                  <strong>${MBHelpers.currency(item.price)}</strong>
                  <span>Jami: ${MBHelpers.currency(item.lineTotal)}</span>
                </div>
              </div>
              <div class="cart-card__actions">
                <input type="number" min="1" value="${item.qty}" data-index="${item.index}" class="cart-qty-input" aria-label="Soni">
                <button type="button" class="link-btn cart-remove" data-index="${item.index}">O'chirish</button>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
    <div class="cart-summary">
      <div class="checkout-total-row checkout-grand-total">
        <span>Umumiy summa</span>
        <strong>${MBHelpers.currency(total)}</strong>
      </div>
      <a href="checkout.html" class="site-btn">Buyurtmaga o'tish</a>
    </div>
  `;

  document.querySelectorAll(".cart-qty-input").forEach((input) => {
    input.addEventListener("change", function () {
      MBStore.updateQty(Number(this.dataset.index), Number(this.value));
      location.reload();
    });
  });

  document.querySelectorAll(".cart-remove").forEach((button) => {
    button.addEventListener("click", function () {
      MBStore.removeFromCart(Number(this.dataset.index));
      location.reload();
    });
  });
})();
