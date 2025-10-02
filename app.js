// app.js

document.addEventListener('DOMContentLoaded', initializeApp);

// --- ▼▼▼ 設定項目 ▼▼▼ ---
const LIFF_ID = "2008199273-3ogv1YME";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyi5sU5X1-wk02FSCkkl8_k6xFS0ExLfKsmXQiN7-zNCcohRY5lRvJeaIyRdEL1g-Gq/exec";
// --- ▲▲▲ 設定項目 ▲▲▲ ---

// グローバル変数
let menuData = [];
let cart = []; // カートの中身を保持する配列
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
    // 1. LIFFの初期化
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    
    // 2. ユーザープロファイルの取得
    userProfile = await liff.getProfile();

    // 3. イベントリスナーの設定
    setupEventListeners();

    // 4. メニューデータを取得して表示
    await fetchMenu();
    
  } catch (err) {
    showError(`初期化に失敗しました: ${err.message}`);
  } finally {
    dom.loading.style.display = 'none';
  }
}

/**
 * イベントリスナーをまとめて設定
 */
function setupEventListeners() {
    dom.viewCartButton.addEventListener('click', openCartModal);
    dom.closeCartModal.addEventListener('click', closeCartModal);
    dom.submitOrderButton.addEventListener('click', confirmAndSubmitOrder);
    // モーダルの外側をクリックしたら閉じる
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
        // カードクリックで商品をカートに追加するモーダルを開く
        card.onclick = () => showAddToCartModal(item);
        dom.menuContainer.appendChild(card);
    });
}

/**
 * カート追加用のモーダル（ここでは簡易的にダイアログを使用）
 */
function showAddToCartModal(item) {
    // 選択肢を生成
    let optionsHtml = '';
    if (item.prices.regular) optionsHtml += `<option value="regular" data-price="${item.prices.regular}">普通盛り (¥${item.prices.regular})</option>`;
    if (item.prices.large) optionsHtml += `<option value="large" data-price="${item.prices.large}">大盛り (¥${item.prices.large})</option>`;
    if (item.prices.sideOnly) optionsHtml += `<option value="sideOnly" data-price="${item.prices.sideOnly}">おかずのみ (¥${item.prices.sideOnly})</option>`;
    
    // SweetAlert2などのライブラリを使うとよりリッチなUIになりますが、ここでは標準機能で実装します。
    // 今回は簡易化のため、普通盛りを1つ追加する機能とします。
    // より複雑なUIが必要な場合は、HTML/CSSでモーダルを別途作成します。
    
    // ここでは一番シンプルな「普通盛り」をカートに追加する例
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
    // カート内に同じ商品IDとオプションが既にあるか探す
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id && cartItem.option.key === option.key);

    if (existingItemIndex > -1) {
        // あれば数量を増やす
        cart[existingItemIndex].quantity += quantity;
    } else {
        // なければ新しいアイテムとして追加
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
 * @param {number} index - カート配列のインデックス
 * @param {number} change - 変更量 (+1 or -1)
 */
window.updateItemQuantity = (index, change) => {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        // 数量が0以下になったら削除
        cart.splice(index, 1);
    }
    renderCartItems();
};

/**
 * カートから商品を削除
 * @param {number} index - カート配列のインデックス
 */
window.removeItemFromCart = (index) => {
    cart.splice(index, 1);
    renderCartItems();
};

/**
 * 注文を確定し、サーバーに送信する
 */
async function confirmAndSubmitOrder() {
    // 注文ボタンを無効化して二重送信を防ぐ
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
            mode: 'no-cors', // doPostを叩くためのおまじない
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        // no-corsモードではレスポンスの中身を確認できないが、POSTが成功したと見なす
        
        // ユーザーにサンクスメッセージを送信
        await sendThanksMessage(orderData);
        
        alert('ご注文ありがとうございました！');
        
        // LIFFアプリを閉じる
        liff.closeWindow();

    } catch (err) {
        alert(`注文処理中にエラーが発生しました: ${err.message}`);
        // エラーが発生したらボタンを元に戻す
        dom.submitOrderButton.disabled = false;
        dom.submitOrderButton.textContent = '注文を確定する';
    }
}

/**
 * ユーザーにLINEでサンクスメッセージを送信
 * @param {object} orderData - 注文データ
 */
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

/**
 * エラーメッセージを表示
 * @param {string} message - 表示するメッセージ
 */
function showError(message) {
    dom.loading.innerHTML = `<p style="color: red; padding: 20px;">${message}</p>`;
    dom.loading.style.display = 'flex';
}
