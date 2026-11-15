import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MENU_ITEMS,
  MENU_MAP,
  DENOMINATIONS,
  BOX_FEE_PRICE,
  BOX_MIN_YUKIUSAGI,
  TAX_RATE_PERCENT,
  calculateSubtotal,
  calculateBoxFee,
  calculateTaxIncludedTotal,
  isOrderCorrect,
  calculateCoinsTotal,
  countTotalCoins,
  calculateMinCoins,
  evaluateTransaction,
  generateCustomerOrder,
  formatOrderSpeech,
  generateCustomerPayment,
  formatCoinsDescription
} from '../logic.js';

describe('お品書き（税抜）の決まり', () => {
  it('全8品の名前・税抜価格・店内限定区分が RULES.md のお品書きと一致すること', () => {
    const expectedMenu = [
      { id: 'yukiusagi', name: '雪うさぎ（上生菓子）', price: 380, dineInOnly: false },
      { id: 'tsubakimochi', name: '椿餅', price: 320, dineInOnly: false },
      { id: 'yuzudaifuku', name: '柚子大福', price: 280, dineInOnly: false },
      { id: 'kurikinton', name: '栗きんとん', price: 450, dineInOnly: false },
      { id: 'yokan', name: '羊羹「冬木立」一棹', price: 1200, dineInOnly: false },
      { id: 'shiratamagozen', name: '白玉ぜんざい', price: 650, dineInOnly: true },
      { id: 'warabimochi', name: '黒糖わらび餅', price: 520, dineInOnly: false },
      { id: 'matchaset', name: '季節の上生菓子と抹茶', price: 900, dineInOnly: true }
    ];

    assert.equal(MENU_ITEMS.length, expectedMenu.length);

    for (const expected of expectedMenu) {
      const item = MENU_MAP[expected.id];
      assert.ok(item, `${expected.id} が存在すること`);
      assert.equal(item.name, expected.name);
      assert.equal(item.price, expected.price);
      assert.equal(item.dineInOnly, expected.dineInOnly);
    }
  });

  it('品物の税抜合計（calculateSubtotal）が正しく計算されること', () => {
    assert.equal(calculateSubtotal({ yukiusagi: 1 }), 380);
    assert.equal(calculateSubtotal({ tsubakimochi: 2, yuzudaifuku: 3 }), 320 * 2 + 280 * 3);
    assert.equal(
      calculateSubtotal({ kurikinton: 1, yokan: 2, warabimochi: 1 }),
      450 + 1200 * 2 + 520
    );
    assert.equal(calculateSubtotal({ shiratamagozen: 1, matchaset: 1 }), 650 + 900);
    assert.equal(calculateSubtotal({}), 0);
  });
});

describe('決まり1・7: お客の注文生成（持ち帰り・店内、品数1〜3種類、各1〜6個）', () => {
  it('乱数パターンを網羅して注文を生成したとき、常に決まり1と決まり7を満たすこと', () => {
    const dineInOnlyIds = MENU_ITEMS.filter((m) => m.dineInOnly).map((m) => m.id);
    const validIds = new Set(MENU_ITEMS.map((m) => m.id));

    let sawTakeout = false;
    let sawDineIn = false;
    const typeCountsSeen = new Set();
    const itemQtysSeen = new Set();

    // 疑似乱数シードで多数回試行
    let seed = 123456789;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 300; i++) {
      const order = generateCustomerOrder(rng);

      // 決まり1: お客は「持ち帰り(takeout)」か「店内(dine_in)」のどちらか
      assert.ok(
        order.orderType === 'takeout' || order.orderType === 'dine_in',
        `不正な orderType: ${order.orderType}`
      );
      if (order.orderType === 'takeout') sawTakeout = true;
      if (order.orderType === 'dine_in') sawDineIn = true;

      const entries = Object.entries(order.items);

      // 決まり7: 頼む品は 1〜3 種類
      assert.ok(
        entries.length >= 1 && entries.length <= 3,
        `品の種類数が 1〜3 の範囲外: ${entries.length}`
      );
      typeCountsSeen.add(entries.length);

      for (const [id, qty] of entries) {
        assert.ok(validIds.has(id), `お品書きにない品ID: ${id}`);

        // 決まり7: 各 1〜6 個（整数）
        assert.ok(Number.isInteger(qty), `個数が整数ではない: ${qty}`);
        assert.ok(qty >= 1 && qty <= 6, `個数が 1〜6 の範囲外: ${qty}`);
        itemQtysSeen.add(qty);

        // 決まり1: 持ち帰りのお客は、店内のみの品を頼まない
        if (order.orderType === 'takeout') {
          assert.ok(
            !dineInOnlyIds.includes(id),
            `持ち帰りなのに店内のみの品 (${id}) が含まれている`
          );
        }
      }
    }

    assert.ok(sawTakeout && sawDineIn, '持ち帰りと店内の両方が生成されること');
    assert.deepEqual([...typeCountsSeen].sort(), [1, 2, 3], '1〜3種類のすべてが出現すること');
    assert.deepEqual([...itemQtysSeen].sort(), [1, 2, 3, 4, 5, 6], '1〜6個のすべてが出現すること');
  });
});

describe('決まり2: 税率（持ち帰り 8 %、店内 10 %）', () => {
  it('税率定数が持ち帰り 8 %、店内 10 % であること', () => {
    assert.equal(TAX_RATE_PERCENT.takeout, 8);
    assert.equal(TAX_RATE_PERCENT.dine_in, 10);
  });
});

describe('決まり3: 化粧箱代（雪うさぎを持ち帰りで5個以上買うときは税抜150円を足す。店内では足さない）', () => {
  it('箱代定数が150円、雪うさぎ5個以上であること', () => {
    assert.equal(BOX_FEE_PRICE, 150);
    assert.equal(BOX_MIN_YUKIUSAGI, 5);
  });

  it('持ち帰りで雪うさぎが4個以下のときは箱代 0 円', () => {
    assert.equal(calculateBoxFee({ yukiusagi: 0 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yukiusagi: 1 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yukiusagi: 4 }, 'takeout'), 0);
  });

  it('持ち帰りで雪うさぎが5個以上のときは箱代 150 円', () => {
    assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'takeout'), 150);
    assert.equal(calculateBoxFee({ yukiusagi: 6 }, 'takeout'), 150);
  });

  it('店内では雪うさぎが5個以上でも箱代を足さない（0 円）', () => {
    assert.equal(calculateBoxFee({ yukiusagi: 5 }, 'dine_in'), 0);
    assert.equal(calculateBoxFee({ yukiusagi: 6 }, 'dine_in'), 0);
  });

  it('雪うさぎ以外の品物を持ち帰りで5個以上買っても箱代は足さない（0 円）', () => {
    assert.equal(calculateBoxFee({ tsubakimochi: 5 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yuzudaifuku: 6, kurikinton: 6 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yokan: 5 }, 'takeout'), 0);
  });
});

describe('決まり4: 税込の合計 ＝（品物の合計 ＋ 箱代）× 税率 の円未満を切り捨てた額', () => {
  it('持ち帰り（8%）で円未満の端数が切り捨てられること', () => {
    // 雪うさぎ 1個: 380 * 1.08 = 410.4 -> 410円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 1 }, 'takeout'), 410);
    // 椿餅 1個: 320 * 1.08 = 345.6 -> 345円（四捨五入なら346になるケース）
    assert.equal(calculateTaxIncludedTotal({ tsubakimochi: 1 }, 'takeout'), 345);
    // 柚子大福 1個: 280 * 1.08 = 302.4 -> 302円
    assert.equal(calculateTaxIncludedTotal({ yuzudaifuku: 1 }, 'takeout'), 302);
    // 黒糖わらび餅 1個: 520 * 1.08 = 561.6 -> 561円（四捨五入なら562になるケース）
    assert.equal(calculateTaxIncludedTotal({ warabimochi: 1 }, 'takeout'), 561);
  });

  it('持ち帰り（8%）で雪うさぎ5個以上のとき、箱代150円にも消費税8%がかかること', () => {
    // 雪うさぎ 5個 (380 * 5 = 1900) + 箱代 150 = 2050円
    // 2050 * 1.08 = 2214円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'takeout'), 2214);

    // 雪うさぎ 5個 + 椿餅 1個 (1900 + 320 + 150 = 2370)
    // 2370 * 1.08 = 2559.6 -> 2559円
    assert.equal(
      calculateTaxIncludedTotal({ yukiusagi: 5, tsubakimochi: 1 }, 'takeout'),
      2559
    );
  });

  it('店内（10%）で正しく計算され、箱代が加算されないこと', () => {
    // 白玉ぜんざい 1個 (650) + 季節の上生菓子と抹茶 1個 (900) = 1550
    // 1550 * 1.10 = 1705円
    assert.equal(
      calculateTaxIncludedTotal({ shiratamagozen: 1, matchaset: 1 }, 'dine_in'),
      1705
    );

    // 栗きんとん 1個 (450) * 1.10 = 495円
    assert.equal(calculateTaxIncludedTotal({ kurikinton: 1 }, 'dine_in'), 495);

    // 店内で雪うさぎ 5個 (1900 + 箱代0) * 1.10 = 2090円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'dine_in'), 2090);
  });
});

describe('決まり5: お客が払うお金（税込合計以上、指定9金種の組み合わせ）', () => {
  it('金種が 1万円・5千円・千円・500円・100円・50円・10円・5円・1円 の9種類であること', () => {
    assert.deepEqual(DENOMINATIONS, [10000, 5000, 1000, 500, 100, 50, 10, 5, 1]);
  });

  it('生成される支払金額が常に税込合計以上であり、金種内訳の合計と一致すること', () => {
    const testTotals = [302, 345, 410, 495, 1000, 1296, 2214, 5000, 10800];
    let seed = 987654321;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (const total of testTotals) {
      for (let i = 0; i < 20; i++) {
        const payment = generateCustomerPayment(total, rng);
        assert.ok(
          payment.paidAmount >= total,
          `支払額 (${payment.paidAmount}) が税込合計 (${total}) 未満`
        );

        // 使われている金種がすべて DENOMINATIONS に含まれ、枚数が0以上の整数であること
        for (const [denomStr, count] of Object.entries(payment.breakdown)) {
          const denom = Number(denomStr);
          assert.ok(DENOMINATIONS.includes(denom), `不正な金種: ${denom}`);
          assert.ok(Number.isInteger(count) && count >= 0, `不正な枚数: ${count}`);
        }

        // 金種内訳の合計金額が paidAmount と一致すること
        assert.equal(calculateCoinsTotal(payment.breakdown), payment.paidAmount);
      }
    }
  });
});

describe('決まり6: おつりの正誤判定と最少枚数（「手ぎわ」点）の判定', () => {
  it('最少枚数の計算（calculateMinCoins）が日本の9金種で正しく求まること', () => {
    // 0円
    const zero = calculateMinCoins(0);
    assert.equal(zero.totalCount, 0);
    assert.equal(calculateCoinsTotal(zero.breakdown), 0);

    // 18,888円 -> 10000x1, 5000x1, 1000x3, 500x1, 100x3, 50x1, 10x3, 5x1, 1x3 (計17枚)
    const allDenoms = calculateMinCoins(18888);
    assert.deepEqual(allDenoms.breakdown, {
      10000: 1,
      5000: 1,
      1000: 3,
      500: 1,
      100: 3,
      50: 1,
      10: 3,
      5: 1,
      1: 3
    });
    assert.equal(allDenoms.totalCount, 17);
  });

  it('注文の品と個数が一致し、おつりが最少枚数なら正解かつ「手ぎわ（isOptimalChange）」になること', () => {
    // 椿餅1個(320円) 持ち帰り(8%) -> 税込 345円
    // 1,000円支払い -> おつり 655円 (500円x1, 100円x1, 50円x1, 5円x1 = 4枚)
    const result = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 100: 1, 50: 1, 5: 1 }
    });

    assert.equal(result.expectedTotal, 345);
    assert.equal(result.expectedChange, 655);
    assert.equal(result.orderCorrect, true);
    assert.equal(result.changeCorrect, true);
    assert.equal(result.isSuccess, true);
    assert.equal(result.isOptimalChange, true);
  });

  it('おつりの金額が合っていれば、枚数が最少でなくても正解（isSuccess: true）になり、手ぎわ（isOptimalChange）は付かないこと', () => {
    // おつり 655円 を 100円x6, 10円x5, 1円x5 (16枚) で渡した場合
    const result = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 100: 6, 10: 5, 1: 5 }
    });

    assert.equal(result.givenChangeAmount, 655);
    assert.equal(result.orderCorrect, true);
    assert.equal(result.changeCorrect, true);
    assert.equal(result.isSuccess, true);
    assert.equal(result.isOptimalChange, false);
  });

  it('おつりの金額が間違っている場合は不正解になり、手ぎわも付かないこと', () => {
    const result = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 100: 1, 50: 1 } // 650円（5円足りない）
    });

    assert.equal(result.changeCorrect, false);
    assert.equal(result.isSuccess, false);
    assert.equal(result.isOptimalChange, false);
  });

  it('おつりが合っていても、渡す品物や個数が間違っていれば不正解になること', () => {
    // 個数違い
    const wrongQty = evaluateTransaction({
      expectedItems: { yukiusagi: 2 },
      selectedItems: { yukiusagi: 1 },
      orderType: 'dine_in',
      paidAmount: 1000,
      changeCoins: { 100: 1, 50: 1, 10: 1, 1: 4 } // 380*2*1.1 = 836 -> おつり164円は正しい
    });
    assert.equal(wrongQty.orderCorrect, false);
    assert.equal(wrongQty.changeCorrect, true);
    assert.equal(wrongQty.isSuccess, false);
    assert.equal(wrongQty.isOptimalChange, false);

    // 余計な品物が混ざっている場合
    assert.equal(
      isOrderCorrect({ yukiusagi: 1 }, { yukiusagi: 1, tsubakimochi: 1 }),
      false
    );
    // 0個のキーが含まれていても実質同じなら一致とみなすこと
    assert.equal(
      isOrderCorrect({ yukiusagi: 1 }, { yukiusagi: 1, tsubakimochi: 0 }),
      true
    );
  });
});

describe('補助フォーマット関数の確認', () => {
  it('注文セリフ（formatOrderSpeech）に品名・個数・持ち帰り/店内の区別が含まれること', () => {
    const takeoutSpeech = formatOrderSpeech({ yukiusagi: 2, yuzudaifuku: 1 }, 'takeout');
    assert.ok(takeoutSpeech.includes('雪うさぎを 2 つ'));
    assert.ok(takeoutSpeech.includes('柚子大福を 1 つ'));
    assert.ok(takeoutSpeech.includes('持ち帰りで'));

    const dineInSpeech = formatOrderSpeech({ shiratamagozen: 1 }, 'dine_in');
    assert.ok(dineInSpeech.includes('白玉ぜんざいを 1 つ'));
    assert.ok(dineInSpeech.includes('店内で'));
  });

  it('お金の内訳文字列（formatCoinsDescription）と枚数集計（countTotalCoins）が正しく動作すること', () => {
    const coins = { 1000: 1, 100: 2, 10: 3 };
    assert.equal(countTotalCoins(coins), 6);
    assert.equal(formatCoinsDescription(coins), '千円札 1 枚、100円玉 2 枚、10円玉 3 枚');
    assert.equal(formatCoinsDescription({}), '0 円');
  });
});
