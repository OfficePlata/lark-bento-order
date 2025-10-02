document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz2NwKKzMTRHALP5Ue6__YLCdmThoN4z6d9_o2mzYez2HxTFvBmg7leanHKQ-zVKn1L/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---

    // 【追加】モバイルデバッグ用のログ表示エリア
    let debugArea = null;
    let debugEnabled = false;

    function debugLog(message) {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        if (debugEnabled && debugArea) {
            debugArea.innerHTML += logMessage + '\n';
            debugArea.scrollTop = debugArea.scrollHeight;
        }
    }

    function createDebugArea() {
        // デバッグボタンを作成
        const debugButton = document.createElement('button');
        debugButton.textContent = 'DEBUG';
        debugButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            background: #ff4444;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        `;
        
        debugButton.addEventListener('click', function() {
            debugEnabled = !debugEnabled;
            if (debugEnabled) {
                if (!debugArea) {
                    debugArea = document.createElement('pre');
                    debugArea.style.cssText = `
                        position: fixed;
                        top: 50px;
                        left: 10px;
                        right: 10px;
                        height: 200px;
                        background: black;
                        color: #00ff00;
                        font-size: 10px;
                        padding: 10px;
                        overflow-y: auto;
                        z-index: 9999;
                        border: 1px solid #ccc;
                        font-family: monospace;
                    `;
                    document.body.appendChild(debugArea);
                }
                debugArea.style.display = 'block';
                debugButton.textContent = 'HIDE DEBUG';
                debugButton.style.background = '#44ff44';
            } else {
                if (debugArea) {
                    debugArea.style.display = 'none';
                }
                debugButton.textContent = 'DEBUG';
                debugButton.style.background = '#ff4444';
            }
        });
        
        document.body.appendChild(debugButton);
    }

    // アプリケーション開始
    debugLog("🚀 アプリケーション開始");
    debugLog(`📱 User Agent: ${navigator.userAgent}`);
    debugLog(`🌐 URL: ${window.location.href}`);

    // デバッグエリアを作成
    createDebugArea();

    // グローバル変数
    let cart = [];
    let menuData = [];
    let currentProduct = null;

    // DOM要素の取得
    const loadingIndicator = document.getElementById('loading-indicator');
    const menuContainer = document.getElementById('menu-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    const cartItemCount = document.getElementById('cart-item-count');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const confirmOrderButton = document.getElementById('confirm-order-button');

    // イベントリスナーの設定
    function setupEventListeners() {
        // モーダル関連
        document.getElementById('modal-close-button').addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', function(e) {
            if (e.target === modalBackdrop) {
                closeModal();
            }
        });

        // 数量調整
        document.getElementById('decrease-qty').addEventListener('click', function() {
            const qtyElement = document.getElementById('quantity');
            let qty = parseInt(qtyElement.textContent);
            if (qty > 1) {
                qty--;
                qtyElement.textContent = qty;
                updateModalPrice();
            }
        });

        document.getElementById('increase-qty').addEventListener('click', function() {
            const qtyElement = document.getElementById('quantity');
            let qty = parseInt(qtyElement.textContent);
            qty++;
            qtyElement.textContent = qty;
            updateModalPrice();
        });

        // カートに追加
        document.getElementById('add-to-cart-button').addEventListener('click', addToCart);

        // 注文確定
        confirmOrderButton.addEventListener('click', submitOrder);

        debugLog("✅ イベントリスナー設定完了");
    }

    // LIFF初期化
    async function initializeLiff() {
        try {
            await liff.init({ liffId: MAIN_LIFF_ID });
            debugLog("✅ LIFF初期化成功");
            
            debugLog(`🔐 ログイン状態: ${liff.isLoggedIn()}`);
            debugLog(`📱 LIFFクライアント: ${liff.isInClient()}`);
            debugLog(`🔧 LIFF OS: ${liff.getOS()}`);
            debugLog(`📊 LIFF言語: ${liff.getLanguage()}`);
            debugLog(`🎯 LIFF版本: ${liff.getVersion()}`);

            if (!liff.isLoggedIn()) {
                liff.login();
                return;
            }

            await loadMenuData();
        } catch (error) {
            debugLog(`❌ LIFF初期化エラー: ${error.message}`);
            showError('LIFF初期化に失敗しました。');
        }
    }

    // メニューデータの読み込み（修正版）
    async function loadMenuData() {
        try {
            debugLog(`📡 メニューデータ取得開始: ${GAS_API_URL}`);
            
            // メニュー取得用のGETリクエスト（actionパラメータなし）
            const response = await fetch(GAS_API_URL);
            debugLog(`📡 メニュー取得レスポンス status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            debugLog(`📡 メニューレスポンステキスト長: ${responseText.length}文字`);
            
            // JSONパースを試行
            try {
                menuData = JSON.parse(responseText);
                debugLog(`📡 パース済みメニューデータ: ${menuData.length}件`);
                
                if (!Array.isArray(menuData)) {
                    throw new Error('メニューデータが配列ではありません');
                }
                
                displayMenu();
                debugLog("✅ メニュー表示完了");
            } catch (parseError) {
                debugLog(`❌ JSONパースエラー: ${parseError.message}`);
                debugLog(`📡 レスポンステキスト: ${responseText.substring(0, 200)}...`);
                throw new Error(`メニューデータの解析に失敗しました: ${parseError.message}`);
            }
            
        } catch (error) {
            debugLog(`❌ メニュー取得エラー: ${error.message}`);
            showError(`メニューの読み込みに失敗しました: ${error.message}`);
        }
    }

    // メニュー表示
    function displayMenu() {
        loadingIndicator.style.display = 'none';
        menuContainer.innerHTML = '';

        if (!menuData || menuData.length === 0) {
            menuContainer.innerHTML = '<p>メニューデータがありません。</p>';
            return;
        }

        menuData.forEach(item => {
            if (item.isAvailable) {
                const menuItem = createMenuItemElement(item);
                menuContainer.appendChild(menuItem);
            }
        });
    }

    // メニューアイテム要素の作成
    function createMenuItemElement(item) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="menu-image">
            <h3 class="menu-name">${item.name}</h3>
            <p class="menu-price">¥${item.price_regular}</p>
            <p class="menu-description">${item.description}</p>
        `;

        menuItem.addEventListener('click', () => openModal(item));
        return menuItem;
    }

    // モーダル開く
    function openModal(item) {
        debugLog(`🛒 商品詳細モーダル開く: ${item.name}`);
        currentProduct = item;

        document.getElementById('modal-image').src = item.imageUrl;
        document.getElementById('modal-name').textContent = item.name;
        document.getElementById('modal-description').textContent = item.description;

        // オプション設定
        const optionSelector = document.getElementById('option-selector');
        optionSelector.innerHTML = '';

        const options = [
            { name: '普通盛り', price: item.price_regular },
            { name: '大盛り', price: item.price_large },
            { name: '小盛り', price: item.price_small },
            { name: 'おかずのみ', price: item.price_side_only }
        ];

        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';
            optionDiv.innerHTML = `
                <input type="radio" id="option-${index}" name="option" value="${option.name}" data-price="${option.price}" ${index === 0 ? 'checked' : ''}>
                <label for="option-${index}">${option.name} (¥${option.price})</label>
            `;
            optionSelector.appendChild(optionDiv);
        });

        // オプション変更時の価格更新
        optionSelector.addEventListener('change', updateModalPrice);

        // 数量リセット
        document.getElementById('quantity').textContent = '1';

        updateModalPrice();
        modalBackdrop.style.display = 'flex';
    }

    // モーダル閉じる
    function closeModal() {
        debugLog("🛒 商品詳細モーダル閉じる");
        modalBackdrop.style.display = 'none';
        currentProduct = null;
    }

    // モーダル価格更新
    function updateModalPrice() {
        const selectedOption = document.querySelector('input[name="option"]:checked');
        const quantity = parseInt(document.getElementById('quantity').textContent);
        
        if (selectedOption) {
            const price = parseInt(selectedOption.dataset.price);
            const totalPrice = price * quantity;
            document.getElementById('modal-price').textContent = totalPrice;
        }
    }

    // カートに追加
    function addToCart() {
        const selectedOption = document.querySelector('input[name="option"]:checked');
        const quantity = parseInt(document.getElementById('quantity').textContent);

        if (!selectedOption || !currentProduct) return;

        const cartItem = {
            id: currentProduct.id,
            name: currentProduct.name,
            option: selectedOption.value,
            price: parseInt(selectedOption.dataset.price),
            quantity: quantity,
            totalPrice: parseInt(selectedOption.dataset.price) * quantity
        };

        cart.push(cartItem);
        debugLog(`🛒 カートに追加: ${cartItem.name} x ${cartItem.quantity}`);
        
        updateCartDisplay();
        closeModal();
    }

    // カート表示更新
    function updateCartDisplay() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

        cartItemCount.textContent = totalItems;
        cartTotalPrice.textContent = totalPrice;
        confirmOrderButton.disabled = totalItems === 0;

        debugLog(`🛒 カート更新: ${totalItems}点 / ${totalPrice}円`);
    }

    // 注文送信（GETリクエスト方式）
    async function submitOrder() {
        debugLog("🚀 注文処理開始");
        
        try {
            confirmOrderButton.disabled = true;
            confirmOrderButton.textContent = '処理中...';

            // ログイン状態確認
            if (!liff.isLoggedIn()) {
                throw new Error('ログインが必要です');
            }
            debugLog(`🔐 ログイン状態確認: ${liff.isLoggedIn()}`);

            // ユーザープロフィール取得
            debugLog("👤 ユーザープロフィール取得開始");
            const profile = await liff.getProfile();
            debugLog(`👤 ユーザー情報取得成功: ${profile.displayName} (${profile.userId})`);

            // 注文データ準備
            const orderId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const orderDetails = cart.map(item => 
                `${item.name} (${item.option}) x ${item.quantity}`
            ).join(', ');
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

            const orderData = {
                orderId: orderId,
                userId: profile.userId,
                displayName: profile.displayName,
                orderDetails: orderDetails,
                totalPrice: totalPrice
            };

            debugLog(`📦 送信する注文データ: ${JSON.stringify(orderData)}`);

            // LINEメッセージ送信を試行（失敗しても続行）
            try {
                const message = `ご注文を承りました！\n\n注文ID: ${orderId}\n注文内容: ${orderDetails}\n合計金額: ¥${totalPrice}`;
                await liff.sendMessages([{
                    type: 'text',
                    text: message
                }]);
                debugLog("📱 LINEメッセージ送信成功");
            } catch (messageError) {
                debugLog(`⚠️ LINEメッセージの送信に失敗しましたが、注文は正常に処理されました: ${messageError.message}`);
            }

            // GASにGETリクエストでデータ送信
            debugLog(`📡 GASにリクエスト送信開始: ${GAS_API_URL}`);
            
            const params = new URLSearchParams({
                action: 'order',
                orderId: orderData.orderId,
                userId: orderData.userId,
                displayName: orderData.displayName,
                orderDetails: orderData.orderDetails,
                totalPrice: orderData.totalPrice.toString()
            });

            const requestUrl = `${GAS_API_URL}?${params.toString()}`;
            debugLog(`📡 リクエストURL: ${requestUrl}`);

            debugLog("📡 fetch実行開始...");
            const response = await fetch(requestUrl);
            debugLog("📡 fetch実行完了");
            
            debugLog(`📡 GASレスポンス status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            debugLog("📡 レスポンステキスト取得開始...");
            const responseText = await response.text();
            debugLog("📡 レスポンステキスト取得完了");
            
            debugLog(`📡 GASレスポンステキスト: ${responseText}`);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                debugLog(`❌ レスポンスJSONパースエラー: ${parseError.message}`);
                throw new Error(`レスポンスの解析に失敗しました: ${parseError.message}`);
            }
            
            if (result.status === 'success') {
                debugLog("✅ 注文処理成功");
                
                // 成功メッセージ表示
                alert(`ご注文が完了しました！\n\n注文ID: ${orderId}\n注文内容: ${orderDetails}\n合計金額: ¥${totalPrice}\n\nLarkテーブルに保存されました。`);
                
                // カートをクリア
                cart = [];
                updateCartDisplay();
            } else {
                throw new Error(result.message || '注文処理に失敗しました');
            }

        } catch (error) {
            debugLog(`❌ 注文処理エラー: ${error.message}`);
            debugLog(`❌ エラースタック: ${error.stack}`);
            
            let errorMessage = '注文処理中にエラーが発生しました。';
            if (error.message.includes('Load failed')) {
                errorMessage = 'ネットワークエラー: ' + error.message;
            } else if (error.message.includes('JSON')) {
                errorMessage = 'データ処理エラー: ' + error.message;
            } else {
                errorMessage = error.message;
            }
            
            alert(errorMessage + '\n\nお手数ですが、お店に直接ご連絡ください。');
        } finally {
            confirmOrderButton.disabled = false;
            confirmOrderButton.textContent = '注文を確定する';
            debugLog("🔄 注文処理終了、ボタン状態リセット");
        }
    }

    // エラー表示
    function showError(message) {
        loadingIndicator.innerHTML = `<p style="color: red;">エラー: ${message}</p>`;
    }

    // GASエンドポイントテスト関数（デバッグ用）
    window.testGasEndpoint = async function() {
        debugLog("🧪 GASエンドポイントテスト開始");
        try {
            // メニュー取得テスト
            debugLog("🧪 メニュー取得テスト");
            const menuResponse = await fetch(GAS_API_URL);
            const menuText = await menuResponse.text();
            debugLog(`🧪 メニューレスポンス status: ${menuResponse.status}`);
            debugLog(`🧪 メニューレスポンステキスト: ${menuText.substring(0, 200)}...`);
            
            // 注文処理テスト
            debugLog("🧪 注文処理テスト");
            const testParams = new URLSearchParams({
                action: 'order',
                orderId: 'test123',
                userId: 'testUser',
                displayName: 'テストユーザー',
                orderDetails: 'テスト弁当 x 1',
                totalPrice: '500'
            });

            const testUrl = `${GAS_API_URL}?${testParams.toString()}`;
            debugLog(`🧪 テストURL: ${testUrl}`);
            
            const orderResponse = await fetch(testUrl);
            const orderText = await orderResponse.text();
            
            debugLog(`🧪 注文レスポンス status: ${orderResponse.status}`);
            debugLog(`🧪 注文レスポンステキスト: ${orderText}`);
            
            if (menuResponse.ok && orderResponse.ok) {
                debugLog("✅ GASエンドポイントテスト成功");
            } else {
                debugLog("❌ GASエンドポイントテスト失敗");
            }
        } catch (error) {
            debugLog(`❌ GASエンドポイントテストエラー: ${error.message}`);
        }
    };

    // 初期化実行
    setupEventListeners();
    initializeLiff();
});
