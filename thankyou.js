document.addEventListener('DOMContentLoaded', function() {
    // --- 設定項目 ---
    // ステップ3で取得した「サンキューページ用」のLIFF IDを設定
    const THANK_YOU_LIFF_ID = "2008199273-K03J1NOr";
    // --- 設定項目ここまで ---

    if (!THANK_YOU_LIFF_ID || THANK_YOU_LIFF_ID === "YOUR_THANK_YOU_LIFF_ID") {
        document.body.innerHTML = "<h1>エラー: LIFF IDが設定されていません。</h1><p>thankyou.jsファイルを修正してください。</p>";
        return;
    }
    
    liff.init({ liffId: THANK_YOU_LIFF_ID })
        .then(() => {
            sendConfirmationMessage();
        })
        .catch((err) => {
            console.error("LIFF initialization failed for thank you page.", err);
            alert('エラーが発生しました。LIFFの初期化に失敗しました。');
        });
});

async function sendConfirmationMessage() {
    // 1. localStorageから注文情報を取得
    const storedData = localStorage.getItem('bentoOrderData');
    if (!storedData) {
        console.warn("No order data found in localStorage.");
        // データがない場合でも、ユーザー体験のためにウィンドウを閉じる
        if (liff.isInClient()) {
            liff.closeWindow();
        }
        return;
    }

    try {
        const orderData = JSON.parse(storedData);
        
        // 2. 送信するメッセージを組み立てる
        const message = `ご注文を受け付けました。\n\n---ご注文内容---\n${orderData.text}\n\nお作りして準備ができましたら、改めてご連絡いたします。`;

        // 3. liff.sendMessages() を使ってメッセージを送信
        if (liff.isInClient() && liff.isApiAvailable('shareTargetPicker')) {
             await liff.sendMessages([
                {
                    type: 'text',
                    text: message
                }
            ]);
            console.log('Message sent successfully.');
            // 送信成功後、localStorageのデータを削除
            localStorage.removeItem('bentoOrderData');
            // LIFFウィンドウを閉じる
            liff.closeWindow();
        } else {
            console.log('User is not in LINE client or sendMessages is not available.');
             // LINEクライアント外でも、localStorageをクリアして閉じる試み
            localStorage.removeItem('bentoOrderData');
            if(liff.isInClient()) liff.closeWindow();
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('メッセージの送信に失敗しました。');
        // エラーが発生してもウィンドウは閉じる
        localStorage.removeItem('bentoOrderData');
        if(liff.isInClient()) liff.closeWindow();
    }
}

