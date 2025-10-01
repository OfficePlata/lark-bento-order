document.addEventListener('DOMContentLoaded', function() {
    // --- 設定項目 ---
    // ステップ3で取得した「メイン注文用」のLIFF IDを設定
    const MAIN_LIFF_ID = "2008199273-3ogv1YME";
    // ステップ2で取得したGASのウェブアプリURLを設定
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyfa5MloSmfy15CqXLxvlhzVnjV75Ghx4uV3RE1gqfD-VSq3Cwan_wShv0r1FFLV7uw/exec";
    // ステップ5で確定するLarkフォームの共有URLを設定
    const LARK_FORM_URL = "https://yjpw4ydvu698.jp.larksuite.com/share/base/form/shrjprndeQ1HbiZyHWfSXVgazTf";
    // --- 設定項目ここまで ---
    // グローバル変数
    let menuData = [];
    let cart = [];
    let currentItem = null;

    // DOM要素
    const loadingIndicator = document.getElementById('loading-indicator');
    const menuContainer = document.getElementById('menu-container');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
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
            { key: 'small', name: '小盛り', price: item.price_small },
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

    
    // 注文確定処理
    async function confirmOrderAndRedirect() {
        if (cart.length === 0) return;

        try {
            if (!liff.isInClient()) {
                alert("この機能はLINEアプリ内でのみ利用可能です。\nPCでテストしている場合、このメッセージが表示されるのは正常な動作です。\n実際の動作は、スマートフォンにURLを送ってご確認ください。");
                return;
            }
            if (!liff.isLoggedIn()) {
                alert("LINEログインが必要です。\nOKを押すとログインします。");
                liff.login();
                return;
            }
            
            const profile = await liff.getProfile();
            
            let orderDetailsText = '';
            cart.forEach(item => {
                orderDetailsText += `${item.name} (${item.option.name}) x ${item.quantity}\n`;
            });
            const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
            
            const fullOrderTextForMessage = `${orderDetailsText}\n合計金額: ${totalPrice}円`;
            localStorage.setItem('bentoOrderData', JSON.stringify({ text: fullOrderTextForMessage }));

            // --- ▼▼▼ ここを修正しました ▼▼▼ ---
            // あなたのLarkフォームに合わせて、正しいフィールドIDを設定しました。
            const params = new URLSearchParams();
            params.set('fldG7V4s2n', profile.userId);         // 「LINEユーザーID」のフィールドID
            params.set('fldxqy5nOt', profile.displayName);    // 「LINE表示名」のフィールドID
            params.set('fldS3gP5O2', orderDetailsText.trim()); // 「注文詳細」のフィールドID
            params.set('fldnY5nS4R', totalPrice);             // 「合計金額」のフィールドID
            // --- ▲▲▲ ここまで修正 ▲▲▲ ---

            const finalUrl = `${LARK_FORM_URL}?${params.toString()}`;

            liff.openWindow({ url: finalUrl, external: true });

        } catch (error) {
            console.error('Failed to process order:', error);
            alert('処理中にエラーが発生しました。もう一度お試しください。');
        }
    }
    

    // イベントリスナー設定
    modalCloseButton.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    confirmOrderButton.addEventListener('click', confirmOrderAndRedirect);
});
