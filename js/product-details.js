(async function () {
  const app = document.getElementById("productDetailApp");
  if (!app) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("uz-UZ") + " so'm";
  }

  function renderStars(value) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    const full = Math.round(rating);
    return "&#9733;".repeat(full) + "&#9734;".repeat(5 - full);
  }

  function getOptions(value) {
    const list = Array.isArray(value) ? value : (window.MBHelpers ? MBHelpers.toList(value) : []);
    return list.length ? list : ["Standart"];
  }

  function selectedChip(group) {
    const active = document.querySelector(`.pd-chip[data-group="${group}"].active`);
    return active ? active.textContent.trim() : "";
  }

  function optionChips(items, group) {
    return `
      <div class="pd-option-list">
        ${items.map((item, index) => `
          <button class="pd-chip ${index === 0 ? "active" : ""}" type="button" data-group="${group}">
            ${escapeHtml(item)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function cleanFeatureText(value) {
    return String(value || "")
      .replace(/^[\s\-–—*•●▪▫✔✓✅☑]+/g, "")
      .replace(/^(Original model|Afzalliklari|Mos keladi|Qayerda kiyiladi|Kombinatsiya)[:\s]*/i, "")
      .replace(/âœ”ï¸|âœ”|â€¢|âœ¨|ðŸ’¯|ðŸ‘”|ðŸ‘•|ðŸ’¥|ðŸ‘Ÿ|ðŸ”¥|ðŸ˜Ž|ðŸŒ¬|ðŸ |ðŸŒ†|ðŸ–|ðŸ‘Œ|ðŸ‘/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[.:;,\s]+|[|;\s]+$/g, "")
      .trim();
  }

  function descriptionFeatures(value) {
    const raw = String(value || "").replace(/\r\n?/g, "\n").trim();
    if (!raw) return [];

    const normalized = raw
      .replace(/[✔✓✅☑•●▪▫]/g, "\n")
      .replace(/âœ”ï¸|âœ”|â€¢|âœ¨|ðŸ’¯|ðŸ‘”|ðŸ‘•|ðŸ’¥|ðŸ‘Ÿ|ðŸ”¥/g, "\n")
      .replace(/\s+[|;]\s+/g, "\n")
      .replace(/\n\s*[-–—*]+\s*/g, "\n");

    return [...new Set(normalized
      .split(/\n+/)
      .map(cleanFeatureText)
      .filter((item) => item && item.length > 2)
      .filter((item) => !/[:?]\s*$/.test(item))
    )].slice(0, 12);
  }

  function descriptionHtml(value) {
    const features = descriptionFeatures(value);
    if (features.length >= 2) {
      return `<ul class="pd-feature-list">${features.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }

    const text = cleanFeatureText(value || "");
    return `<p class="pd-about-text">${escapeHtml(text || "Bu mahsulot haqida batafsil ma'lumot tez orada qo'shiladi.")}</p>`;
  }

  function addToCart(product) {
    const stock = Number(product.stock ?? 999);
    const qty = Math.max(1, Number(document.getElementById("qtyInput").value || 1));
    const message = document.getElementById("pdMessage");

    if (stock <= 0) {
      message.textContent = "Bu mahsulot sotuvda mavjud emas.";
      return false;
    }

    if (qty > stock) {
      message.textContent = "Omborda buncha mahsulot yo'q.";
      return false;
    }

    MBStore.addToCart({
      productId: product.id,
      qty,
      size: selectedChip("size"),
      color: selectedChip("color"),
    });

    message.textContent = "Mahsulot savatga qo'shildi.";
    return true;
  }

  function setRatingSummary(reviews, fallbackRating, fallbackCount) {
    const row = document.getElementById("pdRatingRow");
    if (!row) return;

    const count = Array.isArray(reviews) ? reviews.length : Number(fallbackCount || 0);
    const average = count && Array.isArray(reviews)
      ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / count
      : Number(fallbackRating || 0);

    if (!count || !average) {
      row.innerHTML = "<span class=\"pd-rating-muted\">Sharhlar hali yo'q</span>";
      return;
    }

    row.innerHTML = `
      <span class="pd-rating-stars">${renderStars(average)}</span>
      <span>${average.toFixed(1)} (${count} ta sharh)</span>
    `;
  }

  function reviewImageHtml(images) {
    const list = Array.isArray(images) ? images : [];
    if (!list.length) return "";
    return `
      <div class="pd-review-images">
        ${list.map((src) => `
          <button type="button" class="pd-review-image" data-image="${escapeHtml(src)}">
            <img src="${escapeHtml(src)}" alt="Sharh rasmi">
          </button>
        `).join("")}
      </div>
    `;
  }

  function bindReviewImageModal() {
    document.querySelectorAll(".pd-review-image").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = document.getElementById("reviewImageModal");
        const image = document.getElementById("reviewImageModalImg");
        if (!modal || !image) return;
        image.src = button.dataset.image;
        modal.classList.add("is-open");
      });
    });
  }

  async function loadReviews(id, product) {
    const list = document.getElementById("reviewsList");
    if (!list) return;

    try {
      const reviews = await MBHelpers.fetchJson(MBHelpers.apiUrl(`/api/products/${encodeURIComponent(id)}/reviews`));
      setRatingSummary(reviews, product.rating, product.reviewCount);

      if (!reviews.length) {
        list.innerHTML = "<div class=\"pd-message\">Hozircha sharh yo'q.</div>";
        return;
      }

      list.innerHTML = reviews.map((item) => `
        <article class="pd-review-card">
          <div class="pd-review-head">
            <div>
              <strong>${escapeHtml(item.name || "Mijoz")}</strong>
              <span>${item.createdAt ? new Date(item.createdAt).toLocaleDateString("uz-UZ") : ""}</span>
            </div>
            <div class="pd-review-stars">${renderStars(item.rating)}</div>
          </div>
          <p>${escapeHtml(item.review || "")}</p>
          ${reviewImageHtml(item.images)}
        </article>
      `).join("");
      bindReviewImageModal();
    } catch (error) {
      setRatingSummary([], product.rating, product.reviewCount);
      list.innerHTML = "<div class=\"pd-message\">Sharhlarni yuklab bo'lmadi.</div>";
    }
  }

  function bindReviewForm(id, product) {
    const form = document.getElementById("reviewForm");
    if (!form) return;

    const files = document.getElementById("reviewImages");
    const preview = document.getElementById("reviewImagePreview");
    const message = document.getElementById("reviewMessage");

    files.addEventListener("change", () => {
      const selected = Array.from(files.files || []).slice(0, 5);
      if ((files.files || []).length > 5) {
        message.textContent = "5 tagacha rasm yuklash mumkin.";
      }
      preview.innerHTML = selected.map((file) => `
        <span class="pd-upload-preview">${escapeHtml(file.name)}</span>
      `).join("");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "";

      const name = document.getElementById("reviewName").value.trim();
      const text = document.getElementById("reviewText").value.trim();
      const rating = document.getElementById("reviewRating").value;

      if (!name || !text) {
        message.textContent = "Ism va sharh yozing.";
        return;
      }

      const fd = new FormData();
      fd.append("name", name);
      fd.append("rating", rating);
      fd.append("review", text);
      Array.from(files.files || []).slice(0, 5).forEach((file) => fd.append("images", file));

      try {
        const res = await fetch(MBHelpers.apiUrl(`/api/products/${encodeURIComponent(id)}/reviews`), {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Sharh yuborilmadi");
        form.reset();
        preview.innerHTML = "";
        message.textContent = "Sharhingiz qabul qilindi.";
        await loadReviews(id, product);
      } catch (error) {
        message.textContent = error.message || "Xatolik yuz berdi.";
      }
    });
  }

  function bindRelatedQuickAdd(products) {
    document.querySelectorAll(".js-add-card").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const product = products.find((item) => String(item.id) === String(btn.dataset.id));
        if (!product || Number(product.stock ?? 999) <= 0) {
          alert("Sotuvda mavjud emas");
          return;
        }

        MBStore.addToCart({
          productId: product.id,
          qty: 1,
          size: "",
          color: "",
        });
        alert("Savatga qo'shildi");
      });
    });
  }

  async function loadRelatedProducts(id) {
    const root = document.getElementById("relatedProducts");
    if (!root) return;

    try {
      const products = await MBHelpers.fetchJson(MBHelpers.apiUrl(`/api/products/${encodeURIComponent(id)}/related`));
      if (!Array.isArray(products) || !products.length) {
        root.innerHTML = '<div class="pd-message">O\'xshash mahsulotlar topilmadi.</div>';
        return;
      }
      root.innerHTML = products.map((product) => MBHelpers.productCard(product, { showDescription: false })).join("");
      bindRelatedQuickAdd(products);
    } catch (error) {
      root.innerHTML = '<div class="pd-message">O\'xshash mahsulotlarni yuklab bo\'lmadi.</div>';
    }
  }

  function bindGallery(images) {
    const main = document.getElementById("pdMainImage");
    const thumbs = Array.from(document.querySelectorAll(".pd-thumb"));
    const prev = document.getElementById("pdPrevImage");
    const next = document.getElementById("pdNextImage");
    let activeIndex = 0;

    function setImage(index) {
      if (!images.length) return;
      activeIndex = (index + images.length) % images.length;
      main.src = images[activeIndex];
      thumbs.forEach((thumb, i) => thumb.classList.toggle("active", i === activeIndex));
    }

    thumbs.forEach((thumb, index) => thumb.addEventListener("click", () => setImage(index)));
    if (prev) prev.addEventListener("click", () => setImage(activeIndex - 1));
    if (next) next.addEventListener("click", () => setImage(activeIndex + 1));
    if (images.length <= 1) {
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
    }
  }

  function renderProduct(product) {
    const images = product.images && product.images.length ? product.images : ["img/placeholders/product.svg"];
    const sizes = getOptions(product.sizes);
    const colors = getOptions(product.colors);
    const stock = Number(product.stock ?? 999);
    const inStock = stock > 0;
    const oldPrice = Number(product.oldPrice || 0);
    const price = Number(product.price || 0);
    const discount = oldPrice > price && price > 0
      ? `<span class="pd-discount">-${Math.round(((oldPrice - price) / oldPrice) * 100)}%</span>`
      : "";
    const label = inStock ? (product.label || product.badge || "Mahsulot") : "Sotuvda mavjud emas";

    app.innerHTML = `
      <div class="pd-layout">
        <section class="pd-gallery">
          <div class="pd-image-box">
            <button type="button" class="pd-image-nav prev" id="pdPrevImage" aria-label="Oldingi rasm">&lt;</button>
            <img id="pdMainImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name || "Mahsulot")}">
            <button type="button" class="pd-image-nav next" id="pdNextImage" aria-label="Keyingi rasm">&gt;</button>
          </div>
          <div class="pd-thumbs">
            ${images.map((img, index) => `<button type="button" class="pd-thumb ${index === 0 ? "active" : ""}"><img src="${escapeHtml(img)}" alt="Mahsulot rasmi"></button>`).join("")}
          </div>
        </section>

        <section class="pd-info-box">
          <div class="pd-badge">${escapeHtml(label)}</div>
          <h1 class="pd-title">${escapeHtml(product.name || "")}</h1>
          <div id="pdRatingRow" class="pd-rating-row"></div>

          <div class="pd-price-wrap">
            <strong class="pd-price">${formatPrice(product.price)}</strong>
            ${oldPrice ? `<span class="pd-old-price">${formatPrice(oldPrice)}</span>` : ""}
            ${discount}
          </div>

          <div class="pd-control-panel">
            <div class="pd-options">
              <div class="pd-label">O'lcham</div>
              ${optionChips(sizes, "size")}
            </div>
            <div class="pd-options">
              <div class="pd-label">Rang</div>
              ${optionChips(colors, "color")}
            </div>
            <div class="pd-qty-wrap">
              <label class="pd-label" for="qtyInput">Soni</label>
              <input id="qtyInput" class="pd-qty-input" type="number" min="1" ${inStock ? `max="${stock}"` : ""} value="1">
            </div>
          </div>

          <div class="pd-meta-grid">
            <div class="pd-info-card"><span>Omborda</span><strong>${inStock ? stock + " ta mavjud" : "Sotuvda mavjud emas"}</strong></div>
            <div class="pd-info-card"><span>Yetkazish</span><strong>O'zbekiston bo'ylab tez yetkazish</strong></div>
            <div class="pd-info-card"><span>To'lov</span><strong>Naqd yoki karta orqali</strong></div>
            <div class="pd-info-card"><span>Kategoriya</span><strong>${escapeHtml(product.category || "-")}</strong></div>
          </div>

          <div class="pd-actions">
            <button class="pd-btn pd-btn-primary" id="addToCartBtn" ${inStock ? "" : "disabled"}>Savatga qo'shish</button>
            <button class="pd-btn pd-btn-dark" id="buyNowBtn" ${inStock ? "" : "disabled"}>Hozir olish</button>
          </div>
          <div id="pdMessage" class="pd-message"></div>
        </section>
      </div>

      <section class="pd-section">
        <h2 class="pd-section-title">Mahsulot haqida</h2>
        <div class="pd-about-card">${descriptionHtml(product.desc || product.description || "")}</div>
      </section>

      <section class="pd-section pd-reviews">
        <div class="pd-section-heading">
          <h2 class="pd-section-title">Sharhlar</h2>
        </div>
        <div id="reviewsList" class="pd-reviews-list"><div class="pd-message">Sharhlar yuklanmoqda...</div></div>
        <form id="reviewForm" class="pd-review-form">
          <div class="pd-review-form-grid">
            <input id="reviewName" type="text" placeholder="Ismingiz" autocomplete="name">
            <select id="reviewRating" aria-label="Reyting">
              <option value="5">5 yulduz</option>
              <option value="4">4 yulduz</option>
              <option value="3">3 yulduz</option>
              <option value="2">2 yulduz</option>
              <option value="1">1 yulduz</option>
            </select>
          </div>
          <textarea id="reviewText" placeholder="Sharhingiz"></textarea>
          <label class="pd-file-label" for="reviewImages">Rasm yuklash (5 tagacha)</label>
          <input id="reviewImages" type="file" accept="image/*" multiple>
          <div id="reviewImagePreview" class="pd-upload-previews"></div>
          <button class="pd-btn pd-btn-primary" type="submit">Sharh qoldirish</button>
          <div id="reviewMessage" class="pd-message"></div>
        </form>
      </section>

      <section class="pd-section">
        <h2 class="pd-section-title">O'xshash mahsulotlar</h2>
        <div id="relatedProducts" class="row related-products"><div class="pd-message">Mahsulotlar yuklanmoqda...</div></div>
      </section>

      <div id="reviewImageModal" class="pd-modal" aria-hidden="true">
        <button type="button" class="pd-modal-close" aria-label="Yopish">&times;</button>
        <img id="reviewImageModalImg" src="" alt="Sharh rasmi">
      </div>
    `;

    document.querySelectorAll(".pd-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.dataset.group;
        document.querySelectorAll(`.pd-chip[data-group="${group}"]`).forEach((item) => item.classList.remove("active"));
        chip.classList.add("active");
      });
    });

    document.getElementById("addToCartBtn").addEventListener("click", () => addToCart(product));
    document.getElementById("buyNowBtn").addEventListener("click", () => {
      if (addToCart(product)) window.location.href = "checkout.html";
    });
    document.querySelector(".pd-modal-close").addEventListener("click", () => {
      document.getElementById("reviewImageModal").classList.remove("is-open");
    });
    document.getElementById("reviewImageModal").addEventListener("click", (event) => {
      if (event.target.id === "reviewImageModal") event.currentTarget.classList.remove("is-open");
    });

    bindGallery(images);
    setRatingSummary([], product.rating, product.reviewCount);
    bindReviewForm(product.id, product);
    loadReviews(product.id, product);
    loadRelatedProducts(product.id);
  }

  function initBackButton() {
    const backBtn = document.getElementById("pdBackBtn");
    if (!backBtn) return;
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "shop.html";
      }
    });
  }

  initBackButton();

  if (!productId) {
    app.innerHTML = '<div class="pd-error">Mahsulot tanlanmagan.<br><a href="shop.html">Do\'konga qaytish</a></div>';
    return;
  }

  try {
    const product = await MBHelpers.loadProductById(productId);
    if (!product) throw new Error("Mahsulot topilmadi");
    renderProduct(product);
  } catch (error) {
    app.innerHTML = '<div class="pd-error">Mahsulot topilmadi.<br><a href="shop.html">Do\'konga qaytish</a></div>';
  }
})();
