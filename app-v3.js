document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyH7cAZW8jOUX_io8NEDuQ3xJgHCyJZarIU_Mkb7Vsus26p9cXdnhR4qEJfL4ZEJ3ey/exec";
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

    // 【修正】submitOrder関数を完全に書き換え
    async function submitOrder() {
        if (cart.length === 0) return;
        
        // ボタンを無効化してローディング状態にする
        confirmOrderButton.disabled = true;
        confirmOrderButton.textContent = '注文処理中...';

        try {
            // ログイン確認
            if (!liff.isLoggedIn()) {
                liff.login();
                return; 
            }
            
            // ユーザー情報の取得
            const profile = await liff.getProfile();
            const userId = profile.userId;
            const displayName = profile.displayName;

            // 注文詳細の準備
            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // 注文データの準備（新しい形式）
            const orderData = {
                orderId: new Date().getTime().toString() + Math.random().toString(36).substring(2, 8),
                userId: userId,
                displayName: displayName,
                orderDetails: orderDetailsText.trim(),
                totalPrice: totalPrice
            };
            
            console.log('送信する注文データ:', orderData);

            // LINEメッセージ送信（可能な場合のみ）
            await sendLineMessageIfPossible(orderData);

            // GASへのリクエスト送信
            console.log('GASにリクエストを送信中...');
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            console.log('GASレスポンス status:', response.status);
            console.log('GASレスポンス headers:', [...response.headers.entries()]);

            // レスポンステキストを取得
            const responseText = await response.text();
            console.log('GASレスポンス text:', responseText);

            // レスポンスが空でないことを確認
            if (!responseText || responseText.trim() === '') {
                throw new Error('GASから空のレスポンスが返されました');
            }

            // JSONパースを試行（エラーハンドリング付き）
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSONパースエラー:', parseError);
                console.error('パースに失敗したレスポンス:', responseText);
                
                // レスポンスの最初の100文字を表示してデバッグ
                const preview = responseText.substring(0, 100);
                throw new Error(`GASからの不正なJSONレスポンス: "${preview}..."`);
            }

            console.log('パース済みレスポンス:', result);

            // エラーレスポンスの確認
            if (result.status === 'error') {
                throw new Error(`注文処理エラー: ${result.message}`);
            }

            // 成功時の処理
            if (result.status === 'success') {
                alert('ご注文が完了しました。');
                
                // カートをクリア
                cart = [];
                updateCartView();
                
                // LIFFウィンドウを閉じる
                liff.closeWindow();
            } else {
                throw new Error('予期しないレスポンス形式です');
            }

        } catch (error) {
            console.error('注文処理エラー:', error);
            
            // ユーザーフレンドリーなエラーメッセージを表示
            let userMessage = '注文処理中にエラーが発生しました。';
            
            if (error.message.includes('JSON')) {
                userMessage += '\n詳細: システムの応答形式に問題があります。';
            } else if (error.message.includes('Lark API')) {
                userMessage += '\n詳細: データベースへの保存に失敗しました。';
            } else if (error.message.includes('FieldNameNotFound')) {
                userMessage += '\n詳細: データベースの設定に問題があります。GAS側のフィールドID設定が間違っている可能性があります。';
            } else {
                userMessage += `\n詳細: ${error.message}`;
            }
            
            userMessage += '\n\nお手数ですが、お店に直接ご連絡ください。';
            
            alert(userMessage);
            
        } finally {
            // ボタンを元の状態に戻す
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
        }
    }

    // 【追加】LINEメッセージ送信（可能な場合のみ）
    async function sendLineMessageIfPossible(orderData) {
        try {
            // LINEクライアント内でsendMessagesが利用可能かチェック
            if (liff.isApiAvailable('sendMessages')) {
                const confirmationMessage = `ご注文ありがとうございます！\n\n---ご注文内容---\n${orderData.orderDetails}\n\n合計金額: ${orderData.totalPrice}円\n注文ID: ${orderData.orderId}\n\nご注文を受け付けました。準備ができましたら、改めてご連絡いたします。`;
                
                await liff.sendMessages([{
                    type: 'text',
                    text: confirmationMessage
                }]);
                
                console.log('LINEメッセージを送信しました');
            } else {
                console.log('LINEメッセージ送信はスキップされました（LINEクライアント外）');
            }
        } catch (messageError) {
            // メッセージ送信の失敗は注文処理全体を停止させない
            console.warn('LINEメッセージの送信に失敗しましたが、注文は正常に処理されました:', messageError);
        }
    }

    // 【追加】デバッグ用：GASエンドポイントのテスト
    async function testGasEndpoint() {
        try {
            console.log('GASエンドポイントをテスト中...');
            
            const testData = {
                orderId: 'test-' + Date.now(),
                userId: 'test-user',
                displayName: 'テストユーザー',
                orderDetails: 'テスト注文',
                totalPrice: 1000
            };
            
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });
            
            const responseText = await response.text();
            console.log('テストレスポンス:', responseText);
            
            const result = JSON.parse(responseText);
            console.log('パース済みテストレスポンス:', result);
            
            if (result.status === 'success') {
                console.log('✅ GASエンドポイントは正常に動作しています');
            } else {
                console.log('❌ GASエンドポイントでエラーが発生:', result.message);
            }
            
        } catch (error) {
            console.error('❌ GASエンドポイントテストでエラー:', error);
        }
    }

    // デバッグ用にグローバルに公開
    window.testGasEndpoint = testGasEndpoint;

    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    confirmOrderButton.addEventListener('click', submitOrder);
});
