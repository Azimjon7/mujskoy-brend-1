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
    await renderCategoryFilters();
    applyInitialCategoryFromUrl();
    applyFilter();
  }

  async function renderCategoryFilters() {
    const wrap = document.querySelector(".shop-toolbar__filters");
    if (!wrap) return;

    let categories = [];
    try {
      categories = await MBHelpers.fetchJson(MBHelpers.apiUrl("/api/categories"));
    } catch (error) {
      categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];
    }

    const buttons = ['<button class="filter-btn active" data-category="">Barchasi</button>']
      .concat((Array.isArray(categories) ? categories : []).map((category) => {
        return `<button class="filter-btn" data-category="${category}">${category}</button>`;
      }));
    wrap.innerHTML = buttons.join("");
    bindFilterButtons();
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
        if (Number(p.stock ?? 999) <= 0) {
          alert("Sotuvda mavjud emas");
          return;
        }

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
    const availableOnly = Boolean(document.getElementById("shop-available") && document.getElementById("shop-available").checked);

    const filtered = allProducts.filter((p) => {
      const pCategory = normalizedCategory(p.category);
      const categoryOk = !selectedCategory || pCategory === selectedCategory;
      const textOk =
        !q || [p.name, p.description, p.category, p.subcategory, (p.sizes || []).join(" "), (p.colors || []).join(" ")].join(" ").toLowerCase().includes(q);
      const stockOk = !availableOnly || Number(p.stock ?? 999) > 0;
      return categoryOk && textOk && stockOk;
    });

    const sort = (document.getElementById('shop-sort') && document.getElementById('shop-sort').value) || '';
    if (sort === 'price_asc') {
      filtered.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
    } else if (sort === 'price_desc') {
      filtered.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
    } else if (sort === 'newest') {
      filtered.sort((a,b)=>{
        const ta = new Date(a.createdAt || a.createdAt || 0).getTime()||0;
        const tb = new Date(b.createdAt || b.createdAt || 0).getTime()||0;
        return tb - ta;
      });
    } else if (sort === 'rating') {
      filtered.sort((a,b)=>{
        const rb = Number(b.rating || 0);
        const ra = Number(a.rating || 0);
        if (rb !== ra) return rb - ra;
        return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
      });
    }

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

  function bindFilterButtons() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        applyFilter();
      });
    });
  }

  document.getElementById("shop-search").addEventListener("input", applyFilter);
  const sortEl = document.getElementById('shop-sort');
  if (sortEl) sortEl.addEventListener('change', applyFilter);
  const availableEl = document.getElementById('shop-available');
  if (availableEl) availableEl.addEventListener('change', applyFilter);

  load();
})();
