document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbycojkigarNHIAO8xNZms9dR95K31zE2jXpSFUc2FVIFULMFqM9_LdRTM9DeIofuuVK/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---

    // --- 定数定義 ---
    const NO_IMAGE_URL_300 = 'https://placehold.co/300x240/eee/ccc?text=No+Image';
    const NO_IMAGE_URL_400 = 'https://placehold.co/400x240/eee/ccc?text=No+Image';

    // --- DOM要素の取得 ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const menuContainer = document.getElementById('menu-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const confirmOrderButton = document.getElementById('confirm-order-button');
    const addToCartButton = document.getElementById('add-to-cart-button');
    const modalCloseButton = document.getElementById('modal-close-button');
    const decreaseQtyButton = document.getElementById('decrease-qty');
    const increaseQtyButton = document.getElementById('increase-qty');
    const quantityElement = document.getElementById('quantity');
    const modalName = document.getElementById('modal-name');
    const modalDescription = document.getElementById('modal-description');
    const modalImage = document.getElementById('modal-image');
    const optionSelector = document.getElementById('option-selector');
    const modalPrice = document.getElementById('modal-price');
    const cartItemCount = document.getElementById('cart-item-count');
    const cartTotalPrice = document.getElementById('cart-total-price');

    // --- 状態管理 ---
    let menuData = [];
    let cart = [];
    let currentItem = null;

    /**
     * LIFFの初期化
     */
    function initializeLiff() {
        liff.init({ liffId: MAIN_LIFF_ID })
            .then(() => {
                console.log("LIFF initialized.");
                fetchMenuData();
            })
            .catch((err) => {
                console.error("LIFF init failed.", err);
                showError("LIFFの初期化に失敗しました。画面を再読み込みしてください。");
            });
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - 表示するメッセージ
     */
    function showError(message) {
        loadingIndicator.textContent = message;
        loadingIndicator.style.display = 'block';
    }

    /**
     * メニューデータをGASから非同期で取得
     */
    async function fetchMenuData() {
        if (GAS_API_URL === "YOUR_FINAL_GAS_URL_HERE") {
            showError("アプリケーション設定が不完全です。管理者に連絡してください。");
            return;
        }
        try {
            const response = await fetch(GAS_API_URL);
            if (!response.ok) {
                throw new Error(`サーバーからの応答が不正です (HTTP ${response.status})`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (!Array.isArray(data)) {
                throw new Error('メニューデータの形式が正しくありません。');
            }
            menuData = data;
            displayMenu(menuData);
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error("Fetch menu failed:", error);
            showError(`メニューの読み込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * メニュー項目を画面に表示
     * @param {Array} items - 表示するメニュー項目の配列
     */
    function displayMenu(items) {
        menuContainer.innerHTML = ''; // 安全のため、一度クリア
        items.forEach(item => {
            if (!item || typeof item.name === 'undefined' || typeof item.price_regular === 'undefined') {
                console.warn('Skipping invalid menu item:', item);
                return; // 不正なデータはスキップ
            }

            const itemElement = document.createElement('div');
            itemElement.className = 'grid-item';

            const img = document.createElement('img');
            img.src = item.imageUrl || NO_IMAGE_URL_300;
            img.alt = item.name;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'item-info';

            const nameP = document.createElement('p');
            nameP.className = 'item-name';
            nameP.textContent = item.name; // XSS対策

            const priceP = document.createElement('p');
            priceP.className = 'item-price';
            priceP.textContent = `¥${item.price_regular}`;

            infoDiv.appendChild(nameP);
            infoDiv.appendChild(priceP);
            itemElement.appendChild(img);
            itemElement.appendChild(infoDiv);

            itemElement.addEventListener('click', () => openModal(item));
            menuContainer.appendChild(itemElement);
        });
    }

    /**
     * 商品詳細モーダルを開く
     * @param {object} item - 商品情報
     */
    function openModal(item) {
        currentItem = item;
        modalName.textContent = item.name;
        modalDescription.textContent = item.description || '';
        modalImage.src = item.imageUrl || NO_IMAGE_URL_400;

        renderOptions(item);
        quantityElement.textContent = '1';
        updateModalPrice();
        modalBackdrop.classList.add('visible');
    }

    /**
     * モーダル内の価格オプションを描画
     * @param {object} item - 商品情報
     */
    function renderOptions(item) {
        optionSelector.innerHTML = ''; // クリア
        const options = [
            { key: 'regular', name: '普通盛り', price: item.price_regular },
            { key: 'large', name: '大盛り', price: item.price_large },
            { key: 'small', name: '小盛り', price: item.price_small }, // `price_side_only`から`price_small`に修正
            { key: 'side_only', name: 'おかずのみ', price: item.price_side_only },
        ];

        let isFirstOption = true;
        options.forEach(opt => {
            if (typeof opt.price !== 'undefined' && opt.price !== null) {
                const div = document.createElement('div');
                const input = document.createElement('input');
                input.type = 'radio';
                input.id = `opt_${opt.key}`;
                input.name = 'price_option';
                input.value = opt.key;
                input.dataset.price = opt.price;
                if (isFirstOption) {
                    input.checked = true;
                    isFirstOption = false;
                }

                const label = document.createElement('label');
                label.htmlFor = `opt_${opt.key}`;
                label.textContent = `${opt.name} (¥${opt.price})`;

                div.appendChild(input);
                div.appendChild(label);
                optionSelector.appendChild(div);
            }
        });
    }

    /**
     * モーダルを閉じる
     */
    function closeModal() {
        modalBackdrop.classList.remove('visible');
    }

    /**
     * モーダル内の合計金額を更新
     */
    function updateModalPrice() {
        const selectedOption = document.querySelector('input[name="price_option"]:checked');
        const quantity = parseInt(quantityElement.textContent, 10);
        if (selectedOption) {
            const price = parseInt(selectedOption.dataset.price, 10);
            modalPrice.textContent = price * quantity;
        }
    }

    /**
     * 数量を変更する
     * @param {number} delta - 変更量 (+1 or -1)
     */
    function changeQuantity(delta) {
        let quantity = parseInt(quantityElement.textContent, 10);
        quantity += delta;
        if (quantity < 1) {
            quantity = 1;
        }
        quantityElement.textContent = quantity;
        updateModalPrice();
    }

    /**
     * カートに商品を追加
     */
    function addToCart() {
        const selectedOptionElement = document.querySelector('input[name="price_option"]:checked');
        const quantity = parseInt(quantityElement.textContent, 10);

        if (!currentItem || !selectedOptionElement) {
            alert('オプションを選択してください。');
            return;
        }

        const selectedOption = {
            key: selectedOptionElement.value,
            name: document.querySelector(`label[for="opt_${selectedOptionElement.value}"]`).textContent.split(' ')[0],
            price: parseInt(selectedOptionElement.dataset.price, 10)
        };

        // 同じ商品・同じオプションがカートに存在するかチェック
        const existingCartItem = cart.find(cartItem => 
            cartItem.id === currentItem.id && cartItem.option.key === selectedOption.key
        );

        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            existingCartItem.totalPrice = existingCartItem.quantity * existingCartItem.option.price;
        } else {
            cart.push({
                id: currentItem.id,
                name: currentItem.name,
                quantity: quantity,
                option: selectedOption,
                totalPrice: selectedOption.price * quantity
            });
        }

        updateCartView();
        closeModal();
    }

    /**
     * カートの表示を更新
     */
    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        cartItemCount.textContent = totalItems;
        cartTotalPrice.textContent = totalPrice;
        confirmOrderButton.disabled = cart.length === 0;
    }

    /**
     * 注文を送信
     */
    async function submitOrder() {
        if (cart.length === 0) return;

        confirmOrderButton.disabled = true;
        confirmOrderButton.textContent = '注文処理中...';

        try {
            if (!liff.isLoggedIn()) {
                liff.login({ redirectUri: location.href });
                return; // login後にリダイレクトされるので、ここで処理を中断
            }

            const idToken = liff.getDecodedIDToken();
            if (!idToken || !idToken.sub) {
                throw new Error('ユーザー情報を取得できませんでした。');
            }

            const orderDetailsText = createOrderDetailsText();
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // ユーザーへの確認メッセージ
            const confirmationMessage = createConfirmationMessage(orderDetailsText, totalPrice);

            // LINEにメッセージ送信
            if (liff.isInClient() && liff.isApiAvailable('sendMessages')) {
                await liff.sendMessages([{ type: 'text', text: confirmationMessage }])
                    .catch(err => console.error('LINE message sending failed:', err)); // 送信失敗は許容
            }

            // GASに送信するデータを作成
            const payload = createPayloadForGas(idToken, orderDetailsText, totalPrice);

            // GASに注文データを送信
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                mode: 'cors'
            });

            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || 'データベースへの書き込みに失敗しました。');
            }

            alert('ご注文が完了しました。ありがとうございました！');
            liff.closeWindow();

        } catch (error) {
            console.error('Order submission failed:', error);
            alert(`注文処理中にエラーが発生しました。\n${error.message}\nお手数ですが、お店に直接ご連絡ください。`);
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
        }
    }
    
    /**
     * 注文詳細テキストを作成
     * @returns {string}
     */
    function createOrderDetailsText() {
        return cart.map(item => `${item.name} (${item.option.name}) x ${item.quantity}`).join('\n');
    }

    /**
     * ユーザー確認メッセージを作成
     * @param {string} detailsText 
     * @param {number} totalPrice 
     * @returns {string}
     */
    function createConfirmationMessage(detailsText, totalPrice) {
        return `ご注文ありがとうございます！\n\n---ご注文内容---\n${detailsText}\n\n合計金額: ${totalPrice}円\n\nご注文を受け付けました。準備ができましたら、改めてご連絡いたします。`;
    }

    /**
     * GASに送信するペイロードを作成
     * @param {object} idToken 
     * @param {string} detailsText 
     * @param {number} totalPrice 
     * @returns {object}
     */
    function createPayloadForGas(idToken, detailsText, totalPrice) {
        const orderId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 8);
        const orderDate = new Date().toLocaleDateString('ja-JP');
        return {
            fldYjlldjn: orderId,
            fldYLRXpXN: idToken.sub, // ユーザーID
            fld9MWY8Pv: idToken.name, // 表示名
            fldqDpai9t: idToken.name, // (重複しているが元の仕様を踏襲)
            flduAKumTJ: detailsText,
            fldY9IGZIs: totalPrice,
            fld1Yss0c8: orderDate
        };
    }

    // --- イベントリスナーの設定 ---
    decreaseQtyButton.addEventListener('click', () => changeQuantity(-1));
    increaseQtyButton.addEventListener('click', () => changeQuantity(1));
    addToCartButton.addEventListener('click', addToCart);
    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    confirmOrderButton.addEventListener('click', submitOrder);
    optionSelector.addEventListener('change', updateModalPrice); // イベント委任

    // --- 初期化処理の実行 ---
    initializeLiff();
});


