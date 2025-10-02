// app.js (LIFFメッセージ送信方式・安定版)

document.addEventListener('DOMContentLoaded', initializeApp);

const LIFF_ID = "2008199273-3ogv1YME";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyi5sU5X1-wk02FSCkkl8_k6xFS0ExLfKsmXQiN7-zNCcohRY5lRvJeaIyRdEL1g-Gq/exec"; // ご自身のGAS URL

let menuData = [];
let cart = [];
let userProfile = null;
const dom = {}; // DOM要素はinitializeAppでキャッシュ

async function initializeApp() {
  // DOM要素のキャッシュ
  dom.loading = document.getElementById('loading');
  dom.menuContainer = document.getElementById('menu-container');
  dom.viewCartButton = document.getElementById('view-cart-button');
  dom.cartItemCount = document.getElementById('cart-item-count');
  dom.cartTotalPrice = document.getElementById('cart-total-price');
  dom.cartModal = document.getElementById('cart-modal');
  dom.closeCartModal = document.getElementById('close-cart-modal');
  dom.cartItemsContainer = document.getElementById('cart-items-container');
  dom.cartModalTotalPrice = document.getElementById('cart-modal-total-price');
  dom.submitOrderButton = document.getElementById('submit-order-button');
  
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    userProfile = await liff.getProfile();
    setupEventListeners();
    await fetchMenu();
  } catch (err) {
    showError(`初期化に失敗しました: ${err.message}`);
  } finally {
    if (dom.loading) dom.loading.style.display = 'none';
  }
}

function setupEventListeners() {
  dom.viewCartButton.addEventListener('click', openCartModal);
  dom.closeCartModal.addEventListener('click', closeCartModal);
  dom.submitOrderButton.addEventListener('click', confirmAndSubmitOrder);
  dom.cartModal.addEventListener('click', (e) => {
    if (e.target === dom.cartModal) closeCartModal();
  });
}

async function fetchMenu() {
  try {
    const response = await fetch(GAS_WEB_APP_URL);
    if (!response.ok) throw new Error(`サーバーエラー: ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    menuData = data;
    displayMenu();
  } catch (err) {
    showError(`メニューの取得に失敗しました: ${err.message}`);
  }
}

function displayMenu() {
  dom.menuContainer.innerHTML = '';
  menuData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.innerHTML = `
      <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}" loading="lazy">
      <div class="item-info">
        <p class="item-name">${item.name}</p>
        <p class="item-price">¥${item.prices.regular}〜</p>
      </div>`;
    card.onclick = () => showAddToCartModal(item);
    dom.menuContainer.appendChild(card);
  });
}

function showAddToCartModal(item) {
  const selectedOption = { key: 'regular', name: '普通盛り', price: item.prices.regular };
  addToCart(item, selectedOption, 1);
}

function addToCart(item, option, quantity) {
  const existingItemIndex = cart.findIndex(ci => ci.id === item.id && ci.option.key === option.key);
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({ id: item.id, name: item.name, option, quantity, price: option.price });
  }
  updateCartView();
}

function updateCartView() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  dom.cartItemCount.textContent = totalItems;
  dom.cartTotalPrice.textContent = totalPrice;
  dom.cartModalTotalPrice.textContent = totalPrice;
  dom.viewCartButton.disabled = cart.length === 0;
}

function openCartModal() {
  renderCartItems();
  dom.cartModal.classList.add('visible');
}

function closeCartModal() {
  dom.cartModal.classList.remove('visible');
}

function renderCartItems() {
  if (cart.length === 0) {
    dom.cartItemsContainer.innerHTML = '<p>カートは空です。</p>';
    dom.submitOrderButton.disabled = true;
    return;
  }
  dom.submitOrderButton.disabled = false;
  dom.cartItemsContainer.innerHTML = '';
  cart.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-details">
        <p class="cart-item-name">${item.name}</p><p class="cart-item-meta">${item.option.name}</p>
        <p class="cart-item-price">¥${item.price * item.quantity}</p>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateItemQuantity(${index}, -1)">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateItemQuantity(${index}, 1)">+</button>
        </div>
        <button class="remove-item-btn" onclick="removeItemFromCart(${index})">&times;</button>
      </div>`;
    dom.cartItemsContainer.appendChild(itemEl);
  });
  updateCartView();
}

window.updateItemQuantity = (index, change) => {
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  renderCartItems();
};

window.removeItemFromCart = (index) => {
  cart.splice(index, 1);
  renderCartItems();
};

async function confirmAndSubmitOrder() {
  dom.submitOrderButton.disabled = true;
  dom.submitOrderButton.textContent = '処理中...';
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderData = {
    userId: userProfile.userId,
    displayName: userProfile.displayName,
    cart: cart.map(item => ({ name: item.name, option: item.option, quantity: item.quantity })),
    totalPrice,
  };
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(orderData),
      headers: { 'Content-Type': 'application/json' },
    });
    await sendThanksMessage(orderData);
    alert('ご注文ありがとうございました！');
    if (liff.isInClient()) liff.closeWindow();
  } catch (err) {
    alert(`注文処理中にエラーが発生しました: ${err.message}`);
    dom.submitOrderButton.disabled = false;
    dom.submitOrderButton.textContent = '注文を確定する';
  }
}

async function sendThanksMessage(orderData) {
  if (!liff.isInClient()) return;
  const flexMessage = createReceiptFlexMessage(orderData);
  try {
    await liff.sendMessages([flexMessage]);
  } catch (err) {
    console.error('メッセージの送信に失敗しました:', err);
    alert('確認メッセージの送信には失敗しましたが、ご注文は受け付けられております。');
  }
}

function createReceiptFlexMessage(orderData) {
  const itemDetailsContents = orderData.cart.map(item => ({
    type: "box", layout: "horizontal",
    contents: [
      { type: "text", text: `${item.name} (${item.option.name})`, wrap: true, flex: 3 },
      { type: "text", text: `x ${item.quantity}`, flex: 1, align: "end" }
    ]
  }));
  return {
    type: "flex", altText: "ご注文内容の確認",
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "ご注文ありがとうございます！", weight: "bold", color: "#1DB446", size: "md" },
          { type: "text", text: "ご注文内容が確定しました", weight: "bold", size: "xl", margin: "md" }
        ]
      },
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "ご注文内容", size: "xs", color: "#aaaaaa" },
          { type: "separator", margin: "md" },
          ...itemDetailsContents,
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "horizontal", margin: "md",
            contents: [
              { type: "text", text: "合計金額", weight: "bold" },
              { type: "text", text: `¥${orderData.totalPrice}`, weight: "bold", align: "end" }
            ]
          }
        ]
      },
      styles: { header: { backgroundColor: "#F0FFF0" } }
    }
  };
}

function showError(message) {
  dom.loading.innerHTML = `<p style="color: red; padding: 20px;">${message}</p>`;
  dom.loading.style.display = 'flex';
}
