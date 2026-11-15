import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MENU_ITEMS,
  MENU_MAP,
  DENOMINATIONS,
  DENOMINATION_LABELS,
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
    assert.equal( calculateSubtotal({ shiratamagozen: 1, matchaset: 1 }), 650 + 900);
    assert.equal(calculateSubtotal({}), 0);
  });

  it('各品物を単体および複数個ずつ頼んだときの税抜合計が全8品それぞれ正しいこと', () => {
    assert.equal(calculateSubtotal({ yukiusagi: 3 }), 380 * 3);
    assert.equal(calculateSubtotal({ tsubakimochi: 4 }), 320 * 4);
    assert.equal(calculateSubtotal({ yuzudaifuku: 5 }), 280 * 5);
    assert.equal(calculateSubtotal({ kurikinton: 2 }), 450 * 2);
    assert.equal(calculateSubtotal({ yokan: 3 }), 1200 * 3);
    assert.equal(calculateSubtotal({ shiratamagozen: 2 }), 650 * 2);
    assert.equal(calculateSubtotal({ warabimochi: 4 }), 520 * 4);
    assert.equal(calculateSubtotal({ matchaset: 3 }), 900 * 3);
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

  it('店内のお客は店内のみの品も通常の品も頼み、持ち帰りのお客は店内のみ以外の全6品を頼みうること', () => {
    const takeoutItemsSeen = new Set();
    const dineInItemsSeen = new Set();

    let seed = 246813579;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 400; i++) {
      const order = generateCustomerOrder(rng);
      for (const id of Object.keys(order.items)) {
        if (order.orderType === 'takeout') {
          takeoutItemsSeen.add(id);
        } else {
          dineInItemsSeen.add(id);
        }
      }
    }

    // 持ち帰りでは店内限定以外の6品すべてが出現し、店内限定2品は出現しない
    assert.equal(takeoutItemsSeen.size, 6);
    assert.ok(!takeoutItemsSeen.has('shiratamagozen'));
    assert.ok(!takeoutItemsSeen.has('matchaset'));

    // 店内では店内限定2品を含む全8品が出現する
    assert.equal(dineInItemsSeen.size, 8);
    assert.ok(dineInItemsSeen.has('shiratamagozen'));
    assert.ok(dineInItemsSeen.has('matchaset'));
  });

  it('乱数の境界値（0 や 0.999999）や同じ乱数値が続く場合でも、品の種類数（1〜3種類・重複なし）と個数（1〜6個）が守られること', () => {
    // rng が常に 0 を返す場合: 最小境界（1種類・1個・持ち帰り）
    const minOrder = generateCustomerOrder(() => 0);
    assert.equal(minOrder.orderType, 'takeout');
    const minEntries = Object.entries(minOrder.items);
    assert.equal(minEntries.length, 1);
    assert.equal(minEntries[0][1], 1);
    assert.ok(!MENU_MAP[minEntries[0][0]].dineInOnly);

    // rng が常に 0.999999 を返す場合: 最大境界（3種類・各6個・店内）
    // 同じ乱数値が返り続けても、同じ品が重複選択されて1種類に潰れたり個数が7個以上に合算されたりしないこと
    const maxOrder = generateCustomerOrder(() => 0.999999);
    assert.equal(maxOrder.orderType, 'dine_in');
    const maxEntries = Object.entries(maxOrder.items);
    assert.equal(maxEntries.length, 3);
    for (const [, qty] of maxEntries) {
      assert.equal(qty, 6);
    }

    // 持ち帰りで3種類・同じインデックス乱数が続く場合も、異なる3種類が選ばれ店内限定品が含まれないこと
    const seq = [0.0, 0.99, 0.0, 0.0, 0.0, 0.5, 0.5, 0.5];
    let idx = 0;
    const seqOrder = generateCustomerOrder(() => seq[idx++ % seq.length]);
    assert.equal(seqOrder.orderType, 'takeout');
    assert.equal(Object.keys(seqOrder.items).length, 3);
    for (const [id, qty] of Object.entries(seqOrder.items)) {
      assert.ok(!MENU_MAP[id].dineInOnly);
      assert.ok(qty >= 1 && qty <= 6);
    }
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
    assert.equal(calculateBoxFee({ warabimochi: 6 }, 'takeout'), 0);
  });

  it('雪うさぎが4個以下で、他の品物と合わせた合計個数が5個以上になっても箱代は足さない（0 円）', () => {
    assert.equal(calculateBoxFee({ yukiusagi: 1, tsubakimochi: 4 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yukiusagi: 3, yuzudaifuku: 3 }, 'takeout'), 0);
    assert.equal(calculateBoxFee({ yukiusagi: 4, kurikinton: 1, warabimochi: 2 }, 'takeout'), 0);
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

  it('品物ごと・個数ごとに切り捨てるのではなく、（品物の合計 ＋ 箱代）の全体に税率をかけてから最後に円未満を切り捨てること', () => {
    // 椿餅 2個: 1個ずつ切り捨てて足すと 345 * 2 = 690円 だが、合計(640円) * 1.08 = 691.2 -> 691円
    assert.equal(calculateTaxIncludedTotal({ tsubakimochi: 2 }, 'takeout'), 691);

    // 雪うさぎ 3個: 1個ずつ切り捨てて足すと 410 * 3 = 1230円 だが、合計(1140円) * 1.08 = 1231.2 -> 1231円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 3 }, 'takeout'), 1231);

    // 椿餅 1個(320円) + 黒糖わらび餅 1個(520円):
    // 品目ごとに切り捨てると 345 + 561 = 906円 だが、合計(840円) * 1.08 = 907.2 -> 907円
    assert.equal(
      calculateTaxIncludedTotal({ tsubakimochi: 1, warabimochi: 1 }, 'takeout'),
      907
    );

    // 雪うさぎ 1個(380円) + 椿餅 1個(320円):
    // 品目ごとに切り捨てると 410 + 345 = 755円 だが、合計(700円) * 1.08 = 756円
    assert.equal(
      calculateTaxIncludedTotal({ yukiusagi: 1, tsubakimochi: 1 }, 'takeout'),
      756
    );

    // 雪うさぎ 6個(2280円) + 椿餅 1個(320円) + 箱代(150円) = 2750円:
    // 2750 * 1.08 = 2970円（雪うさぎ6個 2462.4->2462 + 椿餅1個 345.6->345 + 箱代 162 = 2969円 ではない）
    assert.equal(
      calculateTaxIncludedTotal({ yukiusagi: 6, tsubakimochi: 1 }, 'takeout'),
      2970
    );
  });

  it('持ち帰り（8%）で雪うさぎ5個以上のとき、箱代150円にも消費税8%がかかること', () => {
    // 雪うさぎ 5個 (380 * 5 = 1900) + 箱代 150 = 2050円
    // 2050 * 1.08 = 2214円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 5 }, 'takeout'), 2214);

    // 雪うさぎ 6個 (380 * 6 = 2280) + 箱代 150 = 2430円
    // 2430 * 1.08 = 2624.4 -> 2624円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 6 }, 'takeout'), 2624);

    // 雪うさぎ 5個 + 椿餅 1個 (1900 + 320 + 150 = 2370)
    // 2370 * 1.08 = 2559.6 -> 2559円
    assert.equal(
      calculateTaxIncludedTotal({ yukiusagi: 5, tsubakimochi: 1 }, 'takeout'),
      2559
    );

    // 雪うさぎ 4個 + 椿餅 2個 (1520 + 640 + 箱代0 = 2160)
    // 合計6個でも雪うさぎは4個なので箱代は足さず 2160 * 1.08 = 2332.8 -> 2332円
    assert.equal(
      calculateTaxIncludedTotal({ yukiusagi: 4, tsubakimochi: 2 }, 'takeout'),
      2332
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

    // 店内で雪うさぎ 6個 (2280 + 箱代0) * 1.10 = 2508円
    assert.equal(calculateTaxIncludedTotal({ yukiusagi: 6 }, 'dine_in'), 2508);
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

  it('5000円超〜10000円未満や端数の有無など多様な金額・乱数境界値（0〜0.999）でも決まり5を満たすこと', () => {
    const variedTotals = [
      302, 308, 410, 500, 999, 1000, 1001, 1500, 2000, 2559,
      4999, 5000, 5001, 5184, 5500, 5940, 6000, 7500, 9999, 10000, 12500, 19800
    ];
    const fixedRngs = [0, 0.01, 0.1, 0.24, 0.25, 0.5, 0.75, 0.91, 0.92, 0.95, 0.999999];

    for (const total of variedTotals) {
      for (const rVal of fixedRngs) {
        const payment = generateCustomerPayment(total, () => rVal);
        assert.ok(
          Number.isInteger(payment.paidAmount) && payment.paidAmount >= total,
          `total=${total}, rVal=${rVal}: 支払額 (${payment.paidAmount}) が税込合計 (${total}) 未満または非整数`
        );

        let sum = 0;
        for (const [denomStr, count] of Object.entries(payment.breakdown)) {
          const denom = Number(denomStr);
          assert.ok(DENOMINATIONS.includes(denom), `不正な金種: ${denom}`);
          assert.ok(Number.isInteger(count) && count >= 0, `不正な枚数: ${count}`);
          sum += denom * count;
        }
        assert.equal(
          sum,
          payment.paidAmount,
          `total=${total}, rVal=${rVal}: 内訳合計 (${sum}) と paidAmount (${payment.paidAmount}) が不一致`
        );
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

  it('注文の品物の一部を選び忘れた場合や、同じ個数・同じ金額でも別の品物を選んだ場合は不正解になること', () => {
    // 頼まれた2品のうち1品しか選んでいない場合（selectedItems にキーが存在しないケース）
    assert.equal(
      isOrderCorrect({ yukiusagi: 1, tsubakimochi: 1 }, { yukiusagi: 1 }),
      false
    );
    // 何も選んでいない場合
    assert.equal(isOrderCorrect({ yukiusagi: 1 }, {}), false);

    // 合計個数は同じ（1個）だが品物が違う場合
    assert.equal(isOrderCorrect({ yukiusagi: 1 }, { tsubakimochi: 1 }), false);

    // 合計個数（2個）も税抜合計金額（900円）も同じだが品物が違う場合
    // 栗きんとん2個(450*2=900円) vs 雪うさぎ1個+黒糖わらび餅1個(380+520=900円)
    assert.equal(
      isOrderCorrect({ kurikinton: 2 }, { yukiusagi: 1, warabimochi: 1 }),
      false
    );
    const samePriceDiffItem = evaluateTransaction({
      expectedItems: { kurikinton: 2 },
      selectedItems: { yukiusagi: 1, warabimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 10: 2, 5: 1, 1: 3 } // 900 * 1.08 = 972 -> おつり 28円（最少枚数）
    });
    assert.equal(samePriceDiffItem.orderCorrect, false);
    assert.equal(samePriceDiffItem.changeCorrect, true);
    assert.equal(samePriceDiffItem.isSuccess, false);
    assert.equal(samePriceDiffItem.isOptimalChange, false);
  });

  it('おつりの金額が間違っているとき、たとえ渡した枚数が正しいおつりの最少枚数と同じでも「手ぎわ」にならないこと', () => {
    // 椿餅1個(320円) 持ち帰り -> 税込345円、1000円支払い -> 正しいおつり655円（最少4枚: 500, 100, 50, 5）
    // 誤って660円（500, 100, 50, 10 の4枚）を渡した場合：枚数は4枚で一致するが金額が違う
    const wrongAmountSameCount = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 100: 1, 50: 1, 10: 1 }
    });
    assert.equal(wrongAmountSameCount.orderCorrect, true);
    assert.equal(wrongAmountSameCount.changeCorrect, false);
    assert.equal(wrongAmountSameCount.isSuccess, false);
    assert.equal(wrongAmountSameCount.givenCoinsCount, wrongAmountSameCount.optimalCoinsCount);
    assert.equal(wrongAmountSameCount.isOptimalChange, false);
  });

  it('おつり0円（ぴったり支払い）のとき、0枚渡しで正解かつ「手ぎわ」になること', () => {
    // 栗きんとん1個(450円) 店内(10%) -> 税込495円、495円ぴったり支払い -> おつり0円
    const exactPay = evaluateTransaction({
      expectedItems: { kurikinton: 1 },
      selectedItems: { kurikinton: 1 },
      orderType: 'dine_in',
      paidAmount: 495,
      changeCoins: {}
    });
    assert.equal(exactPay.expectedTotal, 495);
    assert.equal(exactPay.expectedChange, 0);
    assert.equal(exactPay.givenChangeAmount, 0);
    assert.equal(exactPay.givenCoinsCount, 0);
    assert.equal(exactPay.orderCorrect, true);
    assert.equal(exactPay.changeCorrect, true);
    assert.equal(exactPay.isSuccess, true);
    assert.equal(exactPay.isOptimalChange, true);
  });

  it('各金種で上位金種1枚の代わりに下位金種複数枚（50円2枚、5円2枚、500円2枚、千円5枚など）を渡したときは正解だが「手ぎわ」にはならないこと', () => {
    // 羊羹1棹(1200円) 店内(10%) -> 税込1320円
    // 10000円支払い -> おつり 8680円 (最適: 5000x1, 1000x3, 500x1, 100x1, 50x1, 10x3 = 9枚)
    const optimal = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 10000,
      changeCoins: { 5000: 1, 1000: 3, 500: 1, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(optimal.isSuccess, true);
    assert.equal(optimal.isOptimalChange, true);

    // 5000円札1枚を千円札5枚に崩した場合（計13枚）
    const sub5000 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 10000,
      changeCoins: { 1000: 8, 500: 1, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(sub5000.isSuccess, true);
    assert.equal(sub5000.isOptimalChange, false);

    // 100円玉1枚を50円玉2枚に崩した場合（計10枚）
    const sub100 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 10000,
      changeCoins: { 5000: 1, 1000: 3, 500: 1, 50: 3, 10: 3 }
    });
    assert.equal(sub100.isSuccess, true);
    assert.equal(sub100.isOptimalChange, false);

    // 10円玉1枚を5円玉2枚に崩した場合（計10枚）
    const sub10 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 10000,
      changeCoins: { 5000: 1, 1000: 3, 500: 1, 100: 1, 50: 1, 10: 2, 5: 2 }
    });
    assert.equal(sub10.isSuccess, true);
    assert.equal(sub10.isOptimalChange, false);
  });

  it('持ち帰りで雪うさぎ5個以上（箱代あり）の会計や店内会計でも evaluateTransaction の各計算結果がすべて正しいこと', () => {
    // 雪うさぎ5個(1900円) + 箱代(150円) = 2050円 -> 持ち帰り8%で 2214円
    // 2500円支払い -> おつり 286円 (100x2, 50x1, 10x3, 5x1, 1x1 = 8枚)
    const takeoutBox = evaluateTransaction({
      expectedItems: { yukiusagi: 5 },
      selectedItems: { yukiusagi: 5 },
      orderType: 'takeout',
      paidAmount: 2500,
      changeCoins: { 100: 2, 50: 1, 10: 3, 5: 1, 1: 1 }
    });
    assert.equal(takeoutBox.subtotal, 1900);
    assert.equal(takeoutBox.boxFee, 150);
    assert.equal(takeoutBox.taxRatePercent, 8);
    assert.equal(takeoutBox.expectedTotal, 2214);
    assert.equal(takeoutBox.expectedChange, 286);
    assert.equal(takeoutBox.isSuccess, true);
    assert.equal(takeoutBox.isOptimalChange, true);

    // 店内で雪うさぎ5個(1900円) + 箱代(0円) -> 店内10%で 2090円
    // 2100円支払い -> おつり 10円 (10x1 = 1枚)
    const dineInNoBox = evaluateTransaction({
      expectedItems: { yukiusagi: 5 },
      selectedItems: { yukiusagi: 5 },
      orderType: 'dine_in',
      paidAmount: 2100,
      changeCoins: { 10: 1 }
    });
    assert.equal(dineInNoBox.subtotal, 1900);
    assert.equal(dineInNoBox.boxFee, 0);
    assert.equal(dineInNoBox.taxRatePercent, 10);
    assert.equal(dineInNoBox.expectedTotal, 2090);
    assert.equal(dineInNoBox.expectedChange, 10);
    assert.equal(dineInNoBox.isSuccess, true);
    assert.equal(dineInNoBox.isOptimalChange, true);
  });

  it('1万円札・5千円札複数枚・500円玉複数枚・全1円玉・0枚キー混在など、どんな金種の組み合わせでも金額が合っていれば正解（changeCorrect: true, isSuccess: true）になること', () => {
    // 1. おつりに1万円札が含まれるケース（羊羹1棹 店内 1320円、20000円支払い -> おつり 18680円）
    const with10000 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 20000,
      changeCoins: { 10000: 1, 5000: 1, 1000: 3, 500: 1, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(with10000.givenChangeAmount, 18680);
    assert.equal(with10000.changeCorrect, true);
    assert.equal(with10000.isSuccess, true);
    assert.equal(with10000.isOptimalChange, true);

    // 2. 1万円札1枚の代わりに5千円札2枚（計3枚の5千円札）で渡すケース -> 正解だが手ぎわではない
    const sub10000 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 20000,
      changeCoins: { 5000: 3, 1000: 3, 500: 1, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(sub10000.givenChangeAmount, 18680);
    assert.equal(sub10000.changeCorrect, true);
    assert.equal(sub10000.isSuccess, true);
    assert.equal(sub10000.isOptimalChange, false);

    // 3. 千円札1枚の代わりに500円玉2枚（計3枚の500円玉）で渡すケース -> 正解だが手ぎわではない
    const sub1000 = evaluateTransaction({
      expectedItems: { yokan: 1 },
      selectedItems: { yokan: 1 },
      orderType: 'dine_in',
      paidAmount: 10000,
      changeCoins: { 5000: 1, 1000: 2, 500: 3, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(sub1000.givenChangeAmount, 8680);
    assert.equal(sub1000.changeCorrect, true);
    assert.equal(sub1000.isSuccess, true);
    assert.equal(sub1000.isOptimalChange, false);

    // 4. 500円玉1枚の代わりに100円玉5枚、50円玉1枚の代わりに10円玉5枚、5円玉1枚の代わりに1円玉5枚など個別崩し
    // 椿餅1個(持ち帰り 345円)、1000円支払い -> おつり 655円 をすべて1円玉 655枚 で渡すケース
    const all1Yen = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 1: 655 }
    });
    assert.equal(all1Yen.givenChangeAmount, 655);
    assert.equal(all1Yen.changeCorrect, true);
    assert.equal(all1Yen.isSuccess, true);
    assert.equal(all1Yen.isOptimalChange, false);

    // 5. 画面UI（app.js）と同様に 0 枚の金種キーがすべて含まれているマップで渡すケース（最少枚数および非最少枚数）
    const withZeroKeys = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: {
        10000: 0,
        5000: 0,
        1000: 0,
        500: 1,
        100: 1,
        50: 1,
        10: 0,
        5: 1,
        1: 0
      }
    });
    assert.equal(withZeroKeys.givenChangeAmount, 655);
    assert.equal(withZeroKeys.givenCoinsCount, 4);
    assert.equal(withZeroKeys.changeCorrect, true);
    assert.equal(withZeroKeys.isSuccess, true);
    assert.equal(withZeroKeys.isOptimalChange, true);

    const withZeroKeysSuboptimal = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: {
        10000: 0,
        5000: 0,
        1000: 0,
        500: 0,
        100: 6,
        50: 0,
        10: 5,
        5: 0,
        1: 5
      }
    });
    assert.equal(withZeroKeysSuboptimal.givenChangeAmount, 655);
    assert.equal(withZeroKeysSuboptimal.givenCoinsCount, 16);
    assert.equal(withZeroKeysSuboptimal.changeCorrect, true);
    assert.equal(withZeroKeysSuboptimal.isSuccess, true);
    assert.equal(withZeroKeysSuboptimal.isOptimalChange, false);

    // 6. 各金種単体での上位→下位両替（5000x2, 1000x5, 500x2, 100x5, 50x2, 10x5, 5x2, 1x5）および1万円札複数枚
    // 栗きんとん1個(店内 495円) に対しておつりがちょうど各額になるよう支払い、下位金種のみで渡す
    const exactBreakCases = [
      { change: 20000, coins: { 10000: 2 }, optimal: true },
      { change: 10000, coins: { 5000: 2 }, optimal: false },
      { change: 5000, coins: { 1000: 5 }, optimal: false },
      { change: 1000, coins: { 500: 2 }, optimal: false },
      { change: 500, coins: { 100: 5 }, optimal: false },
      { change: 100, coins: { 50: 2 }, optimal: false },
      { change: 50, coins: { 10: 5 }, optimal: false },
      { change: 10, coins: { 5: 2 }, optimal: false },
      { change: 5, coins: { 1: 5 }, optimal: false }
    ];
    for (const c of exactBreakCases) {
      const res = evaluateTransaction({
        expectedItems: { kurikinton: 1 },
        selectedItems: { kurikinton: 1 },
        orderType: 'dine_in',
        paidAmount: 495 + c.change,
        changeCoins: c.coins
      });
      assert.equal(res.givenChangeAmount, c.change);
      assert.equal(res.changeCorrect, true);
      assert.equal(res.isSuccess, true);
      assert.equal(res.isOptimalChange, c.optimal);
    }
  });

  it('おつりの金額が ±1円・±10円・±100円違う場合や、0円渡し・おつり0円時の過払い・税抜計算違いのおつりでは必ず不正解（changeCorrect: false, isSuccess: false）になること', () => {
    // 椿餅1個(320円) 持ち帰り(8%) -> 税込345円、1000円支払い -> 正しいおつり 655円
    // 各桁（±1円、±10円、±50円、±100円、±500円、+1000円）だけズレたおつり（下1桁が同じ5のものを含む）
    const wrongChangesFor655 = [
      { label: '-1円 (654円)', coins: { 500: 1, 100: 1, 50: 1, 1: 4 }, amount: 654 },
      { label: '+1円 (656円)', coins: { 500: 1, 100: 1, 50: 1, 5: 1, 1: 1 }, amount: 656 },
      { label: '-10円 (645円)', coins: { 500: 1, 100: 1, 10: 4, 5: 1 }, amount: 645 },
      { label: '+10円 (665円)', coins: { 500: 1, 100: 1, 50: 1, 10: 1, 5: 1 }, amount: 665 },
      { label: '-50円 (605円)', coins: { 500: 1, 100: 1, 5: 1 }, amount: 605 },
      { label: '+50円 (705円)', coins: { 500: 1, 100: 2, 5: 1 }, amount: 705 },
      { label: '-100円 (555円)', coins: { 500: 1, 50: 1, 5: 1 }, amount: 555 },
      { label: '+100円 (755円)', coins: { 500: 1, 100: 2, 50: 1, 5: 1 }, amount: 755 },
      { label: '-500円 (155円)', coins: { 100: 1, 50: 1, 5: 1 }, amount: 155 },
      { label: '+500円 (1155円)', coins: { 1000: 1, 100: 1, 50: 1, 5: 1 }, amount: 1155 },
      { label: '+1000円 (1655円)', coins: { 1000: 1, 500: 1, 100: 1, 50: 1, 5: 1 }, amount: 1655 }
    ];

    for (const wc of wrongChangesFor655) {
      const res = evaluateTransaction({
        expectedItems: { tsubakimochi: 1 },
        selectedItems: { tsubakimochi: 1 },
        orderType: 'takeout',
        paidAmount: 1000,
        changeCoins: wc.coins
      });
      assert.equal(res.givenChangeAmount, wc.amount, wc.label);
      assert.equal(res.changeCorrect, false, `${wc.label}: changeCorrect should be false`);
      assert.equal(res.isSuccess, false, `${wc.label}: isSuccess should be false`);
      assert.equal(res.isOptimalChange, false, `${wc.label}: isOptimalChange should be false`);
    }

    // おつりがあるのに 0円（{}）を渡した場合
    const zeroGiven = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: {}
    });
    assert.equal(zeroGiven.changeCorrect, false);
    assert.equal(zeroGiven.isSuccess, false);

    // おつり 0円（ぴったり支払い）なのに 1円玉1枚 を渡した場合
    const extraOnExact = evaluateTransaction({
      expectedItems: { kurikinton: 1 },
      selectedItems: { kurikinton: 1 },
      orderType: 'dine_in',
      paidAmount: 495,
      changeCoins: { 1: 1 }
    });
    assert.equal(extraOnExact.changeCorrect, false);
    assert.equal(extraOnExact.isSuccess, false);

    // 消費税を引き忘れたおつり（1000 - 320 = 680円）を渡した場合
    const noTaxChange = evaluateTransaction({
      expectedItems: { tsubakimochi: 1 },
      selectedItems: { tsubakimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 100: 1, 50: 1, 10: 3 }
    });
    assert.equal(noTaxChange.changeCorrect, false);
    assert.equal(noTaxChange.isSuccess, false);

    // 品物を間違えて選び（雪うさぎ2個注文に対し1個選択）、その間違えた品物に対するおつり（1000 - 418 = 582円）を渡した場合
    // 正しいおつりは 1000 - 836 = 164円 なので、orderCorrect も changeCorrect も false になること
    const wrongItemChange = evaluateTransaction({
      expectedItems: { yukiusagi: 2 },
      selectedItems: { yukiusagi: 1 },
      orderType: 'dine_in',
      paidAmount: 1000,
      changeCoins: { 500: 1, 50: 1, 10: 3, 1: 2 } // 582円
    });
    assert.equal(wrongItemChange.orderCorrect, false);
    assert.equal(wrongItemChange.changeCorrect, false);
    assert.equal(wrongItemChange.isSuccess, false);
    assert.equal(wrongItemChange.isOptimalChange, false);
  });

  it('端数切り捨て（.2 や .4）や複数品目の端数合算が生じる注文でも、evaluateTransaction のおつり正誤判定が決まり4・決まり6どおりに行われること', () => {
    // 1. 雪うさぎ1個(380円) 持ち帰り(8%): 380 * 1.08 = 410.4 -> 税込 410円
    // 1000円支払い -> 正しいおつり 590円（切り上げで411円と誤計算した 589円 では不正解）
    const frac4Correct = evaluateTransaction({
      expectedItems: { yukiusagi: 1 },
      selectedItems: { yukiusagi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 50: 1, 10: 4 }
    });
    assert.equal(frac4Correct.expectedTotal, 410);
    assert.equal(frac4Correct.expectedChange, 590);
    assert.equal(frac4Correct.changeCorrect, true);
    assert.equal(frac4Correct.isSuccess, true);

    const frac4Wrong = evaluateTransaction({
      expectedItems: { yukiusagi: 1 },
      selectedItems: { yukiusagi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 500: 1, 50: 1, 10: 3, 5: 1, 1: 4 } // 589円
    });
    assert.equal(frac4Wrong.changeCorrect, false);
    assert.equal(frac4Wrong.isSuccess, false);

    // 2. 椿餅1個(320円) + 黒糖わらび餅1個(520円) 持ち帰り(8%): (320 + 520) * 1.08 = 907.2 -> 税込 907円
    // 1000円支払い -> 正しいおつり 93円（品目ごとに切り捨てて 345+561=906円 と誤計算したおつり 94円 では不正解）
    const multiCorrect = evaluateTransaction({
      expectedItems: { tsubakimochi: 1, warabimochi: 1 },
      selectedItems: { tsubakimochi: 1, warabimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 50: 1, 10: 4, 1: 3 } // 93円
    });
    assert.equal(multiCorrect.expectedTotal, 907);
    assert.equal(multiCorrect.expectedChange, 93);
    assert.equal(multiCorrect.changeCorrect, true);
    assert.equal(multiCorrect.isSuccess, true);

    const multiWrong = evaluateTransaction({
      expectedItems: { tsubakimochi: 1, warabimochi: 1 },
      selectedItems: { tsubakimochi: 1, warabimochi: 1 },
      orderType: 'takeout',
      paidAmount: 1000,
      changeCoins: { 50: 1, 10: 4, 1: 4 } // 94円
    });
    assert.equal(multiWrong.changeCorrect, false);
    assert.equal(multiWrong.isSuccess, false);
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

  it('全9金種の合計金額（calculateCoinsTotal）・枚数（countTotalCoins）・ラベル（DENOMINATION_LABELS）がすべて正しいこと', () => {
    const allOne = {
      10000: 1,
      5000: 1,
      1000: 1,
      500: 1,
      100: 1,
      50: 1,
      10: 1,
      5: 1,
      1: 1
    };
    assert.equal(calculateCoinsTotal(allOne), 16666);
    assert.equal(countTotalCoins(allOne), 9);

    const desc = formatCoinsDescription(allOne);
    for (const denom of DENOMINATIONS) {
      assert.ok(desc.includes(`${DENOMINATION_LABELS[denom]} 1 枚`));
    }
  });
});
