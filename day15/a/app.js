import {
  MENU_ITEMS,
  MENU_MAP,
  DENOMINATIONS,
  DENOMINATION_LABELS,
  calculateTaxIncludedTotal,
  evaluateTransaction,
  generateCustomerOrder,
  generateCustomerPayment,
  formatCoinsDescription
} from './logic.js';

const STORAGE_KEY_HIGHSCORE = 'yukimido_high_score';
const GAME_DURATION_SECONDS = 90;
const CUSTOMER_AVATARS = ['👩', '👨', '👵', '👴', '🧑', '👩‍🦱', '👨‍🦳', '👱‍♀️'];

// ゲーム状態
const state = {
  isPlaying: false,
  remainingSeconds: GAME_DURATION_SECONDS,
  timerId: null,
  sales: 0,
  totalCustomers: 0,
  correctCustomers: 0,
  tegiwaPoints: 0,
  highScore: 0,

  // 現在のお客・注文・選択状態
  currentCustomerIndex: 0,
  currentOrder: null, // { orderType, items, speechText }
  currentPayment: null, // { paidAmount, breakdown, description }
  selectedItems: {}, // { [itemId]: count }
  selectedChangeCoins: {} // { [denom]: count }
};

// DOM要素の参照
const els = {
  timerDisplay: document.getElementById('timer-display'),
  timerCard: document.querySelector('.timer-card'),
  salesDisplay: document.getElementById('sales-display'),
  customersDisplay: document.getElementById('customers-display'),
  tegiwaDisplay: document.getElementById('tegiwa-display'),
  highscoreDisplay: document.getElementById('highscore-display'),

  customerAvatar: document.getElementById('customer-avatar'),
  customerNumberBadge: document.getElementById('customer-number-badge'),
  orderTypeBadge: document.getElementById('order-type-badge'),
  customerSpeech: document.getElementById('customer-speech'),

  phaseStart: document.getElementById('phase-start'),
  phaseShelf: document.getElementById('phase-shelf'),
  phaseCheckout: document.getElementById('phase-checkout'),
  phaseFeedback: document.getElementById('phase-feedback'),
  phaseDayEnd: document.getElementById('phase-day-end'),

  startGameBtn: document.getElementById('start-game-btn'),
  resetShelfBtn: document.getElementById('reset-shelf-btn'),
  shelfGrid: document.getElementById('shelf-grid'),
  traySelectedList: document.getElementById('tray-selected-list'),
  goCheckoutBtn: document.getElementById('go-checkout-btn'),

  backToShelfBtn: document.getElementById('back-to-shelf-btn'),
  checkoutOrderTypeText: document.getElementById('checkout-order-type-text'),
  checkoutItemsList: document.getElementById('checkout-items-list'),
  paidCoinsDescription: document.getElementById('paid-coins-description'),
  paidCoinsVisual: document.getElementById('paid-coins-visual'),
  resetChangeBtn: document.getElementById('reset-change-btn'),
  denominationsGrid: document.getElementById('denominations-grid'),
  submitChangeBtn: document.getElementById('submit-change-btn'),

  feedbackHeader: document.querySelector('.feedback-header'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackSubtitle: document.getElementById('feedback-subtitle'),
  feedbackReceiptDl: document.getElementById('feedback-receipt-dl'),
  feedbackPlayerDl: document.getElementById('feedback-player-dl'),
  nextCustomerBtn: document.getElementById('next-customer-btn'),

  newRecordBanner: document.getElementById('new-record-banner'),
  resultSales: document.getElementById('result-sales'),
  resultTotalCustomers: document.getElementById('result-total-customers'),
  resultCorrectCustomers: document.getElementById('result-correct-customers'),
  resultTegiwa: document.getElementById('result-tegiwa'),
  resultHighscore: document.getElementById('result-highscore'),
  playAgainBtn: document.getElementById('play-again-btn')
};

function loadHighScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    const val = parseInt(raw, 10);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY_HIGHSCORE, String(score));
  } catch {
    // ストレージ制限時は無視
  }
}

function formatYen(num) {
  return `${Number(num).toLocaleString('ja-JP')} 円`;
}

function updateHeaderStats() {
  els.timerDisplay.innerHTML = `${state.remainingSeconds}<small>秒</small>`;
  if (state.remainingSeconds <= 15 && state.isPlaying) {
    els.timerCard.classList.add('urgent');
  } else {
    els.timerCard.classList.remove('urgent');
  }

  els.salesDisplay.innerHTML = `${state.sales.toLocaleString('ja-JP')}<small>円</small>`;
  els.customersDisplay.innerHTML = `${state.correctCustomers} / ${state.totalCustomers}<small>人</small>`;
  els.tegiwaDisplay.innerHTML = `${state.tegiwaPoints}<small>点</small>`;
  els.highscoreDisplay.innerHTML = `${state.highScore.toLocaleString('ja-JP')}<small>円</small>`;
}

function showPhase(phaseName) {
  els.phaseStart.hidden = phaseName !== 'start';
  els.phaseShelf.hidden = phaseName !== 'shelf';
  els.phaseCheckout.hidden = phaseName !== 'checkout';
  els.phaseFeedback.hidden = phaseName !== 'feedback';
  els.phaseDayEnd.hidden = phaseName !== 'day-end';
}

function initShelfUI() {
  els.shelfGrid.innerHTML = '';
  for (const item of MENU_ITEMS) {
    const card = document.createElement('div');
    card.className = 'shelf-item-card';
    card.dataset.itemId = item.id;

    const dineInTag = item.dineInOnly
      ? `<span class="tag-dinein">店内のみ</span>`
      : '';

    card.innerHTML = `
      <div>
        <div class="shelf-item-top">
          <span class="shelf-item-icon" aria-hidden="true">${item.icon}</span>
          ${dineInTag}
        </div>
        <div class="shelf-item-title">${item.name}</div>
      </div>
      <div>
        <div class="shelf-item-price-row">
          <span>税抜</span>
          <span class="shelf-item-price">${item.price.toLocaleString('ja-JP')} 円</span>
        </div>
        <div class="qty-controls" style="margin-top: 6px;">
          <button type="button" class="qty-btn item-minus-btn" data-id="${item.id}" aria-label="${item.name}を減らす">−</button>
          <span class="qty-value" id="item-qty-${item.id}">0</span>
          <button type="button" class="qty-btn item-plus-btn" data-id="${item.id}" aria-label="${item.name}を増やす">＋</button>
        </div>
      </div>
    `;
    els.shelfGrid.appendChild(card);
  }

  els.shelfGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !state.isPlaying) return;
    const itemId = btn.dataset.id;
    if (!itemId) return;

    const current = state.selectedItems[itemId] || 0;
    if (btn.classList.contains('item-plus-btn')) {
      state.selectedItems[itemId] = Math.min(20, current + 1);
    } else if (btn.classList.contains('item-minus-btn')) {
      state.selectedItems[itemId] = Math.max(0, current - 1);
    }
    renderShelfSelection();
  });
}

function renderShelfSelection() {
  const selectedParts = [];
  let totalSelectedCount = 0;

  for (const item of MENU_ITEMS) {
    const qty = state.selectedItems[item.id] || 0;
    const qtyEl = document.getElementById(`item-qty-${item.id}`);
    const cardEl = els.shelfGrid.querySelector(`[data-item-id="${item.id}"]`);
    const minusBtn = cardEl?.querySelector('.item-minus-btn');

    if (qtyEl) qtyEl.textContent = String(qty);
    if (cardEl) cardEl.classList.toggle('selected', qty > 0);
    if (minusBtn) minusBtn.disabled = qty <= 0;

    if (qty > 0) {
      selectedParts.push(`${item.orderName} × ${qty}`);
      totalSelectedCount += qty;
    }
  }

  if (selectedParts.length === 0) {
    els.traySelectedList.textContent = 'まだ品物が選ばれていません';
    els.goCheckoutBtn.disabled = true;
  } else {
    els.traySelectedList.textContent = `盆の品：${selectedParts.join('、')}`;
    els.goCheckoutBtn.disabled = false;
  }
}

function initDenominationsUI() {
  els.denominationsGrid.innerHTML = '';
  for (const denom of DENOMINATIONS) {
    const isBill = denom >= 1000;
    const card = document.createElement('div');
    card.className = 'denom-card';
    card.dataset.denom = String(denom);

    card.innerHTML = `
      <div class="denom-label-row">
        <span class="denom-name">${DENOMINATION_LABELS[denom]}</span>
        <span class="denom-badge">${isBill ? 'お札' : '硬貨'}</span>
      </div>
      <div class="qty-controls">
        <button type="button" class="qty-btn denom-minus-btn" data-denom="${denom}" aria-label="${DENOMINATION_LABELS[denom]}を減らす">−</button>
        <span class="qty-value" id="denom-qty-${denom}">0<small style="font-size:0.75rem;margin-left:2px;">枚</small></span>
        <button type="button" class="qty-btn denom-plus-btn" data-denom="${denom}" aria-label="${DENOMINATION_LABELS[denom]}を増やす">＋</button>
      </div>
    `;
    els.denominationsGrid.appendChild(card);
  }

  els.denominationsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !state.isPlaying) return;
    const denom = Number(btn.dataset.denom);
    if (!denom) return;

    const current = state.selectedChangeCoins[denom] || 0;
    if (btn.classList.contains('denom-plus-btn')) {
      state.selectedChangeCoins[denom] = Math.min(30, current + 1);
    } else if (btn.classList.contains('denom-minus-btn')) {
      state.selectedChangeCoins[denom] = Math.max(0, current - 1);
    }
    renderChangeSelection();
  });
}

function renderChangeSelection() {
  for (const denom of DENOMINATIONS) {
    const count = state.selectedChangeCoins[denom] || 0;
    const qtyEl = document.getElementById(`denom-qty-${denom}`);
    const cardEl = els.denominationsGrid.querySelector(`[data-denom="${denom}"]`);
    const minusBtn = cardEl?.querySelector('.denom-minus-btn');

    if (qtyEl) {
      qtyEl.innerHTML = `${count}<small style="font-size:0.75rem;margin-left:2px;">枚</small>`;
    }
    if (cardEl) {
      cardEl.classList.toggle('active', count > 0);
    }
    if (minusBtn) {
      minusBtn.disabled = count <= 0;
    }
  }
}

function resetShelfSelection() {
  state.selectedItems = {};
  for (const item of MENU_ITEMS) {
    state.selectedItems[item.id] = 0;
  }
  renderShelfSelection();
}

function resetChangeSelection() {
  state.selectedChangeCoins = {};
  for (const denom of DENOMINATIONS) {
    state.selectedChangeCoins[denom] = 0;
  }
  renderChangeSelection();
}

function spawnNextCustomer() {
  if (!state.isPlaying) return;

  state.currentCustomerIndex += 1;
  state.totalCustomers += 1;

  const order = generateCustomerOrder();
  const expectedTotal = calculateTaxIncludedTotal(order.items, order.orderType);
  const payment = generateCustomerPayment(expectedTotal);

  state.currentOrder = order;
  state.currentPayment = payment;

  // アバター・バッジ・セリフの更新
  const avatar = CUSTOMER_AVATARS[(state.currentCustomerIndex - 1) % CUSTOMER_AVATARS.length];
  els.customerAvatar.textContent = avatar;
  els.customerNumberBadge.textContent = `${state.currentCustomerIndex} 人目のお客さま`;

  els.orderTypeBadge.hidden = false;
  els.orderTypeBadge.className = `order-type-badge ${order.orderType}`;
  els.orderTypeBadge.textContent = order.orderType === 'takeout' ? '持ち帰り（税8%）' : '店内（税10%）';

  els.customerSpeech.textContent = order.speechText;

  resetShelfSelection();
  resetChangeSelection();
  updateHeaderStats();
  showPhase('shelf');
}

function proceedToCheckout() {
  if (!state.isPlaying || !state.currentOrder) return;

  // 盆にそろえた品物の表示（税抜単価と個数のみ表示し、合計や税込額は表示しない）
  els.checkoutOrderTypeText.textContent =
    state.currentOrder.orderType === 'takeout'
      ? 'ご希望：持ち帰り'
      : 'ご希望：店内飲食';

  els.checkoutItemsList.innerHTML = '';
  for (const item of MENU_ITEMS) {
    const qty = state.selectedItems[item.id] || 0;
    if (qty > 0) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${item.name}（税抜 ${item.price.toLocaleString('ja-JP')} 円）</span>
        <strong>× ${qty} 個</strong>
      `;
      els.checkoutItemsList.appendChild(li);
    }
  }

  // お客さまが出したお金の表示（金種と枚数を表示）
  els.paidCoinsDescription.textContent = state.currentPayment.description;
  els.paidCoinsVisual.innerHTML = '';
  for (const denom of DENOMINATIONS) {
    const count = state.currentPayment.breakdown[denom] || 0;
    if (count > 0) {
      const chip = document.createElement('span');
      chip.className = `money-chip ${denom >= 1000 ? 'bill' : 'coin'}`;
      chip.textContent = `${DENOMINATION_LABELS[denom]} × ${count}`;
      els.paidCoinsVisual.appendChild(chip);
    }
  }

  renderChangeSelection();
  showPhase('checkout');
}

function submitChangeAndEvaluate() {
  if (!state.isPlaying || !state.currentOrder || !state.currentPayment) return;

  const result = evaluateTransaction({
    expectedItems: state.currentOrder.items,
    selectedItems: state.selectedItems,
    orderType: state.currentOrder.orderType,
    paidAmount: state.currentPayment.paidAmount,
    changeCoins: state.selectedChangeCoins
  });

  if (result.isSuccess) {
    state.sales += result.expectedTotal;
    state.correctCustomers += 1;
    if (result.isOptimalChange) {
      state.tegiwaPoints += 1;
    }
    if (state.sales > state.highScore) {
      state.highScore = state.sales;
      saveHighScore(state.highScore);
    }
  }

  updateHeaderStats();
  renderFeedback(result);
  showPhase('feedback');
}

function renderFeedback(result) {
  const isTakeout = state.currentOrder.orderType === 'takeout';

  if (result.isSuccess) {
    els.feedbackHeader.className = 'feedback-header success';
    els.feedbackIcon.textContent = '⭕';
    els.feedbackTitle.textContent = '毎度ありがとうございます！（正解）';
    const tegiwaMsg = result.isOptimalChange
      ? '✨ おつりの枚数も最少！手ぎわ点 ＋1 点！'
      : `（最少枚数は ${result.optimalCoinsCount} 枚でした：${formatCoinsDescription(result.optimalBreakdown)}）`;
    els.feedbackSubtitle.textContent = `売上に ${formatYen(result.expectedTotal)} が加算されました。${tegiwaMsg}`;
    els.customerSpeech.textContent = '「ありがとう！おいしそうだね。」';
  } else {
    els.feedbackHeader.className = 'feedback-header failure';
    els.feedbackIcon.textContent = '❌';
    els.feedbackTitle.textContent = '申し訳ございません…（間違い）';

    const reasons = [];
    if (!result.orderCorrect) {
      reasons.push('品物または個数が注文と違っていました');
    }
    if (!result.changeCorrect) {
      reasons.push('おつりの金額が違っていました');
    }
    els.feedbackSubtitle.textContent = `${reasons.join('・')}。お客さまは帰ってしまい、売上は増えませんでした。`;
    els.customerSpeech.textContent = '「あれ、頼んだものやおつりが違うよ…また今度にするね。」';
  }

  // 正しいお勘定の内訳を表示
  const boxFeeText =
    result.boxFee > 0
      ? `${formatYen(result.boxFee)}（雪うさぎ持ち帰り5個以上）`
      : '0 円（なし）';

  els.feedbackReceiptDl.innerHTML = `
    <dt>品物の合計（税抜）</dt>
    <dd>${formatYen(result.subtotal)}</dd>
    <dt>化粧箱代（税抜）</dt>
    <dd>${boxFeeText}</dd>
    <dt>税率（${isTakeout ? '持ち帰り' : '店内'}）</dt>
    <dd>${result.taxRatePercent} %（円未満切り捨て）</dd>
    <dt>正しい税込合計</dt>
    <dd class="emphasis">${formatYen(result.expectedTotal)}</dd>
    <dt>お客さまが払ったお金</dt>
    <dd>${formatYen(result.paidAmount)}</dd>
    <dt>正しいおつりの額</dt>
    <dd class="emphasis">${formatYen(result.expectedChange)}</dd>
  `;

  // プレイヤーの対応を表示
  const orderCheckText = result.orderCorrect ? '⭕ 注文どおり' : '❌ 注文と不一致';
  const changeCheckText = result.changeCorrect
    ? `⭕ ${formatYen(result.givenChangeAmount)}（正解）`
    : `❌ ${formatYen(result.givenChangeAmount)}（正解は ${formatYen(result.expectedChange)}）`;
  const tegiwaCheckText = !result.isSuccess
    ? '―'
    : result.isOptimalChange
      ? `🌟 獲得（＋1 点 / 最少 ${result.givenCoinsCount} 枚）`
      : `なし（渡した枚数 ${result.givenCoinsCount} 枚 / 最少 ${result.optimalCoinsCount} 枚）`;

  els.feedbackPlayerDl.innerHTML = `
    <dt>そろえた品物</dt>
    <dd>${orderCheckText}</dd>
    <dt>渡したおつりの額</dt>
    <dd>${changeCheckText}</dd>
    <dt>渡した金種内訳</dt>
    <dd>${formatCoinsDescription(state.selectedChangeCoins)}</dd>
    <dt>手ぎわ点</dt>
    <dd>${tegiwaCheckText}</dd>
  `;
}

function startGame() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  state.isPlaying = true;
  state.remainingSeconds = GAME_DURATION_SECONDS;
  state.sales = 0;
  state.totalCustomers = 0;
  state.correctCustomers = 0;
  state.tegiwaPoints = 0;
  state.currentCustomerIndex = 0;
  state.highScore = loadHighScore();

  updateHeaderStats();
  spawnNextCustomer();

  state.timerId = setInterval(() => {
    state.remainingSeconds -= 1;
    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      updateHeaderStats();
      endDay();
    } else {
      updateHeaderStats();
    }
  }, 1000);
}

function endDay() {
  state.isPlaying = false;
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  const prevHigh = loadHighScore();
  let isNewRecord = false;
  if (state.sales > prevHigh) {
    state.highScore = state.sales;
    saveHighScore(state.highScore);
    isNewRecord = true;
  } else if (state.sales > 0 && state.sales === state.highScore && state.highScore > 0) {
    // 営業中に更新済みだった場合も表示
    isNewRecord = true;
  }

  updateHeaderStats();

  els.customerAvatar.textContent = '🍵';
  els.customerNumberBadge.textContent = '本日の営業終了';
  els.orderTypeBadge.hidden = true;
  els.customerSpeech.textContent = '「本日の営業は終了いたしました。今日もお疲れさまでした！」';

  els.newRecordBanner.hidden = !isNewRecord;
  els.resultSales.textContent = formatYen(state.sales);
  els.resultTotalCustomers.textContent = `${state.totalCustomers} 人`;
  els.resultCorrectCustomers.textContent = `${state.correctCustomers} 人`;
  els.resultTegiwa.textContent = `${state.tegiwaPoints} 点`;
  els.resultHighscore.textContent = formatYen(state.highScore);

  showPhase('day-end');
}

function initApp() {
  state.highScore = loadHighScore();
  initShelfUI();
  initDenominationsUI();
  updateHeaderStats();
  showPhase('start');

  els.startGameBtn.addEventListener('click', startGame);
  els.playAgainBtn.addEventListener('click', startGame);
  els.resetShelfBtn.addEventListener('click', resetShelfSelection);
  els.goCheckoutBtn.addEventListener('click', proceedToCheckout);
  els.backToShelfBtn.addEventListener('click', () => {
    if (state.isPlaying) showPhase('shelf');
  });
  els.resetChangeBtn.addEventListener('click', resetChangeSelection);
  els.submitChangeBtn.addEventListener('click', submitChangeAndEvaluate);
  els.nextCustomerBtn.addEventListener('click', spawnNextCustomer);
}

initApp();
