// app.js (URLトリガー方式・最終版)

document.addEventListener('DOMContentLoaded', initializeApp);

// --- ▼▼▼ 設定項目 ▼▼▼ ---
const LIFF_ID = "2008199273-3ogv1YME";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyi5sU5X1-wk02FSCkkl8_k6xFS0ExLfKsmXQiN7-zNCcohRY5lRvJeaIyRdEL1g-Gq/exec";
// --- ▲▲▲ 設定項目 ▲▲▲ ---

// グローバル変数
let menuData = [];
let cart = [];
let userProfile = null;

// DOM要素のキャッシュ
const dom = {
  loading: document.getElementById('loading'),
  menuContainer: document.getElementById('menu-container'),
  cartFooter: document.getElementById('cart-footer'),
  viewCartButton: document.getElementById('view-cart-button'),
  cartItemCount: document.getElementById('cart-item-count'),
  cartTotalPrice: document.getElementById('cart-total-price'),
  cartModal: document.getElementById('cart-modal'),
  closeCartModal: document.getElementById('close-cart-modal'),
  cartItemsContainer: document.getElementById('cart-items-container'),
  cartModalTotalPrice: document.getElementById('cart-modal-total-price'),
  submitOrderButton: document.getElementById('submit-order-button'),
};

/**
 * アプリケーションの初期化
 */
async function initializeApp() {
  if (!LIFF_ID || !GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("貼り付け")) {
    showError("LIFF_ID または GAS_WEB_APP_URL が設定されていません。");
    return;
  }
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    userProfile = await liff.getProfile();
    setupEventListeners();
    await fetchMenu();
  } catch (err) {
    showError(`初期化に失敗しました: ${err.message}`);
  } finally {
    if (dom.loading) dom.loading.style.display = 'none';
  }
}

/**
 * イベントリスナーをまとめて設定
 */
function setupEventListeners() {
  dom.viewCartButton.addEventListener('click', openCartModal);
  dom.closeCartModal.addEventListener('click', closeCartModal);
  dom.submitOrderButton.addEventListener('click', confirmAndSubmitOrder);
  dom.cartModal.addEventListener('click', (e) => {
    if (e.target === dom.cartModal) {
      closeCartModal();
    }
  });
}

/**
 * GASからメニューデータを取得
 */
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

/**
 * メニューを画面に表示
 */
function displayMenu() {
  dom.menuContainer.innerHTML = ''; // スケルトンローダーをクリア
  menuData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.innerHTML = `
      <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}" loading="lazy">
      <div class="item-info">
        <p class="item-name">${item.name}</p>
        <p class="item-price">¥${item.prices.regular}〜</p>
      </div>
    `;
    card.onclick = () => showAddToCartModal(item);
    dom.menuContainer.appendChild(card);
  });
}

/**
 * カート追加用のモーダル（簡易版）
 */
function showAddToCartModal(item) {
  const selectedOption = {
    key: 'regular',
    name: '普通盛り',
    price: item.prices.regular
  };
  addToCart(item, selectedOption, 1);
}

/**
 * カートに商品を追加
 */
function addToCart(item, option, quantity) {
  const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id && cartItem.option.key === option.key);
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      option: option,
      quantity: quantity,
      price: option.price
    });
  }
  updateCartView();
}

/**
 * カートの表示を更新 (フッター)
 */
function updateCartView() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  dom.cartItemCount.textContent = totalItems;
  dom.cartTotalPrice.textContent = totalPrice;
  dom.cartModalTotalPrice.textContent = totalPrice;
  dom.viewCartButton.disabled = cart.length === 0;
}

/**
 * カートモーダルを開く
 */
function openCartModal() {
  renderCartItems();
  dom.cartModal.classList.add('visible');
}

/**
 * カートモーダルを閉じる
 */
function closeCartModal() {
  dom.cartModal.classList.remove('visible');
}

/**
 * カートモーダルの中身を描画
 */
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
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-meta">${item.option.name}</p>
        <p class="cart-item-price">¥${item.price * item.quantity}</p>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateItemQuantity(${index}, -1)">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateItemQuantity(${index}, 1)">+</button>
        </div>
        <button class="remove-item-btn" onclick="removeItemFromCart(${index})">&times;</button>
      </div>
    `;
    dom.cartItemsContainer.appendChild(itemEl);
  });
  updateCartView();
}

/**
 * カート内の商品の数量を変更
 */
window.updateItemQuantity = (index, change) => {
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  renderCartItems();
};

/**
 * カートから商品を削除
 */
window.removeItemFromCart = (index) => {
  cart.splice(index, 1);
  renderCartItems();
};

/**
 * 注文を確定し、サーバーに送信する
 */
async function confirmAndSubmitOrder() {
  dom.submitOrderButton.disabled = true;
  dom.submitOrderButton.textContent = '処理中...';

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const orderData = {
    userId: userProfile.userId,
    displayName: userProfile.displayName,
    cart: cart.map(item => ({ name: item.name, option: item.option, quantity: item.quantity })),
    totalPrice: totalPrice,
  };
  
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'サーバーでエラーが発生しました。');
    }
    
    alert('ご注文ありがとうございました！');
    if (liff.isInClient()) {
      liff.closeWindow();
    }

  } catch (err) {
    alert(`注文処理中にエラーが発生しました: ${err.message}`);
    dom.submitOrderButton.disabled = false;
    dom.submitOrderButton.textContent = '注文を確定する';
  }
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
  dom.loading.innerHTML = `<p style="color: red; padding: 20px;">${message}</p>`;
  dom.loading.style.display = 'flex';
}
