document.addEventListener('DOMContentLoaded', function() {
    // --- ▼▼▼ 最終設定項目 ▼▼▼ ---
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // 【重要】デプロイしたGASのURLをここに設定してください
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz2NwKKzMTRHALP5Ue6__YLCdmThoN4z6d9_o2mzYez2HxTFvBmg7leanHKQ-zVKn1L/exec";
    // --- ▲▲▲ 最終設定項目 ▲▲▲ ---

    // 【強化】モバイル環境での問題解決用デバッグ機能
    let debugLogArea = null;
    let debugVisible = false;
    
    function createDebugLogArea() {
        if (debugLogArea) return;
        
        debugLogArea = document.createElement('div');
        debugLogArea.id = 'debug-log-area';
        debugLogArea.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 250px;
            background: rgba(0,0,0,0.95);
            color: #00ff00;
            font-family: monospace;
            font-size: 10px;
            padding: 8px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            border-bottom: 2px solid #00ff00;
            box-sizing: border-box;
        `;
        document.body.appendChild(debugLogArea);
        
        // デバッグエリアの表示/非表示切り替えボタン
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'DEBUG';
        toggleButton.style.cssText = `
            position: fixed;
            top: 5px;
            right: 5px;
            z-index: 10001;
            background: red;
            color: white;
            border: none;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 3px;
            cursor: pointer;
            min-width: 50px;
        `;
        toggleButton.onclick = () => {
            debugVisible = !debugVisible;
            debugLogArea.style.display = debugVisible ? 'block' : 'none';
            toggleButton.style.background = debugVisible ? 'green' : 'red';
        };
        document.body.appendChild(toggleButton);

        // 【重要】スマホ環境では自動的にデバッグエリアを表示
        setTimeout(() => {
            debugVisible = true;
            debugLogArea.style.display = 'block';
            toggleButton.style.background = 'green';
        }, 500);
    }
    
    function debugLog(message) {
        console.log(message);
        
        if (!debugLogArea) createDebugLogArea();
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logEntry.style.marginBottom = '1px';
        logEntry.style.fontSize = '10px';
        debugLogArea.appendChild(logEntry);
        debugLogArea.scrollTop = debugLogArea.scrollHeight;
        
        // 最大200行まで保持
        while (debugLogArea.children.length > 200) {
            debugLogArea.removeChild(debugLogArea.firstChild);
        }
    }

    // 【強化】エラーハンドリング
    window.addEventListener('error', function(e) {
        debugLog(`❌ JS Error: ${e.message} at ${e.filename}:${e.lineno}`);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        debugLog(`❌ Promise Rejection: ${e.reason}`);
    });

    let menuData = [];
    let cart = [];
    let currentItem = null;
    
    // DOM要素の取得（DOMContentLoadedで実行）
    let loadingIndicator, menuContainer, modalBackdrop, confirmOrderButton, addToCartButton, modalCloseButton, decreaseQtyButton, increaseQtyButton;

    debugLog("🚀 LIFF App Start");
    debugLog(`📱 UA: ${navigator.userAgent.substring(0, 50)}...`);
    debugLog(`🌐 URL: ${window.location.href}`);
    debugLog(`📡 GAS: ${GAS_API_URL.substring(0, 50)}...`);

    // 【追加】ネットワーク状態の確認
    if ('navigator' in window && 'onLine' in navigator) {
        debugLog(`🌐 Network: ${navigator.onLine ? 'Online' : 'Offline'}`);
    }

    // 【追加】画面サイズの確認
    debugLog(`📱 Screen: ${window.screen.width}x${window.screen.height}`);
    debugLog(`📱 Viewport: ${window.innerWidth}x${window.innerHeight}`);

    // DOMContentLoadedイベントでDOM要素を取得し、イベントリスナーを設定
    document.addEventListener('DOMContentLoaded', function() {
        debugLog("📄 DOM Loaded");
        
        // DOM要素の取得
        loadingIndicator = document.getElementById('loading-indicator');
        menuContainer = document.getElementById('menu-container');
        modalBackdrop = document.getElementById('modal-backdrop');
        confirmOrderButton = document.getElementById('confirm-order-button');
        addToCartButton = document.getElementById('add-to-cart-button');
        modalCloseButton = document.getElementById('modal-close-button');
        decreaseQtyButton = document.getElementById('decrease-qty');
        increaseQtyButton = document.getElementById('increase-qty');

        debugLog("🔗 DOM Elements Found");

        // イベントリスナーの設定
        setupEventListeners();

        // LIFF初期化
        initializeLiff();
    });

    function setupEventListeners() {
        debugLog("🔗 Setup Event Listeners");

        // モーダル閉じるボタンのイベントリスナー
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', closeModal);
            debugLog("✅ Modal Close Button OK");
        } else {
            debugLog("❌ Modal Close Button NG");
        }

        // モーダル背景クリックで閉じる機能
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', function(e) {
                if (e.target === modalBackdrop) {
                    debugLog("🛒 Modal BG Click Close");
                    closeModal();
                }
            });
            debugLog("✅ Modal BG Click OK");
        } else {
            debugLog("❌ Modal BG NG");
        }

        // 注文確認ボタンのイベントリスナー
        if (confirmOrderButton) {
            confirmOrderButton.addEventListener('click', submitOrder);
            debugLog("✅ Confirm Button OK");
        } else {
            debugLog("❌ Confirm Button NG");
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
            debugLog("✅ Decrease Button OK");
        }

        if (increaseQtyButton) {
            increaseQtyButton.addEventListener('click', () => {
                let qty = parseInt(document.getElementById('quantity').textContent, 10);
                document.getElementById('quantity').textContent = ++qty;
                updateModalPrice();
            });
            debugLog("✅ Increase Button OK");
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
                debugLog(`🛒 Add to Cart: ${currentItem.name} x ${qty}`);
                updateCartView();
                closeModal();
            });
            debugLog("✅ Add to Cart Button OK");
        }

        debugLog("🔗 All Event Listeners Set");
    }

    function initializeLiff() {
        debugLog("🔄 LIFF Init Start");
        
        // 【重要】LIFF初期化前にタイムアウトを設定
        const liffTimeout = setTimeout(() => {
            debugLog("⏰ LIFF Init Timeout (10s)");
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div style="color: red; text-align: center;">
                        <p>LIFF初期化がタイムアウトしました</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">再読み込み</button>
                    </div>
                `;
            }
        }, 10000);
        
        liff.init({ liffId: MAIN_LIFF_ID })
            .then(() => {
                clearTimeout(liffTimeout);
                debugLog("✅ LIFF Init Success");
                debugLog(`🔐 Login: ${liff.isLoggedIn()}`);
                debugLog(`📱 InClient: ${liff.isInClient()}`);
                debugLog(`🔧 OS: ${liff.getOS()}`);
                debugLog(`📊 Lang: ${liff.getLanguage()}`);
                debugLog(`🎯 Ver: ${liff.getVersion()}`);
                
                // 【重要】メニューデータ取得を少し遅延実行
                setTimeout(() => {
                    fetchMenuData();
                }, 1000);
            })
            .catch((err) => { 
                clearTimeout(liffTimeout);
                debugLog(`❌ LIFF Init Failed: ${err.message}`);
                console.error("LIFF init failed.", err);
                if (loadingIndicator) {
                    loadingIndicator.innerHTML = `
                        <div style="color: red; text-align: center;">
                            <p>LIFF初期化失敗</p>
                            <p style="font-size: 12px;">${err.message}</p>
                            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">再読み込み</button>
                        </div>
                    `;
                }
            });
    }

    // 【大幅強化】メニューデータ取得関数
    async function fetchMenuData() {
        if (GAS_API_URL === "YOUR_FINAL_GAS_URL_HERE") {
            debugLog("❌ GAS URL Not Set");
            if (loadingIndicator) {
                loadingIndicator.textContent = "GAS_API_URLが設定されていません。";
            }
            return;
        }

        debugLog(`📡 Fetch Menu Start`);
        debugLog(`📡 URL: ${GAS_API_URL}`);
        
        try {
            // 【重要】リクエスト前の詳細チェック
            debugLog(`📡 URL Check: ${GAS_API_URL.startsWith('https://') ? 'HTTPS OK' : 'HTTP/HTTPS NG'}`);
            
            // 【重要】タイムアウト付きfetch（20秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                debugLog("⏰ Fetch Timeout (20s)");
            }, 20000);

            debugLog(`📡 Sending Request...`);
            
            // 【重要】リクエストオプションを明示的に設定
            const fetchOptions = {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                // 【追加】モバイル環境での問題対策
                mode: 'cors',
                credentials: 'omit'
            };
            
            debugLog(`📡 Options: ${JSON.stringify(fetchOptions)}`);
            
            const response = await fetch(GAS_API_URL, fetchOptions);
            
            clearTimeout(timeoutId);
            debugLog(`📡 Response: status=${response.status}, ok=${response.ok}`);
            debugLog(`📡 Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
            
            if (!response.ok) {
                throw new Error(`Server Error: ${response.status} ${response.statusText}`);
            }
            
            debugLog(`📡 Getting Text...`);
            const responseText = await response.text();
            debugLog(`📡 Text Length: ${responseText.length}`);
            debugLog(`📡 Text Preview: ${responseText.substring(0, 100)}...`);
            
            debugLog(`📡 Parsing JSON...`);
            menuData = JSON.parse(responseText);
            debugLog(`📡 Parsed: ${Array.isArray(menuData) ? menuData.length : typeof menuData} items`);
            
            if (menuData.error) {
                throw new Error(menuData.message || menuData.error);
            }

            if (!Array.isArray(menuData)) {
                throw new Error(`Menu data is not array: ${typeof menuData}`);
            }

            if (menuData.length === 0) {
                throw new Error('Menu data is empty');
            }

            debugLog(`📡 Menu Sample: ${JSON.stringify(menuData[0])}`);
            
            displayMenu(menuData);
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            debugLog("✅ Menu Display Complete");
            
        } catch (error) {
            debugLog(`❌ Menu Fetch Failed: ${error.message}`);
            debugLog(`❌ Error Type: ${error.name}`);
            debugLog(`❌ Error Stack: ${error.stack || 'No stack'}`);
            console.error("Fetch menu failed:", error);
            
            // 【重要】エラー時の詳細表示とフォールバック
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div style="color: red; font-size: 14px; text-align: center; padding: 20px;">
                        <h3>メニュー読込失敗</h3>
                        <p style="font-size: 12px; margin: 10px 0;">${error.message}</p>
                        <button onclick="location.reload()" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px;">再読み込み</button>
                        <button onclick="showFallbackMenu()" style="margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px;">テストメニュー表示</button>
                    </div>
                `;
            }

            // 【追加】5秒後に自動的にフォールバックメニューを表示
            setTimeout(() => {
                showFallbackMenu();
            }, 5000);
        }
    }

    // 【追加】フォールバック用メニュー表示関数
    window.showFallbackMenu = function() {
        debugLog("🔄 Show Fallback Menu");
        const fallbackMenu = [
            {
                id: 1,
                name: "テスト弁当（フォールバック）",
                price_regular: 500,
                price_large: 600,
                price_small: 400,
                price_side_only: 300,
                description: "ネットワークエラー時のテスト用メニュー",
                imageUrl: "https://placehold.co/300x240/FF6B6B/white?text=TEST+MENU",
                isAvailable: true
            },
            {
                id: 2,
                name: "緊急用弁当",
                price_regular: 450,
                price_large: 550,
                price_small: 350,
                price_side_only: 250,
                description: "システム復旧までの緊急用メニュー",
                imageUrl: "https://placehold.co/300x240/4ECDC4/white?text=EMERGENCY",
                isAvailable: true
            }
        ];
        
        displayMenu(fallbackMenu);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    };

    function displayMenu(items) {
        if (!menuContainer) {
            debugLog("❌ Menu Container Not Found");
            return;
        }
        
        debugLog(`📋 Display Menu: ${items.length} items`);
        menuContainer.innerHTML = '';
        
        items.forEach((item, index) => {
            debugLog(`📋 Item ${index + 1}: ${item.name}`);
            const itemElement = document.createElement('div');
            itemElement.className = 'grid-item';
            itemElement.innerHTML = `
                <img src="${item.imageUrl || 'https://placehold.co/300x240/eee/ccc?text=No+Image'}" alt="${item.name}" loading="lazy">
                <div class="item-info">
                    <p class="item-name">${item.name}</p>
                    <p class="item-price">¥${item.price_regular}</p>
                </div>
            `;
            itemElement.addEventListener('click', () => openModal(item));
            menuContainer.appendChild(itemElement);
        });
        debugLog(`📋 Menu Display Complete: ${items.length} items`);
    }

    function openModal(item) {
        debugLog(`🛒 Open Modal: ${item.name}`);
        
        if (!modalBackdrop) {
            debugLog("❌ Modal Backdrop Not Found");
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
        
        // モーダル表示
        modalBackdrop.classList.add('visible');
        debugLog("✅ Modal Opened");
    }

    function closeModal() {
        debugLog("🛒 Close Modal");
        if (modalBackdrop) {
            modalBackdrop.classList.remove('visible');
            debugLog("✅ Modal Closed");
        } else {
            debugLog("❌ Modal Backdrop Not Found");
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
            debugLog(`💰 Price Update: ¥${price}`);
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
        
        debugLog(`🛒 Cart Update: ${totalItems} items / ¥${totalPrice}`);
    }

    // submitOrder関数とsendLineMessageIfPossible関数（既存のコードと同じ）
    async function submitOrder() {
        if (cart.length === 0) {
            debugLog("❌ Cart Empty");
            return;
        }
        
        debugLog("🚀 Submit Order Start");
        
        // ボタンを無効化してローディング状態にする
        if (confirmOrderButton) {
            confirmOrderButton.disabled = true;
            confirmOrderButton.textContent = '注文処理中...';
        }

        try {
            // ログイン確認
            debugLog(`🔐 Login Check: ${liff.isLoggedIn()}`);
            if (!liff.isLoggedIn()) {
                debugLog("❌ Not Logged In - Redirect to Login");
                liff.login();
                return; 
            }
            
            // ユーザー情報の取得
            debugLog("👤 Get Profile Start");
            const profile = await liff.getProfile();
            const userId = profile.userId;
            const displayName = profile.displayName;
            debugLog(`👤 Profile OK: ${displayName} (${userId})`);

            // 注文詳細の準備
            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // 注文データの準備
            const orderData = {
                orderId: new Date().getTime().toString() + Math.random().toString(36).substring(2, 8),
                userId: userId,
                displayName: displayName,
                orderDetails: orderDetailsText.trim(),
                totalPrice: totalPrice
            };
            
            debugLog(`📦 Order Data: ${JSON.stringify(orderData)}`);

            // LINEメッセージ送信（可能な場合のみ）
            await sendLineMessageIfPossible(orderData);

            // GASへのリクエスト送信
            debugLog(`📡 Send to GAS: ${GAS_API_URL}`);
            
            const fetchOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            };
            
            debugLog(`📡 POST Options: ${JSON.stringify(fetchOptions)}`);
            
            const response = await fetch(GAS_API_URL, fetchOptions);
            debugLog(`📡 GAS Response: status=${response.status}`);
            
            if (!response.ok) {
                throw new Error(`Server Error: ${response.status} ${response.statusText}`);
            }
            
            const responseText = await response.text();
            debugLog(`📡 GAS Response Text: ${responseText}`);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                debugLog(`❌ JSON Parse Error: ${parseError.message}`);
                debugLog(`📡 Raw Response: ${responseText}`);
                throw new Error(`Response Parse Failed: ${parseError.message}`);
            }
            
            debugLog(`📡 Parsed Response: ${JSON.stringify(result)}`);
            
            if (result.success || result.status === 'success') {
                debugLog("✅ Order Success");
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
                throw new Error(result.error || result.message || '注文処理に失敗しました');
            }
            
        } catch (error) {
            debugLog(`❌ Order Failed: ${error.message}`);
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
                debugLog("📱 Not In Client - Skip Message");
                return;
            }

            const message = {
                type: 'text',
                text: `🍱 お弁当注文\n\n${orderData.orderDetails}\n\n合計: ¥${orderData.totalPrice}\n注文ID: ${orderData.orderId}`
            };

            await liff.sendMessages([message]);
            debugLog("📱 LINE Message Sent");
        } catch (error) {
            debugLog(`📱 LINE Message Failed: ${error.message}`);
            // メッセージ送信失敗は致命的エラーではないので続行
        }
    }

})();
