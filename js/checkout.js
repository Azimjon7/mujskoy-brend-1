(function () {
  let checkoutItems = [];
  let checkoutSubtotal = 0;
  let checkoutTotal = 0;
  let appliedPromo = null;

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("uz-UZ") + " so'm";
  }

  function setCheckoutMessage(text, type) {
    const msg = document.getElementById("checkoutMessage");
    if (!msg) return;
    msg.innerHTML = '<span class="checkout-msg checkout-msg--' + type + '">' + text + "</span>";
  }

  function getSelectedPaymentType() {
    const picked = document.querySelector('input[name="paymentType"]:checked');
    return picked ? picked.value : "naqd";
  }

  function syncPaymentUI() {
    const wrap = document.getElementById("paymentScreenshotWrap");
    const file = document.getElementById("paymentScreenshot");
    if (!wrap) return;
    if (getSelectedPaymentType() === "karta") {
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
      if (file) file.value = "";
    }
  }

  function buildItemMeta(item) {
    const parts = [];
    if (item.size) parts.push("O'lcham: " + item.size);
    if (item.color) parts.push("Rang: " + item.color);
    if (!parts.length) return "";
    return '<small class="checkout-item-meta">' + parts.join(" | ") + "</small>";
  }

  function renderCheckoutSummary() {
    const summary = document.getElementById("checkoutSummary");
    if (!summary) return;

    const qtyTotal = checkoutItems.reduce((sum, item) => sum + item.qty, 0);
    const itemsHtml = checkoutItems
      .map((item, index) =>
        '<div class="checkout-summary-row">' +
        '<div><p>' + (index + 1) + ". " + item.name + " x " + item.qty + "</p>" +
        buildItemMeta(item) + "</div>" +
        "<strong>" + formatMoney(item.lineTotal) + "</strong></div>"
      )
      .join("");

    const discountHtml = appliedPromo
      ? '<div class="checkout-total-row"><span>Chegirma (' + appliedPromo.code + ')</span><strong>-' + formatMoney(appliedPromo.discountAmount) + "</strong></div>"
      : "";

    summary.innerHTML =
      '<div class="checkout-summary-head"><span>Mahsulot</span><span>Narx</span></div>' +
      '<div class="checkout-summary-list">' + itemsHtml + "</div>" +
      '<div class="checkout-total-row"><span>Jami mahsulot</span><strong>' + qtyTotal + " ta</strong></div>" +
      '<div class="checkout-total-row"><span>Oraliq summa</span><strong>' + formatMoney(checkoutSubtotal) + "</strong></div>" +
      discountHtml +
      '<div class="checkout-total-row checkout-grand-total"><span>Umumiy summa</span><strong>' + formatMoney(checkoutTotal) + "</strong></div>";
  }

  async function initCheckout() {
    const summary = document.getElementById("checkoutSummary");
    const cart = MBStore.getCart();

    if (!cart.length) {
      summary.innerHTML = '<p class="checkout-empty">Savatingiz bo\'sh. <a class="checkout-empty__link" href="shop.html">Do\'konga o\'tish</a></p>';
      return;
    }

    const products = await MBHelpers.loadProducts({ forceRefresh: true });
    checkoutItems = cart.map((item) => {
      const product = products.find((p) => String(p.id) === String(item.productId)) || {};
      const price = Number(product.price || 0);
      const qty = Math.max(1, Number(item.qty || 1));
      const stock = Number(product.stock ?? 999);
      const safeQty = Math.min(qty, Math.max(0, stock));
      return {
        productId: item.productId,
        name: product.name || "Mahsulot",
        size: item.size || "",
        color: item.color || "",
        qty: safeQty,
        price,
        lineTotal: price * safeQty,
      };
    }).filter((item) => item.qty > 0);

    if (!checkoutItems.length) {
      summary.innerHTML = '<p class="checkout-empty">Tanlangan mahsulot sotuvda mavjud emas. <a class="checkout-empty__link" href="shop.html">Do\'konga o\'tish</a></p>';
      return;
    }

    checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0);
    checkoutTotal = checkoutSubtotal;
    renderCheckoutSummary();
  }

  async function applyPromoCode() {
    const code = document.getElementById("promoCode").value.trim();
    const message = document.getElementById("promoMessage");
    const applyBtn = document.getElementById("applyPromoBtn");

    if (!code) {
      message.innerHTML = '<span class="checkout-msg checkout-msg--error">Promokod kiriting.</span>';
      return;
    }

    applyBtn.disabled = true;
    applyBtn.classList.add("is-loading");
    applyBtn.textContent = "Tekshirilmoqda...";

    try {
      const res = await fetch("/api/promocodes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: checkoutSubtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Promokod ishlamadi");
      appliedPromo = data;
      checkoutTotal = data.total;
      message.innerHTML = '<span class="checkout-msg checkout-msg--success">Promokod qo\'llandi.</span>';
      renderCheckoutSummary();
    } catch (error) {
      appliedPromo = null;
      checkoutTotal = checkoutSubtotal;
      message.innerHTML = '<span class="checkout-msg checkout-msg--error">' + (error.message || "Promokod ishlamadi") + "</span>";
      renderCheckoutSummary();
    } finally {
      applyBtn.disabled = false;
      applyBtn.classList.remove("is-loading");
      applyBtn.textContent = "Qo'llash";
    }
  }

  async function submitOrder() {
    if (!checkoutItems.length) {
      setCheckoutMessage("Savatingiz bo'sh.", "error");
      return;
    }

    const paymentType = getSelectedPaymentType();
    const screenshotFile = document.getElementById("paymentScreenshot").files[0];
    const payload = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      note: document.getElementById("note").value.trim(),
      total: checkoutTotal,
      subtotal: checkoutSubtotal,
      promoCode: appliedPromo ? appliedPromo.code : "",
      items: checkoutItems,
      paymentType,
    };

    if (!payload.name || !payload.phone || !payload.address) {
      setCheckoutMessage("Ism, telefon va manzil majburiy.", "error");
      return;
    }

    if (paymentType === "karta" && !screenshotFile) {
      setCheckoutMessage("Karta to'lovi uchun skrinshot yuklang.", "error");
      return;
    }

    const requestOptions = { method: "POST" };
    if (paymentType === "karta") {
      const formData = new FormData();
      Object.keys(payload).forEach((key) => {
        if (key === "items") return;
        formData.append(key, String(payload[key] ?? ""));
      });
      formData.append("items", JSON.stringify(checkoutItems));
      formData.append("itemsJson", JSON.stringify(checkoutItems));
      checkoutItems.forEach((item, index) => {
        Object.keys(item).forEach((key) => {
          formData.append("items[" + index + "][" + key + "]", String(item[key] ?? ""));
        });
      });
      if (screenshotFile) formData.append("paymentScreenshot", screenshotFile);
      requestOptions.body = formData;
    } else {
      requestOptions.headers = { "Content-Type": "application/json" };
      requestOptions.body = JSON.stringify({ ...payload, paymentType: "naqd" });
    }

    const submitBtn = document.getElementById("submitOrderBtn");
    const previousText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitBtn.textContent = "Yuborilmoqda...";

    try {
      const res = await fetch("/api/orders", requestOptions);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Buyurtma yuborilmadi.");
      MBStore.clearCart();
      const order = data.order || {};
      window.location.href =
        "success.html?orderId=" + encodeURIComponent(order.id || "") +
        "&date=" + encodeURIComponent(order.createdAt || "") +
        "&total=" + encodeURIComponent(order.total || checkoutTotal);
    } catch (error) {
      setCheckoutMessage(error.message || "Xatolik yuz berdi. Qayta urinib ko'ring.", "error");
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.textContent = previousText;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="paymentType"]').forEach((el) => el.addEventListener("change", syncPaymentUI));
    const promoBtn = document.getElementById("applyPromoBtn");
    const submitBtn = document.getElementById("submitOrderBtn");
    if (promoBtn) promoBtn.addEventListener("click", applyPromoCode);
    if (submitBtn) submitBtn.addEventListener("click", submitOrder);
    syncPaymentUI();
    initCheckout();
  });
})();
