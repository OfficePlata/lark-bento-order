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
            console.log("Thank you page LIFF initialized.");
            sendConfirmationMessage();
        })
        .catch((err) => {
            console.error("LIFF initialization failed for thank you page.", err);
            document.body.innerHTML = `<h1>LIFF初期化エラー</h1><p>LINEクライアントで開いているか、LIFF IDが正しいか確認してください。</p><p>${err}</p>`;
        });
});

async function sendConfirmationMessage() {
    // 1. localStorageから注文情報を取得
    const storedData = localStorage.getItem('bentoOrderData');
    if (!storedData) {
        console.error("localStorageから注文情報が見つかりませんでした。");
        // データがない場合でもウィンドウを閉じる
        if (liff.isInClient()) {
            liff.closeWindow();
        }
        return;
    }

    try {
        const orderData = JSON.parse(storedData);
        console.log("Retrieved order data:", orderData);
        
        // 2. 送信するメッセージを組み立てる
        const message = `ご注文を受け付けました。\n\n---ご注文内容---\n${orderData.text}\n\nお作りして準備ができましたら、改めてご連絡いたします。`;

        // 3. liff.sendMessages() を使ってメッセージを送信
        // ▼▼▼ APIのチェックをより適切な'sendMessages'に変更しました ▼▼▼
        if (liff.isInClient() && liff.isApiAvailable('sendMessages')) {
             await liff.sendMessages([
                {
                    type: 'text',
                    text: message
                }
            ]);
            console.log('Message sent successfully.');
        } else {
            console.warn('User is not in LINE client or sendMessages is not available.');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('メッセージの送信に失敗しました。');
    } finally {
        // 成功・失敗にかかわらず、localStorageのデータを削除してLIFFウィンドウを閉じる
        console.log("Cleaning up and closing window.");
        localStorage.removeItem('bentoOrderData');
        if (liff.isInClient()) {
            liff.closeWindow();
        }
    }
}

