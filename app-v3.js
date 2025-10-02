
// 即時実行関数でグローバルスコープの汚染を防ぐ
(() => {
    'use strict';

    // --- ▼▼▼ 設定項目 ▼▼▼ ---
    const LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】Step 2でコピーしたGASのウェブアプリURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyiE9U28j-lQgrgYMfD3nV0JbFNAULBvw6sOLTijfGEUxRK3s8C6dPiwKYXAvIsTAF3/exec";
    // --- ▲▲▲ 設定項目 ▲▲▲ ---

    // --- グローバル変数 ---
    let menuData = [];
    let cart = [];
    let currentItem = null;

    // --- DOM要素のキャッシュ ---
    const dom = {
        loadingIndicator: document.getElementById('loading-indicator'),
        menuContainer: document.getElementById('menu-container'),
        // アイテム詳細モーダル
        itemModalBackdrop: document.getElementById('item-modal-backdrop'),
        itemModal: document.getElementById('item-modal'),
        modalImage: document.getElementById('modal-image'),
        modalName: document.getElementById('modal-name'),
        modalDescription: document.getElementById('modal-description'),
        optionSelector: document.getElementById('option-selector'),
        quantityDisplay: document.getElementById('quantity'),
        modalPrice: document.getElementById('modal-price'),
        // カート確認モーダル
        cartModalBackdrop: document.getElementById('cart-modal-backdrop'),
        cartSummaryList: document.getElementById('cart-summary-list'),
        cartSummaryTotalPrice: document.getElementById('cart-summary-total-price'),
        confirmOrderButton: document.getElementById('confirm-order-button'),
        // フッター
        cartItemCount: document.getElementById('cart-item-count'),
        cartTotalPrice: document.getElementById('cart-total-price'),
        showCartButton: document.getElementById('show-cart-button'),
    };

    // --- アプリケーション初期化 ---
    document.addEventListener('DOMContentLoaded', initializeApp);

    function initializeApp() {
        if (!LIFF_ID || GAS_API_URL.includes("ここに")) {
            showError("LIFF_IDまたはGAS_API_URLが設定されていません。");
            return;
        }

        liff.init({ liffId: LIFF_ID })
            .then(fetchMenuData)
            .catch(err => {
                console.error("LIFFの初期化に失敗しました", err);
                showError(`LIFFの初期化に失敗しました: ${err.message}`);
            });
        
        setupEventListeners();
    }
    
    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        // 商品モーダル
        dom.itemModalBackdrop.addEventListener('click', (e) => {
            if (e.target === dom.itemModalBackdrop) closeItemModal();
        });
        document.getElementById('close-item-modal-button').addEventListener('click', closeItemModal);
        document.getElementById('decrease-qty').addEventListener('click', () => updateQuantity(-1));
        document.getElementById('increase-qty').addEventListener('click', () => updateQuantity(1));
        document.getElementById('add-to-cart-button').addEventListener('click', addToCart);
        
        // カートモーダル
        dom.showCartButton.addEventListener('click', openCartModal);
        dom.cartModalBackdrop.addEventListener('click', (e) => {
            if (e.target === dom.cartModalBackdrop) closeCartModal();
        });
        document.getElementById('close-cart-modal-button').addEventListener('click', closeCartModal);
        document.getElementById('close-cart-button').addEventListener('click', closeCartModal);
        dom.confirmOrderButton.addEventListener('click', submitOrder);
    }

    // --- メニュー処理 ---
    async function fetchMenuData() {
        try {
            const response = await fetch(GAS_API_URL);
            if (!response.ok) throw new Error(`サーバーエラー: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.details || data.error);
            
            menuData = data;
            displayMenu();
            dom.loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error("メニューの取得に失敗しました", error);
            showError(`メニューの取得に失敗しました: ${error.message}`);
        }
    }

    function displayMenu() {
        dom.menuContainer.innerHTML = '';
        menuData.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item';
            itemElement.innerHTML = `
                <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}">
                <div class="item-info">
                    <p class="item-name">${item.name}</p>
                    <p class="item-price">¥${item.price_regular || ' -'}</p>
                </div>
            `;
            itemElement.addEventListener('click', () => openItemModal(item));
            dom.menuContainer.appendChild(itemElement);
        });
    }
    
    // --- 商品詳細モーダル処理 ---
    function openItemModal(item) {
        currentItem = item;
        dom.modalImage.src = item.imageUrl || 'https://placehold.co/400x240/eee/ccc?text=No+Image';
        dom.modalName.textContent = item.name;
        dom.modalDescription.textContent = item.description || '';

        const options = [
            { key: 'regular', name: '普通盛り', price: item.price_regular },
            { key: 'large', name: '大盛り', price: item.price_large },
            { key: 'side_only', name: 'おかずのみ', price: item.price_side_only },
        ];

        dom.optionSelector.innerHTML = '';
        let isFirstOption = true;
        options.forEach(opt => {
            if (opt.price > 0) {
                const checked = isFirstOption ? 'checked' : '';
                const selected = isFirstOption ? 'selected' : '';
                dom.optionSelector.innerHTML += `
                    <label class="option-item ${selected}" onclick="selectOption(this)">
                        <input type="radio" name="price_option" value="${opt.key}" data-price="${opt.price}" class="hidden" ${checked}>
                        <span>${opt.name}</span>
                        <span class="font-bold">¥${opt.price}</span>
                    </label>
                `;
                isFirstOption = false;
            }
        });

        dom.quantityDisplay.textContent = '1';
        updateModalPrice();
        dom.itemModalBackdrop.classList.add('visible');
    }
    
    window.selectOption = (labelElement) => {
        document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
        labelElement.classList.add('selected');
        labelElement.querySelector('input[type="radio"]').checked = true;
        updateModalPrice();
    };

    function closeItemModal() {
        dom.itemModalBackdrop.classList.remove('visible');
    }

    function updateQuantity(change) {
        let qty = parseInt(dom.quantityDisplay.textContent, 10) + change;
        if (qty < 1) qty = 1;
        dom.quantityDisplay.textContent = qty;
        updateModalPrice();
    }
    
    function updateModalPrice() {
        const selOpt = document.querySelector('input[name="price_option"]:checked');
        const qty = parseInt(dom.quantityDisplay.textContent, 10);
        const price = selOpt ? parseInt(selOpt.dataset.price, 10) * qty : 0;
        dom.modalPrice.textContent = price;
    }

    // --- カート処理 ---
    function addToCart() {
        const selOptEl = document.querySelector('input[name="price_option"]:checked');
        if (!currentItem || !selOptEl) return;
        
        const qty = parseInt(dom.quantityDisplay.textContent, 10);
        const selOpt = {
            key: selOptEl.value,
            name: selOptEl.parentElement.querySelector('span').textContent,
            price: parseInt(selOptEl.dataset.price, 10)
        };
        
        cart.push({
            id: currentItem.id,
            name: currentItem.name,
            quantity: qty,
            option: selOpt,
            totalPrice: selOpt.price * qty
        });

        updateCartView();
        closeItemModal();
    }

    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

        dom.cartItemCount.textContent = totalItems;
        dom.cartTotalPrice.textContent = totalPrice;
        dom.showCartButton.disabled = cart.length === 0;
    }
    
    function openCartModal() {
        if (cart.length === 0) return;
        
        dom.cartSummaryList.innerHTML = '';
        cart.forEach((item, index) => {
            dom.cartSummaryList.innerHTML += `
                <div class="cart-list-item">
                    <div class="cart-list-item-details">
                        <p class="item-name">${item.name}</p>
                        <p class="item-meta">${item.option.name} x ${item.quantity}</p>
                    </div>
                    <div class="cart-list-item-actions">
                        <span class="item-total">¥${item.totalPrice}</span>
                        <button class="remove-button" onclick="window.removeCartItem(${index})">&times;</button>
                    </div>
                </div>
            `;
        });

        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        dom.cartSummaryTotalPrice.textContent = `¥${totalPrice}`;
        dom.cartModalBackdrop.classList.add('visible');
    }

    function closeCartModal() {
        dom.cartModalBackdrop.classList.remove('visible');
    }
    
    window.removeCartItem = (index) => {
        cart.splice(index, 1);
        updateCartView();
        if (cart.length > 0) {
            openCartModal(); // ビューを再描画
        } else {
            closeCartModal();
        }
    };
    
    // --- ★★★【最重要】注文処理（修正済み）★★★ ---
    async function submitOrder() {
        setOrderButtonState(true, '処理中...');

        try {
            if (!liff.isLoggedIn()) {
                alert("LINEにログインしてください。");
                liff.login();
                setOrderButtonState(false, '注文を確定する');
                return;
            }

            const profile = await liff.getProfile();
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            const orderDetails = cart.map(item => 
                `${item.name} (${item.option.name}) x ${item.quantity}`
            ).join('\n');

            const orderData = {
                userId: profile.userId,
                displayName: profile.displayName,
                orderDetails: orderDetails,
                totalPrice: totalPrice
            };

            // GASへ注文データを送信
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                throw new Error(`サーバーでエラーが発生しました: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                await sendConfirmationMessage(orderDetails, totalPrice);
                
                alert('ご注文ありがとうございました！');
                resetApp();

                if (liff.isInClient()) {
                    liff.closeWindow();
                }
            } else {
                throw new Error(result.error || '注文処理に失敗しました');
            }

        } catch (error) {
            console.error("注文処理に失敗しました", error);
            alert(`注文処理に失敗しました: ${error.message}`);
            setOrderButtonState(false, '注文を確定する');
        }
    }
    
    async function sendConfirmationMessage(orderDetails, totalPrice) {
        if (!liff.isInClient()) return;
        try {
            const message = `ご注文ありがとうございます。\n\n【注文内容】\n${orderDetails}\n\n合計金額: ${totalPrice}円`;
            await liff.sendMessages([{ type: 'text', text: message }]);
        } catch (msgError) {
            console.error('LINEメッセージの送信に失敗しました', msgError);
            alert('確認メッセージの送信には失敗しましたが、注文は受け付けられています。');
        }
    }

    // --- ヘルパー関数 ---
    function showError(message) {
        dom.loadingIndicator.innerHTML = `<p style="color: red;">${message}</p>`;
        dom.loadingIndicator.style.display = 'block';
    }

    function setOrderButtonState(disabled, text) {
        dom.confirmOrderButton.disabled = disabled;
        dom.confirmOrderButton.textContent = text;
    }

    function resetApp() {
        cart = [];
        updateCartView();
        closeCartModal();
    }

})();

