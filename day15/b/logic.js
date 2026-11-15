/**
 * 和菓子屋「ゆきみ堂」 計算・判定ロジック (logic.js)
 * 画面 (DOM) から切り離された純粋な関数と定数を定義・export します。
 */

/** お品書き（税抜価格・店内限定フラグ） */
export const MENU_ITEMS = [
  {
    id: 'yukiusagi',
    name: '雪うさぎ（上生菓子）',
    shortName: '雪うさぎ',
    counterWord: 'つ',
    price: 380,
    dineInOnly: false,
    category: '生菓子',
    description: 'ふんわり薯蕷饅頭に赤い目をあしらった冬の上生菓子',
  },
  {
    id: 'tsubakimochi',
    name: '椿餅',
    shortName: '椿餅',
    counterWord: 'つ',
    price: 320,
    dineInOnly: false,
    category: '生菓子',
    description: '道明寺粉とこし餡を艶やかな椿の葉で挟んだ銘菓',
  },
  {
    id: 'yuzudaifuku',
    name: '柚子大福',
    shortName: '柚子大福',
    counterWord: 'つ',
    price: 280,
    dineInOnly: false,
    category: '大福',
    description: '香り高い柚子皮を練り込んだ白餡入りの羽二重餅',
  },
  {
    id: 'kurikinton',
    name: '栗きんとん',
    shortName: '栗きんとん',
    counterWord: 'つ',
    price: 450,
    dineInOnly: false,
    category: '生菓子',
    description: '国産栗と砂糖のみで炊き上げたほっくり茶巾絞り',
  },
  {
    id: 'yokan',
    name: '羊羹「冬木立」一棹',
    shortName: '羊羹「冬木立」一棹',
    counterWord: 'つ',
    price: 1200,
    dineInOnly: false,
    category: '棹菓子',
    description: '小豆の風味豊かな本格煉羊羹（一棹）',
  },
  {
    id: 'shiratama',
    name: '白玉ぜんざい',
    shortName: '白玉ぜんざい',
    counterWord: 'つ',
    price: 650,
    dineInOnly: true,
    category: '甘味（店内）',
    description: '大納言小豆と茹でたて白玉の温かいぜんざい',
  },
  {
    id: 'warabimochi',
    name: '黒糖わらび餅',
    shortName: '黒糖わらび餅',
    counterWord: 'つ',
    price: 520,
    dineInOnly: false,
    category: '餅菓子',
    description: '沖縄産黒糖と深煎りきな粉をまぶしたとろける食感',
  },
  {
    id: 'matcha_set',
    name: '季節の上生菓子と抹茶',
    shortName: '季節の上生菓子と抹茶',
    counterWord: 'つ',
    price: 900,
    dineInOnly: true,
    category: '甘味（店内）',
    description: '宇治抹茶と本日の上生菓子のお召し上がりセット',
  },
];

export const MENU_MAP = Object.fromEntries(
  MENU_ITEMS.map((item) => [item.id, item])
);

/** お札・硬貨の額面（大きい順） */
export const DENOMINATIONS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

export const DENOMINATION_LABELS = {
  10000: '一万円札',
  5000: '五千円札',
  1000: '千円札',
  500: '500円玉',
  100: '100円玉',
  50: '50円玉',
  10: '10円玉',
  5: '5円玉',
  1: '1円玉',
};

/** 税率・箱代の定数 */
export const TAX_RATE_TAKEOUT = 0.08;
export const TAX_RATE_DINE_IN = 0.10;
export const YUKIUSAGI_BOX_THRESHOLD = 5;
export const YUKIUSAGI_BOX_FEE = 150;

/**
 * 注文データ（オブジェクト形式 { itemId: count } または配列形式 [{ id, count }]）を
 * 正規化された { itemId: count } マップに変換する。
 * @param {Record<string, number> | Array<{id: string, count?: number, quantity?: number}>} items
 * @returns {Record<string, number>}
 */
export function normalizeItemsMap(items) {
  const normalized = {};
  if (!items) return normalized;

  if (Array.isArray(items)) {
    for (const entry of items) {
      if (!entry || !entry.id) continue;
      const qty = Number(entry.count ?? entry.quantity ?? 0);
      if (qty > 0) {
        normalized[entry.id] = (normalized[entry.id] || 0) + qty;
      }
    }
  } else if (typeof items === 'object') {
    for (const [id, rawCount] of Object.entries(items)) {
      const qty = Number(rawCount || 0);
      if (qty > 0) {
        normalized[id] = qty;
      }
    }
  }
  return normalized;
}

/**
 * 品物の税抜小計（箱代を除く）を計算する。
 * @param {Record<string, number> | Array<{id: string, count: number}>} items
 * @returns {number} 税抜の品物合計（円）
 */
export function calculateSubtotal(items) {
  const map = normalizeItemsMap(items);
  let subtotal = 0;
  for (const [id, count] of Object.entries(map)) {
    const menu = MENU_MAP[id];
    if (!menu) {
      throw new Error(`Unknown menu item id: ${id}`);
    }
    subtotal += menu.price * count;
  }
  return subtotal;
}

/**
 * 化粧箱代（税抜）を計算する。
 * 決まり3: 雪うさぎを持ち帰りで 5 個以上買うときは、化粧箱代 150 円（税抜）を足す。店内では足さない。
 * @param {Record<string, number> | Array<{id: string, count: number}>} items
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {number} 化粧箱代（0 または 150）
 */
export function calculateBoxFee(items, orderType) {
  if (orderType !== 'takeout') {
    return 0;
  }
  const map = normalizeItemsMap(items);
  const yukiusagiCount = map.yukiusagi || 0;
  return yukiusagiCount >= YUKIUSAGI_BOX_THRESHOLD ? YUKIUSAGI_BOX_FEE : 0;
}

/**
 * 税込の合計金額を計算する。
 * 決まり2: 税率は、持ち帰り 8 %、店内 10 %。
 * 決まり3: 雪うさぎを持ち帰りで 5 個以上買うときは、化粧箱代 150 円（税抜）を足す。店内では足さない。
 * 決まり4: 税込の合計 ＝（品物の合計 ＋ 箱代）× 税率 の円未満を切り捨てた額。
 * ※浮動小数点誤差を防ぐため整数演算 Math.floor((preTaxTotal * (100 + taxPercent)) / 100) を用いる。
 * @param {Record<string, number> | Array<{id: string, count: number}>} items
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {number} 税込合計金額（円）
 */
export function calculateTaxIncludedTotal(items, orderType) {
  const subtotal = calculateSubtotal(items);
  if (subtotal === 0) return 0;
  const boxFee = calculateBoxFee(items, orderType);
  const preTaxTotal = subtotal + boxFee;
  const taxPercent = orderType === 'takeout' ? 8 : 10;
  return Math.floor((preTaxTotal * (100 + taxPercent)) / 100);
}

/**
 * 会計の内訳（小計、箱代、税抜合計、税率、消費税額、税込合計）をまとめて返す。
 * @param {Record<string, number> | Array<{id: string, count: number}>} items
 * @param {'takeout' | 'dine_in'} orderType
 */
export function calculateOrderSummary(items, orderType) {
  const subtotal = calculateSubtotal(items);
  const boxFee = subtotal > 0 ? calculateBoxFee(items, orderType) : 0;
  const preTaxTotal = subtotal + boxFee;
  const taxPercent = orderType === 'takeout' ? 8 : 10;
  const taxRate = taxPercent / 100;
  const total = subtotal > 0 ? Math.floor((preTaxTotal * (100 + taxPercent)) / 100) : 0;
  const taxAmount = total - preTaxTotal;

  return {
    subtotal,
    boxFee,
    preTaxTotal,
    taxPercent,
    taxRate,
    taxAmount,
    total,
  };
}

/**
 * お客の注文とプレイヤーが選んだ品物が一致しているかを判定する。
 * @param {Record<string, number> | Array<{id: string, count: number}>} expectedItems お客の注文
 * @param {Record<string, number> | Array<{id: string, count: number}>} selectedItems プレイヤーの選択
 * @returns {boolean}
 */
export function isOrderCorrect(expectedItems, selectedItems) {
  const expected = normalizeItemsMap(expectedItems);
  const selected = normalizeItemsMap(selectedItems);

  const expectedKeys = Object.keys(expected);
  const selectedKeys = Object.keys(selected);

  if (expectedKeys.length !== selectedKeys.length) {
    return false;
  }

  for (const id of expectedKeys) {
    if (expected[id] !== selected[id]) {
      return false;
    }
  }
  return true;
}

/**
 * 指定された金額に対する最小枚数の金種内訳と合計枚数を計算する。
 * @param {number} amount おつり金額（0以上の整数）
 * @returns {{ breakdown: Record<number, number>, totalCoins: number }}
 */
export function getOptimalChangeBreakdown(amount) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Invalid change amount: ${amount}`);
  }
  let remaining = amount;
  const breakdown = {};
  let totalCoins = 0;

  for (const denom of DENOMINATIONS) {
    const count = Math.floor(remaining / denom);
    breakdown[denom] = count;
    totalCoins += count;
    remaining %= denom;
  }

  return { breakdown, totalCoins };
}

/**
 * おつりの最少枚数を返す。
 * @param {number} changeAmount おつり金額（0以上の整数）
 * @returns {number} 最少のお札・硬貨の合計枚数
 */
export function calculateMinChangeCoins(changeAmount) {
  return getOptimalChangeBreakdown(changeAmount).totalCoins;
}

/**
 * お札・硬貨の枚数マップ { 10000: n, 5000: n, ... } から合計金額と合計枚数を計算する。
 * @param {Record<number, number>} coinsMap
 * @returns {{ totalAmount: number, totalCoins: number }}
 */
export function sumCoinsMap(coinsMap) {
  let totalAmount = 0;
  let totalCoins = 0;
  if (!coinsMap) return { totalAmount, totalCoins };

  for (const denom of DENOMINATIONS) {
    const count = Math.max(0, Math.floor(Number(coinsMap[denom] || 0)));
    totalAmount += denom * count;
    totalCoins += count;
  }
  return { totalAmount, totalCoins };
}

/**
 * プレイヤーが渡したおつりを判定する。
 * 決まり6: おつりは金額が合っていれば正解。枚数がいちばん少ない渡し方なら、売上とは別に「手ぎわ」点を 1 点足す。
 * @param {number} expectedChange 正しいおつり金額
 * @param {Record<number, number>} playerCoinsMap プレイヤーが選んだ金種ごとの枚数
 */
export function evaluateChange(expectedChange, playerCoinsMap) {
  const { totalAmount: givenAmount, totalCoins: givenCoins } = sumCoinsMap(playerCoinsMap);
  const { breakdown: optimalBreakdown, totalCoins: minCoins } =
    getOptimalChangeBreakdown(expectedChange);

  const isAmountCorrect = givenAmount === expectedChange;
  const isOptimalCoins = isAmountCorrect && givenCoins === minCoins;

  return {
    isAmountCorrect,
    isOptimalCoins,
    givenAmount,
    expectedChange,
    givenCoins,
    minCoins,
    optimalBreakdown,
  };
}

/**
 * 注文内容とおつりの両方を総合判定する。
 * @param {{ items: Record<string, number>, orderType: 'takeout' | 'dine_in', paymentAmount: number }} customerOrder
 * @param {Record<string, number>} playerItems
 * @param {Record<number, number>} playerChangeCoins
 */
export function evaluateTransaction(customerOrder, playerItems, playerChangeCoins) {
  const orderMatched = isOrderCorrect(customerOrder.items, playerItems);
  const summary = calculateOrderSummary(customerOrder.items, customerOrder.orderType);
  const expectedChange = customerOrder.paymentAmount - summary.total;
  const changeResult = evaluateChange(expectedChange, playerChangeCoins);

  const isSuccess = orderMatched && changeResult.isAmountCorrect;
  const tegiwaBonus = isSuccess && changeResult.isOptimalCoins ? 1 : 0;
  const addedSales = isSuccess ? summary.total : 0;

  return {
    isSuccess,
    orderMatched,
    changeResult,
    summary,
    addedSales,
    tegiwaBonus,
  };
}

/**
 * お客が支払う金額と金種内訳を生成する。
 * 決まり5: お客が払うお金は、税込の合計以上で、1万円札・5千円札・千円札・500円玉・100円玉・50円玉・10円玉・5円玉・1円玉の組み合わせ。
 * @param {number} totalAmount 税込の合計金額
 * @param {() => number} [rng=Math.random] 乱数生成関数
 * @returns {{ paymentAmount: number, breakdown: Record<number, number>, expectedChange: number }}
 */
export function generateCustomerPayment(totalAmount, rng = Math.random) {
  const candidates = new Set();

  // 1. キリの良い単位で切り上げた支払い候補
  const ceil100 = Math.ceil((totalAmount + 1) / 100) * 100;
  const ceil500 = Math.ceil((totalAmount + 1) / 500) * 500;
  const ceil1000 = Math.ceil((totalAmount + 1) / 1000) * 1000;
  const ceil5000 = Math.ceil((totalAmount + 1) / 5000) * 5000;
  const ceil10000 = Math.ceil((totalAmount + 1) / 10000) * 10000;

  candidates.add(ceil100);
  candidates.add(ceil500);
  candidates.add(ceil1000);
  if (totalAmount <= 5000) candidates.add(5000);
  if (totalAmount <= 10000) candidates.add(10000);
  candidates.add(ceil5000);
  candidates.add(ceil10000);

  // 2. 端数を揃えておつりを綺麗にする現実的な支払いパターン（例: 1,123円に対して1,130円や1,203円など）
  const mod10 = totalAmount % 10;
  const mod100 = totalAmount % 100;
  if (mod10 > 0) {
    candidates.add(ceil1000 + mod10);
    candidates.add(ceil500 + mod10);
  }
  if (mod100 > 0) {
    const nextTen = Math.ceil(totalAmount / 10) * 10;
    if (nextTen > totalAmount) candidates.add(nextTen);
    const nextFifty = Math.ceil(totalAmount / 50) * 50;
    if (nextFifty > totalAmount) candidates.add(nextFifty);
  }

  // 税込合計より大きい候補を優先（おつり計算を楽しめるようにする）
  const validCandidates = Array.from(candidates).filter((amt) => amt > totalAmount);
  // 重み付けで身近な支払額を選びやすくする（千円単位や百円・五百円単位を多めに）
  validCandidates.sort((a, b) => a - b);

  const chosenIndex = Math.min(
    validCandidates.length - 1,
    Math.floor(rng() * Math.min(validCandidates.length, 4))
  );
  const paymentAmount = validCandidates[chosenIndex] || ceil1000 || totalAmount + 100;

  const { breakdown } = getOptimalChangeBreakdown(paymentAmount);
  return {
    paymentAmount,
    breakdown,
    expectedChange: paymentAmount - totalAmount,
  };
}

/**
 * 決まり1・7に従って、1人のお客の注文をランダムに生成する。
 * - 決まり1: お客は「持ち帰り」か「店内」のどちらか。持ち帰りのお客は、店内のみの品を頼まない。
 * - 決まり7: 1人のお客が頼む品は 1〜3 種類、各 1〜6 個。
 * @param {() => number} [rng=Math.random]
 */
export function generateCustomerOrder(rng = Math.random) {
  const orderType = rng() < 0.55 ? 'takeout' : 'dine_in';

  const availablePool = MENU_ITEMS.filter(
    (item) => !(orderType === 'takeout' && item.dineInOnly)
  );

  // 1〜3種類
  const numTypes = Math.floor(rng() * 3) + 1;

  // シャッフルして先頭 numTypes 個を選ぶ
  const shuffled = [...availablePool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const chosenMenus = shuffled.slice(0, numTypes);
  const items = {};
  for (const menu of chosenMenus) {
    // 各 1〜6 個
    const qty = Math.floor(rng() * 6) + 1;
    items[menu.id] = qty;
  }

  const summary = calculateOrderSummary(items, orderType);
  const payment = generateCustomerPayment(summary.total, rng);
  const orderText = formatCustomerOrderSpeech(items, orderType);
  const paymentText = formatPaymentDescription(payment.breakdown, payment.paymentAmount);

  return {
    orderType,
    items,
    summary,
    paymentAmount: payment.paymentAmount,
    paymentBreakdown: payment.breakdown,
    expectedChange: payment.expectedChange,
    orderText,
    paymentText,
  };
}

/**
 * 注文内容を自然なセリフ（例：「雪うさぎを 2 つと、柚子大福を 1 つ。持ち帰りで」）に整形する。
 * @param {Record<string, number>} items
 * @param {'takeout' | 'dine_in'} orderType
 * @returns {string}
 */
export function formatCustomerOrderSpeech(items, orderType) {
  const map = normalizeItemsMap(items);
  const parts = [];
  for (const menu of MENU_ITEMS) {
    const qty = map[menu.id];
    if (qty > 0) {
      parts.push(`${menu.shortName}を ${qty} ${menu.counterWord}`);
    }
  }
  const itemsPhrase = parts.join('と、');
  const typePhrase = orderType === 'takeout' ? '持ち帰りで' : '店内で';
  return `${itemsPhrase}。${typePhrase}`;
}

/**
 * 支払いの金種内訳を読みやすい文字列（例：「千円札 1 枚・500 円玉 1 枚」）に整形する。
 * @param {Record<number, number>} breakdown
 * @param {number} [totalAmount]
 * @returns {string}
 */
export function formatPaymentDescription(breakdown, totalAmount) {
  const parts = [];
  for (const denom of DENOMINATIONS) {
    const count = breakdown[denom] || 0;
    if (count > 0) {
      parts.push(`${DENOMINATION_LABELS[denom]} ${count} 枚`);
    }
  }
  if (parts.length === 0) return '0 円';
  const joined = parts.join('・');
  return typeof totalAmount === 'number'
    ? `${joined}（計 ${totalAmount.toLocaleString('ja-JP')} 円）`
    : joined;
}
