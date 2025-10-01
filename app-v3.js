document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzhB4RmJU8tiQ-etpSIeZklM6R0uBdL4rLfupoL_Ax9wxc_bNdUepLcSw8dWeNEcraW/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---

    // 【追加】モバイルデバッグ用のログ表示エリア
    let debugLogArea = null;
    
    function createDebugLogArea() {
        if (debugLogArea) return;
        
        debugLogArea = document.createElement('div');
        debugLogArea.id = 'debug-log-area';
        debugLogArea.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 200px;
            background: rgba(0,0,0,0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 10px;
            padding: 10px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(debugLogArea);
        
        // デバッグエリアの表示/非表示切り替え
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'DEBUG';
        toggleButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            background: red;
            color: white;
            border: none;
            padding: 5px 10px;
            font-size: 12px;
        `;
        toggleButton.onclick = () => {
            debugLogArea.style.display = debugLogArea.style.display === 'none' ? 'block' : 'none';
        };
        document.body.appendChild(toggleButton);
    }
    
    function debugLog(message) {
        console.log(message);
        
        if (!debugLogArea) createDebugLogArea();
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        debugLogArea.appendChild(logEntry);
        debugLogArea.scrollTop = debugLogArea.scrollHeight;
        
        // 最大100行まで保持
        while (debugLogArea.children.length > 100) {
            debugLogArea.removeChild(debugLogArea.firstChild);
        }
    }

    // 【追加】エラーハンドリングの強化
    window.addEventListener('error', function(e) {
        debugLog(`❌ JavaScript Error: ${e.message} at ${e.filename}:${e.lineno}`);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        debugLog(`❌ Unhandled Promise Rejection: ${e.reason}`);
    });

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

    debugLog("🚀 アプリケーション開始");
    debugLog(`📱 User Agent: ${navigator.userAgent}`);
    debugLog(`🌐 URL: ${window.location.href}`);

    liff.init({ liffId: MAIN_LIFF_ID })
        .then(() => {
            debugLog("✅ LIFF初期化成功");
            debugLog(`🔐 ログイン状態: ${liff.isLoggedIn()}`);
            debugLog(`📱 LIFFクライアント: ${liff.isInClient()}`);
            debugLog(`🔧 LIFF OS: ${liff.getOS()}`);
            debugLog(`📊 LIFF言語: ${liff.getLanguage()}`);
            debugLog(`🎯 LIFF版本: ${liff.getVersion()}`);
            
            fetchMenuData();
        })
        .catch((err) => { 
            debugLog(`❌ LIFF初期化失敗: ${err.message}`);
            console.error("LIFF init failed.", err);
            loadingIndicator.textContent = "LIFF初期化失敗";
        });

    async function fetchMenuData() {
        if (GAS_API_URL === "YOUR_FINAL_GAS_URL_HERE") {
            debugLog("❌ GAS_API_URLが設定されていません");
            loadingIndicator.textContent = "GAS_API_URLが設定されていません。";
            return;
        }
        try {
            debugLog(`📡 メニューデータ取得開始: ${GAS_API_URL}`);
            const response = await fetch(GAS_API_URL);
            debugLog(`📡 メニュー取得レスポンス status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`サーバー応答エラー: ${response.status}`);
            }
            
            const responseText = await response.text();
            debugLog(`📡 メニューレスポンステキスト長: ${responseText.length}文字`);
            
            menuData = JSON.parse(responseText);
            debugLog(`📡 パース済みメニューデータ: ${menuData.length}件`);
            
            if (menuData.error) {
                throw new Error(menuData.error);
            }
            displayMenu(menuData);
            loadingIndicator.style.display = 'none';
            debugLog("✅ メニュー表示完了");
        } catch (error) {
            debugLog(`❌ メニュー取得失敗: ${error.message}`);
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
        debugLog(`🛒 商品詳細モーダル開く: ${item.name}`);
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
        debugLog("🛒 商品詳細モーダル閉じる");
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
        debugLog(`🛒 カートに追加: ${currentItem.name} x ${qty}`);
        updateCartView();
        closeModal();
    });

    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        document.getElementById('cart-item-count').textContent = totalItems;
        document.getElementById('cart-total-price').textContent = totalPrice;
        confirmOrderButton.disabled = cart.length === 0;
        debugLog(`🛒 カート更新: ${totalItems}点 / ${totalPrice}円`);
    }

    // 【強化】submitOrder関数にモバイル対応デバッグを追加
    async function submitOrder() {
        if (cart.length === 0) {
            debugLog("❌ カートが空です");
            return;
        }
        
        debugLog("🚀 注文処理開始");
        
        // ボタンを無効化してローディング状態にする
        confirmOrderButton.disabled = true;
        confirmOrderButton.textContent = '注文処理中...';

        try {
            // ログイン確認
            debugLog(`🔐 ログイン状態確認: ${liff.isLoggedIn()}`);
            if (!liff.isLoggedIn()) {
                debugLog("❌ ユーザーがログインしていません。ログインページにリダイレクト");
                liff.login();
                return; 
            }
            
            // ユーザー情報の取得
            debugLog("👤 ユーザープロフィール取得開始");
            const profile = await liff.getProfile();
            const userId = profile.userId;
            const displayName = profile.displayName;
            debugLog(`👤 ユーザー情報取得成功: ${displayName} (${userId})`);

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
            
            debugLog(`📦 送信する注文データ: ${JSON.stringify(orderData)}`);

            // LINEメッセージ送信（可能な場合のみ）
            await sendLineMessageIfPossible(orderData);

            // GASへのリクエスト送信
            debugLog(`📡 GASにリクエスト送信開始: ${GAS_API_URL}`);
            
            const fetchOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            };
            
            debugLog(`📡 リクエストオプション: ${JSON.stringify(fetchOptions)}`);
            
            let response;
            try {
                debugLog(`📡 fetch実行開始...`);
                response = await fetch(GAS_API_URL, fetchOptions);
                debugLog(`📡 fetch実行完了`);
            } catch (fetchError) {
                debugLog(`❌ fetchエラー: ${fetchError.message}`);
                debugLog(`❌ fetchエラータイプ: ${fetchError.name}`);
                debugLog(`❌ fetchエラースタック: ${fetchError.stack}`);
                throw new Error(`ネットワークエラー: ${fetchError.message}`);
            }

            debugLog(`📡 GASレスポンス status: ${response.status}`);
            debugLog(`📡 GASレスポンス ok: ${response.ok}`);
            debugLog(`📡 GASレスポンス headers: ${JSON.stringify([...response.headers.entries()])}`);

            // レスポンステキストを取得
            let responseText;
            try {
                debugLog(`📡 レスポンステキスト取得開始...`);
                responseText = await response.text();
                debugLog(`📡 レスポンステキスト取得完了`);
            } catch (textError) {
                debugLog(`❌ レスポンステキスト取得エラー: ${textError.message}`);
                throw new Error(`レスポンス読み取りエラー: ${textError.message}`);
            }
            
            debugLog(`📡 GASレスポンステキスト: "${responseText}"`);
            debugLog(`📡 レスポンステキスト長: ${responseText.length}文字`);

            // レスポンスが空でないことを確認
            if (!responseText || responseText.trim() === '') {
                throw new Error('GASから空のレスポンスが返されました');
            }

            // JSONパースを試行（エラーハンドリング付き）
            let result;
            try {
                result = JSON.parse(responseText);
                debugLog(`📡 パース済みレスポンス: ${JSON.stringify(result)}`);
            } catch (parseError) {
                debugLog(`❌ JSONパースエラー: ${parseError.message}`);
                debugLog(`❌ パースに失敗したレスポンス: "${responseText}"`);
                
                // レスポンスの最初の100文字を表示してデバッグ
                const preview = responseText.substring(0, 100);
                throw new Error(`GASからの不正なJSONレスポンス: "${preview}..."`);
            }

            // エラーレスポンスの確認
            if (result.status === 'error') {
                debugLog(`❌ GASエラーレスポンス: ${result.message}`);
                throw new Error(`注文処理エラー: ${result.message}`);
            }

            // 成功時の処理
            if (result.status === 'success') {
                debugLog('✅ 注文処理成功');
                alert('ご注文が完了しました。');
                
                // カートをクリア
                cart = [];
                updateCartView();
                
                // LIFFウィンドウを閉じる
                if (liff.isInClient()) {
                    debugLog('📱 LIFFウィンドウを閉じます');
                    liff.closeWindow();
                } else {
                    debugLog('🌐 ブラウザ環境のため、ウィンドウは閉じません');
                }
            } else {
                debugLog(`❌ 予期しないレスポンス形式: ${JSON.stringify(result)}`);
                throw new Error('予期しないレスポンス形式です');
            }

        } catch (error) {
            debugLog(`❌ 注文処理エラー: ${error.message}`);
            debugLog(`❌ エラースタック: ${error.stack}`);
            console.error('注文処理エラー:', error);
            
            // ユーザーフレンドリーなエラーメッセージを表示
            let userMessage = '注文処理中にエラーが発生しました。';
            
            if (error.message.includes('JSON')) {
                userMessage += '\n詳細: システムの応答形式に問題があります。';
            } else if (error.message.includes('Lark API')) {
                userMessage += '\n詳細: データベースへの保存に失敗しました。';
            } else if (error.message.includes('FieldNameNotFound')) {
                userMessage += '\n詳細: データベースの設定に問題があります。';
            } else if (error.message.includes('fetch')) {
                userMessage += '\n詳細: ネットワーク接続に問題があります。';
            } else {
                userMessage += `\n詳細: ${error.message}`;
            }
            
            userMessage += '\n\nお手数ですが、お店に直接ご連絡ください。';
            
            alert(userMessage);
            
        } finally {
            // ボタンを元の状態に戻す
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
            debugLog("🔄 注文処理終了、ボタン状態リセット");
        }
    }

    // 【追加】LINEメッセージ送信（可能な場合のみ）
    async function sendLineMessageIfPossible(orderData) {
        try {
            debugLog(`💬 LINEメッセージ送信チェック: isApiAvailable=${liff.isApiAvailable('sendMessages')}`);
            
            // LINEクライアント内でsendMessagesが利用可能かチェック
            if (liff.isApiAvailable('sendMessages')) {
                const confirmationMessage = `ご注文ありがとうございます！\n\n---ご注文内容---\n${orderData.orderDetails}\n\n合計金額: ${orderData.totalPrice}円\n注文ID: ${orderData.orderId}\n\nご注文を受け付けました。準備ができましたら、改めてご連絡いたします。`;
                
                debugLog(`💬 LINEメッセージ送信開始`);
                await liff.sendMessages([{
                    type: 'text',
                    text: confirmationMessage
                }]);
                
                debugLog('✅ LINEメッセージを送信しました');
            } else {
                debugLog('ℹ️ LINEメッセージ送信はスキップされました（LINEクライアント外またはAPI利用不可）');
            }
        } catch (messageError) {
            // メッセージ送信の失敗は注文処理全体を停止させない
            debugLog(`⚠️ LINEメッセージの送信に失敗しましたが、注文は正常に処理されました: ${messageError.message}`);
            console.warn('LINEメッセージの送信に失敗しましたが、注文は正常に処理されました:', messageError);
        }
    }

    // 【追加】デバッグ用：GASエンドポイントのテスト
    async function testGasEndpoint() {
        try {
            debugLog('🧪 GASエンドポイントテスト開始');
            
            const testData = {
                orderId: 'test-' + Date.now(),
                userId: 'test-user',
                displayName: 'テストユーザー',
                orderDetails: 'テスト注文',
                totalPrice: 1000
            };
            
            debugLog(`🧪 テストデータ: ${JSON.stringify(testData)}`);
            
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });
            
            debugLog(`🧪 テストレスポンス status: ${response.status}`);
            
            const responseText = await response.text();
            debugLog(`🧪 テストレスポンステキスト: ${responseText}`);
            
            const result = JSON.parse(responseText);
            debugLog(`🧪 パース済みテストレスポンス: ${JSON.stringify(result)}`);
            
            if (result.status === 'success') {
                debugLog('✅ GASエンドポイントは正常に動作しています');
                alert('✅ GASエンドポイントテスト成功');
            } else {
                debugLog(`❌ GASエンドポイントでエラーが発生: ${result.message}`);
                alert('❌ GASエンドポイントテスト失敗: ' + result.message);
            }
            
        } catch (error) {
            debugLog(`❌ GASエンドポイントテストでエラー: ${error.message}`);
            console.error('❌ GASエンドポイントテストでエラー:', error);
            alert('❌ GASエンドポイントテストでエラー: ' + error.message);
        }
    }

    // デバッグ用にグローバルに公開
    window.testGasEndpoint = testGasEndpoint;
    window.debugLog = debugLog;

    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    confirmOrderButton.addEventListener('click', submitOrder);
    
    debugLog("✅ イベントリスナー設定完了");
});
