// Day 16: Antigravity が書いたテストに、わざとバグを入れた logic.js（ミューテーション）を当てる
//
// 作業用のフォルダ（logic.js と test/）を一時フォルダにコピーし、ミューテーションを 1 つずつ入れて
// - test  : Antigravity のテスト（node --test）が落ちるか（＝バグを見つけたか）
// - check : 答え合わせのプログラム（day15/check_logic.mjs。計算と注文・支払いの生成だけを見る）が見つけるか
// を記録する。
//
// 実行: node day16/mutate.mjs E:/tmp/yukimido_test round1
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK = join(HERE, '..', 'day15', 'check_logic.mjs');
const [work, tag = 'round1', only] = process.argv.slice(2);

// [名前, 置き換える前, 置き換えた後, 説明]
export const MUTANTS = [
  ['M1', "const ratePercent = orderType === 'dine_in' ? TAX_RATE_PERCENT.dine_in : TAX_RATE_PERCENT.takeout;\n  // 浮動",
    "const ratePercent = orderType === 'dine_in' ? TAX_RATE_PERCENT.takeout : TAX_RATE_PERCENT.dine_in;\n  // 浮動",
    '持ち帰りと店内の税率を入れ替える'],
  ['M2', 'return yukiusagiCount >= BOX_MIN_YUKIUSAGI', 'return yukiusagiCount > BOX_MIN_YUKIUSAGI',
    '箱代の条件を「5 個以上」から「5 個より多い」にする'],
  ['M3', "  if (orderType !== 'takeout') return 0;\n  const yukiusagiCount", '  const yukiusagiCount',
    '店内でも箱代を足す'],
  ['M4', 'return Math.floor((taxBeforeFloor * (100 + ratePercent)) / 100);',
    'return Math.round((taxBeforeFloor * (100 + ratePercent)) / 100);', '円未満を切り捨てでなく四捨五入する'],
  ['M5', 'return Math.floor((taxBeforeFloor * (100 + ratePercent)) / 100);',
    'return Math.floor((subtotal * (100 + ratePercent)) / 100) + boxFee;', '箱代に税をかけない'],
  ['M6', 'total += MENU_MAP[id].price * qty;', 'total += MENU_MAP[id].price;', '個数を掛け忘れる'],
  ['M7', "    price: 280,", "    price: 290,", '柚子大福の値段を 280 円から 290 円にする（データの誤り）'],
  ['M8', 'export const BOX_FEE_PRICE = 150;', 'export const BOX_FEE_PRICE = 100;', '箱代を 150 円から 100 円にする'],
  ['M9', "  for (const denom of DENOMINATIONS) {\n    const count = Math.floor(remaining / denom);",
    "  for (const denom of DENOMINATIONS.filter((d) => d !== 5)) {\n    const count = Math.floor(remaining / denom);",
    'おつりの最少枚数で 5 円玉を使わない'],
  ['M10', 'const changeCorrect = givenChangeAmount === expectedChange;',
    'const changeCorrect = givenChangeAmount >= expectedChange;', 'おつりを多く渡しても正解にする'],
  ['M11', '  const isOptimalChange =\n    isSuccess &&', '  const isOptimalChange =', '間違えたときも手ぎわ点を付けうる'],
  ['M12', '  for (const id of allIds) {', '  for (const id of Object.keys(expectedItems)) {',
    '注文にない品を余計に載せても正解にする'],
  ['M13', "(item) => orderType === 'dine_in' || !item.dineInOnly", '(item) => true',
    '持ち帰りのお客も店内のみの品を頼む'],
  ['M14', 'const numTypes = Math.floor(rng() * 3) + 1;', 'const numTypes = Math.floor(rng() * 4) + 1;',
    'お客が頼む品を 1〜4 種類にする'],
  ['M15', 'const qty = Math.floor(rng() * 6) + 1;', 'const qty = Math.floor(rng() * 6);', '個数が 0〜5 個になる'],
  ['M16', 'const amount = Math.max(1, Math.floor(totalAmount));', 'const amount = Math.max(1, Math.floor(totalAmount) - 100);',
    '払うお金を、合計より 100 円少ない額から決める（足りないことがある）'],
  ['M17', 'totalCount += count;\n    }\n  }\n  return totalCount;', 'totalCount += 1;\n    }\n  }\n  return totalCount;',
    'おつりの枚数を、金種の数で数える'],
  ['M18', '(c) => c > amount);', '(c) => c > amount && c % 1000 === 0);', 'お客が千円単位でしか払わない（決まりの範囲内）'],
  ['M19', 'return Math.floor((taxBeforeFloor * (100 + ratePercent)) / 100);',
    'return Math.floor(taxBeforeFloor * (1 + ratePercent / 100));', '整数でなく小数で税をかける（この範囲では同じ答え）'],
  // 2 回目の前に足したもの。Antigravity には見せていない
  ['N1', 'const yukiusagiCount = Number(items.yukiusagi) || 0;',
    'const yukiusagiCount = Object.values(items).reduce((s, n) => s + (Number(n) || 0), 0);', '箱代の 5 個を、雪うさぎ以外も合わせて数える'],
  ['N2', "const orderType = rng() < 0.55 ? 'takeout' : 'dine_in';", "const orderType = rng() < 1.1 ? 'takeout' : 'dine_in';",
    '店内のお客が来ない（決まりの範囲内だが偏る）'],
  ['N3', "const orderType = rng() < 0.55 ? 'takeout' : 'dine_in';", "const orderType = rng() < -1 ? 'takeout' : 'dine_in';",
    '持ち帰りのお客が来ない（決まりの範囲内だが偏る）'],
  ['N4', 'const qty = Math.floor(rng() * 6) + 1;', 'const qty = Math.floor(rng() * 5) + 1;', '6 個の注文が出ない（決まりの範囲内だが偏る）'],
  ['N5', 'const numTypes = Math.floor(rng() * 3) + 1;', 'const numTypes = 1;', 'いつも 1 種類しか頼まない（決まりの範囲内だが偏る）'],
  ['N6', 'breakdown[1000] = 5;', 'breakdown[1000] = 4;', '5 千円を千円札で払うとき、4 枚しか出さない（内訳と額が合わない）'],
  ['N7', '  let sum = 0;\n  for (const denom of DENOMINATIONS) {', '  let sum = 0;\n  for (const denom of DENOMINATIONS.filter((d) => d !== 1)) {',
    '渡したおつりの額に、1 円玉を数えない'],
  ['N8', 'const changeCorrect = givenChangeAmount === expectedChange;',
    'const changeCorrect = Math.abs(givenChangeAmount - expectedChange) <= 1;', 'おつりが 1 円ずれても正解にする'],
];

const run = (cmd, args, cwd) => {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const original = readFileSync(join(work, 'logic.js'), 'utf-8');
const results = [];
for (const [name, before, after, desc] of MUTANTS) {
  if (only && name !== only) continue;
  const n = original.split(before).length - 1;
  if (n !== 1) throw new Error(`${name}: 置き換える前の文字列が ${n} か所にある`);
  const dir = mkdtempSync(join(tmpdir(), 'yukimido-'));
  cpSync(work, dir, { recursive: true, filter: (p) => !p.includes('node_modules') });
  writeFileSync(join(dir, 'logic.js'), original.replace(before, after));
  const test = run(process.execPath, ['--test'], dir);
  const check = run(process.execPath, [CHECK, 'a', join(dir, 'logic.js')], dir);
  const violated = !(check.ok && (check.out.match(/中 0 件ずれ/g) ?? []).length === 2 && /違反なし/.test(check.out));
  const failed = (test.out.match(/^# fail (\d+)/m) ?? [])[1];
  results.push({ name, desc, caught: !test.ok, failedTests: Number(failed ?? 0), ruleViolation: violated });
  console.log(`${name} ${!test.ok ? '見つけた' : '見逃した'}（落ちたテスト ${failed ?? '?'}）  答え合わせ: ${violated ? '見つけた' : '見逃した'}  ${desc}`);
  rmSync(dir, { recursive: true, force: true });
}
const base = run(process.execPath, ['--test'], work);
console.log(`元の logic.js でのテスト: ${base.ok ? '全部通る' : '落ちる'}  ${(base.out.match(/^# (tests|pass|fail) \d+/gm) ?? []).join(' / ')}`);
const caught = results.filter((r) => r.caught).length;
console.log(`見つけた ${caught} / ${results.length}`);
if (!only) {
  mkdirSync(join(HERE, 'results'), { recursive: true });
  writeFileSync(join(HERE, 'results', `mutants_${tag}.json`), JSON.stringify({ base: base.ok, results }, null, 2));
}
