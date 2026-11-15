// Day 24: 会計スキルに出す注文と、決まりどおりの正解（day15/check_logic.mjs と同じ計算）
// o1・o4 は払う額が合計より少ない（足りないと気づくかを見る）、o8 は店内のみの品の持ち帰り、o10 はちょうど払う
const P = { 雪うさぎ: 380, 椿餅: 320, 柚子大福: 280, 栗きんとん: 450, 羊羹: 1200, 白玉ぜんざい: 650, 黒糖わらび餅: 520, 上生菓子と抹茶: 900 };
const DENOMS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
const ORDERS = [
  ['o1', '雪うさぎを3つ、持ち帰りで。1000円で払います。', { 雪うさぎ: 3 }, false, 1000],
  ['o2', '雪うさぎを5つ、持ち帰りで。5000円札で。', { 雪うさぎ: 5 }, false, 5000],
  ['o3', '雪うさぎを5つ、店内でいただきます。3000円で。', { 雪うさぎ: 5 }, true, 3000],
  ['o4', '雪うさぎを4つと柚子大福を2つ、持ち帰り。2000円で。', { 雪うさぎ: 4, 柚子大福: 2 }, false, 2000],
  ['o5', '椿餅1つと黒糖わらび餅1つ、持ち帰りで。1000円で。', { 椿餅: 1, 黒糖わらび餅: 1 }, false, 1000],
  ['o6', '羊羹「冬木立」を2棹と栗きんとんを3つ、持ち帰りで。1万円で払います。', { 羊羹: 2, 栗きんとん: 3 }, false, 10000],
  ['o7', '白玉ぜんざいを2つと季節の上生菓子と抹茶を1つ、店内で。3000円で。', { 白玉ぜんざい: 2, 上生菓子と抹茶: 1 }, true, 3000],
  ['o8', '白玉ぜんざいを1つ、持ち帰りでお願いします。', { 白玉ぜんざい: 1 }, false, null],
  ['o9', '雪うさぎを6つと椿餅を6つと栗きんとんを6つ、持ち帰りで。1万円で。', { 雪うさぎ: 6, 椿餅: 6, 栗きんとん: 6 }, false, 10000],
  ['o10', '柚子大福を1つ、店内で。308円ちょうどで払います。', { 柚子大福: 1 }, true, 308],
];
for (const [id, text, items, dineIn, paid] of ORDERS) {
  const sub = Object.entries(items).reduce((s, [k, n]) => s + P[k] * n, 0);
  const box = !dineIn && (items.雪うさぎ ?? 0) >= 5 ? 150 : 0;
  const total = Math.floor((sub + box) * (dineIn ? 110 : 108) / 100);
  const dineOnly = !dineIn && (items.白玉ぜんざい || items.上生菓子と抹茶);
  let change = paid == null ? null : paid - total, coins = [];
  if (change != null && change >= 0) { let r = change; for (const d of DENOMS) { const c = Math.floor(r / d); if (c) coins.push(`${d}円×${c}`); r %= d; } }
  console.log(JSON.stringify({ id, text, expected: dineOnly ? '店内のみの品なので持ち帰りにできない' : change < 0 ? { subtotal: sub, box, total, short: -change } : { subtotal: sub, box, total, change, coins: coins.join(' ') } }, null, 0));
}
