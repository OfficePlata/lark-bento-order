document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw-t5n0nfXrFzOt5L5tw1NTDnJe7zEvQKBi9cEh4jVknjRk2qeSj3QhLS8nzYPXf70e/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---
    // (これより下の部分は変更不要です)
    let menuData = [];
    let cart = [];
    let currentItem = null;
    const loadingIndicator = document.getElementById('loading-indicator');
    const menuContainer = document.getElementById('menu-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const confirmOrderButton = document.getElementById('confirm-order-button');
    const addToCartButton = document.getElementById('add-to-cart-button');
    const modalCloseButton = document.getElementById('modal-close-button');
    const decreaseQtyButton = document.getElementById('decrease-qty');
    const increaseQtyButton = document.getElementById('increase-qty');

    liff.init({ liffId: MAIN_LIFF_ID })
        .then(() => {
            console.log("LIFF initialized.");
            fetchMenuData();
        })
        .catch((err) => { 
            console.error("LIFF init failed.", err);
            loadingIndicator.textContent = "LIFF初期化失敗";
        });

    async function fetchMenuData() {
        if (GAS_API_URL === "YOUR_FINAL_GAS_URL_HERE") {
            loadingIndicator.textContent = "GAS_API_URLが設定されていません。";
            return;
        }
        try {
            const response = await fetch(GAS_API_URL);
            if (!response.ok) {
                throw new Error(`サーバー応答エラー: ${response.status}`);
            }
            menuData = await response.json();
            if (menuData.error) {
                throw new Error(menuData.error);
            }
            displayMenu(menuData);
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error("Fetch menu failed:", error);
            loadingIndicator.textContent = `メニュー読込失敗: ${error.message}`;
        }
    }

    function displayMenu(items) {
        menuContainer.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'grid-item';
            itemElement.innerHTML = `
                <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}">
                <div class="item-info">
                    <p class="item-name">${item.name}</p>
                    <p class="item-price">¥${item.price_regular}</p>
                </div>
            `;
            itemElement.addEventListener('click', () => openModal(item));
            menuContainer.appendChild(itemElement);
        });
    }

    function openModal(item) {
        currentItem = item;
        document.getElementById('modal-name').textContent = item.name;
        document.getElementById('modal-description').textContent = item.description || '';
        document.getElementById('modal-image').src = item.imageUrl || 'https://placehold.co/400x240/eee/ccc?text=No+Image';

        const optionSelector = document.getElementById('option-selector');
        optionSelector.innerHTML = '';
        const options = [
            { key: 'regular', name: '普通盛り', price: item.price_regular },
            { key: 'large', name: '大盛り', price: item.price_large },
            { key: 'small', name: '小盛り', price: item.price_side_only },
            { key: 'side_only', name: 'おかずのみ', price: item.price_side_only },
        ];
        options.forEach((opt, index) => {
            if (opt.price !== undefined) {
                const checked = index === 0 ? 'checked' : '';
                optionSelector.innerHTML += `<div class="option-item"><input type="radio" id="opt_${opt.key}" name="price_option" value="${opt.key}" data-price="${opt.price}" ${checked}><label for="opt_${opt.key}">${opt.name} (¥${opt.price})</label></div>`;
            }
        });
        document.getElementsByName('price_option').forEach(r => r.addEventListener('change', updateModalPrice));
        document.getElementById('quantity').textContent = '1';
        updateModalPrice();
        modalBackdrop.classList.add('visible');
    }

    function closeModal() {
        modalBackdrop.classList.remove('visible');
    }

    function updateModalPrice() {
        const selOpt = document.querySelector('input[name="price_option"]:checked');
        const qty = parseInt(document.getElementById('quantity').textContent, 10);
        if (selOpt) {
            document.getElementById('modal-price').textContent = parseInt(selOpt.dataset.price, 10) * qty;
        }
    }

    decreaseQtyButton.addEventListener('click', () => {
        let qty = parseInt(document.getElementById('quantity').textContent, 10);
        if (qty > 1) {
            document.getElementById('quantity').textContent = --qty;
            updateModalPrice();
        }
    });
    increaseQtyButton.addEventListener('click', () => {
        let qty = parseInt(document.getElementById('quantity').textContent, 10);
        document.getElementById('quantity').textContent = ++qty;
        updateModalPrice();
    });

    addToCartButton.addEventListener('click', () => {
        const selOptEl = document.querySelector('input[name="price_option"]:checked');
        const qty = parseInt(document.getElementById('quantity').textContent, 10);
        if (!currentItem || !selOptEl) return;
        const selOpt = {
            key: selOptEl.value,
            name: document.querySelector(`label[for="opt_${selOptEl.value}"]`).textContent.split(' ')[0],
            price: parseInt(selOptEl.dataset.price, 10)
        };
        cart.push({ id: currentItem.id, name: currentItem.name, quantity: qty, option: selOpt, totalPrice: selOpt.price * qty });
        updateCartView();
        closeModal();
    });

    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        document.getElementById('cart-item-count').textContent = totalItems;
        document.getElementById('cart-total-price').textContent = totalPrice;
        confirmOrderButton.disabled = cart.length === 0;
    }

    async function submitOrder() {
        if (cart.length === 0) return;
        confirmOrderButton.disabled = true;
        confirmOrderButton.textContent = '注文処理中...';

        try {
            if (!liff.isLoggedIn()) {
                liff.login();
                return; 
            }
            
            const profile = await liff.getProfile();
            const userId = profile.userId;
            const displayName = profile.displayName;

            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            const confirmationMessage = `ご注文ありがとうございます！\n\n---ご注文内容---\n${orderDetailsText.trim()}\n\n合計金額: ${totalPrice}円\n\nご注文を受け付けました。準備ができましたら、改めてご連絡いたします。`;

            // --- ▼▼▼ ここを修正しました (ご提示のロジックを反映) ▼▼▼ ---
            try {
                // liff.sendMessagesが利用可能かチェック
                if (liff.isApiAvailable('sendMessages')) {
                    await liff.sendMessages([{ type: 'text', text: confirmationMessage }]);
                } else {
                    // LINEクライアント外、またはAPIが利用不可の場合はコンソールに警告を出す
                    console.warn('LINEメッセージは送信されません (LINEクライアント外、またはAPIが利用不可)');
                }
            } catch (messageError) {
                // メッセージ送信に失敗した場合のエラーハンドリング
                console.error(`LINEメッセージの送信に失敗しました。Error: ${messageError.message}`);
                // 注文処理は続行するため、ここではエラーをスローしない
            }
            // --- ▲▲▲ 修正ここまで ▲▲▲ ---

            const orderId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 8);
            const orderDate = new Date().toLocaleDateString('ja-JP');
            const payload = {
                fldYjlldjn: orderId, fldYLRXpXN: userId, fld9MWY8Pv: displayName,
                fldqDpai9t: displayName, flduAKumTJ: orderDetailsText.trim(),
                fldY9IGZIs: totalPrice, fld1Yss0c8: orderDate
            };

            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                mode: 'cors' 
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`GASへの通信に失敗しました。サーバー応答エラー: ${response.status}. Response: ${errorText}`);
            }
            const result = await response.json();

            if (result.status === 'success') {
                alert('ご注文が完了しました。');
                liff.closeWindow();
            } else {
                throw new Error(result.message || 'Lark Baseへの書き込みに失敗しました (GASからのエラー)。');
            }
        } catch (error) {
            alert(`注文処理中にエラーが発生しました。\n\n詳細: ${error.message}\n\nお手数ですが、お店に直接ご連絡ください。`);
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
        }
    }

    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    confirmOrderButton.addEventListener('click', submitOrder);
});
