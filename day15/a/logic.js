/**
 * 和菓子屋「ゆきみ堂」計算・判定ロジック (logic.js)
 * 画面（DOM）から完全に切り離された純粋関数群と定数を定義・export します。
 */

export const MENU_ITEMS = [
  {
    id: 'yukiusagi',
    name: '雪うさぎ（上生菓子）',
    orderName: '雪うさぎ',
    price: 380,
    dineInOnly: false,
    note: '',
    icon: '🐇',
    desc: '紅い目をした愛らしい薯蕷饅頭'
  },
  {
    id: 'tsubakimochi',
    name: '椿餅',
    orderName: '椿餅',
    price: 320,
    dineInOnly: false,
    note: '',
    icon: '🌺',
    desc: '道明寺粉とこし餡を椿の葉で挟んだ餅菓子'
  },
  {
    id: 'yuzudaifuku',
    name: '柚子大福',
    orderName: '柚子大福',
    price: 280,
    dineInOnly: false,
    note: '',
    icon: '🍊',
    desc: '香り高い柚子皮を練り込んだ白餡の大福'
  },
  {
    id: 'kurikinton',
    name: '栗きんとん',
    orderName: '栗きんとん',
    price: 450,
    dineInOnly: false,
    note: '',
    icon: '🌰',
    desc: '国産栗と砂糖のみで炊き上げた茶巾絞り'
  },
  {
    id: 'yokan',
    name: '羊羹「冬木立」一棹',
    orderName: '羊羹「冬木立」一棹',
    price: 1200,
    dineInOnly: false,
    note: '',
    icon: '🪵',
    desc: 'じっくり練り上げた伝統の本練羊羹'
  },
  {
    id: 'shiratamagozen',
    name: '白玉ぜんざい',
    orderName: '白玉ぜんざい',
    price: 650,
    dineInOnly: true,
    note: '店内のみ',
    icon: '🥣',
    desc: '温かい大納言小豆ともちもちの白玉'
  },
  {
    id: 'warabimochi',
    name: '黒糖わらび餅',
    orderName: '黒糖わらび餅',
    price: 520,
    dineInOnly: false,
    note: '',
    icon: '🍡',
    desc: '沖縄産黒糖と深煎りきな粉のわらび餅'
  },
  {
    id: 'matchaset',
    name: '季節の上生菓子と抹茶',
    orderName: '季節の上生菓子と抹茶',
    price: 900,
    dineInOnly: true,
    note: '店内のみ',
    icon: '🍵',
    desc: '職人の練り切りと宇治抹茶の一服'
  }
];

export const MENU_MAP = Object.fromEntries(
  MENU_ITEMS.map((item) => [item.id, item])
);

export const DENOMINATIONS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

export const DENOMINATION_LABELS = {
  10000: '1万円札',
  5000: '5千円札',
  1000: '千円札',
  500: '500円玉',
  100: '100円玉',
  50: '50円玉',
  10: '10円玉',
  5: '5円玉',
  1: '1円玉'
};

export const BOX_FEE_PRICE = 150;
export const BOX_MIN_YUKIUSAGI = 5;

export const TAX_RATE_PERCENT = {
  takeout: 8,
  dine_in: 10
};

/**
 * 品物の税抜合計を計算する
 * @param {Record<string, number>} items - { [itemId]: count }
 * @returns {number} 税抜の品物合計金額
 */
export function calculateSubtotal(items) {
  if (!items || typeof items !== 'object') return 0;
  let total = 0;
  for (const [id, count] of Object.entries(items)) {
    const qty = Number(count) || 0;
    if (qty > 0 && MENU_MAP[id]) {
      total += MENU_MAP[id].price * qty;
    }
  }
  return total;
}

/**
 * 化粧箱代（税抜）を計算する
 * 決まり3: 雪うさぎを持ち帰りで 5 個以上買うときは、化粧箱代 150 円（税抜）を足す。店内では足さない。
 * @param {Record<string, number>} items - { [itemId]: count }
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {number} 箱代（150 または 0）
 */
export function calculateBoxFee(items, orderType) {
  if (!items || typeof items !== 'object') return 0;
  if (orderType !== 'takeout') return 0;
  const yukiusagiCount = Number(items.yukiusagi) || 0;
  return yukiusagiCount >= BOX_MIN_YUKIUSAGI ? BOX_FEE_PRICE : 0;
}

/**
 * 税込の合計金額を計算する
 * 決まり2: 税率は、持ち帰り 8 %、店内 10 %。
 * 決まり4: 税込の合計 ＝（品物の合計 ＋ 箱代）× 税率 の円未満を切り捨てた額。
 * @param {Record<string, number>} items - { [itemId]: count }
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {number} 税込合計金額（整数）
 */
export function calculateTaxIncludedTotal(items, orderType) {
  const subtotal = calculateSubtotal(items);
  const boxFee = calculateBoxFee(items, orderType);
  const taxBeforeFloor = subtotal + boxFee;
  const ratePercent = orderType === 'dine_in' ? TAX_RATE_PERCENT.dine_in : TAX_RATE_PERCENT.takeout;
  // 浮動小数点誤差を防ぐため整数演算で (合計 * (100 + 税率%)) / 100 を切り捨てる
  return Math.floor((taxBeforeFloor * (100 + ratePercent)) / 100);
}

/**
 * 注文とプレイヤーが選んだ品物が完全に一致しているか判定する
 * @param {Record<string, number>} expectedItems - お客の注文 { [itemId]: count }
 * @param {Record<string, number>} selectedItems - プレイヤーの選択 { [itemId]: count }
 * @returns {boolean}
 */
export function isOrderCorrect(expectedItems, selectedItems) {
  if (!expectedItems || !selectedItems) return false;

  const allIds = new Set([
    ...Object.keys(expectedItems),
    ...Object.keys(selectedItems)
  ]);

  for (const id of allIds) {
    const exp = Number(expectedItems[id]) || 0;
    const sel = Number(selectedItems[id]) || 0;
    if (exp !== sel) {
      return false;
    }
  }
  return true;
}

/**
 * お札・硬貨の枚数マップから合計金額を計算する
 * @param {Record<number | string, number>} coinsMap - { [denomination]: count }
 * @returns {number}
 */
export function calculateCoinsTotal(coinsMap) {
  if (!coinsMap || typeof coinsMap !== 'object') return 0;
  let sum = 0;
  for (const denom of DENOMINATIONS) {
    const count = Number(coinsMap[denom]) || 0;
    if (count > 0) {
      sum += denom * count;
    }
  }
  return sum;
}

/**
 * お札・硬貨の枚数マップから総枚数を計算する
 * @param {Record<number | string, number>} coinsMap - { [denomination]: count }
 * @returns {number}
 */
export function countTotalCoins(coinsMap) {
  if (!coinsMap || typeof coinsMap !== 'object') return 0;
  let totalCount = 0;
  for (const denom of DENOMINATIONS) {
    const count = Number(coinsMap[denom]) || 0;
    if (count > 0) {
      totalCount += count;
    }
  }
  return totalCount;
}

/**
 * 指定されたおつり金額に対する最少枚数の金種内訳と枚数を計算する
 * @param {number} changeAmount - おつり額（0以上の整数）
 * @returns {{ breakdown: Record<number, number>, totalCount: number }}
 */
export function calculateMinCoins(changeAmount) {
  let remaining = Math.max(0, Math.floor(Number(changeAmount) || 0));
  const breakdown = {};
  let totalCount = 0;

  for (const denom of DENOMINATIONS) {
    const count = Math.floor(remaining / denom);
    breakdown[denom] = count;
    totalCount += count;
    remaining %= denom;
  }

  return { breakdown, totalCount };
}

/**
 * 会計全体（注文の一致、おつり額の一致、最少枚数「手ぎわ」判定）を評価する
 * @param {object} params
 * @param {Record<string, number>} params.expectedItems - お客の注文
 * @param {Record<string, number>} params.selectedItems - プレイヤーが選んだ品物
 * @param {'takeout' | 'dine_in'} params.orderType - 持ち帰り('takeout') または 店内('dine_in')
 * @param {number} params.paidAmount - お客が払った金額
 * @param {Record<number | string, number>} params.changeCoins - プレイヤーが渡したおつり { [denom]: count }
 */
export function evaluateTransaction({
  expectedItems,
  selectedItems,
  orderType,
  paidAmount,
  changeCoins
}) {
  const orderCorrect = isOrderCorrect(expectedItems, selectedItems);
  const subtotal = calculateSubtotal(expectedItems);
  const boxFee = calculateBoxFee(expectedItems, orderType);
  const taxRatePercent = orderType === 'dine_in' ? TAX_RATE_PERCENT.dine_in : TAX_RATE_PERCENT.takeout;
  const expectedTotal = calculateTaxIncludedTotal(expectedItems, orderType);
  const expectedChange = paidAmount - expectedTotal;

  const givenChangeAmount = calculateCoinsTotal(changeCoins);
  const givenCoinsCount = countTotalCoins(changeCoins);

  const changeCorrect = givenChangeAmount === expectedChange;
  const isSuccess = orderCorrect && changeCorrect;

  const minCoinsInfo = calculateMinCoins(expectedChange);
  // 日本の通貨単位（10000, 5000, 1000, 500, 100, 50, 10, 5, 1）は正準系(canonical coin system)であり、
  // かつ任意の金額に対して最少枚数となる組み合わせは一意だが、枚数比較と内訳一致の両方で厳密に確認する。
  const isOptimalChange =
    isSuccess &&
    givenCoinsCount === minCoinsInfo.totalCount &&
    DENOMINATIONS.every((d) => (Number(changeCoins[d]) || 0) === minCoinsInfo.breakdown[d]);

  return {
    isSuccess,
    orderCorrect,
    changeCorrect,
    isOptimalChange,
    subtotal,
    boxFee,
    taxRatePercent,
    expectedTotal,
    paidAmount,
    expectedChange,
    givenChangeAmount,
    givenCoinsCount,
    optimalBreakdown: minCoinsInfo.breakdown,
    optimalCoinsCount: minCoinsInfo.totalCount
  };
}

/**
 * お客の注文をランダムに生成する
 * 決まり1: お客は「持ち帰り」か「店内」のどちらか。持ち帰りのお客は、店内のみの品を頼まない。
 * 決まり7: 1 人のお客が頼む品は 1〜3 種類、各 1〜6 個。
 * @param {() => number} [rng=Math.random]
 */
export function generateCustomerOrder(rng = Math.random) {
  const orderType = rng() < 0.55 ? 'takeout' : 'dine_in';

  const availableMenu = MENU_ITEMS.filter(
    (item) => orderType === 'dine_in' || !item.dineInOnly
  );

  // 1〜3種類を選択
  const numTypes = Math.floor(rng() * 3) + 1;
  const pool = [...availableMenu];
  const chosenItems = [];

  for (let i = 0; i < numTypes && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    chosenItems.push(pool.splice(idx, 1)[0]);
  }

  const items = {};
  for (const item of chosenItems) {
    // 各 1〜6 個
    const qty = Math.floor(rng() * 6) + 1;
    items[item.id] = qty;
  }

  const speechText = formatOrderSpeech(items, orderType);

  return {
    orderType,
    items,
    speechText
  };
}

/**
 * 注文内容からセリフ文字列を生成する
 * 例：「雪うさぎを 2 つと、柚子大福を 1 つ。持ち帰りで」
 * @param {Record<string, number>} items
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {string}
 */
export function formatOrderSpeech(items, orderType) {
  const phrases = [];
  for (const menu of MENU_ITEMS) {
    const count = Number(items[menu.id]) || 0;
    if (count > 0) {
      const counterWord = menu.id === 'yokan' ? `${count} 棹（さお）` : `${count} つ`;
      // 「雪うさぎを 2 つ」のように自然な表記にするため、一棹はそのまま「1 つ」または個数表現に対応
      const simpleCounter = `${count} つ`;
      phrases.push(`${menu.orderName}を ${simpleCounter}`);
    }
  }
  const itemsText = phrases.join('と、');
  const suffix = orderType === 'takeout' ? '持ち帰りで。' : '店内で。';
  return `「${itemsText}。${suffix}」`;
}

/**
 * 税込合計金額に対して、お客が払うお金（合計額と金種内訳）を生成する
 * 決まり5: お客が払うお金は、税込の合計以上で、1万円札〜1円玉の組み合わせ。
 * @param {number} totalAmount - 税込合計金額
 * @param {() => number} [rng=Math.random]
 * @returns {{ paidAmount: number, breakdown: Record<number, number>, description: string }}
 */
export function generateCustomerPayment(totalAmount, rng = Math.random) {
  const amount = Math.max(1, Math.floor(totalAmount));
  const candidates = new Set();

  // 1. 千円単位の切り上げ（例: 1,350円 -> 2,000円）
  const next1000 = Math.ceil(amount / 1000) * 1000;
  candidates.add(next1000);

  // 2. 500円単位の切り上げ（例: 1,350円 -> 1,500円）
  const next500 = Math.ceil(amount / 500) * 500;
  candidates.add(next500);

  // 3. 100円単位の切り上げ（例: 1,350円 -> 1,400円）
  const next100 = Math.ceil(amount / 100) * 100;
  candidates.add(next100);

  // 4. 5千円札や1万円札を使った支払い
  if (amount <= 5000) {
    candidates.add(5000);
  }
  if (amount <= 10000) {
    candidates.add(10000);
  } else {
    candidates.add(Math.ceil(amount / 5000) * 5000);
    candidates.add(Math.ceil(amount / 10000) * 10000);
  }

  // 5. 端数を合わせた賢い出し方（おつりが500円や100円や50円になる出し方）
  const onesAndTens = amount % 100;
  if (onesAndTens > 0) {
    // 端数だけぴったり出す（例: 1,234円に対して 2,034円や 1,534円）
    candidates.add(next1000 + onesAndTens);
    if (next500 >= amount) {
      candidates.add(next500 + (amount % 10));
    }
  }

  // ぴったり支払いも低確率で候補に含めるが、おつり計算の遊びのためおつりが出る候補を優先する
  const validCandidates = [...candidates].filter((c) => c > amount);
  let paidAmount;
  if (validCandidates.length > 0 && rng() < 0.92) {
    const idx = Math.floor(rng() * validCandidates.length);
    paidAmount = validCandidates[idx];
  } else {
    paidAmount = next1000 > amount ? next1000 : amount + 100;
  }

  // 金種内訳を構成（標準の最少枚数表現をベースにしつつ、時々千円札複数枚にする）
  const { breakdown } = calculateMinCoins(paidAmount);

  // 例: 5000円を千円札5枚で出すパターンを少し混ぜる
  if (breakdown[5000] === 1 && breakdown[1000] === 0 && paidAmount <= 5000 && rng() < 0.25) {
    breakdown[5000] = 0;
    breakdown[1000] = 5;
  }

  const description = formatCoinsDescription(breakdown);

  return {
    paidAmount,
    breakdown,
    description
  };
}

/**
 * 金種内訳オブジェクトから「千円札 1 枚、100円玉 2 枚」のような文字列を作る
 * @param {Record<number, number>} breakdown
 * @returns {string}
 */
export function formatCoinsDescription(breakdown) {
  const parts = [];
  for (const denom of DENOMINATIONS) {
    const count = Number(breakdown[denom]) || 0;
    if (count > 0) {
      parts.push(`${DENOMINATION_LABELS[denom]} ${count} 枚`);
    }
  }
  return parts.length > 0 ? parts.join('、') : '0 円';
}
