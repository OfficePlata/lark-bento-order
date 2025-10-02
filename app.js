// app.js (LIFFメッセージ送信方式・安定版)

document.addEventListener('DOMContentLoaded', initializeApp);

const LIFF_ID = "2008199273-3ogv1YME";
// ▼▼▼ ステップ2で更新したURLになっているか確認！ ▼▼▼
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxuAfe8aumpDo4JUSaWcVlr6QWVmOnjWW2RK48it9OuEJPK_1uXpFu_eFuBQjGJfjPU/exec";

let menuData = [];
let cart = [];
let userProfile = null;
const dom = {};

// (initializeAppから下のコードは変更ありません)
// ...
async function confirmAndSubmitOrder() {
  dom.submitOrderButton.disabled = true;
  dom.submitOrderButton.textContent = '処理中...';
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderData = {
    userId: userProfile.userId,
    displayName: userProfile.displayName,
    cart: cart.map(item => ({ name: item.name, option: item.option, quantity: item.quantity })),
    totalPrice,
  };
  try {
    // GASにPOSTリクエストを送信
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(orderData),
      headers: { 'Content-Type': 'application/json' },
    });
    
    // GASからの応答を確認
    const result = await response.json();
    if (!result.success) {
      throw new Error('サーバーでの記録に失敗しました。');
    }

    // LIFFからメッセージを送信
    await sendThanksMessage(orderData);
    
    alert('ご注文ありがとうございました！');
    if (liff.isInClient()) liff.closeWindow();

  } catch (err) {
    alert(`注文処理中にエラーが発生しました: ${err.message}`);
    dom.submitOrderButton.disabled = false;
    dom.submitOrderButton.textContent = '注文を確定する';
  }
}
// ... (sendThanksMessage, createReceiptFlexMessage など、他の関数もすべて必要です)
