(async function () {
  const rootNew = document.getElementById("new-products");
  const rootFeatured = document.getElementById("featured-products");
  if (!rootNew) return;

  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((r) => (s.onload = r));
  }

  const list = await MBHelpers.loadProducts({ forceRefresh: true });

  if (!list.length) {
    const empty = MBHelpers.emptyState("Admin paneldan birinchi mahsulotni qo'shing.");
    rootNew.innerHTML = empty;
    if (rootFeatured) rootFeatured.innerHTML = empty;
    return;
  }

  rootNew.innerHTML = list
    .slice(0, 8)
    .map((p) => MBHelpers.productCard(p, { showDescription: false }))
    .join("");
  if (rootFeatured) {
    rootFeatured.innerHTML = list
      .slice(0, 8)
      .map((p) => MBHelpers.productCard(p, { showDescription: false }))
      .join("");
  }
  bindQuickAdd(list);
})();

function bindQuickAdd(products) {
  document.querySelectorAll(".js-add-card").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const p = products.find((x) => String(x.id) === String(this.dataset.id));
      if (!p) return;

      MBStore.addToCart({
        productId: p.id,
        qty: 1,
        size: (p.sizes && p.sizes[0]) || "",
        color: (p.colors && p.colors[0]) || "",
      });
      alert("Savatga qo'shildi");
    });
  });
}
