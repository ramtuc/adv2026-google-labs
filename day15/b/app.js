import {
  MENU_ITEMS,
  MENU_MAP,
  DENOMINATIONS,
  DENOMINATION_LABELS,
  calculateSubtotal,
  calculateBoxFee,
  calculateTaxIncludedTotal,
  calculateOrderSummary,
  isOrderCorrect,
  calculateMinChangeCoins,
  getOptimalChangeBreakdown,
  sumCoinsMap,
  evaluateChange,
  evaluateTransaction,
  generateCustomerOrder,
} from './logic.js';

const STORAGE_KEY_HIGH_SALES = 'yukimido_high_sales_v1';
const GAME_DURATION_MS = 90 * 1000;

/** 和菓子ごとのSVGアイコン定義 */
const WAGASHI_SVGS = {
  yukiusagi: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <ellipse cx="24" cy="28" rx="16" ry="13" fill="#ffffff" stroke="#d9cfc3" stroke-width="2"/>
      <path d="M18 16 C12 10, 10 16, 17 20" fill="#7ab893"/>
      <path d="M22 15 C18 8, 15 13, 21 19" fill="#589e74"/>
      <circle cx="16" cy="28" r="2.2" fill="#d12c2c"/>
    </svg>`,
  tsubakimochi: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <path d="M8 26 Q24 10 40 26 Q24 34 8 26 Z" fill="#3a6b48"/>
      <ellipse cx="24" cy="26" rx="12" ry="9" fill="#f7dce0" stroke="#e3b8bf" stroke-width="1.5"/>
      <path d="M10 28 Q24 42 38 28 Q24 22 10 28 Z" fill="#2d5739"/>
    </svg>`,
  yuzudaifuku: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <ellipse cx="24" cy="27" rx="15" ry="12" fill="#fff4c7" stroke="#e3c56b" stroke-width="2"/>
      <circle cx="20" cy="23" r="1.5" fill="#d48b19"/>
      <circle cx="28" cy="26" r="1.3" fill="#d48b19"/>
      <circle cx="23" cy="30" r="1.2" fill="#d48b19"/>
    </svg>`,
  kurikinton: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <path d="M24 10 C34 16, 38 27, 34 36 C30 40, 18 40, 14 36 C10 27, 14 16, 24 10 Z" fill="#d99b26" stroke="#b07812" stroke-width="2"/>
      <path d="M24 10 L21 19 M24 10 L24 20 M24 10 L27 19" stroke="#966309" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
  yokan: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <polygon points="10,22 28,12 38,18 20,28" fill="#5e2c31"/>
      <polygon points="10,22 20,28 20,38 10,32" fill="#421c20"/>
      <polygon points="20,28 38,18 38,28 20,38" fill="#4f2328"/>
    </svg>`,
  shiratama: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <path d="M8 22 H40 A16 15 0 0 1 8 22 Z" fill="#b8332a"/>
      <ellipse cx="24" cy="22" rx="16" ry="6" fill="#6b2d29"/>
      <circle cx="19" cy="21" r="4.5" fill="#ffffff"/>
      <circle cx="27" cy="22" r="4.5" fill="#ffffff"/>
      <circle cx="23" cy="18" r="4" fill="#ffffff"/>
    </svg>`,
  warabimochi: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <ellipse cx="24" cy="32" rx="17" ry="8" fill="#593a27"/>
      <circle cx="18" cy="26" r="6" fill="#c79548" stroke="#9e6f27" stroke-width="1.5"/>
      <circle cx="28" cy="27" r="6" fill="#c79548" stroke="#9e6f27" stroke-width="1.5"/>
      <circle cx="23" cy="21" r="6" fill="#d4a459" stroke="#9e6f27" stroke-width="1.5"/>
    </svg>`,
  matcha_set: `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <path d="M16 20 H38 L35 35 C34 39, 20 39, 19 35 Z" fill="#3d352e"/>
      <ellipse cx="27" cy="20" rx="11" ry="4" fill="#5cb85c"/>
      <circle cx="13" cy="33" r="6" fill="#f29bb0" stroke="#d46e88" stroke-width="1.5"/>
    </svg>`,
};

/** お客さまアバターSVGパターン */
const CUSTOMER_AVATARS = [
  `<svg viewBox="0 0 64 64" width="60" height="60"><circle cx="32" cy="24" r="13" fill="#f5d6be"/><path d="M18 22 C18 11, 46 11, 46 22 C46 17, 18 17, 18 22 Z" fill="#3a2e28"/><path d="M14 58 C16 42, 48 42, 50 58 Z" fill="#4a6b5b"/><circle cx="27" cy="25" r="1.8" fill="#2b211c"/><circle cx="37" cy="25" r="1.8" fill="#2b211c"/><path d="M28 31 Q32 34 36 31" fill="none" stroke="#a65b4c" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 64 64" width="60" height="60"><circle cx="32" cy="25" r="13" fill="#f5d6be"/><circle cx="32" cy="11" r="6" fill="#594a42"/><path d="M18 23 C18 12, 46 12, 46 23 Z" fill="#594a42"/><path d="M14 58 C16 42, 48 42, 50 58 Z" fill="#9e3d34"/><circle cx="27" cy="26" r="1.8" fill="#2b211c"/><circle cx="37" cy="26" r="1.8" fill="#2b211c"/><path d="M29 32 Q32 35 35 32" fill="none" stroke="#a65b4c" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 64 64" width="60" height="60"><circle cx="32" cy="25" r="13" fill="#f0ccb0"/><path d="M19 20 C22 12, 42 12, 45 20" fill="#7a7571"/><path d="M14 58 C16 42, 48 42, 50 58 Z" fill="#5c4b3b"/><circle cx="27" cy="25" r="1.8" fill="#2b211c"/><circle cx="37" cy="25" r="1.8" fill="#2b211c"/><path d="M28 32 Q32 34 36 32" fill="none" stroke="#8c5347" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 64 64" width="60" height="60"><circle cx="32" cy="25" r="13" fill="#fae0cc"/><path d="M17 26 C17 10, 47 10, 47 26 C44 17, 20 17, 17 26 Z" fill="#2b211b"/><path d="M14 58 C16 42, 48 42, 50 58 Z" fill="#c9882c"/><circle cx="27" cy="25" r="1.8" fill="#2b211c"/><circle cx="37" cy="25" r="1.8" fill="#2b211c"/><path d="M29 31 Q32 34 35 31" fill="none" stroke="#b8564b" stroke-width="2" stroke-linecap="round"/></svg>`,
];

// ゲーム状態
const state = {
  isPlaying: false,
  phase: 'shelf', // 'shelf' | 'payment'
  endTimeMs: 0,
  timerIntervalId: null,
  sales: 0,
  highSales: 0,
  initialHighSales: 0,
  customerCount: 0,
  correctCount: 0,
  tegiwaScore: 0,
  currentCustomer: null,
  playerTray: {},
  playerChangeCoins: {},
  history: [],
};

// DOM要素の参照
const els = {
  timeLeft: document.getElementById('time-left'),
  timerBar: document.getElementById('timer-bar'),
  currentSales: document.getElementById('current-sales'),
  customerCount: document.getElementById('customer-count'),
  correctCount: document.getElementById('correct-count'),
  tegiwaScore: document.getElementById('tegiwa-score'),
  highSales: document.getElementById('high-sales'),

  rulesToggleBtn: document.getElementById('rules-toggle-btn'),
  rulesDrawer: document.getElementById('rules-drawer'),
  headerStartBtn: document.getElementById('header-start-btn'),
  startGameBtn: document.getElementById('start-game-btn'),
  retryGameBtn: document.getElementById('retry-game-btn'),

  feedbackBanner: document.getElementById('feedback-banner'),
  titleScreen: document.getElementById('title-screen'),
  resultScreen: document.getElementById('result-screen'),
  playArea: document.getElementById('play-area'),

  customerAvatar: document.getElementById('customer-avatar'),
  customerNumberBadge: document.getElementById('customer-number-badge'),
  orderTypeBadge: document.getElementById('order-type-badge'),
  phaseIndicator: document.getElementById('phase-indicator'),
  customerSpeech: document.getElementById('customer-speech'),
  customerOrderTags: document.getElementById('customer-order-tags'),

  shelfGrid: document.getElementById('shelf-grid'),
  clearTrayBtn: document.getElementById('clear-tray-btn'),

  registerModeBadge: document.getElementById('register-mode-badge'),
  trayTotalItems: document.getElementById('tray-total-items'),
  trayItemsList: document.getElementById('tray-items-list'),

  receiptSubtotal: document.getElementById('receipt-subtotal'),
  receiptBoxfeeRow: document.getElementById('receipt-boxfee-row'),
  receiptBoxfee: document.getElementById('receipt-boxfee'),
  receiptTaxRate: document.getElementById('receipt-tax-rate'),
  receiptTaxAmount: document.getElementById('receipt-tax-amount'),
  receiptTotal: document.getElementById('receipt-total'),

  step1Actions: document.getElementById('step1-actions'),
  checkoutBtn: document.getElementById('checkout-btn'),

  paymentSection: document.getElementById('payment-section'),
  paidAmountValue: document.getElementById('paid-amount-value'),
  paidBreakdownText: document.getElementById('paid-breakdown-text'),
  givenChangeAmount: document.getElementById('given-change-amount'),
  givenChangeCoins: document.getElementById('given-change-coins'),
  requiredChangeDisplay: document.getElementById('required-change-display'),
  clearChangeBtn: document.getElementById('clear-change-btn'),
  moneyTrayGrid: document.getElementById('money-tray-grid'),
  backToShelfBtn: document.getElementById('back-to-shelf-btn'),
  submitChangeBtn: document.getElementById('submit-change-btn'),

  newRecordBanner: document.getElementById('new-record-banner'),
  resultSales: document.getElementById('result-sales'),
  resultHighSales: document.getElementById('result-high-sales'),
  resultCustomers: document.getElementById('result-customers'),
  resultCorrect: document.getElementById('result-correct'),
  resultTegiwa: document.getElementById('result-tegiwa'),
  resultHistoryList: document.getElementById('result-history-list'),
};

/** ローカルストレージから最高売上を読み込む */
function loadHighSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HIGH_SALES);
    const parsed = parseInt(raw || '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/** 最高売上をローカルストレージに保存する */
function saveHighSales(amount) {
  try {
    localStorage.setItem(STORAGE_KEY_HIGH_SALES, String(amount));
  } catch {
    // ストレージ制限時は無視
  }
}

/** 商品棚のDOMを生成 */
function buildShelfDOM() {
  els.shelfGrid.innerHTML = '';
  for (const item of MENU_ITEMS) {
    const card = document.createElement('div');
    card.className = 'wagashi-card';
    card.id = `shelf-card-${item.id}`;
    card.dataset.itemId = item.id;

    let badgeHtml = '';
    if (item.dineInOnly) {
      badgeHtml = `<span class="badge-note badge-dinein">店内のみ</span>`;
    } else if (item.id === 'yukiusagi') {
      badgeHtml = `<span class="badge-note badge-box">持帰5個〜箱代+150円</span>`;
    }

    card.innerHTML = `
      <div class="wagashi-info" data-action="increment" data-item-id="${item.id}" title="クリックで1つ追加">
        <div class="wagashi-icon">${WAGASHI_SVGS[item.id] || ''}</div>
        <div class="wagashi-text">
          <div class="wagashi-name-row">
            <span class="wagashi-name">${item.name}</span>
          </div>
          <div class="wagashi-price-row">
            <span class="wagashi-price">${item.price.toLocaleString('ja-JP')} 円</span>
            ${badgeHtml}
          </div>
        </div>
      </div>
      <div class="qty-controls">
        <button type="button" class="qty-btn minus" data-action="decrement" data-item-id="${item.id}" aria-label="${item.name}を1つ減らす">−</button>
        <span id="qty-count-${item.id}" class="qty-count">0</span>
        <button type="button" class="qty-btn plus" data-action="increment" data-item-id="${item.id}" aria-label="${item.name}を1つ増やす">＋</button>
      </div>
    `;
    els.shelfGrid.appendChild(card);
  }

  els.shelfGrid.addEventListener('click', (e) => {
    if (!state.isPlaying || state.phase !== 'shelf') return;
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const itemId = target.dataset.itemId;
    const action = target.dataset.action;
    if (!itemId) return;

    if (action === 'increment') {
      adjustTrayItem(itemId, 1);
    } else if (action === 'decrement') {
      adjustTrayItem(itemId, -1);
    }
  });
}

/** お札・硬貨の選択ボタン群を生成 */
function buildMoneyTrayDOM() {
  els.moneyTrayGrid.innerHTML = '';
  for (const denom of DENOMINATIONS) {
    const card = document.createElement('div');
    card.className = 'money-unit-card';
    card.id = `money-card-${denom}`;

    let badgeClass = 'coin-silver';
    if (denom >= 1000) badgeClass = 'bill';
    else if (denom === 500) badgeClass = 'coin-500';
    else if (denom === 10 || denom === 5) badgeClass = 'coin-bronze';
    else if (denom === 1) badgeClass = 'coin-1';

    card.innerHTML = `
      <div class="money-badge ${badgeClass}">${DENOMINATION_LABELS[denom]}</div>
      <div class="money-controls">
        <button type="button" class="money-btn minus" data-denom="${denom}" data-delta="-1" aria-label="${DENOMINATION_LABELS[denom]}を1枚減らす">−</button>
        <span id="coin-count-${denom}" class="money-count">0</span>
        <button type="button" class="money-btn plus" data-denom="${denom}" data-delta="1" aria-label="${DENOMINATION_LABELS[denom]}を1枚増やす">＋</button>
      </div>
    `;
    els.moneyTrayGrid.appendChild(card);
  }

  els.moneyTrayGrid.addEventListener('click', (e) => {
    if (!state.isPlaying || state.phase !== 'payment') return;
    const btn = e.target.closest('button[data-denom]');
    if (!btn) return;
    const denom = Number(btn.dataset.denom);
    const delta = Number(btn.dataset.delta);
    adjustChangeCoin(denom, delta);
  });
}

/** 棚の品物の選択数を変更 */
function adjustTrayItem(itemId, delta) {
  const current = state.playerTray[itemId] || 0;
  const next = Math.max(0, Math.min(20, current + delta));
  if (next === 0) {
    delete state.playerTray[itemId];
  } else {
    state.playerTray[itemId] = next;
  }
  updateShelfAndReceiptUI();
}

/** おつりの金種枚数を変更 */
function adjustChangeCoin(denom, delta) {
  const current = state.playerChangeCoins[denom] || 0;
  const next = Math.max(0, Math.min(30, current + delta));
  if (next === 0) {
    delete state.playerChangeCoins[denom];
  } else {
    state.playerChangeCoins[denom] = next;
  }
  updateChangeSelectionUI();
}

/** 棚と伝票の表示更新 */
function updateShelfAndReceiptUI() {
  let totalItemsCount = 0;
  for (const item of MENU_ITEMS) {
    const qty = state.playerTray[item.id] || 0;
    totalItemsCount += qty;
    const countEl = document.getElementById(`qty-count-${item.id}`);
    const cardEl = document.getElementById(`shelf-card-${item.id}`);
    if (countEl) countEl.textContent = String(qty);
    if (cardEl) {
      cardEl.classList.toggle('selected', qty > 0);
      cardEl.classList.toggle('disabled-phase', state.phase !== 'shelf');
    }
  }

  els.trayTotalItems.textContent = `${totalItemsCount} 個`;

  // お盆リストの更新
  els.trayItemsList.innerHTML = '';
  const selectedIds = MENU_ITEMS.filter((m) => (state.playerTray[m.id] || 0) > 0);
  if (selectedIds.length === 0) {
    els.trayItemsList.innerHTML = '<li class="tray-empty-msg">棚から品物を選んでください</li>';
  } else {
    for (const item of selectedIds) {
      const qty = state.playerTray[item.id];
      const li = document.createElement('li');
      li.className = 'tray-item-row';
      li.innerHTML = `
        <span>${item.name} × <strong>${qty}</strong></span>
        <span>${(item.price * qty).toLocaleString('ja-JP')} 円</span>
      `;
      els.trayItemsList.appendChild(li);
    }
  }

  // 伝票計算プレビューの更新
  const orderType = state.currentCustomer ? state.currentCustomer.orderType : 'takeout';
  const summary = calculateOrderSummary(state.playerTray, orderType);

  els.receiptSubtotal.textContent = summary.subtotal.toLocaleString('ja-JP');
  els.receiptBoxfee.textContent = summary.boxFee.toLocaleString('ja-JP');
  els.receiptBoxfeeRow.classList.toggle('active-fee', summary.boxFee > 0);
  els.receiptTaxRate.textContent = String(summary.taxPercent);
  els.receiptTaxAmount.textContent = summary.taxAmount.toLocaleString('ja-JP');
  els.receiptTotal.textContent = summary.total.toLocaleString('ja-JP');
}

/** おつり選択UIの更新 */
function updateChangeSelectionUI() {
  for (const denom of DENOMINATIONS) {
    const count = state.playerChangeCoins[denom] || 0;
    const countEl = document.getElementById(`coin-count-${denom}`);
    const cardEl = document.getElementById(`money-card-${denom}`);
    if (countEl) countEl.textContent = String(count);
    if (cardEl) cardEl.classList.toggle('active-coin', count > 0);
  }

  const { totalAmount, totalCoins } = sumCoinsMap(state.playerChangeCoins);
  els.givenChangeAmount.textContent = totalAmount.toLocaleString('ja-JP');
  els.givenChangeCoins.textContent = String(totalCoins);
}

/** スコアボードの更新 */
function updateScoreboardUI() {
  els.currentSales.textContent = state.sales.toLocaleString('ja-JP');
  els.customerCount.textContent = String(state.customerCount);
  els.correctCount.textContent = String(state.correctCount);
  els.tegiwaScore.textContent = String(state.tegiwaScore);
  els.highSales.textContent = state.highSales.toLocaleString('ja-JP');
}

/** フィードバック通知の表示 */
function showFeedback(message, type = 'success') {
  els.feedbackBanner.hidden = false;
  els.feedbackBanner.className = `feedback-banner ${type}`;
  els.feedbackBanner.textContent = message;
}

/** 次のお客さまを迎える */
function nextCustomer(customOrder = null, incrementCount = true) {
  if (!state.isPlaying) return;

  if (incrementCount) {
    state.customerCount += 1;
  }
  state.currentCustomer = customOrder || generateCustomerOrder();
  state.playerTray = {};
  state.playerChangeCoins = {};
  state.phase = 'shelf';

  const cust = state.currentCustomer;
  const avatarIdx = (state.customerCount - 1) % CUSTOMER_AVATARS.length;
  els.customerAvatar.innerHTML = CUSTOMER_AVATARS[avatarIdx];
  els.customerNumberBadge.textContent = `${state.customerCount}人目`;

  const isTakeout = cust.orderType === 'takeout';
  els.orderTypeBadge.className = `order-type-badge ${cust.orderType}`;
  els.orderTypeBadge.textContent = isTakeout
    ? '持ち帰り（税率 8%）'
    : '店内（税率 10%）';

  els.customerSpeech.textContent = `「${cust.orderText}」`;

  // 注文内容タグ表示
  els.customerOrderTags.innerHTML = '';
  for (const menu of MENU_ITEMS) {
    const qty = cust.items[menu.id];
    if (qty > 0) {
      const tag = document.createElement('span');
      tag.className = 'order-tag';
      tag.textContent = `${menu.name} × ${qty}`;
      els.customerOrderTags.appendChild(tag);
    }
  }
  if (isTakeout && (cust.items.yukiusagi || 0) >= 5) {
    const boxTag = document.createElement('span');
    boxTag.className = 'order-tag box-notice';
    boxTag.textContent = '化粧箱代 +150円（税抜）対象';
    els.customerOrderTags.appendChild(boxTag);
  }

  setPhaseUI('shelf');
  updateShelfAndReceiptUI();
  updateChangeSelectionUI();
  updateScoreboardUI();
}

/** フェーズ（手順1: 棚選択 / 手順2: お会計・おつり）のUI切り替え */
function setPhaseUI(phase) {
  state.phase = phase;
  const isShelf = phase === 'shelf';

  els.step1Actions.hidden = !isShelf;
  els.paymentSection.hidden = isShelf;
  els.clearTrayBtn.disabled = !isShelf;

  if (isShelf) {
    els.phaseIndicator.textContent = '手順1：棚から品物を選んで「お会計へ進む」を押してください';
    els.registerModeBadge.textContent = '品揃え中';
  } else {
    els.phaseIndicator.textContent = '手順2：お札と硬貨を選んで「おつりを渡す」を押してください';
    els.registerModeBadge.textContent = 'おつり計算中';

    const cust = state.currentCustomer;
    const traySummary = calculateOrderSummary(state.playerTray, cust.orderType);
    const diff = cust.paymentAmount - traySummary.total;

    els.paidAmountValue.textContent = cust.paymentAmount.toLocaleString('ja-JP');
    els.paidBreakdownText.textContent = `内訳：${cust.paymentText}`;
    els.requiredChangeDisplay.textContent =
      diff >= 0 ? diff.toLocaleString('ja-JP') : `不足 (${diff.toLocaleString('ja-JP')})`;
  }

  updateShelfAndReceiptUI();
}

/** 「お会計へ進む」ボタン処理 */
function handleProceedToCheckout() {
  if (!state.isPlaying || state.phase !== 'shelf') return;
  const subtotal = calculateSubtotal(state.playerTray);
  if (subtotal === 0) {
    showFeedback('お盆が空です。棚から品物を選んで数をそろえてください。', 'error');
    return;
  }
  setPhaseUI('payment');
}

/** 「おつりを渡す」ボタン処理（注文とおつりの正誤判定） */
function handleSubmitChange() {
  if (!state.isPlaying || state.phase !== 'payment') return;

  const cust = state.currentCustomer;
  const evalResult = evaluateTransaction(cust, state.playerTray, state.playerChangeCoins);

  if (evalResult.isSuccess) {
    state.sales += evalResult.addedSales;
    state.correctCount += 1;
    state.tegiwaScore += evalResult.tegiwaBonus;

    if (state.sales > state.highSales) {
      state.highSales = state.sales;
      saveHighSales(state.highSales);
    }

    const tegiwaMsg = evalResult.tegiwaBonus
      ? `✨手ぎわ +1点（最少 ${evalResult.changeResult.minCoins} 枚！）`
      : `（おつり正解！最少枚数は ${evalResult.changeResult.minCoins} 枚でした）`;

    showFeedback(
      `「ありがとう！」 売上 +${evalResult.addedSales.toLocaleString('ja-JP')} 円 ${tegiwaMsg}`,
      'success'
    );

    state.history.push({
      customerNo: state.customerCount,
      orderText: cust.orderText,
      isSuccess: true,
      sales: evalResult.addedSales,
      tegiwa: evalResult.tegiwaBonus > 0,
      detail: `税込 ${evalResult.summary.total.toLocaleString('ja-JP')}円 / おつり ${evalResult.changeResult.expectedChange.toLocaleString('ja-JP')}円（${evalResult.changeResult.givenCoins}枚）`,
    });
  } else {
    let reason = '';
    if (!evalResult.orderMatched && !evalResult.changeResult.isAmountCorrect) {
      reason = `品物もおつり金額も違いました（正しい税込合計: ${evalResult.summary.total.toLocaleString('ja-JP')}円、正しいおつり: ${evalResult.changeResult.expectedChange.toLocaleString('ja-JP')}円）`;
    } else if (!evalResult.orderMatched) {
      reason = '注文された品物または個数が違いました';
    } else {
      reason = `おつりの金額が違いました（正しいおつり: ${evalResult.changeResult.expectedChange.toLocaleString('ja-JP')}円 / 渡した額: ${evalResult.changeResult.givenAmount.toLocaleString('ja-JP')}円）`;
    }

    showFeedback(
      `「注文と違うわ…」お客さまは帰ってしまいました（売上 +0円）— ${reason}`,
      'error'
    );

    state.history.push({
      customerNo: state.customerCount,
      orderText: cust.orderText,
      isSuccess: false,
      sales: 0,
      tegiwa: false,
      detail: reason,
    });
  }

  updateScoreboardUI();
  nextCustomer();
}

/** 1日の営業（90秒）を開始する */
function startGame() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }

  state.isPlaying = true;
  state.sales = 0;
  state.customerCount = 0;
  state.correctCount = 0;
  state.tegiwaScore = 0;
  state.history = [];
  state.initialHighSales = loadHighSales();
  state.highSales = state.initialHighSales;

  els.titleScreen.hidden = true;
  els.resultScreen.hidden = true;
  els.playArea.hidden = false;
  els.feedbackBanner.hidden = true;
  els.headerStartBtn.textContent = '最初からやり直す';

  state.endTimeMs = performance.now() + GAME_DURATION_MS;
  updateTimerUI(GAME_DURATION_MS);

  state.timerIntervalId = setInterval(() => {
    const remainingMs = Math.max(0, state.endTimeMs - performance.now());
    updateTimerUI(remainingMs);
    if (remainingMs <= 0) {
      endGame();
    }
  }, 100);

  nextCustomer();
}

/** 残り時間表示の更新 */
function updateTimerUI(remainingMs) {
  const seconds = Math.ceil(remainingMs / 1000);
  els.timeLeft.textContent = String(seconds);

  const ratio = Math.max(0, Math.min(1, remainingMs / GAME_DURATION_MS));
  els.timerBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  els.timerBar.classList.toggle('warning', seconds <= 30 && seconds > 10);
  els.timerBar.classList.toggle('danger', seconds <= 10);
}

/** 90秒終了時の集計画面表示 */
function endGame() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
  state.isPlaying = false;

  const isNewRecord = state.sales > 0 && state.sales > state.initialHighSales;
  if (state.sales > state.highSales) {
    state.highSales = state.sales;
  }
  saveHighSales(state.highSales);

  updateScoreboardUI();

  els.playArea.hidden = true;
  els.titleScreen.hidden = true;
  els.resultScreen.hidden = false;
  els.headerStartBtn.textContent = 'もう1日営業する';

  els.newRecordBanner.hidden = !isNewRecord;
  els.resultSales.textContent = state.sales.toLocaleString('ja-JP');
  els.resultHighSales.textContent = state.highSales.toLocaleString('ja-JP');
  els.resultCustomers.textContent = String(state.customerCount);
  els.resultCorrect.textContent = String(state.correctCount);
  els.resultTegiwa.textContent = String(state.tegiwaScore);

  els.resultHistoryList.innerHTML = '';
  if (state.history.length === 0) {
    els.resultHistoryList.innerHTML = '<div class="history-item">接客記録はありません</div>';
  } else {
    for (const item of state.history) {
      const row = document.createElement('div');
      row.className = `history-item ${item.isSuccess ? 'ok' : 'ng'}`;
      const badge = item.isSuccess
        ? `⭕ 売上 +${item.sales.toLocaleString('ja-JP')}円${item.tegiwa ? '（★手ぎわ+1）' : ''}`
        : '❌ 失敗（売上 +0円）';
      row.innerHTML = `
        <div>
          <strong>${item.customerNo}人目：</strong>「${item.orderText}」
          <div style="color:#665a50;font-size:0.78rem;">${item.detail}</div>
        </div>
        <div style="white-space:nowrap;font-weight:700;">${badge}</div>
      `;
      els.resultHistoryList.appendChild(row);
    }
  }
}

/** 初期化処理 */
function init() {
  state.highSales = loadHighSales();
  buildShelfDOM();
  buildMoneyTrayDOM();
  updateScoreboardUI();

  els.startGameBtn.addEventListener('click', startGame);
  els.retryGameBtn.addEventListener('click', startGame);
  els.headerStartBtn.addEventListener('click', startGame);

  els.rulesToggleBtn.addEventListener('click', () => {
    const isHidden = els.rulesDrawer.hidden;
    els.rulesDrawer.hidden = !isHidden;
    els.rulesToggleBtn.setAttribute('aria-expanded', String(isHidden));
  });

  els.clearTrayBtn.addEventListener('click', () => {
    if (!state.isPlaying || state.phase !== 'shelf') return;
    state.playerTray = {};
    updateShelfAndReceiptUI();
  });

  els.checkoutBtn.addEventListener('click', handleProceedToCheckout);

  els.backToShelfBtn.addEventListener('click', () => {
    if (!state.isPlaying || state.phase !== 'payment') return;
    setPhaseUI('shelf');
  });

  els.clearChangeBtn.addEventListener('click', () => {
    if (!state.isPlaying || state.phase !== 'payment') return;
    state.playerChangeCoins = {};
    updateChangeSelectionUI();
  });

  els.submitChangeBtn.addEventListener('click', handleSubmitChange);

  // デバッグ・自動検証フック（ブラウザでの動作確認用）
  window.__yukimidoDebug = {
    getState: () => state,
    setCustomerOrder: (customOrder) => nextCustomer(customOrder, false),
    forceEndDay: () => endGame(),
  };
}

init();
