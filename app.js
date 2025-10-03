document.addEventListener('DOMContentLoaded', initializeApp);

// --- ▼▼▼ 設定項目 ▼▼▼ ---
const LIFF_ID = "2008199273-3ogv1YME"; // ご自身のLIFF IDに書き換えてください
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxiBqWGuGsZIAvkEFOgWJkodL9lYngLYioboQf0BSj-PIrNb1GQBiWpG8QG9OHX47Q0/exec"; // ご自身のGAS URLに書き換えてください
// --- ▲▲▲ 設定項目 ▲▲▲ ---

let menuData = [];
let cart = [];
let userProfile = null;
const dom = {}; // DOM要素をキャッシュするオブジェクト

async function initializeApp() {
  if (!LIFF_ID || !GAS_WEB_APP_URL) {
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
    if(dom.loading) dom.loading.style.display = 'none';
  }
}

function setupEventListeners() {
    // 汎用DOM要素
    dom.loading = document.getElementById('loading');
    dom.menuContainer = document.getElementById('menu-container');

    // カートフッター関連
    dom.viewCartButton = document.getElementById('view-cart-button');
    dom.cartItemCount = document.getElementById('cart-item-count');
    dom.cartTotalPrice = document.getElementById('cart-total-price');

    // カートモーダル関連
    dom.cartModal = document.getElementById('cart-modal');
    dom.closeCartModal = document.getElementById('close-cart-modal');
    dom.submitOrderButton = document.getElementById('submit-order-button');
    dom.cartItemsContainer = document.getElementById('cart-items-container');
    dom.cartModalTotalPrice = document.getElementById('cart-modal-total-price');
    
    // ★★商品詳細モーダル関連★★
    dom.itemDetailModal = document.getElementById('item-detail-modal');
    dom.closeItemDetailModal = document.getElementById('close-item-detail-modal');
    dom.itemDetailName = document.getElementById('item-detail-name');
    dom.itemDetailImg = document.getElementById('item-detail-img');
    dom.itemDetailDescription = document.getElementById('item-detail-description');
    dom.itemDetailOptions = document.getElementById('item-detail-options');
    dom.itemDetailQuantity = document.getElementById('item-detail-quantity');
    dom.itemDetailDecrease = document.getElementById('item-detail-decrease');
    dom.itemDetailIncrease = document.getElementById('item-detail-increase');
    dom.addToCartButton = document.getElementById('add-to-cart-button');

    // イベントリスナー設定
    dom.viewCartButton.addEventListener('click', openCartModal);
    dom.closeCartModal.addEventListener('click', closeCartModal);
    dom.submitOrderButton.addEventListener('click', confirmAndSubmitOrder);
    dom.cartModal.addEventListener('click', (e) => {
        if (e.target === dom.cartModal) closeCartModal();
    });

    // ★★商品詳細モーダルのイベントリスナー★★
    dom.closeItemDetailModal.addEventListener('click', closeItemDetailModal);
    dom.itemDetailModal.addEventListener('click', (e) => {
        if (e.target === dom.itemDetailModal) closeItemDetailModal();
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
        <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}">
        <div class="item-info">
            <p class="item-name">${item.name}</p>
            <p class="item-price">¥${item.prices.regular}〜</p>
        </div>
    `;
    // ★変更点: クリックで詳細モーダルを開く
    card.onclick = () => showItemDetailModal(item);
    dom.menuContainer.appendChild(card);
  });
}

// ★★★ ここからが新しい機能の中核です ★★★

function showItemDetailModal(item) {
    // 1. モーダルに商品情報を設定
    dom.itemDetailName.textContent = item.name;
    dom.itemDetailImg.src = item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image';
    dom.itemDetailDescription.textContent = item.description || '商品説明がありません。';

    // 2. オプション選択肢を動的に生成
    dom.itemDetailOptions.innerHTML = '';
    const options = [
        { key: 'regular', name: '普通盛り', price: item.prices.regular },
        { key: 'large', name: '大盛り', price: item.prices.large },
        { key: 'sideOnly', name: 'おかずのみ', price: item.prices.sideOnly }
    ];

    let isFirstOption = true;
    options.forEach(opt => {
        // 価格が有効なもの（0より大きい）だけを表示
        if (opt.price && opt.price > 0) {
            const label = document.createElement('label');
            label.className = 'option-label';
            label.innerHTML = `
                <span>${opt.name}</span>
                <span class="option-price">¥${opt.price}</span>
                <input type="radio" name="price-option" value="${opt.key}" data-name="${opt.name}" data-price="${opt.price}">
            `;
            if (isFirstOption) {
                label.querySelector('input').checked = true;
                isFirstOption = false;
            }
            dom.itemDetailOptions.appendChild(label);
        }
    });

    // 3. 数量をリセットし、イベントリスナーを再設定
    let quantity = 1;
    dom.itemDetailQuantity.textContent = quantity;
    
    // cloneNodeでリスナーの重複を防ぐ
    const newDecreaseBtn = dom.itemDetailDecrease.cloneNode(true);
    dom.itemDetailDecrease.parentNode.replaceChild(newDecreaseBtn, dom.itemDetailDecrease);
    dom.itemDetailDecrease = newDecreaseBtn;
    dom.itemDetailDecrease.onclick = () => {
        if (quantity > 1) {
            quantity--;
            dom.itemDetailQuantity.textContent = quantity;
        }
    };

    const newIncreaseBtn = dom.itemDetailIncrease.cloneNode(true);
    dom.itemDetailIncrease.parentNode.replaceChild(newIncreaseBtn, dom.itemDetailIncrease);
    dom.itemDetailIncrease = newIncreaseBtn;
    dom.itemDetailIncrease.onclick = () => {
        quantity++;
        dom.itemDetailQuantity.textContent = quantity;
    };
    
    // 4. 「カートに追加」ボタンのイベントリスナーを再設定
    const newAddToCartBtn = dom.addToCartButton.cloneNode(true);
    dom.addToCartButton.parentNode.replaceChild(newAddToCartBtn, dom.addToCartButton);
    dom.addToCartButton = newAddToCartBtn;
    dom.addToCartButton.onclick = () => {
        const selectedOptionEl = dom.itemDetailOptions.querySelector('input[name="price-option"]:checked');
        if (!selectedOptionEl) {
            alert('サイズを選択してください。');
            return;
        }
        const selectedOption = {
            key: selectedOptionEl.value,
            name: selectedOptionEl.dataset.name,
            price: parseInt(selectedOptionEl.dataset.price, 10)
        };
        addToCart(item, selectedOption, quantity);
        closeItemDetailModal();
    };

    // 5. モーダルを表示
    dom.itemDetailModal.classList.add('visible');
}

function closeItemDetailModal() {
    dom.itemDetailModal.classList.remove('visible');
}

// ★★★ ここまで ★★★


// --- カート関連の関数 (既存のロジックをそのまま利用) ---

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

// グローバルスコープに関数を公開
window.updateItemQuantity = (index, change) => {
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
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
    totalPrice: totalPrice,
  };
  try {
    // GASへの送信
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    // サンクスFlex Messageを送信
    await sendThanksMessage(orderData);
    alert('ご注文ありがとうございました！');
    liff.closeWindow();
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
        "type": "box", "layout": "horizontal",
        "contents": [
            { "type": "text", "text": `${item.name} (${item.option.name})`, "wrap": true, "flex": 3 },
            { "type": "text", "text": `x ${item.quantity}`, "flex": 1, "align": "end" }
        ]
    }));
    return {
        "type": "flex", "altText": "ご注文内容の確認",
        "contents": {
            "type": "bubble",
            "header": { "type": "box", "layout": "vertical", "contents": [
                { "type": "text", "text": "ご注文ありがとうございます！", "weight": "bold", "color": "#1DB446", "size": "md" },
                { "type": "text", "text": "ご注文内容が確定しました", "weight": "bold", "size": "xl", "margin": "md" }
            ]},
            "body": { "type": "box", "layout": "vertical", "contents": [
                { "type": "text", "text": "ご注文内容", "size": "xs", "color": "#aaaaaa" },
                { "type": "separator", "margin": "md" },
                ...itemDetailsContents,
                { "type": "separator", "margin": "lg" },
                { "type": "box", "layout": "horizontal", "contents": [
                    { "type": "text", "text": "合計金額", "weight": "bold" },
                    { "type": "text", "text": `¥${orderData.totalPrice}`, "weight": "bold", "align": "end" }
                ], "margin": "md"}
            ]},
            "styles": { "header": { "backgroundColor": "#F0FFF0" }}
        }
    };
}

function showError(message) {
    console.error(message);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.innerHTML = `<p style="color: red;">エラー: ${message}</p>`;
        loadingEl.style.display = 'flex';
    }
}
