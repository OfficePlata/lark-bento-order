document.addEventListener('DOMContentLoaded', function() {
    // --- 設定項目 ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME"; 
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyAL3Ctz_nZ4Ca5lfVJeO7_HaUTHSp5iRth1R2ypCIKiC0Ctq99OSj8HsmhdIFz6B2m/exec";
    // --- 設定項目ここまで ---

    // グローバル変数
    let menuData = [];
    let cart = [];
    let currentItem = null;

    // DOM要素
    const loadingIndicator = document.getElementById('loading-indicator');
    const menuContainer = document.getElementById('menu-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const confirmOrderButton = document.getElementById('confirm-order-button');
    const addToCartButton = document.getElementById('add-to-cart-button');
    const modalCloseButton = document.getElementById('modal-close-button');
    const decreaseQtyButton = document.getElementById('decrease-qty');
    const increaseQtyButton = document.getElementById('increase-qty');


    // 1. LIFFの初期化
    liff.init({ liffId: MAIN_LIFF_ID })
        .then(() => {
            console.log("LIFF initialized successfully.");
            fetchMenuData();
        })
        .catch((err) => {
            console.error("LIFF initialization failed.", err);
            alert("LIFFの初期化に失敗しました。");
        });

    // 2. GASからメニューデータを取得
    async function fetchMenuData() {
        try {
            const response = await fetch(GAS_API_URL);
            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }
            menuData = await response.json();
            if (menuData.error) {
                throw new Error(menuData.error);
            }
            displayMenu(menuData);
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error("Failed to fetch menu data:", error);
            loadingIndicator.textContent = "メニューの読み込みに失敗しました。";
        }
    }

    // 3. メニューを画面に表示
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

    // 4. モーダルを開く処理
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
                optionSelector.innerHTML += `
                    <input type="radio" id="opt_${opt.key}" name="price_option" value="${opt.key}" data-price="${opt.price}" ${checked}>
                    <label for="opt_${opt.key}">${opt.name} (¥${opt.price})</label>
                `;
            }
        });
        
        document.getElementsByName('price_option').forEach(radio => {
            radio.addEventListener('change', updateModalPrice);
        });

        document.getElementById('quantity').textContent = '1';
        updateModalPrice();
        modalBackdrop.classList.add('visible');
    }

    // 5. モーダルを閉じる処理
    function closeModal() {
        modalBackdrop.classList.remove('visible');
        currentItem = null;
    }

    // モーダル内の価格を更新
    function updateModalPrice() {
        const selectedOption = document.querySelector('input[name="price_option"]:checked');
        const quantity = parseInt(document.getElementById('quantity').textContent, 10);
        if (selectedOption) {
            const price = parseInt(selectedOption.dataset.price, 10);
            const totalPrice = price * quantity;
            document.getElementById('modal-price').textContent = totalPrice;
        }
    }
    
    // 数量の増減
    decreaseQtyButton.addEventListener('click', () => {
        let qty = parseInt(document.getElementById('quantity').textContent, 10);
        if (qty > 1) {
            qty--;
            document.getElementById('quantity').textContent = qty;
            updateModalPrice();
        }
    });

    increaseQtyButton.addEventListener('click', () => {
        let qty = parseInt(document.getElementById('quantity').textContent, 10);
        qty++;
        document.getElementById('quantity').textContent = qty;
        updateModalPrice();
    });

    // カートに追加
    addToCartButton.addEventListener('click', () => {
        const selectedOptionEl = document.querySelector('input[name="price_option"]:checked');
        const quantity = parseInt(document.getElementById('quantity').textContent, 10);

        if (!currentItem || !selectedOptionEl) return;
        
        const selectedOption = {
            key: selectedOptionEl.value,
            name: document.querySelector(`label[for="opt_${selectedOptionEl.value}"]`).textContent.split(' ')[0],
            price: parseInt(selectedOptionEl.dataset.price, 10)
        };
        
        const cartItem = {
            id: currentItem.id,
            name: currentItem.name,
            quantity: quantity,
            option: selectedOption,
            totalPrice: selectedOption.price * quantity,
        };
        
        cart.push(cartItem);
        
        updateCartView();
        closeModal();
    });

    // カートの表示を更新
    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        
        document.getElementById('cart-item-count').textContent = totalItems;
        document.getElementById('cart-total-price').textContent = totalPrice;

        confirmOrderButton.disabled = cart.length === 0;
    }

    // ▼▼▼ 注文確定処理を全面的に書き換えました ▼▼▼
    async function submitOrder() {
        if (cart.length === 0) return;

        confirmOrderButton.disabled = true;
        confirmOrderButton.textContent = '注文処理中...';

        try {
            if (!liff.isLoggedIn()) {
                alert("LINEログインが必要です。OKを押すとログインします。");
                liff.login();
                return;
            }
            
            // 1. 注文データとLINEへの返信メッセージを作成
            const idToken = liff.getDecodedIDToken();
            const userId = idToken.sub;
            const displayName = idToken.name;

            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            const confirmationMessage = `ご注文ありがとうございます！\n\n---ご注文内容---\n${orderDetailsText.trim()}\n\n合計金額: ${totalPrice}円\n\nご注文を受け付けました。準備ができましたら、改めてご連絡いたします。`;

            // 2. LINEに確認メッセージを送信
            if (liff.isInClient() && liff.isApiAvailable('sendMessages')) {
                await liff.sendMessages([{ type: 'text', text: confirmationMessage }]);
            } else {
                console.warn('LINEメッセージを送信できません。LINEクライアント外か、APIが利用できません。');
            }

            // 3. Lark Baseに送信するデータを作成
            const orderId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 8);
            const orderDate = new Date().toLocaleDateString('ja-JP');

            const payload = {
                fldYjlldjn: orderId,
                fldYLRXpXN: userId,
                fld9MWY8Pv: displayName,
                fldqDpai9t: displayName,
                flduAKumTJ: orderDetailsText.trim(),
                fldY9IGZIs: totalPrice,
                fld1Yss0c8: orderDate,
                fldsOifcR8: '', // 顧客種別（LIFFから取得不可）
                fldBX4rdNx: '', // 配達時間（LIFFから取得不可）
                fldpFFSOo2: '', // 配達先住所（LIFFから取得不可）
            };

            // 4. GASにPOSTリクエストを送信してLark Baseに書き込む
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                mode: 'cors' 
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('ご注文が完了しました。');
                liff.closeWindow();
            } else {
                throw new Error(result.message || 'Lark Baseへの書き込みに失敗しました。');
            }

        } catch (error) {
            console.error('注文処理中にエラーが発生しました:', error);
            alert(`注文処理中にエラーが発生しました。\n${error.message}\nお手数ですが、お店に直接ご連絡ください。`);
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
        }
    }
    
    // イベントリスナー設定
    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    confirmOrderButton.addEventListener('click', submitOrder);
});
