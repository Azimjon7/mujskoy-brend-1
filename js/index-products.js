(async function () {
  const rootCategories = document.getElementById("home-categories");
  const rootNew = document.getElementById("new-products");
  const rootFeatured = document.getElementById("featured-products");
  if (!rootNew) return;

  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((resolve) => (s.onload = resolve));
  }

  const list = await MBHelpers.loadProducts({ forceRefresh: true });

  if (!list.length) {
    const empty = MBHelpers.emptyState("Admin paneldan birinchi mahsulotni qo'shing.");
    if (rootCategories) rootCategories.innerHTML = empty;
    rootNew.innerHTML = empty;
    if (rootFeatured) rootFeatured.innerHTML = empty;
    return;
  }

  renderCategories(list);

  rootNew.innerHTML = list
    .slice(0, 8)
    .map((product) => MBHelpers.productCard(product, { showDescription: false }))
    .join("");

  if (rootFeatured) {
    const topProducts = [...list].sort((a, b) => {
      const aLabel = String(a.label || "").toLowerCase();
      const bLabel = String(b.label || "").toLowerCase();
      const aBoost = /(bestseller|top)/.test(aLabel) ? 100 : 0;
      const bBoost = /(bestseller|top)/.test(bLabel) ? 100 : 0;
      const aScore = aBoost + Number(a.rating || 0) * 10 + Number(a.reviewCount || 0);
      const bScore = bBoost + Number(b.rating || 0) * 10 + Number(b.reviewCount || 0);
      return bScore - aScore;
    });

    rootFeatured.innerHTML = topProducts
      .slice(0, 8)
      .map((product) => MBHelpers.productCard(product, { showDescription: false }))
      .join("");
  }

  bindQuickAdd(list);

  function renderCategories(products) {
    if (!rootCategories) return;

    const grouped = products.reduce((map, product) => {
      const category = product.category || "Boshqa";
      if (!map[category]) {
        map[category] = {
          category,
          count: 0,
          image: product.image || (product.images && product.images[0]) || "img/placeholders/category.svg",
        };
      }
      map[category].count += 1;
      return map;
    }, {});

    rootCategories.innerHTML = Object.values(grouped).slice(0, 6).map((item) => `
      <div class="col-6 col-md-6 col-lg-4">
        <a class="luxe-cat luxe-reveal" href="shop.html?category=${encodeURIComponent(item.category)}">
          <img src="${item.image || "img/placeholders/category.svg"}" alt="${MBHelpers.escapeHtml(item.category)}">
          <div class="luxe-cat__overlay">
            <h5>${MBHelpers.escapeHtml(item.category)}</h5>
            <p>${item.count} ta mahsulot</p>
          </div>
        </a>
      </div>
    `).join("");
  }
})();

function bindQuickAdd(products) {
  document.querySelectorAll(".js-add-card").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const product = products.find((item) => String(item.id) === String(this.dataset.id));
      if (!product) return;
      if (Number(product.stock ?? 999) <= 0) {
        alert("Sotuvda mavjud emas");
        return;
      }

      MBStore.addToCart({
        productId: product.id,
        qty: 1,
        size: (product.sizes && product.sizes[0]) || "",
        color: (product.colors && product.colors[0]) || "",
      });
      alert("Savatga qo'shildi");
    });
  });
}
