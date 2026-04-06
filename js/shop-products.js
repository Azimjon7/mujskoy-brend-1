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

  async function load() {
    const res = await fetch("/api/products");
    const data = await res.json();
    allProducts = (Array.isArray(data) ? data : []).map((p) => MBHelpers.normalizeProduct(p));
    render(allProducts);
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = MBHelpers.emptyState("Admin paneldan mahsulot qo'shganingizdan keyin shu yerda chiqadi.");
      return;
    }

    grid.innerHTML = items.map((p) => MBHelpers.productCard(p)).join("");
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
    const category = active ? active.dataset.category : "";
    const q = (document.getElementById("shop-search").value || "").toLowerCase();

    const filtered = allProducts.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || [p.name, p.description, p.category, p.subcategory].join(" ").toLowerCase().includes(q))
    );

    render(filtered);
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
