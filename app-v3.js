document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz2NwKKzMTRHALP5Ue6__YLCdmThoN4z6d9_o2mzYez2HxTFvBmg7leanHKQ-zVKn1L/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---

    // デバッグ機能
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
            display: block;
        `;
        document.body.appendChild(debugLogArea);
        
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'DEBUG';
        toggleButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            background: green;
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
        
        while (debugLogArea.children.length > 100) {
            debugLogArea.removeChild(debugLogArea.firstChild);
        }
    }

    let menuData = [];
    let cart = [];
    let currentItem = null;
    let loadingIndicator, menuContainer, modalBackdrop, confirmOrderButton, addToCartButton, modalCloseButton, decreaseQtyButton, increaseQtyButton;

    debugLog("🚀 LIFF App Start");

    document.addEventListener('DOMContentLoaded', function() {
        debugLog("📄 DOM Loaded");
        
        loadingIndicator = document.getElementById('loading-indicator');
        menuContainer = document.getElementById('menu-container');
        modalBackdrop = document.getElementById('modal-backdrop');
        confirmOrderButton = document.getElementById('confirm-order-button');
        addToCartButton = document.getElementById('add-to-cart-button');
        modalCloseButton = document.getElementById('modal-close-button');
        decreaseQtyButton = document.getElementById('decrease-qty');
        increaseQtyButton = document.getElementById('increase-qty');

        setupEventListeners();
        initializeLiff();
    });

    function setupEventListeners() {
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', closeModal);
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', function(e) {
                if (e.target === modalBackdrop) {
                    closeModal();
                }
            });
        }

        if (confirmOrderButton) {
            confirmOrderButton.addEventListener('click', submitOrder);
        }

        if (decreaseQtyButton) {
            decreaseQtyButton.addEventListener('click', () => {
                let qty = parseInt(document.getElementById('quantity').textContent, 10);
                if (qty > 1) {
                    document.getElementById('quantity').textContent = --qty;
                    updateModalPrice();
                }
            });
        }

        if (increaseQtyButton) {
            increaseQtyButton.addEventListener('click', () => {
                let qty = parseInt(document.getElementById('quantity').textContent, 10);
                document.getElementById('quantity').textContent = ++qty;
                updateModalPrice();
            });
        }

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
        }
    }

    function initializeLiff() {
        debugLog("🔄 LIFF初期化開始");
        
        liff.init({ liffId: MAIN_LIFF_ID })
            .then(() => {
                debugLog("✅ LIFF初期化成功");
                debugLog(`🔐 ログイン状態: ${liff.isLoggedIn()}`);
                debugLog(`📱 LIFFクライアント: ${liff.isInClient()}`);
                
                // 【重要】GAS接続テストを先に実行
                testGASConnection();
            })
            .catch((err) => { 
                debugLog(`❌ LIFF初期化失敗: ${err.message}`);
                // LIFF初期化に失敗してもメニューデータ取得を試行
                testGASConnection();
            });
    }

    // 【新規追加】GAS接続テスト関数
    async function testGASConnection() {
        debugLog("📡 GAS接続テスト開始");
        debugLog(`📡 URL: ${GAS_API_URL}`);
        
        try {
            // シンプルなGETリクエストでテスト
            const response = await fetch(GAS_API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            debugLog(`📡 GASレスポンス: ${response.status}`);
            
            if (response.ok) {
                const text = await response.text();
                debugLog(`📡 GASレスポンステキスト: ${text.substring(0, 200)}...`);
                
                try {
                    const data = JSON.parse(text);
                    debugLog(`📡 JSON解析成功: ${Array.isArray(data) ? data.length : typeof data}`);
                    
                    if (Array.isArray(data) && data.length > 0) {
                        menuData = data;
                        displayMenu(menuData);
                        if (loadingIndicator) {
                            loadingIndicator.style.display = 'none';
                        }
                        debugLog("✅ メニュー表示成功");
                        return;
                    }
                } catch (parseError) {
                    debugLog(`❌ JSON解析エラー: ${parseError.message}`);
                }
            }
            
            // GAS接続に問題がある場合、固定メニューを表示
            showFallbackMenu();
            
        } catch (error) {
            debugLog(`❌ GAS接続エラー: ${error.message}`);
            showFallbackMenu();
        }
    }

    // 【新規追加】フォールバックメニュー表示
    function showFallbackMenu() {
        debugLog("🔄 フォールバックメニュー表示");
        
        const fallbackMenu = [
            {
                id: 1,
                name: "日替り弁当",
                price_regular: 500,
                price_large: 600,
                price_small: 400,
                price_side_only: 300,
                description: "本日のおすすめ弁当",
                imageUrl: "https://placehold.co/300x240/4CAF50/white?text=日替り弁当",
                isAvailable: true
            },
            {
                id: 2,
                name: "油淋鶏弁当",
                price_regular: 600,
                price_large: 700,
                price_small: 500,
                price_side_only: 400,
                description: "人気の油淋鶏弁当",
                imageUrl: "https://placehold.co/300x240/FF9800/white?text=油淋鶏弁当",
                isAvailable: true
            },
            {
                id: 3,
                name: "チキン南蛮弁当",
                price_regular: 600,
                price_large: 700,
                price_small: 500,
                price_side_only: 400,
                description: "タルタルソースたっぷり",
                imageUrl: "https://placehold.co/300x240/2196F3/white?text=チキン南蛮弁当",
                isAvailable: true
            },
            {
                id: 4,
                name: "塩唐揚げ弁当",
                price_regular: 500,
                price_large: 600,
                price_small: 400,
                price_side_only: 300,
                description: "あっさり塩味の唐揚げ",
                imageUrl: "https://placehold.co/300x240/9C27B0/white?text=塩唐揚げ弁当",
                isAvailable: true
            },
            {
                id: 5,
                name: "ハムカツ弁当",
                price_regular: 500,
                price_large: 600,
                price_small: 400,
                price_side_only: 300,
                description: "サクサクハムカツ",
                imageUrl: "https://placehold.co/300x240/FF5722/white?text=ハムカツ弁当",
                isAvailable: true
            }
        ];
        
        menuData = fallbackMenu;
        displayMenu(menuData);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        debugLog("✅ フォールバックメニュー表示完了");
    }

    function displayMenu(items) {
        if (!menuContainer) {
            debugLog("❌ メニューコンテナが見つかりません");
            return;
        }
        
        debugLog(`📋 メニュー表示: ${items.length}件`);
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
        
        const modalName = document.getElementById('modal-name');
        const modalDescription = document.getElementById('modal-description');
        const modalImage = document.getElementById('modal-image');
        
        if (modalName) modalName.textContent = item.name;
        if (modalDescription) modalDescription.textContent = item.description || '';
        if (modalImage) modalImage.src = item.imageUrl || 'https://placehold.co/400x240/eee/ccc?text=No+Image';

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
            
            document.getElementsByName('price_option').forEach(r => r.addEventListener('change', updateModalPrice));
        }
        
        const quantityElement = document.getElementById('quantity');
        if (quantityElement) {
            quantityElement.textContent = '1';
        }
        
        updateModalPrice();
        modalBackdrop.classList.add('visible');
        debugLog("✅ モーダル表示完了");
    }

    function closeModal() {
        debugLog("🛒 商品詳細モーダル閉じる");
        if (modalBackdrop) {
            modalBackdrop.classList.remove('visible');
            debugLog("✅ モーダル非表示完了");
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

    async function submitOrder() {
        if (cart.length === 0) {
            debugLog("❌ カートが空です");
            return;
        }
        
        debugLog("🚀 注文処理開始");
        
        if (confirmOrderButton) {
            confirmOrderButton.disabled = true;
            confirmOrderButton.textContent = '注文処理中...';
        }

        try {
            debugLog(`🔐 ログイン状態確認: ${liff.isLoggedIn()}`);
            if (!liff.isLoggedIn()) {
                debugLog("❌ ユーザーがログインしていません。ログインページにリダイレクト");
                liff.login();
                return; 
            }
            
            debugLog("👤 ユーザープロフィール取得開始");
            const profile = await liff.getProfile();
            const userId = profile.userId;
            const displayName = profile.displayName;
            debugLog(`👤 ユーザー情報取得成功: ${displayName} (${userId})`);

            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            const orderData = {
                orderId: new Date().getTime().toString() + Math.random().toString(36).substring(2, 8),
                userId: userId,
                displayName: displayName,
                orderDetails: orderDetailsText.trim(),
                totalPrice: totalPrice
            };
            
            debugLog(`📦 送信する注文データ: ${JSON.stringify(orderData)}`);

            await sendLineMessageIfPossible(orderData);

            debugLog(`📡 GASにリクエスト送信開始: ${GAS_API_URL}`);
            
            const fetchOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            };
            
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
                throw new Error(`レスポンス解析失敗: ${parseError.message}`);
            }
            
            debugLog(`📡 解析済みレスポンス: ${JSON.stringify(result)}`);
            
            if (result.success || result.status === 'success') {
                debugLog("✅ 注文送信成功");
                cart = [];
                updateCartView();
                
                alert('注文が正常に送信されました！');
                
                if (liff.isInClient()) {
                    liff.closeWindow();
                } else {
                    window.location.href = 'thankyou.html';
                }
            } else {
                throw new Error(result.error || result.message || '注文処理に失敗しました');
            }
            
        } catch (error) {
            debugLog(`❌ 注文送信失敗: ${error.message}`);
            console.error("Submit order failed:", error);
            alert(`注文送信に失敗しました: ${error.message}`);
        } finally {
            if (confirmOrderButton) {
                confirmOrderButton.disabled = cart.length === 0;
                confirmOrderButton.textContent = '注文を確定する';
            }
        }
    }

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
        }
    }

})();
