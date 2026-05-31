(async function () {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((r) => (s.onload = r));
  }

  let allProducts = [];

  function normalizedCategory(value) {
    return MBHelpers.normalizeCategory(value || "");
  }

  async function load() {
    allProducts = await MBHelpers.loadProducts({ forceRefresh: true });
    applyInitialCategoryFromUrl();
    applyFilter();
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = MBHelpers.emptyState("Admin paneldan mahsulot qo'shganingizdan keyin shu yerda chiqadi.");
      return;
    }

    grid.innerHTML = items.map((p) => MBHelpers.productCard(p, { showDescription: false })).join("");
    document.querySelectorAll(".js-add-card").forEach((btn) =>
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        const p = allProducts.find((x) => String(x.id) === String(this.dataset.id));
        if (!p) return;

        MBStore.addToCart({
          productId: p.id,
          qty: 1,
          size: (p.sizes && p.sizes[0]) || "",
          color: (p.colors && p.colors[0]) || "",
        });
        alert("Savatga qo'shildi");
      })
    );
  }

  function applyFilter() {
    const active = document.querySelector(".filter-btn.active");
    const selectedCategory = active ? normalizedCategory(active.dataset.category) : "";
    const q = (document.getElementById("shop-search").value || "").toLowerCase();

    const filtered = allProducts.filter((p) => {
      const pCategory = normalizedCategory(p.category);
      const categoryOk = !selectedCategory || pCategory === selectedCategory;
      const textOk =
        !q || [p.name, p.description, p.category, p.subcategory].join(" ").toLowerCase().includes(q);
      return categoryOk && textOk;
    });

    render(filtered);
  }

  function applyInitialCategoryFromUrl() {
    const urlCategory = new URLSearchParams(window.location.search).get("category");
    if (!urlCategory) return;

    const normalizedUrlCategory = normalizedCategory(urlCategory);
    const buttons = Array.from(document.querySelectorAll(".filter-btn"));
    const targetBtn = buttons.find((btn) => normalizedCategory(btn.dataset.category) === normalizedUrlCategory);
    if (!targetBtn) return;

    buttons.forEach((b) => b.classList.remove("active"));
    targetBtn.classList.add("active");
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      applyFilter();
    });
  });

  document.getElementById("shop-search").addEventListener("input", applyFilter);

  load();
})();
