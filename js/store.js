(function () {
  const CART_KEY = 'mujskoy_cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCounters();
  }
  function addToCart(item) {
    const cart = getCart();
    const found = cart.find(x => x.productId === item.productId && x.size === item.size && x.color === item.color);
    if (found) found.qty += item.qty;
    else cart.push(item);
    saveCart(cart);
  }
  function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }
  function updateQty(index, qty) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
  }
  function clearCart() {
    saveCart([]);
  }
  function updateCartCounters() {
    const count = getCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    document.querySelectorAll('.js-cart-count').forEach(el => el.textContent = count);
  }
  window.MBStore = { getCart, saveCart, addToCart, removeFromCart, updateQty, clearCart, updateCartCounters };
  document.addEventListener('DOMContentLoaded', updateCartCounters);
})();
