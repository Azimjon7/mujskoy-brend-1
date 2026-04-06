(async function () {
  const root = document.getElementById("product-detail-root");
  if (!root) return;

  if (!window.MBHelpers) {
    const s = document.createElement("script");
    s.src = "js/helpers.js";
    document.body.appendChild(s);
    await new Promise((r) => (s.onload = r));
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = '<div class="empty-state"><h5>Mahsulot tanlanmagan</h5><p>Do\'kon sahifasidan mahsulot tanlang.</p></div>';
    return;
  }

  const res = await fetch("/api/products/" + id);
  if (!res.ok) {
    root.innerHTML = '<div class="empty-state"><h5>Mahsulot topilmadi</h5></div>';
    return;
  }

  const p = MBHelpers.normalizeProduct(await res.json());
  const images = p.images.length ? p.images : ["img/placeholders/product.svg"];
  const sizesList = p.sizes.length ? p.sizes : ["Standart"];
  const colorsList = p.colors.length ? p.colors : ["Standart"];

  const sizes = sizesList
    .map(
      (size, i) =>
        `<label class="${i === 0 ? "active" : ""}"><input type="radio" name="size" value="${size}" ${i === 0 ? "checked" : ""}>${size}</label>`
    )
    .join("");

  const colors = colorsList
    .map(
      (color, i) =>
        `<label class="${i === 0 ? "active" : ""}"><input type="radio" name="color" value="${color}" ${i === 0 ? "checked" : ""}>${color}</label>`
    )
    .join("");

  root.innerHTML = `
    <div class="row">
      <div class="col-lg-6">
        <div class="product-gallery-main"><img id="main-product-image" src="${images[0]}" alt="${p.name}"></div>
        <div class="product-thumbs">${images.map((img, i) => `<img src="${img}" class="${i === 0 ? "active" : ""}" data-image="${img}" alt="thumb">`).join("")}</div>
      </div>
      <div class="col-lg-6">
        <div class="product-detail-card">
          <h3>${p.name}</h3>
          <p>${p.description || ""}</p>
          <div class="price-wrap"><strong>${Number(p.price).toLocaleString("uz-UZ")} so'm</strong>${Number(p.oldPrice) > 0 ? `<span class="product__oldprice">${Number(p.oldPrice).toLocaleString("uz-UZ")} so'm</span>` : ""}</div>
          <div class="option-group"><h6>Size</h6><div class="option-list" id="size-options">${sizes}</div></div>
          <div class="option-group"><h6>Rang</h6><div class="option-list" id="color-options">${colors}</div></div>
          <div class="qty-wrap"><span>Soni</span><input type="number" id="detail-qty" min="1" value="1"></div>
          <div class="option-group"><h6>Kargo</h6><p>${p.shipping || "Butun O'zbekiston bo'ylab"}</p></div>
          <div class="product__links">
            <a href="#" id="add-detail-cart" class="site-btn">Savatga qo'shish</a>
            <a href="shop.html" class="site-btn site-btn--ghost">Do'konga qaytish</a>
          </div>
          <div class="option-group"><h6>To'liq tavsif</h6><p>${p.fullDescription || p.description || ""}</p></div>
        </div>
      </div>
    </div>`;

  document.querySelectorAll(".product-thumbs img").forEach((img) =>
    img.addEventListener("click", function () {
      document.getElementById("main-product-image").src = this.dataset.image;
      document.querySelectorAll(".product-thumbs img").forEach((x) => x.classList.remove("active"));
      this.classList.add("active");
    })
  );

  document.querySelectorAll(".option-list label").forEach((label) => {
    label.addEventListener("click", function () {
      const parent = this.parentElement;
      parent.querySelectorAll("label").forEach((x) => x.classList.remove("active"));
      this.classList.add("active");
    });
  });

  document.getElementById("add-detail-cart").addEventListener("click", function (e) {
    e.preventDefault();
    const size = (document.querySelector('input[name="size"]:checked') || {}).value || "";
    const color = (document.querySelector('input[name="color"]:checked') || {}).value || "";
    const qty = Number(document.getElementById("detail-qty").value || 1);
    MBStore.addToCart({ productId: p.id, size, color, qty });
    alert("Savatga qo'shildi");
  });
})();
