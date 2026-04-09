window.MBHelpers = {
  normalizeCategory(value) {
    const raw = String(value || "")
      .toLowerCase()
      .replace(/[’`']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const map = {
      futbolkalar: "Futbolkalar",
      Aksesuarlar: "Aksesuarlar",
      "ustki kiyimlar": "Ustki kiyimlar",
      shimlar: "Shimlar",
      "oyoq kiyimlar": "Oyoq kiyimlar",
      "bosh kiyimlar": "Bosh kiyimlar",
    };

    return map[raw] || (value || "");
  },
  toList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return [];

      let splitter = /,\s*/;
      if (!raw.includes(",")) {
        splitter = /\s+va\s+/i;
      }
      if (!raw.includes(",") && !/\s+va\s+/i.test(raw)) {
        splitter = /\s+/;
      }

      const tokens = raw
        .split(splitter)
        .map((item) => item.trim())
        .filter(Boolean);

      const expanded = [];
      tokens.forEach((token) => {
        const range = token.match(/^(\d+)\s*[\-\u2010-\u2015\u2212]\s*(\d+)$/);
        if (range) {
          const start = Number(range[1]);
          const end = Number(range[2]);
          if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 30) {
            for (let n = start; n <= end; n += 1) expanded.push(String(n));
            return;
          }
        }

        const uzRange = token.match(/^(\d+)\s*dan\s*(\d+)\s*gacha$/i);
        if (uzRange) {
          const start = Number(uzRange[1]);
          const end = Number(uzRange[2]);
          if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 30) {
            for (let n = start; n <= end; n += 1) expanded.push(String(n));
            return;
          }
        }

        expanded.push(token);
      });

      return [...new Set(expanded)];
    }
    return [];
  },
  normalizeProduct(product) {
    const images = this.toList(product.images);
    if (product.image) images.unshift(product.image);

    return {
      ...product,
      category: this.normalizeCategory(product.category),
      image: product.image || images[0] || "img/placeholders/product.svg",
      images: images.length ? images : ["img/placeholders/product.svg"],
      description: product.description || product.desc || "",
      sizes: this.toList(product.sizes),
      colors: this.toList(product.colors),
    };
  },
  currency(value) {
    const num = Number(value || 0);
    return num.toLocaleString("uz-UZ") + " so'm";
  },
  productCard(product, options = {}) {
    const normalized = this.normalizeProduct(product);
    const showDescription = options.showDescription !== false;
    const image = normalized.images[0];
    const oldPrice = Number(normalized.oldPrice) > 0 ? `<span class="product__oldprice">${this.currency(normalized.oldPrice)}</span>` : "";
    const descriptionHtml = showDescription ? `<p>${normalized.description}</p>` : "";

    return `
      <div class="col-lg-3 col-md-4 col-sm-6">
        <div class="product__item">
          <a href="product-details.html?id=${normalized.id}" class="product__item__pic" style="background-image:url('${image}')">
            <div class="label">${normalized.badge || "Yangi"}</div>
          </a>
          <div class="product__item__text">
            <h6><a href="product-details.html?id=${normalized.id}">${normalized.name || "Mahsulot"}</a></h6>
            ${descriptionHtml}
            <div class="product__price">${this.currency(normalized.price)} ${oldPrice}</div>
            <div class="product__links">
              <a class="link-btn js-add-card" href="#" data-id="${normalized.id}">Savatga qo'shish</a>
            </div>
          </div>
        </div>
      </div>`;
  },
  emptyState(message) {
    return `<div class="col-12"><div class="empty-state"><img src="img/placeholders/product.svg" alt="placeholder"><h5>Hozircha mahsulot yo'q</h5><p>${message}</p></div></div>`;
  }
};
