import assert from 'node:assert/strict';
import {
  MENU_ITEMS,
  MENU_MAP,
  calculateSubtotal,
  calculateBoxFee,
  calculateTaxIncludedTotal,
  isOrderCorrect,
  calculateMinCoins,
  evaluateTransaction,
  generateCustomerOrder,
  generateCustomerPayment
} from 'file:///e:/tmp/yukimido_a/logic.js';

// 1. お品書きの検証
assert.equal(MENU_ITEMS.length, 8);
assert.equal(MENU_MAP.yukiusagi.price, 380);
assert.equal(MENU_MAP.tsubakimochi.price, 320);
assert.equal(MENU_MAP.yuzudaifuku.price, 280);
assert.equal(MENU_MAP.kurikinton.price, 450);
assert.equal(MENU_MAP.yokan.price, 1200);
assert.equal(MENU_MAP.shiratamagozen.price, 650);
assert.equal(MENU_MAP.shiratamagozen.dineInOnly, true);
assert.equal(MENU_MAP.warabimochi.price, 520);
assert.equal(MENU_MAP.matchaset.price, 900);
assert.equal(MENU_MAP.matchaset.dineInOnly, true);

// 2. 箱代ルール（雪うさぎ持ち帰り5個以上で150円、4個以下や店内は0円）
assert.equal(calculateBoxFee({ yukiusagi: 4 }, 'takeout'), 0);
assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'takeout'), 150);
assert.equal(calculateBoxFee({ yukiusagi: 6 }, 'takeout'), 150);
assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'dine_in'), 0);
assert.equal(calculateBoxFee({ yukiusagi: 6 }, 'dine_in'), 0);

// 3. 税込合計金額（円未満切り捨て）
// 例1: 雪うさぎ2個(760) + 柚子大福1個(280) = 1040円、持ち帰り(8%) -> 1040 * 1.08 = 1123.2 -> 1123円
assert.equal(
  calculateTaxIncludedTotal({ yukiusagi: 2, yuzudaifuku: 1 }, 'takeout'),
  1123
);

// 例2: 雪うさぎ5個(1900) 持ち帰り -> 箱代150円加算 = 2050円 * 1.08 = 2214円
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'takeout'), 2214);

// 例3: 雪うさぎ5個(1900) 店内 -> 箱代0円 = 1900円 * 1.10 = 2090円
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'dine_in'), 2090);

// 例4: 栗きんとん1個(450) 持ち帰り -> 450 * 1.08 = 486円
assert.equal(calculateTaxIncludedTotal({ kurikinton: 1 }, 'takeout'), 486);

// 4. 注文一致判定
assert.equal(
  isOrderCorrect({ yukiusagi: 2, yuzudaifuku: 1 }, { yukiusagi: 2, yuzudaifuku: 1, yokan: 0 }),
  true
);
assert.equal(
  isOrderCorrect({ yukiusagi: 2, yuzudaifuku: 1 }, { yukiusagi: 2, yuzudaifuku: 2 }),
  false
);

// 5. おつりの最少枚数と手ぎわ判定
// おつり 877円 -> 500×1, 100×3, 50×1, 10×2, 5×1, 1×2 (計10枚)
const min877 = calculateMinCoins(877);
assert.equal(min877.totalCount, 10);
assert.equal(min877.breakdown[500], 1);
assert.equal(min877.breakdown[100], 3);
assert.equal(min877.breakdown[50], 1);
assert.equal(min877.breakdown[10], 2);
assert.equal(min877.breakdown[5], 1);
assert.equal(min877.breakdown[1], 2);

// evaluateTransaction テスト（最少枚数で正解 -> isOptimalChange: true）
const evalOptimal = evaluateTransaction({
  expectedItems: { yukiusagi: 2, yuzudaifuku: 1 }, // 税込 1123円
  selectedItems: { yukiusagi: 2, yuzudaifuku: 1 },
  orderType: 'takeout',
  paidAmount: 2000, // おつり 877円
  changeCoins: min877.breakdown
});
assert.equal(evalOptimal.isSuccess, true);
assert.equal(evalOptimal.isOptimalChange, true);

// evaluateTransaction テスト（金額は合っているが500円玉1枚の代わりに100円玉5枚 -> isSuccess: true, isOptimalChange: false）
const nonOptimalCoins = { ...min877.breakdown, 500: 0, 100: 8 };
const evalNonOptimal = evaluateTransaction({
  expectedItems: { yukiusagi: 2, yuzudaifuku: 1 },
  selectedItems: { yukiusagi: 2, yuzudaifuku: 1 },
  orderType: 'takeout',
  paidAmount: 2000,
  changeCoins: nonOptimalCoins
});
assert.equal(evalNonOptimal.isSuccess, true);
assert.equal(evalNonOptimal.isOptimalChange, false);

// 6. ランダム生成テスト（500回試行して決まり1, 5, 7を満たすか確認）
for (let i = 0; i < 500; i++) {
  const order = generateCustomerOrder();
  const keys = Object.keys(order.items);
  assert.ok(keys.length >= 1 && keys.length <= 3, '品数は1〜3種類');
  for (const k of keys) {
    const q = order.items[k];
    assert.ok(q >= 1 && q <= 6, '各品は1〜6個');
    if (order.orderType === 'takeout') {
      assert.equal(MENU_MAP[k].dineInOnly, false, '持ち帰りは店内のみの品を頼まない');
    }
  }
  const total = calculateTaxIncludedTotal(order.items, order.orderType);
  const payment = generateCustomerPayment(total);
  assert.ok(payment.paidAmount >= total, '支払額は税込合計以上');
}

console.log('ALL LOGIC TESTS PASSED!');
