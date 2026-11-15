// Day 15: Antigravity が書いた logic.js を、決まりどおりの答え合わせ（参照実装）と照合する
// 実行: node day15/check_logic.mjs a E:/tmp/yukimido_a/logic.js
import { pathToFileURL } from 'node:url';

const [name, path] = process.argv.slice(2);
const L = await import(pathToFileURL(path).href);

// ---- 参照実装（prompt.md の決まりをそのまま書いたもの） ----
const MENU = [ // [品, 値段, 店内のみ]
  ['雪うさぎ', 380, false], ['椿餅', 320, false], ['柚子大福', 280, false], ['栗きんとん', 450, false],
  ['羊羹', 1200, false], ['白玉ぜんざい', 650, true], ['黒糖わらび餅', 520, false], ['上生菓子と抹茶', 900, true],
];
const DENOMS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
const refTotal = (counts, dineIn) => { // counts: 品ごとの個数の配列
  const sub = counts.reduce((s, n, i) => s + n * MENU[i][1], 0);
  const box = !dineIn && counts[0] >= 5 ? 150 : 0;
  return Math.floor((sub + box) * (dineIn ? 110 : 108) / 100);
};
const refMinCoins = (amount) => DENOMS.reduce((n, d) => { n += Math.floor(amount / d); amount %= d; return n; }, 0);

// ---- 実装ごとの呼び出し方の違いを吸収する ----
const adapters = {
  a: {
    ids: L.MENU_ITEMS?.map((m) => m.id),
    total(counts, dineIn) {
      const items = Object.fromEntries(counts.map((n, i) => [this.ids[i], n]).filter(([, n]) => n > 0));
      return L.calculateTaxIncludedTotal(items, dineIn ? 'dine_in' : 'takeout');
    },
    minCoins: (amount) => L.calculateMinCoins(amount).totalCount,
    order(rng) {
      const o = L.generateCustomerOrder(rng);
      return { dineIn: o.orderType === 'dine_in', counts: this.ids.map((id) => o.items[id] ?? 0) };
    },
    pay: (total, rng) => L.generateCustomerPayment(total, rng).paidAmount,
  },
  b: {
    ids: L.MENU_ITEMS?.map((m) => m.id),
    total(counts, dineIn) { return adapters.a.total.call(this, counts, dineIn); },
    minCoins: (amount) => L.calculateMinChangeCoins(amount),
    order(rng) { return adapters.a.order.call(this, rng); },
    pay: (total, rng) => L.generateCustomerPayment(total, rng).paymentAmount,
  },
};
const A = adapters[name];

// 1. 全ての注文（1〜3 種類、各 1〜6 個、持ち帰り／店内）で税込の合計を比べる
let orders = 0; const wrong = [];
const combos = (k, start, acc) => k === 0 ? [acc] :
  Array.from({ length: 8 - start }, (_, j) => combos(k - 1, start + j + 1, [...acc, start + j])).flat();
for (const dineIn of [false, true]) for (let k = 1; k <= 3; k++) for (const kinds of combos(k, 0, [])) {
  if (!dineIn && kinds.some((i) => MENU[i][2])) continue; // 持ち帰りは店内のみの品を頼まない
  const qtys = Array.from({ length: 6 ** k }, (_, x) => kinds.map((_, j) => Math.floor(x / 6 ** j) % 6 + 1));
  for (const q of qtys) {
    const counts = Array(8).fill(0); kinds.forEach((i, j) => { counts[i] = q[j]; });
    orders++;
    const got = A.total(counts, dineIn), exp = refTotal(counts, dineIn);
    if (got !== exp) wrong.push({ counts, dineIn, got, exp });
  }
}
console.log(`[${name}] 税込の合計: ${orders} 通り中 ${wrong.length} 件ずれ`, wrong.slice(0, 5));

// 2. おつりの最少枚数（0〜30,000 円）
const badCoins = [];
for (let y = 0; y <= 30000; y++) if (A.minCoins(y) !== refMinCoins(y)) badCoins.push(y);
console.log(`[${name}] 最少枚数: 30,001 通り中 ${badCoins.length} 件ずれ`, badCoins.slice(0, 5));

// 3. お客の注文と支払いを 10 万回作り、決まり 1・5・7 を守るか
let seed = 1; const rng = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const viol = {};
const v = (k, ex) => { viol[k] ??= { n: 0, ex }; viol[k].n++; };
for (let t = 0; t < 100000; t++) {
  const o = A.order(rng); const kinds = o.counts.filter((n) => n > 0).length;
  if (kinds < 1 || kinds > 3) v('種類が 1〜3 でない', o);
  if (o.counts.some((n) => n < 0 || n > 6)) v('個数が 0〜6 でない', o);
  if (!o.dineIn && o.counts.some((n, i) => n > 0 && MENU[i][2])) v('持ち帰りで店内のみの品', o);
  const total = refTotal(o.counts, o.dineIn); const paid = A.pay(total, rng);
  if (!(Number.isInteger(paid) && paid >= total)) v('払うお金が合計未満', { total, paid });
}
console.log(`[${name}] 注文と支払い 10 万回:`, Object.keys(viol).length ? viol : '違反なし');
