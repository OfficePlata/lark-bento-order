// app.js (Flex Message対応版)

document.addEventListener('DOMContentLoaded', initializeApp);

// --- ▼▼▼ 設定項目 ▼▼▼ ---
const LIFF_ID = "2008199273-3ogv1YME"; // ご自身のLIFF IDに書き換えてください
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxuAfe8aumpDo4JUSaWcVlr6QWVmOnjWW2RK48it9OuEJPK_1uXpFu_eFuBQjGJfjPU/exec"; // ご自身のGAS URLに書き換えてください
// --- ▲▲▲ 設定項目 ▲▲▲ ---

// (グローバル変数、DOM要素キャッシュは変更なし)
let menuData = [];
let cart = [];
let userProfile = null;
const dom = { /* ... */ };


// (initializeApp, setupEventListeners, fetchMenu, displayMenu, showAddToCartModal, addToCart, updateCartView, openCartModal, closeCartModal, renderCartItems, updateItemQuantity, removeItemFromCart, confirmAndSubmitOrder は変更ありません)
// ... (省略) ...


// ★★★ ここから変更 ★★★

/**
 * ユーザーにLINEでサンクスメッセージを送信（Flex Message版）
 * @param {object} orderData - 注文データ
 */
async function sendThanksMessage(orderData) {
    if (!liff.isInClient()) return;

    // Flex MessageのJSONオブジェクトを生成
    const flexMessage = createReceiptFlexMessage(orderData);

    try {
        await liff.sendMessages([flexMessage]); // 配列に格納して送信
    } catch (err) {
        console.error('メッセージの送信に失敗しました:', err);
        alert('確認メッセージの送信には失敗しましたが、ご注文は受け付けられております。');
    }
}

/**
 * 注文データからレシート風のFlex Messageを生成する
 * @param {object} orderData - 注文データ
 * @returns {object} Flex Message JSON Object
 */
function createReceiptFlexMessage(orderData) {
    // 注文内容の詳細部分を動的に生成
    const itemDetailsContents = orderData.cart.map(item => ({
        "type": "box",
        "layout": "horizontal",
        "contents": [
            {
                "type": "text",
                "text": `${item.name} (${item.option.name})`,
                "wrap": true,
                "flex": 3
            },
            {
                "type": "text",
                "text": `x ${item.quantity}`,
                "flex": 1,
                "align": "end"
            }
        ]
    }));

    // Flex Messageの本体
    return {
        "type": "flex",
        "altText": "ご注文内容の確認",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "ご注文ありがとうございます！",
                        "weight": "bold",
                        "color": "#1DB446",
                        "size": "md"
                    },
                    {
                        "type": "text",
                        "text": "ご注文内容が確定しました",
                        "weight": "bold",
                        "size": "xl",
                        "margin": "md"
                    }
                ]
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "ご注文内容",
                        "size": "xs",
                        "color": "#aaaaaa"
                    },
                    {
                        "type": "separator",
                        "margin": "md"
                    },
                    // ここに動的に生成した注文内容が入る
                    ...itemDetailsContents,
                    {
                        "type": "separator",
                        "margin": "lg"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "合計金額",
                                "weight": "bold"
                            },
                            {
                                "type": "text",
                                "text": `¥${orderData.totalPrice}`,
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "md"
                    }
                ]
            },
            "styles": {
                "header": {
                    "backgroundColor": "#F0FFF0"
                }
            }
        }
    };
}

// ★★★ ここまで変更 ★★★


// (showError関数は変更なし)
function showError(message) { /* ... */ }


/* 以下、変更のない関数群です。コードをすべて置き換える場合はこちらも含めてください。*/

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
    if(dom.loading) dom.loading.style.display = 'none';
  }
}

function setupEventListeners() {
    dom.viewCartButton = document.getElementById('view-cart-button');
    dom.cartModal = document.getElementById('cart-modal');
    dom.closeCartModal = document.getElementById('close-cart-modal');
    dom.submitOrderButton = document.getElementById('submit-order-button');
    
    dom.viewCartButton.addEventListener('click', openCartModal);
    dom.closeCartModal.addEventListener('click', closeCartModal);
    dom.submitOrderButton.addEventListener('click', confirmAndSubmitOrder);
    dom.cartModal.addEventListener('click', (e) => {
        if (e.target === dom.cartModal) closeCartModal();
    });
}

async function fetchMenu() {
    dom.loading = document.getElementById('loading');
    dom.menuContainer = document.getElementById('menu-container');
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
        card.onclick = () => showAddToCartModal(item);
        dom.menuContainer.appendChild(card);
    });
}

function showAddToCartModal(item) {
    const selectedOption = {
        key: 'regular',
        name: '普通盛り',
        price: item.prices.regular
    };
    addToCart(item, selectedOption, 1);
}

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
    dom.cartItemCount = document.getElementById('cart-item-count');
    dom.cartTotalPrice = document.getElementById('cart-total-price');
    dom.cartModalTotalPrice = document.getElementById('cart-modal-total-price');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    dom.cartItemCount.textContent = totalItems;
    dom.cartTotalPrice.textContent = totalPrice;
    dom.cartModalTotalPrice.textContent = totalPrice;

    dom.viewCartButton.disabled = cart.length === 0;
}

function openCartModal() {
    dom.cartItemsContainer = document.getElementById('cart-items-container');
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
        await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        await sendThanksMessage(orderData);
        alert('ご注文ありがとうございました！');
        liff.closeWindow();

    } catch (err) {
        alert(`注文処理中にエラーが発生しました: ${err.message}`);
        dom.submitOrderButton.disabled = false;
        dom.submitOrderButton.textContent = '注文を確定する';
    }
}
