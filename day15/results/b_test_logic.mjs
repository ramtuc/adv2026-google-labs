import assert from 'node:assert/strict';
import {
  MENU_ITEMS,
  MENU_MAP,
  DENOMINATIONS,
  calculateSubtotal,
  calculateBoxFee,
  calculateTaxIncludedTotal,
  calculateOrderSummary,
  isOrderCorrect,
  calculateMinChangeCoins,
  getOptimalChangeBreakdown,
  evaluateChange,
  evaluateTransaction,
  generateCustomerOrder,
} from 'file:///e:/tmp/yukimido_b/logic.js';

// 1. お品書きの検証
assert.equal(MENU_ITEMS.length, 8);
assert.equal(MENU_MAP.yukiusagi.price, 380);
assert.equal(MENU_MAP.tsubakimochi.price, 320);
assert.equal(MENU_MAP.yuzudaifuku.price, 280);
assert.equal(MENU_MAP.kurikinton.price, 450);
assert.equal(MENU_MAP.yokan.price, 1200);
assert.equal(MENU_MAP.shiratama.price, 650);
assert.equal(MENU_MAP.shiratama.dineInOnly, true);
assert.equal(MENU_MAP.warabimochi.price, 520);
assert.equal(MENU_MAP.matcha_set.price, 900);
assert.equal(MENU_MAP.matcha_set.dineInOnly, true);

// 2. 箱代（決まり3）と税込合計（決まり2・4）の検証
// 例1: 雪うさぎ2つ(760) + 柚子大福1つ(280) = 1040円、持ち帰り(8%) => floor(1040 * 1.08) = 1123円
assert.equal(calculateSubtotal({ yukiusagi: 2, yuzudaifuku: 1 }), 1040);
assert.equal(calculateBoxFee({ yukiusagi: 2, yuzudaifuku: 1 }, 'takeout'), 0);
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 2, yuzudaifuku: 1 }, 'takeout'), 1123);

// 例2: 雪うさぎ4つ(1520)、持ち帰り => 箱代0円、floor(1520 * 1.08) = 1641円
assert.equal(calculateBoxFee({ yukiusagi: 4 }, 'takeout'), 0);
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 4 }, 'takeout'), 1641);

// 例3: 雪うさぎ5つ(1900)、持ち帰り => 箱代150円加算 => 税抜2050円、floor(2050 * 1.08) = 2214円
assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'takeout'), 150);
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'takeout'), 2214);

// 例4: 雪うさぎ6つ(2280)、持ち帰り => 箱代150円加算 => 税抜2430円、floor(2430 * 1.08) = 2624円
assert.equal(calculateBoxFee({ yukiusagi: 6 }, 'takeout'), 150);
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 6 }, 'takeout'), 2624);

// 例5: 雪うさぎ5つ(1900)、店内(10%) => 箱代0円、floor(1900 * 1.10) = 2090円
assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'dine_in'), 0);
assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'dine_in'), 2090);

// 3. 注文一致判定
assert.equal(isOrderCorrect({ yukiusagi: 2, yuzudaifuku: 1 }, { yuzudaifuku: 1, yukiusagi: 2 }), true);
assert.equal(isOrderCorrect({ yukiusagi: 2, yuzudaifuku: 1 }, { yukiusagi: 2, yuzudaifuku: 2 }), false);
assert.equal(isOrderCorrect({ yukiusagi: 2 }, { yukiusagi: 2, tsubakimochi: 1 }), false);

// 4. おつりの最少枚数と手ぎわ判定（決まり6）
// 877円のおつり: 500(1) + 100(3) + 50(1) + 10(2) + 5(1) + 1(2) = 10枚
assert.equal(calculateMinChangeCoins(877), 10);
const opt877 = evaluateChange(877, { 500: 1, 100: 3, 50: 1, 10: 2, 5: 1, 1: 2 });
assert.equal(opt877.isAmountCorrect, true);
assert.equal(opt877.isOptimalCoins, true);

// 877円を100円8枚等で渡した場合（金額は正解だが枚数が14枚で非最少）
const nonOpt877 = evaluateChange(877, { 100: 8, 50: 1, 10: 2, 5: 1, 1: 2 });
assert.equal(nonOpt877.isAmountCorrect, true);
assert.equal(nonOpt877.isOptimalCoins, false);

// 5. ランダム注文生成のルール検証（500回試行）
for (let i = 0; i < 500; i++) {
  const order = generateCustomerOrder();
  const keys = Object.keys(order.items);
  // 1〜3種類
  assert.ok(keys.length >= 1 && keys.length <= 3, `Invalid item types count: ${keys.length}`);
  for (const k of keys) {
    const qty = order.items[k];
    // 各1〜6個
    assert.ok(qty >= 1 && qty <= 6, `Invalid qty for ${k}: ${qty}`);
    // 持ち帰りのお客は店内のみの品を頼まない
    if (order.orderType === 'takeout') {
      assert.equal(MENU_MAP[k].dineInOnly, false, `Takeout ordered dine-in only item: ${k}`);
    }
  }
  assert.ok(order.paymentAmount >= order.summary.total);
}

console.log('ALL LOGIC UNIT TESTS PASSED!');
