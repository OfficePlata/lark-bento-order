document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz2NwKKzMTRHALP5Ue6__YLCdmThoN4z6d9_o2mzYez2HxTFvBmg7leanHKQ-zVKn1L/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---
    // 【追加】モバイルデバッグ用のログ表示エリア
    let debugLogArea = null;
    
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
    
    // DOM要素の取得（DOMContentLoadedで実行）
    let loadingIndicator, menuContainer, modalBackdrop, confirmOrderButton, addToCartButton, modalCloseButton, decreaseQtyButton, increaseQtyButton;

    debugLog("🚀 アプリケーション開始");
    debugLog(`📱 User Agent: ${navigator.userAgent}`);
    debugLog(`🌐 URL: ${window.location.href}`);

    // 【修正】DOMContentLoadedイベントでDOM要素を取得し、イベントリスナーを設定
    document.addEventListener('DOMContentLoaded', function() {
        debugLog("📄 DOM読み込み完了");
        
        // DOM要素の取得
        loadingIndicator = document.getElementById('loading-indicator');
        menuContainer = document.getElementById('menu-container');
        modalBackdrop = document.getElementById('modal-backdrop');
        confirmOrderButton = document.getElementById('confirm-order-button');
        addToCartButton = document.getElementById('add-to-cart-button');
        modalCloseButton = document.getElementById('modal-close-button');
        decreaseQtyButton = document.getElementById('decrease-qty');
        increaseQtyButton = document.getElementById('increase-qty');

        debugLog("🔗 DOM要素取得完了");

        // 【修正】イベントリスナーの設定
        setupEventListeners();

        // LIFF初期化
        initializeLiff();
    });

    function setupEventListeners() {
        debugLog("🔗 イベントリスナー設定開始");

        // 【修正】モーダル閉じるボタンのイベントリスナー
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', closeModal);
            debugLog("✅ モーダル閉じるボタンのイベントリスナー設定完了");
        } else {
            debugLog("❌ モーダル閉じるボタンが見つかりません");
        }

        // 【修正】モーダル背景クリックで閉じる機能
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', function(e) {
                if (e.target === modalBackdrop) {
                    debugLog("🛒 モーダル背景クリックで閉じる");
                    closeModal();
                }
            });
            debugLog("✅ モーダル背景クリックイベントリスナー設定完了");
        } else {
            debugLog("❌ モーダル背景要素が見つかりません");
        }

        // 【修正】注文確認ボタンのイベントリスナー
        if (confirmOrderButton) {
            confirmOrderButton.addEventListener('click', submitOrder);
            debugLog("✅ 注文確認ボタンのイベントリスナー設定完了");
        } else {
            debugLog("❌ 注文確認ボタンが見つかりません");
        }

        // 数量調整ボタンのイベントリスナー
        if (decreaseQtyButton) {
            decreaseQtyButton.addEventListener('click', () => {
                let qty = parseInt(document.getElementById('quantity').textContent, 10);
                if (qty > 1) {
                    document.getElementById('quantity').textContent = --qty;
                    updateModalPrice();
                }
            });
            debugLog("✅ 数量減少ボタンのイベントリスナー設定完了");
        }

        if (increaseQtyButton) {
            increaseQtyButton.addEventListener('click', () => {
                let qty = parseInt(document.getElementById('quantity').textContent, 10);
                document.getElementById('quantity').textContent = ++qty;
                updateModalPrice();
            });
            debugLog("✅ 数量増加ボタンのイベントリスナー設定完了");
        }

        // カートに追加ボタンのイベントリスナー
        if (addToCartButton) {
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
            debugLog("✅ カートに追加ボタンのイベントリスナー設定完了");
        }

        debugLog("🔗 全イベントリスナー設定完了");
    }

    function initializeLiff() {
        debugLog("🔄 LIFF初期化開始");
        
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
                if (loadingIndicator) {
                    loadingIndicator.textContent = "LIFF初期化失敗";
                }
            });
    }

    async function fetchMenuData() {
        if (GAS_API_URL === "YOUR_FINAL_GAS_URL_HERE") {
            debugLog("❌ GAS_API_URLが設定されていません");
            if (loadingIndicator) {
                loadingIndicator.textContent = "GAS_API_URLが設定されていません。";
            }
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
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            debugLog("✅ メニュー表示完了");
        } catch (error) {
            debugLog(`❌ メニュー取得失敗: ${error.message}`);
            console.error("Fetch menu failed:", error);
            if (loadingIndicator) {
                loadingIndicator.textContent = `メニュー読込失敗: ${error.message}`;
            }
        }
    }

    function displayMenu(items) {
        if (!menuContainer) {
            debugLog("❌ メニューコンテナが見つかりません");
            return;
        }
        
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
        debugLog(`📋 メニュー表示完了: ${items.length}件`);
    }

    function openModal(item) {
        debugLog(`🛒 商品詳細モーダル開く: ${item.name}`);
        
        if (!modalBackdrop) {
            debugLog("❌ モーダル背景要素が見つかりません");
            return;
        }
        
        currentItem = item;
        
        // モーダル内容の設定
        const modalName = document.getElementById('modal-name');
        const modalDescription = document.getElementById('modal-description');
        const modalImage = document.getElementById('modal-image');
        
        if (modalName) modalName.textContent = item.name;
        if (modalDescription) modalDescription.textContent = item.description || '';
        if (modalImage) modalImage.src = item.imageUrl || 'https://placehold.co/400x240/eee/ccc?text=No+Image';

        // オプション選択肢の設定
        const optionSelector = document.getElementById('option-selector');
        if (optionSelector) {
            optionSelector.innerHTML = '';
            const options = [
                { key: 'regular', name: '普通盛り', price: item.price_regular },
                { key: 'large', name: '大盛り', price: item.price_large },
                { key: 'small', name: '小盛り', price: item.price_small },
                { key: 'side_only', name: 'おかずのみ', price: item.price_side_only },
            ];
            options.forEach((opt, index) => {
                if (opt.price !== undefined && opt.price !== null) {
                    const checked = index === 0 ? 'checked' : '';
                    optionSelector.innerHTML += `<div class="option-item"><input type="radio" id="opt_${opt.key}" name="price_option" value="${opt.key}" data-price="${opt.price}" ${checked}><label for="opt_${opt.key}">${opt.name} (¥${opt.price})</label></div>`;
                }
            });
            
            // オプション変更時のイベントリスナー設定
            document.getElementsByName('price_option').forEach(r => r.addEventListener('change', updateModalPrice));
        }
        
        // 数量を1にリセット
        const quantityElement = document.getElementById('quantity');
        if (quantityElement) {
            quantityElement.textContent = '1';
        }
        
        updateModalPrice();
        
        // 【修正】モーダル表示
        modalBackdrop.classList.add('visible');
        debugLog("✅ モーダル表示完了");
    }

    function closeModal() {
        debugLog("🛒 商品詳細モーダル閉じる");
        if (modalBackdrop) {
            modalBackdrop.classList.remove('visible');
            debugLog("✅ モーダル非表示完了");
        } else {
            debugLog("❌ モーダル背景要素が見つかりません");
        }
    }

    function updateModalPrice() {
        const selOpt = document.querySelector('input[name="price_option"]:checked');
        const quantityElement = document.getElementById('quantity');
        const modalPriceElement = document.getElementById('modal-price');
        
        if (selOpt && quantityElement && modalPriceElement) {
            const qty = parseInt(quantityElement.textContent, 10);
            const price = parseInt(selOpt.dataset.price, 10) * qty;
            modalPriceElement.textContent = price;
            debugLog(`💰 モーダル価格更新: ¥${price}`);
        }
    }

    function updateCartView() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        
        const cartItemCountElement = document.getElementById('cart-item-count');
        const cartTotalPriceElement = document.getElementById('cart-total-price');
        
        if (cartItemCountElement) cartItemCountElement.textContent = totalItems;
        if (cartTotalPriceElement) cartTotalPriceElement.textContent = totalPrice;
        
        if (confirmOrderButton) {
            confirmOrderButton.disabled = cart.length === 0;
        }
        
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
        if (confirmOrderButton) {
            confirmOrderButton.disabled = true;
            confirmOrderButton.textContent = '注文処理中...';
        }

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
            
            debugLog(`📡 送信オプション: ${JSON.stringify(fetchOptions)}`);
            
            const response = await fetch(GAS_API_URL, fetchOptions);
            debugLog(`📡 GASレスポンス status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`サーバー応答エラー: ${response.status} ${response.statusText}`);
            }
            
            const responseText = await response.text();
            debugLog(`📡 GASレスポンステキスト: ${responseText}`);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                debugLog(`❌ JSON解析エラー: ${parseError.message}`);
                debugLog(`📡 生レスポンス: ${responseText}`);
                throw new Error(`レスポンス解析失敗: ${parseError.message}`);
            }
            
            debugLog(`📡 解析済みレスポンス: ${JSON.stringify(result)}`);
            
            if (result.success) {
                debugLog("✅ 注文送信成功");
                cart = [];
                updateCartView();
                
                // 成功メッセージ表示
                alert('注文が正常に送信されました！');
                
                // サンクスページへリダイレクト（可能な場合）
                if (liff.isInClient()) {
                    liff.closeWindow();
                } else {
                    window.location.href = 'thankyou.html';
                }
            } else {
                throw new Error(result.error || '注文処理に失敗しました');
            }
            
        } catch (error) {
            debugLog(`❌ 注文送信失敗: ${error.message}`);
            console.error("Submit order failed:", error);
            alert(`注文送信に失敗しました: ${error.message}`);
        } finally {
            // ボタンを元に戻す
            if (confirmOrderButton) {
                confirmOrderButton.disabled = cart.length === 0;
                confirmOrderButton.textContent = '注文を確定する';
            }
        }
    }

    // LINEメッセージ送信（可能な場合のみ）
    async function sendLineMessageIfPossible(orderData) {
        try {
            if (!liff.isInClient()) {
                debugLog("📱 LINEクライアント外のため、メッセージ送信をスキップ");
                return;
            }

            const message = {
                type: 'text',
                text: `🍱 お弁当注文\n\n${orderData.orderDetails}\n\n合計: ¥${orderData.totalPrice}\n注文ID: ${orderData.orderId}`
            };

            await liff.sendMessages([message]);
            debugLog("📱 LINEメッセージ送信成功");
        } catch (error) {
            debugLog(`📱 LINEメッセージ送信失敗: ${error.message}`);
            // メッセージ送信失敗は致命的エラーではないので続行
        }
    }

})();
