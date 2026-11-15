/**
 * 我が家の植物 - 水やり管理 (Plant Care Tracker)
 * Self-contained Vanilla JS application with real-date calculation & localStorage persistence
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'plant_app_state_v1';

  // Built-in SVG Data URLs for extra botanical illustrations when adding new plants
  const SVG_ILLUSTRATIONS = {
    svg_ficus: 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#E6EFE6"/>
        <path d="M42 82 L78 82 L72 108 L48 108 Z" fill="#C87D55"/>
        <rect x="39" y="77" width="42" height="7" rx="3" fill="#B56942"/>
        <path d="M60 77 Q56 60 60 40" stroke="#685D54" stroke-width="6" stroke-linecap="round" fill="none"/>
        <ellipse cx="44" cy="48" rx="14" ry="9" transform="rotate(-25 44 48)" fill="#3D6849"/>
        <ellipse cx="76" cy="46" rx="14" ry="9" transform="rotate(25 76 46)" fill="#4A7C59"/>
        <ellipse cx="60" cy="30" rx="16" ry="11" fill="#2E5137"/>
        <ellipse cx="46" cy="33" rx="12" ry="8" transform="rotate(-15 46 33)" fill="#4A7C59"/>
        <ellipse cx="74" cy="33" rx="12" ry="8" transform="rotate(15 74 33)" fill="#3D6849"/>
      </svg>`
    ),
    svg_succulent: 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#F4F7F4"/>
        <path d="M38 80 L82 80 L76 106 L44 106 Z" fill="#D4A373"/>
        <ellipse cx="60" cy="68" rx="22" ry="10" fill="#4A7C59"/>
        <ellipse cx="46" cy="60" rx="14" ry="10" transform="rotate(-30 46 60)" fill="#529471"/>
        <ellipse cx="74" cy="60" rx="14" ry="10" transform="rotate(30 74 60)" fill="#529471"/>
        <ellipse cx="60" cy="52" rx="12" ry="16" fill="#3D6849"/>
        <circle cx="60" cy="36" r="4" fill="#F59E0B"/>
      </svg>`
    ),
    svg_fern: 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#E6EFE6"/>
        <path d="M43 82 L77 82 L71 107 L49 107 Z" fill="#8D7B68"/>
        <path d="M60 82 Q45 55 26 36" stroke="#2E5137" stroke-width="3" fill="none"/>
        <path d="M60 82 Q60 50 60 22" stroke="#3D6849" stroke-width="3" fill="none"/>
        <path d="M60 82 Q75 55 94 36" stroke="#2E5137" stroke-width="3" fill="none"/>
        <circle cx="35" cy="45" r="7" fill="#4A7C59"/>
        <circle cx="46" cy="56" r="7" fill="#4A7C59"/>
        <circle cx="60" cy="34" r="8" fill="#4A7C59"/>
        <circle cx="60" cy="50" r="8" fill="#3D6849"/>
        <circle cx="85" cy="45" r="7" fill="#4A7C59"/>
        <circle cx="74" cy="56" r="7" fill="#4A7C59"/>
      </svg>`
    ),
    svg_herb: 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#F4F7F4"/>
        <rect x="40" y="78" width="40" height="28" rx="6" fill="#A98467"/>
        <path d="M52 78 L52 42 M68 78 L68 46" stroke="#3D6849" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="44" cy="52" rx="10" ry="6" transform="rotate(-20 44 52)" fill="#10B981"/>
        <ellipse cx="60" cy="46" rx="10" ry="6" transform="rotate(20 60 46)" fill="#059669"/>
        <ellipse cx="52" cy="36" rx="9" ry="12" fill="#10B981"/>
        <ellipse cx="76" cy="56" rx="10" ry="6" transform="rotate(20 76 56)" fill="#10B981"/>
        <ellipse cx="68" cy="40" rx="8" ry="11" fill="#059669"/>
      </svg>`
    ),
    svg_aloe: 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#E6EFE6"/>
        <path d="M40 82 L80 82 L74 108 L46 108 Z" fill="#BC6C25"/>
        <path d="M60 82 C54 55 56 32 60 20 C64 32 66 55 60 82 Z" fill="#2E5137"/>
        <path d="M55 82 C40 60 34 42 34 28 C44 40 50 58 55 82 Z" fill="#4A7C59"/>
        <path d="M65 82 C80 60 86 42 86 28 C76 40 70 58 65 82 Z" fill="#3D6849"/>
      </svg>`
    )
  };

  const AVATAR_CHOICES = [
    { id: 'monstera', label: 'モンステラ', src: 'img/monstera.png' },
    { id: 'cactus', label: 'サボテン', src: 'img/cactus.png' },
    { id: 'pothos', label: 'ポトス', src: 'img/pothos.png' },
    { id: 'pachira', label: 'パキラ', src: 'img/pachira.png' },
    { id: 'ivy', label: 'アイビー', src: 'img/ivy.png' },
    { id: 'ficus', label: 'ガジュマル風', src: SVG_ILLUSTRATIONS.svg_ficus },
    { id: 'succulent', label: '多肉植物', src: SVG_ILLUSTRATIONS.svg_succulent },
    { id: 'fern', label: 'シダ植物', src: SVG_ILLUSTRATIONS.svg_fern },
    { id: 'herb', label: 'ハーブ', src: SVG_ILLUSTRATIONS.svg_herb },
    { id: 'aloe', label: 'アロエ', src: SVG_ILLUSTRATIONS.svg_aloe }
  ];

  // =========================================================================
  // Date Helpers (Timezone-safe YYYY-MM-DD arithmetic)
  // =========================================================================

  let state = null;

  function formatDateISO(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTodayISO() {
    const now = new Date();
    const offset =
      state && state.settings && Number.isFinite(Number(state.settings.dateOffsetDays))
        ? Number(state.settings.dateOffsetDays)
        : 0;
    if (offset !== 0) {
      now.setDate(now.getDate() + offset);
    }
    return formatDateISO(now);
  }

  function parseISODateUTC(iso) {
    const parts = String(iso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      const now = new Date();
      return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function addDaysISO(baseIso, offsetDays) {
    const utcMs = parseISODateUTC(baseIso);
    const dt = new Date(utcMs);
    dt.setUTCDate(dt.getUTCDate() + Number(offsetDays || 0));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Returns whole days from `fromIso` to `toIso` (i.e. toIso - fromIso).
   * Example: diffDaysISO('2026-11-14', '2026-11-17') === 3
   */
  function diffDaysISO(fromIso, toIso) {
    const msPerDay = 86400000;
    return Math.round((parseISODateUTC(toIso) - parseISODateUTC(fromIso)) / msPerDay);
  }

  /**
   * Dynamically computes a plant's status for `todayIso`.
   * - If `plant.history` contains `todayIso`, the plant was watered today:
   *   -> belongs to "今日の水やり" (`isTodayTask = true`, `wateredToday = true`, `daysRemaining = 0`).
   * - Otherwise, compares `plant.nextDueDate` against `todayIso`:
   *   -> `diff = diffDaysISO(todayIso, plant.nextDueDate)`
   *   -> if `diff <= 0`, it is due today or overdue (`isTodayTask = true`, `wateredToday = false`, `daysRemaining = 0`, `overdueDays = -diff`)
   *   -> if `diff > 0`, it is scheduled in the future (`isTodayTask = false`, `wateredToday = false`, `daysRemaining = diff`, `overdueDays = 0`)
   */
  function computePlantStatus(plant, todayIso) {
    const history = Array.isArray(plant.history) ? plant.history : [];
    const wateredToday = history.includes(todayIso);

    if (wateredToday) {
      return {
        isTodayTask: true,
        wateredToday: true,
        daysRemaining: 0,
        overdueDays: 0,
        nextDueDate: plant.nextDueDate || addDaysISO(todayIso, plant.cycleDays || 7)
      };
    }

    const nextDueDate = plant.nextDueDate || todayIso;
    const diff = diffDaysISO(todayIso, nextDueDate);

    if (diff <= 0) {
      return {
        isTodayTask: true,
        wateredToday: false,
        daysRemaining: 0,
        overdueDays: Math.abs(diff),
        nextDueDate: nextDueDate
      };
    }

    return {
      isTodayTask: false,
      wateredToday: false,
      daysRemaining: diff,
      overdueDays: 0,
      nextDueDate: nextDueDate
    };
  }

  // =========================================================================
  // Initial State & Migration
  // =========================================================================

  function createInitialState(baseDateIso) {
    const today = baseDateIso || formatDateISO(new Date());
    return {
      activeTab: 'home',
      baseDate: today,
      settings: {
        reminderTime: '08:30',
        defaultCycle: 7,
        showTodayInAll: false,
        dateOffsetDays: 0
      },
      plants: [
        {
          id: 'plant-monstera',
          name: 'モンステラ',
          variety: 'Monstera deliciosa',
          location: 'リビング・窓辺',
          cycleDays: 7,
          nextDueDate: addDaysISO(today, 7),
          previousDueDate: today,
          image: 'img/monstera.png',
          notes: '直射日光を避け、レースカーテン越しの明るい場所に置く。葉水もこまめに与える。',
          history: [today, addDaysISO(today, -7), addDaysISO(today, -14)]
        },
        {
          id: 'plant-cactus',
          name: 'サボテン',
          variety: 'Echinocactus grusonii',
          location: '自室デスク',
          cycleDays: 14,
          nextDueDate: today,
          previousDueDate: today,
          image: 'img/cactus.png',
          notes: '土が完全に乾いてから数日後にたっぷり水やり。受け皿に水を溜めないように注意。',
          history: [addDaysISO(today, -14), addDaysISO(today, -28)]
        },
        {
          id: 'plant-pothos',
          name: 'ポトス',
          variety: 'Epipremnum aureum',
          location: 'リビング・シェルフ',
          cycleDays: 7,
          nextDueDate: addDaysISO(today, 3),
          image: 'img/pothos.png',
          notes: '表土が乾いたらたっぷり水やり。つるが伸びすぎたら剪定して水差しで増やせる。',
          history: [addDaysISO(today, -4), addDaysISO(today, -11)]
        },
        {
          id: 'plant-pachira',
          name: 'パキラ',
          variety: 'Pachira glabra',
          location: '玄関・廊下',
          cycleDays: 10,
          nextDueDate: addDaysISO(today, 5),
          image: 'img/pachira.png',
          notes: '乾燥に強いので水のやりすぎによる根腐れに注意。風通しの良い日陰〜半日陰で管理。',
          history: [addDaysISO(today, -5), addDaysISO(today, -15)]
        },
        {
          id: 'plant-ivy',
          name: 'アイビー',
          variety: 'Hedera helix',
          location: 'キッチン・カウンター',
          cycleDays: 5,
          nextDueDate: addDaysISO(today, 1),
          image: 'img/ivy.png',
          notes: '明日水やりが必要です。水切れに注意し、春〜秋は土の表面が乾いたらたっぷり与える。',
          history: [addDaysISO(today, -4), addDaysISO(today, -9)]
        }
      ]
    };
  }

  function migrateAndNormalizeState(parsed) {
    parsed.settings = Object.assign(
      { reminderTime: '08:30', defaultCycle: 7, showTodayInAll: false, dateOffsetDays: 0 },
      parsed.settings || {}
    );

    const fallbackBaseDate = parsed.baseDate || '2026-11-14';
    let needsSave = false;

    parsed.plants.forEach((p) => {
      if (!Array.isArray(p.history)) {
        p.history = [];
        needsSave = true;
      }
      p.cycleDays = Math.max(1, Number(p.cycleDays) || 7);

      // Migrate legacy plants that only stored static `daysRemaining` without `nextDueDate`
      if (!p.nextDueDate) {
        if (p.history.length > 0) {
          // Derive nextDueDate from the most recent watering date + cycleDays
          const latestWatered = p.history[0];
          p.nextDueDate = addDaysISO(latestWatered, p.cycleDays);
          if (p.wateredToday) {
            p.previousDueDate = latestWatered;
          }
        } else {
          const rem = Number.isFinite(Number(p.daysRemaining)) ? Number(p.daysRemaining) : 0;
          p.nextDueDate = addDaysISO(fallbackBaseDate, rem);
        }
        needsSave = true;
      }
    });

    if (needsSave) {
      saveState(parsed);
    }
    return parsed;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createInitialState();
        saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.plants)) {
        const initial = createInitialState();
        saveState(initial);
        return initial;
      }
      return migrateAndNormalizeState(parsed);
    } catch (e) {
      return createInitialState();
    }
  }

  function saveState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  state = loadState();
  let selectedAvatarSrc = AVATAR_CHOICES[0].src;
  let activeDetailPlantId = null;

  // Calendar state
  let calYear = Number(getTodayISO().split('-')[0]);
  let calMonth = Number(getTodayISO().split('-')[1]) - 1;
  let selectedCalDateISO = getTodayISO();

  // Toast helper
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
    }, 2200);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // Rendering: Home View (Today's Watering & All Plants)
  // =========================================================================

  function renderHome() {
    const todayIso = getTodayISO();

    // Compute live status for each plant against todayIso
    const enriched = state.plants.map((plant) => ({
      plant,
      status: computePlantStatus(plant, todayIso)
    }));

    const todayItems = enriched.filter((item) => item.status.isTodayTask);
    const listItems = state.settings.showTodayInAll
      ? enriched.slice()
      : enriched.filter((item) => !item.status.isTodayTask);

    // 1. Update Counter Badge (e.g. "2件")
    const countBadge = document.getElementById('today-count-badge');
    if (countBadge) {
      countBadge.textContent = `${todayItems.length}件`;
    }

    // 2. Render Today's Watering Grid
    const todayGrid = document.getElementById('today-watering-grid');
    if (todayGrid) {
      if (todayItems.length === 0) {
        todayGrid.innerHTML = `
          <div class="empty-box" style="grid-column: span 2;">
            🎉 今日の水やり対象はありません。<br/>
            <span style="font-size:11px; color:var(--stone-400);">右上の「＋」から植物を追加するか、詳細から水やり日を調整できます。</span>
          </div>
        `;
      } else {
        todayGrid.innerHTML = todayItems
          .map(({ plant, status }) => {
            const isDone = Boolean(status.wateredToday);
            const cardStateClass = isDone ? 'is-completed' : 'is-uncompleted';
            const badgeClass = isDone ? 'is-done' : 'is-pending';
            const badgeText = isDone ? '本日分' : '未完了';
            const labelStateClass = isDone ? 'is-checked' : 'is-unchecked';
            const checkedAttr = isDone ? 'checked' : '';
            const locText = escapeHtml(plant.location || '場所未設定');
            const overdueSub =
              !isDone && status.overdueDays > 0
                ? ` <span style="color:var(--red-600); font-weight:600;">(${status.overdueDays}日超過)</span>`
                : '';

            return `
              <article class="watering-card ${cardStateClass}" data-purpose="watering-card" data-plant-id="${escapeHtml(plant.id)}">
                <div class="watering-card-overlay"></div>
                <div class="watering-card-media" data-action="open-detail" data-plant-id="${escapeHtml(plant.id)}">
                  <img alt="${escapeHtml(plant.name)}" loading="lazy" src="${escapeHtml(plant.image)}" />
                  <div class="card-status-badge ${badgeClass}">${badgeText}</div>
                </div>
                <div class="watering-card-info" data-action="open-detail" data-plant-id="${escapeHtml(plant.id)}">
                  <h3 class="watering-card-title">${escapeHtml(plant.name)}</h3>
                  <p class="watering-card-location">${locText}${overdueSub}</p>
                </div>
                <label class="watering-check-label ${labelStateClass}">
                  <span class="watering-check-text">済</span>
                  <input type="checkbox" class="watering-checkbox" data-action="toggle-today-check" data-plant-id="${escapeHtml(plant.id)}" ${checkedAttr} />
                </label>
              </article>
            `;
          })
          .join('');
      }
    }

    // 3. Render All Plants List
    const allList = document.getElementById('all-plants-list');
    if (allList) {
      if (listItems.length === 0) {
        allList.innerHTML = `
          <div class="empty-box">
            表示する植物がありません。
          </div>
        `;
      } else {
        allList.innerHTML = listItems
          .map(({ plant, status }) => {
            const isUrgent = status.daysRemaining === 1;
            const isToday = status.isTodayTask;

            if (isUrgent) {
              // Matches Plant 3: アイビー (あと1日！ - 警告赤色表示)
              return `
                <div class="plant-row is-urgent" role="button" tabindex="0" data-action="open-detail" data-plant-id="${escapeHtml(plant.id)}">
                  <div class="urgent-accent-bar"></div>
                  <div class="plant-row-left">
                    <div class="plant-thumb">
                      <img alt="${escapeHtml(plant.name)}" loading="lazy" src="${escapeHtml(plant.image)}" />
                    </div>
                    <div>
                      <div class="plant-row-name-wrap">
                        <h3 class="plant-row-name">${escapeHtml(plant.name)}</h3>
                        <span class="pulse-dot"></span>
                      </div>
                      <p class="plant-row-sub">明日水やりが必要です</p>
                    </div>
                  </div>
                  <div class="plant-row-right">
                    <span class="days-badge is-urgent">
                      <span>あと1日！</span>
                    </span>
                    <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                  </div>
                </div>
              `;
            }

            const badgeLabel = isToday
              ? (status.wateredToday ? '本日済' : '今日！')
              : `あと${status.daysRemaining}日`;
            const badgeExtraClass = isToday ? 'is-today' : '';

            return `
              <div class="plant-row" role="button" tabindex="0" data-action="open-detail" data-plant-id="${escapeHtml(plant.id)}">
                <div class="plant-row-left">
                  <div class="plant-thumb">
                    <img alt="${escapeHtml(plant.name)}" loading="lazy" src="${escapeHtml(plant.image)}" />
                  </div>
                  <div>
                    <h3 class="plant-row-name">${escapeHtml(plant.name)}</h3>
                    <p class="plant-row-sub">水やり周期: ${escapeHtml(plant.cycleDays)}日ごと</p>
                  </div>
                </div>
                <div class="plant-row-right">
                  <span class="days-badge ${badgeExtraClass}">${escapeHtml(badgeLabel)}</span>
                  <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                  </svg>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // 4. Update Drawer Stats
    const statTotal = document.getElementById('drawer-stat-total');
    const statPending = document.getElementById('drawer-stat-pending');
    if (statTotal) statTotal.textContent = `${state.plants.length}鉢`;
    if (statPending) {
      const pendingCount = todayItems.filter((item) => !item.status.wateredToday).length;
      statPending.textContent = `${pendingCount}件`;
    }
  }

  // =========================================================================
  // Toggling Today's Watering Checkbox
  // =========================================================================

  function toggleTodayWatering(plantId, checked) {
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;

    const today = getTodayISO();
    if (!Array.isArray(plant.history)) plant.history = [];

    if (checked) {
      if (!plant.history.includes(today)) {
        plant.history.unshift(today);
      }
      // Remember due date before today's completion in case the user unchecks it today
      if (!plant.previousDueDate || diffDaysISO(today, plant.nextDueDate) <= 0) {
        plant.previousDueDate = plant.nextDueDate || today;
      }
      plant.nextDueDate = addDaysISO(today, plant.cycleDays || 7);
      showToast(`🌿 「${plant.name}」の水やりを完了しました`);
    } else {
      plant.history = plant.history.filter((d) => d !== today);
      if (plant.previousDueDate && diffDaysISO(today, plant.previousDueDate) <= 0) {
        plant.nextDueDate = plant.previousDueDate;
      } else {
        plant.nextDueDate = today;
      }
      showToast(`「${plant.name}」を未完了に戻しました`);
    }

    saveState(state);
    renderAll();
  }

  // =========================================================================
  // Plant Detail Modal ("タップで詳細")
  // =========================================================================

  function openDetailModal(plantId) {
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;
    activeDetailPlantId = plantId;

    const todayIso = getTodayISO();
    const status = computePlantStatus(plant, todayIso);

    const body = document.getElementById('detail-modal-body');
    const title = document.getElementById('detail-modal-title');
    if (title) title.textContent = `${plant.name} の詳細`;

    let statusBadgeHtml = '';
    if (status.isTodayTask) {
      if (status.wateredToday) {
        statusBadgeHtml = `<span class="days-badge is-today">本日水やり済 ✓</span>`;
      } else if (status.overdueDays > 0) {
        statusBadgeHtml = `<span class="days-badge is-urgent">未完了（${status.overdueDays}日超過）</span>`;
      } else {
        statusBadgeHtml = `<span class="days-badge is-urgent">今日が水やり日</span>`;
      }
    } else if (status.daysRemaining === 1) {
      statusBadgeHtml = `<span class="days-badge is-urgent">あと1日！（明日）</span>`;
    } else {
      statusBadgeHtml = `<span class="days-badge">あと${status.daysRemaining}日</span>`;
    }

    const lastWatered =
      plant.history && plant.history.length > 0 ? plant.history[0] : '記録なし';
    const historyPills =
      plant.history && plant.history.length > 0
        ? plant.history
            .slice(0, 6)
            .map((d) => `<span class="preset-chip">💧 ${escapeHtml(d)}</span>`)
            .join('')
        : `<span style="font-size:12px; color:var(--stone-400);">まだ履歴がありません</span>`;

    body.innerHTML = `
      <div class="detail-hero">
        <div class="detail-hero-img">
          <img src="${escapeHtml(plant.image)}" alt="${escapeHtml(plant.name)}" />
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <h3 style="font-size:1.125rem; font-weight:700; color:var(--stone-900);">${escapeHtml(plant.name)}</h3>
            ${statusBadgeHtml}
          </div>
          <p style="font-size:0.75rem; color:var(--stone-500); margin-top:2px;">
            📍 ${escapeHtml(plant.location || '場所未設定')}
            ${plant.variety ? ` ・ <span style="font-style:italic;">${escapeHtml(plant.variety)}</span>` : ''}
          </p>
          <p style="font-size:11px; color:var(--stone-400); margin-top:2px;">
            次回予定日: ${escapeHtml(status.nextDueDate)}
          </p>
        </div>
      </div>

      <div class="detail-stats-grid">
        <div class="detail-stat-card">
          <div class="detail-stat-label">水やり周期</div>
          <div class="detail-stat-value">${escapeHtml(plant.cycleDays)}日ごと</div>
        </div>
        <div class="detail-stat-card">
          <div class="detail-stat-label">前回の水やり日</div>
          <div class="detail-stat-value">${escapeHtml(lastWatered)}</div>
        </div>
      </div>

      <div class="detail-stat-card">
        <div class="detail-stat-label">育て方・管理メモ</div>
        <p style="font-size:0.8125rem; color:var(--stone-700); margin-top:0.25rem; line-height:1.5;">
          ${escapeHtml(plant.notes || 'メモは登録されていません。')}
        </p>
      </div>

      <div class="detail-stat-card">
        <div class="detail-stat-label" style="margin-bottom:0.375rem;">水やり履歴</div>
        <div class="chip-list">${historyPills}</div>
      </div>

      <div class="detail-stat-card" style="display:flex; flex-direction:column; gap:0.5rem;">
        <div class="detail-stat-label">次回水やり日数の調整（ステータス変更）</div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:0.375rem;">
          <button type="button" class="btn-secondary" data-detail-action="set-days" data-days="0" style="padding:0.4rem 0.25rem; font-size:11px;">今日(0日)</button>
          <button type="button" class="btn-secondary" data-detail-action="set-days" data-days="1" style="padding:0.4rem 0.25rem; font-size:11px; color:var(--red-600); border-color:var(--red-200);">あと1日！</button>
          <button type="button" class="btn-secondary" data-detail-action="delta-days" data-delta="-1" style="padding:0.4rem 0.25rem; font-size:11px;">-1日</button>
          <button type="button" class="btn-secondary" data-detail-action="delta-days" data-delta="1" style="padding:0.4rem 0.25rem; font-size:11px;">+1日</button>
        </div>
      </div>

      <button type="button" class="btn-primary" data-detail-action="water-now">
        <span>💧</span> 今すぐ水やりを記録する（周期リセット）
      </button>

      <div style="display:flex; gap:0.625rem;">
        <button type="button" class="btn-secondary" data-detail-action="edit" style="flex:1;">
          ✏️ 編集する
        </button>
        <button type="button" class="btn-danger" data-detail-action="delete" style="flex:1;">
          🗑️ 削除する
        </button>
      </div>
    `;

    const backdrop = document.getElementById('detail-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDetailModal() {
    const backdrop = document.getElementById('detail-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    activeDetailPlantId = null;
  }

  // =========================================================================
  // Add / Edit Plant Modal ("＋ 植物を追加")
  // =========================================================================

  function renderAvatarPicker() {
    const picker = document.getElementById('avatar-picker');
    if (!picker) return;
    picker.innerHTML = AVATAR_CHOICES.map((item) => {
      const isSel = item.src === selectedAvatarSrc ? 'is-selected' : '';
      return `
        <button type="button" class="avatar-option ${isSel}" data-avatar-src="${escapeHtml(item.src)}" title="${escapeHtml(item.label)}">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}" />
        </button>
      `;
    }).join('');
  }

  function openFormModal(editPlantId) {
    const todayIso = getTodayISO();
    const formTitle = document.getElementById('form-modal-title');
    const idInput = document.getElementById('form-plant-id');
    const nameInput = document.getElementById('form-name');
    const locInput = document.getElementById('form-location');
    const varInput = document.getElementById('form-variety');
    const cycleInput = document.getElementById('form-cycle');
    const remSelect = document.getElementById('form-remaining');
    const notesInput = document.getElementById('form-notes');
    const fileStatus = document.getElementById('form-file-status');
    if (fileStatus) fileStatus.textContent = '';

    if (editPlantId) {
      const plant = state.plants.find((p) => p.id === editPlantId);
      if (!plant) return;
      const status = computePlantStatus(plant, todayIso);
      if (formTitle) formTitle.textContent = `「${plant.name}」を編集`;
      idInput.value = plant.id;
      nameInput.value = plant.name;
      locInput.value = plant.location || '';
      varInput.value = plant.variety || '';
      cycleInput.value = plant.cycleDays || 7;

      const remVal = String(Math.max(0, status.daysRemaining));
      if (!Array.from(remSelect.options).some((o) => o.value === remVal)) {
        const opt = document.createElement('option');
        opt.value = remVal;
        opt.textContent = `あと${remVal}日`;
        remSelect.appendChild(opt);
      }
      remSelect.value = remVal;
      notesInput.value = plant.notes || '';
      selectedAvatarSrc = plant.image || AVATAR_CHOICES[0].src;
    } else {
      if (formTitle) formTitle.textContent = '植物を追加';
      idInput.value = '';
      nameInput.value = '';
      locInput.value = 'リビング・窓辺';
      varInput.value = '';
      cycleInput.value = state.settings.defaultCycle || 7;
      remSelect.value = '3';
      notesInput.value = '';
      selectedAvatarSrc = AVATAR_CHOICES[0].src;
    }

    renderAvatarPicker();

    const backdrop = document.getElementById('form-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    setTimeout(() => nameInput && nameInput.focus(), 80);
  }

  function closeFormModal() {
    const backdrop = document.getElementById('form-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  // =========================================================================
  // Calendar Tab Rendering
  // =========================================================================

  function renderCalendar() {
    const label = document.getElementById('cal-month-label');
    if (label) {
      label.textContent = `${calYear}年${calMonth + 1}月`;
    }

    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayIso = getTodayISO();

    // Map ISO date -> { done: [], urgent: [], due: [] }
    const dateEvents = {};
    function ensureDate(iso) {
      if (!dateEvents[iso]) dateEvents[iso] = { done: [], urgent: [], due: [] };
      return dateEvents[iso];
    }

    state.plants.forEach((p) => {
      const status = computePlantStatus(p, todayIso);
      if (Array.isArray(p.history)) {
        p.history.forEach((hIso) => {
          ensureDate(hIso).done.push(p);
        });
      }
      if (status.isTodayTask && !status.wateredToday) {
        ensureDate(todayIso).urgent.push(p);
      } else if (status.daysRemaining === 1) {
        ensureDate(status.nextDueDate).urgent.push(p);
      } else if (status.daysRemaining > 1) {
        ensureDate(status.nextDueDate).due.push(p);
      } else if (status.wateredToday && status.nextDueDate) {
        ensureDate(status.nextDueDate).due.push(p);
      }
    });

    let cellsHtml = '';
    for (let i = 0; i < firstDay; i++) {
      cellsHtml += `<div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const iso = `${calYear}-${mStr}-${dStr}`;
      const isToday = iso === todayIso ? 'is-today' : '';
      const isSelected = iso === selectedCalDateISO ? 'is-selected' : '';
      const ev = dateEvents[iso];

      let dotsHtml = '';
      if (ev) {
        if (ev.done.length > 0) dotsHtml += `<span class="cal-dot done"></span>`;
        if (ev.urgent.length > 0) dotsHtml += `<span class="cal-dot urgent"></span>`;
        if (ev.due.length > 0) dotsHtml += `<span class="cal-dot due"></span>`;
      }

      cellsHtml += `
        <button type="button" class="calendar-day ${isToday} ${isSelected}" data-cal-date="${iso}">
          <span>${d}</span>
          <div class="calendar-dots">${dotsHtml}</div>
        </button>
      `;
    }

    grid.innerHTML = cellsHtml;

    const selTitle = document.getElementById('cal-selected-date-title');
    if (selTitle) {
      selTitle.textContent = `${selectedCalDateISO} の水やり記録・予定`;
    }

    const selList = document.getElementById('cal-selected-events');
    if (selList) {
      const ev = dateEvents[selectedCalDateISO];
      const items = [];
      if (ev) {
        ev.done.forEach((p) =>
          items.push({ plant: p, badge: '水やり完了 ✓', cls: 'is-today' })
        );
        ev.urgent.forEach((p) =>
          items.push({ plant: p, badge: '水やり予定（要注意）', cls: 'is-urgent' })
        );
        ev.due.forEach((p) =>
          items.push({ plant: p, badge: '水やり予定日', cls: '' })
        );
      }

      if (items.length === 0) {
        selList.innerHTML = `<div class="empty-box">この日の記録・予定はありません。</div>`;
      } else {
        selList.innerHTML = items
          .map(
            (item) => `
          <div class="plant-row" data-action="open-detail" data-plant-id="${escapeHtml(item.plant.id)}">
            <div class="plant-row-left">
              <div class="plant-thumb">
                <img src="${escapeHtml(item.plant.image)}" alt="${escapeHtml(item.plant.name)}" />
              </div>
              <div>
                <h3 class="plant-row-name">${escapeHtml(item.plant.name)}</h3>
                <p class="plant-row-sub">${escapeHtml(item.plant.location || '')}</p>
              </div>
            </div>
            <div class="plant-row-right">
              <span class="days-badge ${item.cls}">${escapeHtml(item.badge)}</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  }

  // =========================================================================
  // Settings & Simulation Actions
  // =========================================================================

  function renderSettings() {
    const remInput = document.getElementById('setting-reminder-time');
    const cycInput = document.getElementById('setting-default-cycle');
    const showAllCheck = document.getElementById('setting-show-today-in-all');
    if (remInput) remInput.value = state.settings.reminderTime || '08:30';
    if (cycInput) cycInput.value = state.settings.defaultCycle || 7;
    if (showAllCheck) showAllCheck.checked = Boolean(state.settings.showTodayInAll);
  }

  function advanceOneDay() {
    state.settings.dateOffsetDays =
      (Number(state.settings.dateOffsetDays) || 0) + 1;
    const nextIso = getTodayISO();
    selectedCalDateISO = nextIso;
    calYear = Number(nextIso.split('-')[0]);
    calMonth = Number(nextIso.split('-')[1]) - 1;
    saveState(state);
    renderAll();
    showToast(`📅 日付を ${nextIso} に進めました`);
  }

  function resetToInitialData() {
    state.settings.dateOffsetDays = 0;
    const realTodayIso = formatDateISO(new Date());
    state = createInitialState(realTodayIso);
    selectedCalDateISO = realTodayIso;
    calYear = Number(realTodayIso.split('-')[0]);
    calMonth = Number(realTodayIso.split('-')[1]) - 1;
    saveState(state);
    switchTab('home');
    renderAll();
    showToast('🔄 初期データにリセットしました');
  }

  // =========================================================================
  // Tab Navigation & Master Render
  // =========================================================================

  function switchTab(tabName) {
    state.activeTab = tabName;
    saveState(state);

    const views = {
      home: document.getElementById('view-home'),
      calendar: document.getElementById('view-calendar'),
      settings: document.getElementById('view-settings')
    };

    Object.keys(views).forEach((k) => {
      if (views[k]) {
        views[k].classList.toggle('hidden', k !== tabName);
      }
    });

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      const isMatch = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('is-active', isMatch);
    });

    renderAll();
  }

  function renderAll() {
    renderHome();
    renderCalendar();
    renderSettings();
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================

  function initEvents() {
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerBackdrop = document.getElementById('drawer-backdrop');

    function closeDrawer() {
      if (drawerBackdrop) {
        drawerBackdrop.classList.remove('is-open');
        drawerBackdrop.setAttribute('aria-hidden', 'true');
      }
    }

    if (btnOpenDrawer && drawerBackdrop) {
      btnOpenDrawer.addEventListener('click', () => {
        drawerBackdrop.classList.add('is-open');
        drawerBackdrop.setAttribute('aria-hidden', 'false');
      });
    }
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', (e) => {
        if (
          e.target === drawerBackdrop ||
          e.target.classList.contains('drawer-frame')
        ) {
          closeDrawer();
        }
      });
    }

    const drawerBtnAdd = document.getElementById('drawer-btn-add');
    if (drawerBtnAdd) {
      drawerBtnAdd.addEventListener('click', () => {
        closeDrawer();
        openFormModal(null);
      });
    }

    const drawerBtnAdvance = document.getElementById('drawer-btn-advance');
    if (drawerBtnAdvance) {
      drawerBtnAdvance.addEventListener('click', () => {
        closeDrawer();
        advanceOneDay();
      });
    }

    const drawerBtnReset = document.getElementById('drawer-btn-reset');
    if (drawerBtnReset) {
      drawerBtnReset.addEventListener('click', () => {
        closeDrawer();
        resetToInitialData();
      });
    }

    const btnOpenAdd = document.getElementById('btn-open-add');
    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', () => openFormModal(null));
    }

    document.addEventListener('change', (e) => {
      const target = e.target;
      if (
        target &&
        target.matches('input[data-action="toggle-today-check"]')
      ) {
        const plantId = target.getAttribute('data-plant-id');
        toggleTodayWatering(plantId, target.checked);
      }
    });

    document.addEventListener('click', (e) => {
      const detailTrigger = e.target.closest('[data-action="open-detail"]');
      if (detailTrigger) {
        const plantId = detailTrigger.getAttribute('data-plant-id');
        openDetailModal(plantId);
        return;
      }

      const avatarBtn = e.target.closest('[data-avatar-src]');
      if (avatarBtn) {
        selectedAvatarSrc = avatarBtn.getAttribute('data-avatar-src');
        renderAvatarPicker();
        return;
      }

      const locChip = e.target.closest('[data-loc]');
      if (locChip) {
        const locInput = document.getElementById('form-location');
        if (locInput) locInput.value = locChip.getAttribute('data-loc');
        return;
      }

      const calDayBtn = e.target.closest('[data-cal-date]');
      if (calDayBtn) {
        selectedCalDateISO = calDayBtn.getAttribute('data-cal-date');
        renderCalendar();
        return;
      }

      const detailActionBtn = e.target.closest('[data-detail-action]');
      if (detailActionBtn && activeDetailPlantId) {
        const action = detailActionBtn.getAttribute('data-detail-action');
        const plant = state.plants.find((p) => p.id === activeDetailPlantId);
        if (!plant) return;
        const todayIso = getTodayISO();
        const status = computePlantStatus(plant, todayIso);

        if (action === 'water-now') {
          if (!Array.isArray(plant.history)) plant.history = [];
          if (!plant.history.includes(todayIso)) plant.history.unshift(todayIso);
          plant.previousDueDate = plant.nextDueDate || todayIso;
          plant.nextDueDate = addDaysISO(todayIso, plant.cycleDays || 7);
          saveState(state);
          renderAll();
          openDetailModal(plant.id);
          showToast(`💧 「${plant.name}」の水やりを記録しました`);
        } else if (action === 'set-days') {
          const days = Number(detailActionBtn.getAttribute('data-days'));
          if (Array.isArray(plant.history)) {
            plant.history = plant.history.filter((d) => d !== todayIso);
          }
          plant.nextDueDate = addDaysISO(todayIso, days);
          saveState(state);
          renderAll();
          openDetailModal(plant.id);
          showToast(
            `「${plant.name}」を${days === 0 ? '今日の水やり' : `あと${days}日`}に設定しました`
          );
        } else if (action === 'delta-days') {
          const delta = Number(detailActionBtn.getAttribute('data-delta'));
          const nextDays = Math.max(0, status.daysRemaining + delta);
          if (Array.isArray(plant.history)) {
            plant.history = plant.history.filter((d) => d !== todayIso);
          }
          plant.nextDueDate = addDaysISO(todayIso, nextDays);
          saveState(state);
          renderAll();
          openDetailModal(plant.id);
        } else if (action === 'edit') {
          const editId = plant.id;
          closeDetailModal();
          openFormModal(editId);
        } else if (action === 'delete') {
          const removedName = plant.name;
          state.plants = state.plants.filter((p) => p.id !== plant.id);
          saveState(state);
          closeDetailModal();
          renderAll();
          showToast(`「${removedName}」を削除しました`);
        }
      }
    });

    const btnCloseDetail = document.getElementById('btn-close-detail');
    const detailBackdrop = document.getElementById('detail-modal-backdrop');
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeDetailModal);
    if (detailBackdrop) {
      detailBackdrop.addEventListener('click', (e) => {
        if (e.target === detailBackdrop) closeDetailModal();
      });
    }

    const btnCloseForm = document.getElementById('btn-close-form');
    const btnCancelForm = document.getElementById('btn-cancel-form');
    const formBackdrop = document.getElementById('form-modal-backdrop');
    if (btnCloseForm) btnCloseForm.addEventListener('click', closeFormModal);
    if (btnCancelForm) btnCancelForm.addEventListener('click', closeFormModal);
    if (formBackdrop) {
      formBackdrop.addEventListener('click', (e) => {
        if (e.target === formBackdrop) closeFormModal();
      });
    }

    const fileInput = document.getElementById('form-image-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          selectedAvatarSrc = ev.target.result;
          renderAvatarPicker();
          const status = document.getElementById('form-file-status');
          if (status) status.textContent = `選択済: ${file.name}`;
        };
        reader.readAsDataURL(file);
      });
    }

    const plantForm = document.getElementById('plant-form');
    if (plantForm) {
      plantForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const todayIso = getTodayISO();
        const idVal = document.getElementById('form-plant-id').value.trim();
        const nameVal = document.getElementById('form-name').value.trim();
        if (!nameVal) return;

        const locVal =
          document.getElementById('form-location').value.trim() || 'リビング';
        const varVal = document.getElementById('form-variety').value.trim();
        const cycleVal = Math.max(
          1,
          Number(document.getElementById('form-cycle').value) || 7
        );
        const remVal = Math.max(
          0,
          Number(document.getElementById('form-remaining').value)
        );
        const notesVal = document.getElementById('form-notes').value.trim();

        if (idVal) {
          const existing = state.plants.find((p) => p.id === idVal);
          if (existing) {
            existing.name = nameVal;
            existing.location = locVal;
            existing.variety = varVal;
            existing.cycleDays = cycleVal;
            if (!existing.history || !existing.history.includes(todayIso)) {
              existing.nextDueDate = addDaysISO(todayIso, remVal);
            }
            existing.image = selectedAvatarSrc;
            existing.notes = notesVal;
          }
          showToast(`🌿 「${nameVal}」を更新しました`);
        } else {
          const newPlant = {
            id: 'plant-' + Date.now(),
            name: nameVal,
            variety: varVal,
            location: locVal,
            cycleDays: cycleVal,
            nextDueDate: addDaysISO(todayIso, remVal),
            image: selectedAvatarSrc,
            notes: notesVal,
            history: []
          };
          state.plants.push(newPlant);
          showToast(`🌱 「${nameVal}」を追加しました`);
        }

        saveState(state);
        closeFormModal();
        renderAll();
      });
    }

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    const calPrev = document.getElementById('cal-prev-btn');
    const calNext = document.getElementById('cal-next-btn');
    if (calPrev) {
      calPrev.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) {
          calMonth = 11;
          calYear--;
        }
        renderCalendar();
      });
    }
    if (calNext) {
      calNext.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) {
          calMonth = 0;
          calYear++;
        }
        renderCalendar();
      });
    }

    const remInput = document.getElementById('setting-reminder-time');
    const cycInput = document.getElementById('setting-default-cycle');
    const showAllCheck = document.getElementById('setting-show-today-in-all');
    if (remInput) {
      remInput.addEventListener('change', () => {
        state.settings.reminderTime = remInput.value;
        saveState(state);
        showToast('通知時刻を保存しました');
      });
    }
    if (cycInput) {
      cycInput.addEventListener('change', () => {
        state.settings.defaultCycle = Math.max(1, Number(cycInput.value) || 7);
        saveState(state);
        showToast('デフォルト周期を保存しました');
      });
    }
    if (showAllCheck) {
      showAllCheck.addEventListener('change', () => {
        state.settings.showTodayInAll = showAllCheck.checked;
        saveState(state);
        renderHome();
        showToast('一覧表示設定を更新しました');
      });
    }

    const btnAdvanceDay = document.getElementById('btn-advance-day');
    if (btnAdvanceDay) {
      btnAdvanceDay.addEventListener('click', advanceOneDay);
    }

    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
      btnResetData.addEventListener('click', resetToInitialData);
    }

    // Re-render when window regains focus or visibility changes (e.g. date changed while open)
    window.addEventListener('focus', () => renderAll());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderAll();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    state.activeTab = 'home';
    renderAll();
  });
})();
