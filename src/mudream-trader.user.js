// ==UserScript==
// @name         MuDream Trader — Upgrades + Appraiser
// @namespace    mudream-upgrade-finder
// @version      0.4.0
// @description  Апгрейды персонажей и автономная оценка предметов по Ctrl+D при открытом tooltip MuDream.
// @match        https://mudream.online/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const GRAPHQL_URL = '/api/graphql';
  const BTN_ID = 'mduf-launch';
  const PANEL_ID = 'mduf-panel';
  const STYLE_ID = 'mduf-style';

  const RACES = {
    MG:  { label: 'MG',  filter: { forMG: true } },
    DL:  { label: 'DL',  filter: { forDL: true } },
    EE:  { label: 'EE',  filter: { forELF: true } }
  };

  // Предварительное автоопределение по class из GET_CHAR_BY_NAME.
  // Если сервер вернёт неожиданный код — можно выбрать расу вручную.
  const CLASS_TO_RACE = {
    48: 'MG',
    64: 'DL',
    32: 'EE'
  };

  const TYPE_LABELS = {
    armor: 'Нагрудник',
    shield: 'Щит / левая рука',
    helm: 'Шлем',
    pants: 'Штаны',
    boots: 'Ботинки',
    gloves: 'Перчатки',
    wings: 'Крылья / плащ',
    sword: 'Меч',
    staff: 'Посох',
    spear: 'Копьё',
    axe: 'Топор',
    mace: 'Булава',
    bow: 'Лук',
    crossbow: 'Арбалет',
    scepter: 'Скипетр',
    pet: 'Питомец',
    ring: 'Кольцо',
    pendant: 'Кулон',
    skill: 'Скилл'
  };

  const SLOT_LABELS = {
    weapon: 'Правая рука',
    shield: 'Левая рука',
    helm: 'Шлем',
    armor: 'Нагрудник',
    pants: 'Штаны',
    gloves: 'Перчатки',
    boots: 'Ботинки',
    wings: 'Крылья / плащ',
    pet: 'Питомец',
    pendant: 'Кулон',
    ring1: 'Кольцо 1',
    ring2: 'Кольцо 2',
    ring: 'Кольцо'
  };

  const CURRENCIES = [
    ['bless', 'Bless'],
    ['soul',  'Soul'],
    ['life',  'Life'],
    ['chaos', 'Chaos'],
    ['creat', 'Creation']
  ];

  const PROFILES = {
    pvm: {
      label: 'PvM',
      weights: {
        gs:0.30, ias:3.0, phys:14, edr:9, addDamage:0.10, skillDamage:0.06,
        str:0.11, agi:0.13, vit:0.045, ene:0.075,
        dd:18, dsr:5, hp:7, sd:1.5, zen:3, ref:0.5,
        pvpDamage:0.2, pvpDefense:0.2, sdIgnore:0.2, sdDecrease:0.2
      }
    },
    pvp: {
      label: 'PvP',
      weights: {
        gs:0.25, ias:2.3, phys:10, edr:10, addDamage:0.06, skillDamage:0.05,
        str:0.08, agi:0.10, vit:0.08, ene:0.05,
        dd:16, dsr:0.5, hp:12, sd:10, zen:0, ref:12,
        pvpDamage:8, pvpDefense:8, sdIgnore:10, sdDecrease:8
      }
    },
    hybrid: {
      label: 'Универсал',
      weights: {
        gs:0.30, ias:2.7, phys:12, edr:9, addDamage:0.08, skillDamage:0.055,
        str:0.10, agi:0.115, vit:0.065, ene:0.06,
        dd:17, dsr:3, hp:9, sd:6, zen:1, ref:5,
        pvpDamage:4, pvpDefense:4, sdIgnore:5, sdDecrease:4
      }
    },
    zen: {
      label: 'Фарм Zen',
      weights: {
        gs:0.22, ias:2.5, phys:11, edr:7, addDamage:0.07, skillDamage:0.05,
        str:0.09, agi:0.11, vit:0.05, ene:0.06,
        dd:14, dsr:6, hp:6, sd:1.5, zen:22, ref:0.5,
        pvpDamage:0, pvpDefense:0, sdIgnore:0, sdDecrease:0
      }
    }
  };

  const GET_CHAR_QUERY = `
    fragment InventoryFragment on Item {
      hex
      pos
      isExpirable
      expireInSeconds
      slot
      __typename
    }

    query GET_CHAR_BY_NAME($name: String!) {
      characterByName(name: $name) {
        name
        level
        masterLevel
        class
        resets
        grandResets
        strength
        dexterity
        vitality
        energy
        leadership
        online
        mapId
        isMine
        Equipment {
          ...InventoryFragment
          __typename
        }
        __typename
      }
    }
  `;

  const GET_LOTS_QUERY = `
    query GET_ALL_LOTS(
      $offset: NonNegativeInt,
      $limit: NonNegativeInt,
      $sort: LotsSortInput,
      $filter: LotsFilterInput
    ) {
      lots(
        limit: $limit,
        offset: $offset,
        sort: $sort,
        filter: $filter
      ) {
        Lots {
          id
          source
          isMine
          type
          gearScore
          hasPendingCounterOffer
          Prices {
            value
            Currency {
              id
              code
              type
              title
            }
          }
        }
        Pagination {
          total
          currentPage
          nextPageExists
        }
      }
    }
  `;

  const state = {
    character: null,
    race: 'MG',
    equipment: [],
    ItemClass: null,
    sourceData: null,
    marketCache: {},
    selectedItem: null,
    selectedCandidates: [],
    characterUpgradeCandidates: [],
    marketDiagnostics: {},
    profile: 'pvm',
    appraiseItem: null,
    appraiseResults: null
  };

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${BTN_ID} {
        position: fixed;
        right: 18px;
        top: 88px;
        z-index: 2147483645;
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 10px;
        padding: 10px 14px;
        background: #122846;
        color: #fff;
        font: 700 13px Arial,sans-serif;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,.35);
      }
      #${BTN_ID}:hover { background:#18375f; }

      #${PANEL_ID} {
        position:fixed;
        inset:0;
        z-index:2147483646;
        background:rgba(0,0,0,.72);
        overflow:auto;
        padding:18px;
        font-family:Arial,sans-serif;
        color:#eee;
      }

      #${PANEL_ID} * { box-sizing:border-box; }

      #${PANEL_ID} .mduf-window {
        width:min(1220px,100%);
        margin:0 auto;
        background:#11151c;
        border:1px solid #4d5562;
        border-radius:14px;
        padding:16px;
        box-shadow:0 16px 50px rgba(0,0,0,.55);
      }

      #${PANEL_ID} .mduf-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:14px;
      }

      #${PANEL_ID} .mduf-title {
        font-size:20px;
        font-weight:700;
      }

      #${PANEL_ID} .mduf-close {
        width:36px;
        height:36px;
        border:0;
        border-radius:8px;
        background:#2b313b;
        color:#fff;
        font-size:24px;
        cursor:pointer;
      }

      #${PANEL_ID} .mduf-block {
        border:1px solid #343d49;
        border-radius:10px;
        background:#151a22;
        padding:12px;
        margin-bottom:12px;
      }

      #${PANEL_ID} .mduf-block-title {
        font-weight:700;
        font-size:14px;
        margin-bottom:9px;
      }

      #${PANEL_ID} .mduf-row {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:end;
      }

      #${PANEL_ID} label {
        display:flex;
        flex-direction:column;
        gap:5px;
        color:#aeb6c2;
        font-size:12px;
      }

      #${PANEL_ID} input,
      #${PANEL_ID} select {
        border:1px solid #46505d;
        border-radius:8px;
        padding:8px 9px;
        background:#1d232d;
        color:#fff;
        min-width:110px;
      }

      #${PANEL_ID} .mduf-name { min-width:220px; }

      #${PANEL_ID} .mduf-btn {
        border:1px solid #4a5564;
        border-radius:8px;
        padding:8px 12px;
        background:#202834;
        color:#fff;
        font-weight:700;
        cursor:pointer;
      }

      #${PANEL_ID} .mduf-primary {
        background:#e8edf5;
        color:#111;
        border-color:#e8edf5;
      }

      #${PANEL_ID} .mduf-btn:disabled {
        opacity:.5;
        cursor:wait;
      }

      #${PANEL_ID} .mduf-status {
        white-space:pre-wrap;
        color:#b9c1cc;
        font-size:13px;
      }

      #${PANEL_ID} .mduf-char-summary {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-top:8px;
      }

      #${PANEL_ID} .mduf-chip {
        border:1px solid #3e4855;
        border-radius:999px;
        padding:5px 9px;
        font-size:12px;
        background:#171c24;
      }

      #${PANEL_ID} .mduf-table-wrap {
        overflow:auto;
        border:1px solid #343d49;
        border-radius:9px;
        max-height:52vh;
      }

      #${PANEL_ID} table {
        width:100%;
        border-collapse:collapse;
        font-size:12px;
        min-width:900px;
      }

      #${PANEL_ID} th {
        position:sticky;
        top:0;
        z-index:1;
        background:#222a35;
        padding:8px;
        text-align:left;
        border-bottom:1px solid #46515f;
      }

      #${PANEL_ID} td {
        padding:7px 8px;
        vertical-align:top;
        border-bottom:1px solid #2a323c;
      }

      #${PANEL_ID} tr:hover td { background:#171d25; }

      #${PANEL_ID} .mduf-options {
        line-height:1.4;
        max-width:430px;
      }

      #${PANEL_ID} .mduf-cards {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }

      #${PANEL_ID} .mduf-card {
        border:1px solid #3d4754;
        border-radius:10px;
        padding:10px;
        background:#171d25;
        min-height:140px;
      }

      #${PANEL_ID} .mduf-card h4 {
        margin:0 0 7px;
        font-size:14px;
      }

      #${PANEL_ID} .mduf-candidate {
        border-top:1px solid #313a46;
        padding-top:7px;
        margin-top:7px;
        font-size:12px;
        line-height:1.4;
      }

      #${PANEL_ID} .mduf-copybox {
        width:100%;
        min-height:180px;
        resize:vertical;
        font-family:Consolas,monospace;
        font-size:12px;
      }
@media (max-width:900px) {
        #${PANEL_ID} .mduf-cards {
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function ensureButton() {
    if (!document.body || document.getElementById(BTN_ID)) return;
    const b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.textContent = 'АПГРЕЙДЫ';
    b.addEventListener('click', openPanel);
    document.body.appendChild(b);
  }

  function findDecoderFromReact() {
    const nodes = document.querySelectorAll(
      '[class*="MarketItem_"], [class*="Item_"], [class*="MarketList_"]'
    );

    for (const node of nodes) {
      const key = Object.keys(node).find(k => k.startsWith('__reactFiber$'));
      if (!key) continue;

      let fiber = node[key];

      for (let depth = 0; fiber && depth < 20; depth++, fiber = fiber.return) {
        const item = fiber.memoizedProps?.item;

        if (
          item &&
          item.sourceData &&
          typeof item.constructor === 'function' &&
          typeof item.constructor.prototype?.calcOptions === 'function'
        ) {
          state.ItemClass = item.constructor;
          state.sourceData = item.sourceData;
          return true;
        }
      }
    }

    return false;
  }

  function decodeHex(hex) {
    if (!state.ItemClass || !state.sourceData) {
      throw new Error('Декодер предметов ещё не найден');
    }
    return new state.ItemClass(hex, 0, state.sourceData);
  }

  async function gql(query, variables, operationName) {
    const r = await fetch(GRAPHQL_URL, {
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ operationName, query, variables })
    });

    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);

    const j = await r.json();
    if (j.errors?.length) throw new Error(j.errors.map(x => x.message).join('; '));
    return j;
  }

  async function loadCharacter(name) {
    const j = await gql(GET_CHAR_QUERY, {name}, 'GET_CHAR_BY_NAME');
    const c = j?.data?.characterByName;
    if (!c) throw new Error(`Персонаж "${name}" не найден`);
    return c;
  }

  function normalizeItem(item, extra={}) {
    return {
      ...extra,
      name:item.name || '',
      title:item.title?.text || item.name || '',
      type:item.type || extra.type || 'unknown',
      level:Number(item.level || 0),
      gearScore:Number(item.gearScore || 0),
      baseScore:Number(item.baseScore || 0),
      hasLuck:!!item.hasLuck,
      hasSkill:!!item.hasSkill,
      isExe:!!item.isExe,
      allOptions:(item.allOptions || []).map(o => ({
        id:o.id ?? null,
        type:o.type ?? null,
        name:o.name ?? '',
        fullName:o.fullName ?? o.name ?? '',
        value:Number(o.value ?? 0),
        rank:o.rank ?? null,
        rankIndex:o.rankIndex ?? null,
        code:o.code ?? null,
        optionIndex:o.optionIndex ?? null
      }))
    };
  }

  function renderCharacter(panel) {
    const c = state.character;
    const box = panel.querySelector('.mduf-char-summary');

    if (!c) {
      box.innerHTML = '';
      return;
    }

    box.innerHTML = `
      <span class="mduf-chip"><b>${esc(c.name)}</b></span>
      <span class="mduf-chip">Lvl ${c.level}</span>
      <span class="mduf-chip">${c.resets} RR</span>
      <span class="mduf-chip">STR ${c.strength}</span>
      <span class="mduf-chip">AGI ${c.dexterity}</span>
      <span class="mduf-chip">VIT ${c.vitality}</span>
      <span class="mduf-chip">ENE ${c.energy}</span>
      <span class="mduf-chip">CMD ${c.leadership ?? 0}</span>
      <span class="mduf-chip">class=${c.class}</span>
    `;
  }

  function renderEquipment(panel) {
    const body = panel.querySelector('.mduf-equip-body');
    body.innerHTML = '';

    for (const x of state.equipment) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(SLOT_LABELS[x.slot] || x.slot || '—')}</td>
        <td>${esc(x.title)}</td>
        <td>${esc(TYPE_LABELS[x.type] || x.type)}</td>
        <td>${x.gearScore}</td>
        <td class="mduf-options">${x.allOptions.map(o => esc(o.fullName)).join('<br>') || '—'}</td>
        <td><button class="mduf-btn mduf-find-upgrade" data-pos="${x.pos}">Найти замену</button></td>
      `;
      body.appendChild(tr);
    }

    body.querySelectorAll('.mduf-find-upgrade').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pos = Number(btn.dataset.pos);
        const current = state.equipment.find(x => x.pos === pos);
        if (current) await findUpgrades(panel, current);
      });
    });
  }

  async function loadProfile(panel) {
    const status = panel.querySelector('.mduf-status');
    const name = panel.querySelector('.mduf-name').value.trim();

    if (!name) {
      status.textContent = 'Введи имя персонажа.';
      return;
    }

    status.textContent = 'Ищу декодер предметов на странице рынка…';

    if (!findDecoderFromReact()) {
      status.textContent =
        'Не нашёл декодер. Закрой окно анализатора, дождись появления карточек рынка, затем открой анализатор снова.';
      return;
    }

    try {
      status.textContent = `Загружаю персонажа ${name}…`;
      const c = await loadCharacter(name);
      state.character = c;

      const autoRace = CLASS_TO_RACE[Number(c.class)];
      if (autoRace) {
        state.race = autoRace;
        panel.querySelector('.mduf-race').value = autoRace;
      } else {
        state.race = panel.querySelector('.mduf-race').value;
      }

      state.equipment = (c.Equipment || [])
        .map(eq => {
          try {
            const item = decodeHex(eq.hex);
            return normalizeItem(item, {
              pos:Number(eq.pos),
              slot:eq.slot || '',
              hex:eq.hex
            });
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a,b) => a.pos - b.pos);

      renderCharacter(panel);
      renderEquipment(panel);

      status.textContent =
        `Готово. Персонаж ${c.name} загружен. Раса для рынка: ${state.race}.`;

    } catch (e) {
      console.error('[MuDream Upgrade Finder]', e);
      status.textContent = `Ошибка: ${e.message}`;
    }
  }

  function getBudget(panel) {
    const out = {};
    for (const [code] of CURRENCIES) {
      const v = Number(panel.querySelector(`.mduf-budget-${code}`).value || 0);
      out[code] = Number.isFinite(v) ? Math.max(0, v) : 0;
    }
    return out;
  }

  async function fetchLotsByFilter(filter, status, label='рынок') {
    let offset = 0;
    const limit = 50;
    const all = [];
    let total = null;
    let pages = 0;

    while (true) {
      if (status) {
        status.textContent =
          `Загрузка ${label}: ${all.length}${total !== null ? ' / ' + total : ''}…`;
      }

      const j = await gql(
        GET_LOTS_QUERY,
        {
          filter,
          limit,
          offset,
          sort:{field:'LOT_FIELD_UPDATED_AT',type:'SORT_TYPE_DESC'}
        },
        'GET_ALL_LOTS'
      );

      const block = j?.data?.lots;
      if (!block) throw new Error('Нет data.lots');

      total = block.Pagination?.total ?? total;
      const rows = block.Lots || [];
      all.push(...rows);
      pages++;

      if (!block.Pagination?.nextPageExists || !rows.length) break;
      offset += limit;
    }

    const unique = [...new Map(all.map(x => [x.id, x])).values()];
    return { lots: unique, total, pages, fetched: all.length };
  }

  function decodeMarketLots(rawLots) {
    return (rawLots || []).map(lot => {
      try {
        const item = decodeHex(lot.source);
        if (!item?.isValid || item?.invalid) return null;
        return normalizeItem(item, {
          lotId:lot.id,
          source:lot.source,
          prices:(lot.Prices || []).map(p => ({
            value:Number(p.value || 0),
            code:p.Currency?.code || '',
            title:p.Currency?.title || p.Currency?.code || ''
          }))
        });
      } catch (_) {
        return null;
      }
    }).filter(Boolean);
  }

  async function fetchMarketRace(race, status) {
    if (state.marketCache[race]) return state.marketCache[race];

    const cfg = RACES[race];
    if (!cfg) throw new Error(`Неизвестная раса ${race}`);

    const r = await fetchLotsByFilter(cfg.filter, status, `рынка ${race}`);
    const decoded = decodeMarketLots(r.lots);

    state.marketDiagnostics[race] = {
      serverTotal:r.total,
      fetchedRaw:r.fetched,
      uniqueRaw:r.lots.length,
      decoded:decoded.length,
      pages:r.pages
    };

    state.marketCache[race] = decoded;
    return decoded;
  }

  function optionMap(item) {
    const m = {};
    for (const o of item.allOptions || []) {
      const key = o.code || `${o.type}:${o.name}`;
      if (!(key in m) || Number(o.value) > m[key]) m[key] = Number(o.value || 0);
    }
    return m;
  }

  // Это НЕ формула сервера. Нужна только для отсечения заведомо слабых лотов.
  // Финальную оценку по-прежнему делает ChatGPT.
  function optionUtility(item) {
    const u = {
      ias:0, phys:0, edr:0, addDamage:0, skillDamage:0,
      str:0, agi:0, vit:0, ene:0,
      dd:0, dsr:0, hp:0, sd:0, zen:0, ref:0,
      pvpDamage:0, pvpDefense:0, sdIgnore:0, sdDecrease:0
    };

    for (const o of item.allOptions || []) {
      const n = `${o.name} ${o.fullName}`.toLowerCase();
      const v = Number(o.value || 0);

      if (o.code === 'ias' || n.includes('attack speed')) u.ias = Math.max(u.ias, v);
      else if (o.code === 'di' || n.includes('physical damage increase')) u.phys = Math.max(u.phys, v);
      else if (o.code === 'edr' || n.includes('excellent damage rate')) u.edr = Math.max(u.edr, v);
      else if (n.includes('additional damage') && !n.includes('pvp')) u.addDamage = Math.max(u.addDamage, v);
      else if (n.includes('skill damage')) u.skillDamage = Math.max(u.skillDamage, v);
      else if (n.includes('strength')) u.str += v;
      else if (n.includes('agility')) u.agi += v;
      else if (n.includes('vitality')) u.vit += v;
      else if (n.includes('energy')) u.ene += v;
      else if (n.includes('damage decrease')) u.dd = Math.max(u.dd, v);
      else if (n.includes('defense success rate')) u.dsr = Math.max(u.dsr, v);
      else if (n.includes('maximum life') || n.includes('max life')) u.hp = Math.max(u.hp, v);
      else if (n.includes('maximum sd') || n.includes('max sd')) u.sd = Math.max(u.sd, v);
      else if (n.includes('zen drop')) u.zen = Math.max(u.zen, v);
      else if (n.includes('reflect')) u.ref = Math.max(u.ref, v);
      else if (n.includes('additional damage (pvp)') || n.includes('pvp damage')) u.pvpDamage = Math.max(u.pvpDamage, v);
      else if (n.includes('defense rate (pvp)') || n.includes('pvp defense')) u.pvpDefense = Math.max(u.pvpDefense, v);
      else if (n.includes('sd ignore')) u.sdIgnore = Math.max(u.sdIgnore, v);
      else if (n.includes('sd decrease')) u.sdDecrease = Math.max(u.sdDecrease, v);
    }
    return u;
  }

  function roughScore(item) {
    const u = optionUtility(item);
    const profile = PROFILES[state.profile] || PROFILES.pvm;
    const w = profile.weights;
    let s = Number(item.gearScore || 0) * w.gs;

    s += u.ias * w.ias;
    s += u.phys * w.phys;
    s += u.edr * w.edr;
    s += u.addDamage * w.addDamage;
    s += u.skillDamage * w.skillDamage;

    s += u.str * w.str;
    s += u.agi * w.agi;
    s += u.vit * w.vit;
    s += u.ene * w.ene;

    s += u.dd * w.dd;
    s += u.dsr * w.dsr;
    s += u.hp * w.hp;
    s += u.sd * w.sd;
    s += u.zen * w.zen;
    s += u.ref * w.ref;
    s += u.pvpDamage * w.pvpDamage;
    s += u.pvpDefense * w.pvpDefense;
    s += u.sdIgnore * w.sdIgnore;
    s += u.sdDecrease * w.sdDecrease;

    if (item.hasLuck) s += state.profile === 'pvp' ? 10 : 8;
    return s;
  }

  function isMeaningfulUpgrade(current, candidate) {
    const gsCur = Number(current.gearScore || 0);
    const gsNew = Number(candidate.gearScore || 0);
    if (gsNew < gsCur - 8) return false;

    const cu = optionUtility(current);
    const nu = optionUtility(candidate);
    const profile = state.profile;

    let meaningful = false;

    if (profile === 'pvp') {
      meaningful =
        nu.ias > cu.ias ||
        nu.phys > cu.phys ||
        nu.edr > cu.edr ||
        nu.dd > cu.dd ||
        nu.hp > cu.hp ||
        nu.sd > cu.sd ||
        nu.ref > cu.ref ||
        nu.pvpDamage > cu.pvpDamage ||
        nu.pvpDefense > cu.pvpDefense ||
        nu.sdIgnore > cu.sdIgnore ||
        nu.sdDecrease > cu.sdDecrease ||
        nu.vit > cu.vit + 60 ||
        nu.agi > cu.agi + 60;
    } else if (profile === 'zen') {
      meaningful =
        nu.zen > cu.zen ||
        nu.ias > cu.ias ||
        nu.phys > cu.phys ||
        nu.dd > cu.dd ||
        nu.dsr > cu.dsr + 5 ||
        nu.agi > cu.agi + 60 ||
        nu.ene > cu.ene + 60 ||
        nu.str > cu.str + 60;
    } else if (profile === 'hybrid') {
      meaningful =
        nu.ias > cu.ias ||
        nu.phys > cu.phys ||
        nu.edr > cu.edr ||
        nu.dd > cu.dd ||
        nu.dsr > cu.dsr + 5 ||
        nu.hp > cu.hp ||
        nu.sd > cu.sd ||
        nu.ref > cu.ref ||
        nu.zen > cu.zen ||
        nu.agi > cu.agi + 60 ||
        nu.str > cu.str + 60 ||
        nu.ene > cu.ene + 60 ||
        nu.vit > cu.vit + 70;
    } else {
      meaningful =
        nu.ias > cu.ias ||
        nu.phys > cu.phys ||
        nu.edr > cu.edr ||
        nu.addDamage > cu.addDamage + 40 ||
        nu.skillDamage > cu.skillDamage + 20 ||
        nu.str > cu.str + 60 ||
        nu.agi > cu.agi + 60 ||
        nu.ene > cu.ene + 60 ||
        nu.vit > cu.vit + 80 ||
        nu.dd > cu.dd ||
        nu.dsr > cu.dsr + 5 ||
        nu.hp > cu.hp ||
        nu.zen > cu.zen;
    }

    if (!meaningful) return false;

    const gain = roughScore(candidate) - roughScore(current);
    return gain >= 12;
  }

  function compoundPriceStatus(item, budget) {
    const required = {};
    for (const p of item.prices || []) {
      if (p.code in budget) required[p.code] = Number(p.value || 0);
    }

    const parts = Object.entries(required);
    if (!parts.length) return null;

    const deficits = {};
    let missingKinds = 0;
    let missingTotal = 0;
    let relativeDeficit = 0;

    for (const [code, need] of parts) {
      const have = Number(budget[code] || 0);
      const miss = Math.max(0, need - have);
      deficits[code] = miss;
      if (miss > 0) {
        missingKinds++;
        missingTotal += miss;
        relativeDeficit += miss / Math.max(need, 1);
      }
    }

    const affordable = missingKinds === 0;
    const stretch = !affordable && missingKinds <= 3 && relativeDeficit <= 1.0;

    return { required, deficits, affordable, stretch, missingKinds, missingTotal, relativeDeficit };
  }

  function formatCompoundPrice(item) {
    const byCode = Object.fromEntries((item.prices || []).map(p => [p.code, p]));
    return CURRENCIES
      .filter(([code]) => byCode[code])
      .map(([code, title]) => `${byCode[code].value} ${title}`)
      .join(' + ') || '—';
  }

  function formatDeficit(priceStatus) {
    if (!priceStatus) return '—';
    const rows = CURRENCIES
      .filter(([code]) => Number(priceStatus.deficits?.[code] || 0) > 0)
      .map(([code, title]) => `${priceStatus.deficits[code]} ${title}`);
    return rows.length ? rows.join(' + ') : 'ничего';
  }

  function canAffordCompound(item, budget) {
    const ps = compoundPriceStatus(item, budget);
    return !!ps?.affordable;
  }

  function spendCompound(item, budget) {
    const next = {...budget};
    for (const p of item.prices || []) {
      if (p.code in next) next[p.code] = Math.max(0, Number(next[p.code] || 0) - Number(p.value || 0));
    }
    return next;
  }

  function basketCost(item) {
    return (item.prices || []).reduce((sum, p) => sum + Number(p.value || 0), 0);
  }

  function sameCandidateType(current, candidate) {
    // Пока сравниваем в первую очередь тот же реальный тип предмета.
    // Для слота "shield" у MG это может быть второй меч — декодированный type всё решит.
    return candidate.type === current.type;
  }

  function shortlist(current, candidates, budget) {
    const curScore = roughScore(current);

    const rows = candidates
      .filter(x => sameCandidateType(current, x))
      .filter(x => x.lotId)
      .filter(x => isMeaningfulUpgrade(current, x))
      .map(x => {
        const score = roughScore(x);
        const gain = score - curScore;
        const price = compoundPriceStatus(x, budget);
        const totalRequired = price
          ? Object.values(price.required).reduce((a,b) => a + Number(b || 0), 0)
          : Infinity;

        return {
          ...x,
          _score:score,
          _gain:gain,
          _price:price,
          _value:price ? gain / Math.max(totalRequired, 1) : -Infinity
        };
      })
      .filter(x => x._gain > 0);

    const affordable = rows
      .filter(x => x._price?.affordable)
      .sort((a,b) => b._gain - a._gain);

    const value = rows
      .filter(x => x._price?.affordable)
      .sort((a,b) => b._value - a._value);

    const stretch = rows
      .filter(x => x._price?.stretch)
      .sort((a,b) => b._gain - a._gain);

    return {
      affordable:affordable.slice(0,5),
      value:value.slice(0,5),
      stretch:stretch.slice(0,5)
    };
  }

  function candidateHtml(x) {
    if (!x) return '<div class="mduf-candidate">Нет кандидата.</div>';

    const price = formatCompoundPrice(x);
    const deficit = x._price?.affordable
      ? 'хватает'
      : `не хватает: ${formatDeficit(x._price)}`;

    return `
      <div class="mduf-candidate">
        <b>${esc(x.title)}</b><br>
        GS ${x.gearScore} · черновой прирост ${x._gain.toFixed(1)}<br>
        ${x.allOptions.map(o => esc(o.fullName)).join('<br>')}<br>
        <b>Цена:</b> ${esc(price)}<br>
        <b>Бюджет:</b> ${esc(deficit)}<br>
        <button class="mduf-btn mduf-buy" type="button" data-lot="${esc(x.lotId)}">Купить</button>
      </div>
    `;
  }

  function renderShortlist(panel, current, groups) {
    state.selectedItem = current;
    state.selectedCandidates = [
      ...groups.affordable,
      ...groups.value,
      ...groups.stretch
    ];

    panel.querySelector('.mduf-selected-title').textContent =
      `Текущий предмет: ${current.title}`;

    panel.querySelector('.mduf-now').innerHTML =
      groups.affordable.length ? candidateHtml(groups.affordable[0]) : candidateHtml(null);

    panel.querySelector('.mduf-value').innerHTML =
      groups.value.length ? candidateHtml(groups.value[0]) : candidateHtml(null);

    panel.querySelector('.mduf-stretch').innerHTML =
      groups.stretch.length ? candidateHtml(groups.stretch[0]) : candidateHtml(null);

    panel.querySelector('.mduf-copy').disabled = false;

    panel.querySelectorAll('.mduf-buy').forEach(btn => {
      btn.addEventListener('click', () => requestNativeBuy(panel, btn.dataset.lot));
    });
  }

  async function findUpgrades(panel, current) {
    const status = panel.querySelector('.mduf-status');
    const race = panel.querySelector('.mduf-race').value;
    state.race = race;
    state.profile = panel.querySelector('.mduf-profile').value;

    try {
      const market = await fetchMarketRace(race, status);
      const budget = getBudget(panel);
      const groups = shortlist(current, market, budget);

      renderShortlist(panel, current, groups);

      status.textContent =
        `Рынок ${race} просканирован. Найдены предварительные кандидаты для "${current.title}".\n` +
        `Важно: рейтинг сейчас только для первичного отсева, не финальная формула DPS.`;

    } catch (e) {
      console.error('[MuDream Upgrade Finder]', e);
      status.textContent = `Ошибка поиска: ${e.message}`;
    }
  }

  function topUpgradeForCurrent(current, market, budget) {
    const curScore = roughScore(current);
    return market
      .filter(x => sameCandidateType(current, x))
      .filter(x => isMeaningfulUpgrade(current, x))
      .map(x => {
        const gain = roughScore(x) - curScore;
        const ps = compoundPriceStatus(x, budget);
        return {
          ...x,
          _current: current,
          _gain: gain,
          _price: ps,
          _basketCost: basketCost(x),
          _value: gain / Math.max(basketCost(x), 1)
        };
      })
      .filter(x => x._gain > 0);
  }

  async function findBestCharacterUpgrades(panel) {
    const status = panel.querySelector('.mduf-status');
    if (!state.character || !state.equipment.length) {
      status.textContent = 'Сначала загрузи персонажа.';
      return;
    }

    const race = panel.querySelector('.mduf-race').value;
    state.race = race;
    state.profile = panel.querySelector('.mduf-profile').value;
    const budget = getBudget(panel);

    try {
      const market = await fetchMarketRace(race, status);
      let all = [];

      for (const current of state.equipment) {
        all.push(...topUpgradeForCurrent(current, market, budget));
      }

      const affordable = all
        .filter(x => x._price?.affordable)
        .sort((a,b) => b._gain - a._gain);

      const value = all
        .filter(x => x._price?.affordable)
        .sort((a,b) => b._value - a._value);

      const stretch = all
        .filter(x => x._price?.stretch)
        .sort((a,b) => b._gain - a._gain);

      // Greedy shopping plan: value first, without buying two replacements for same slot.
      let remaining = {...budget};
      const usedPos = new Set();
      const plan = [];

      for (const cand of value) {
        const pos = cand._current?.pos;
        if (usedPos.has(pos)) continue;
        if (!canAffordCompound(cand, remaining)) continue;
        plan.push(cand);
        usedPos.add(pos);
        remaining = spendCompound(cand, remaining);
        if (plan.length >= 5) break;
      }

      state.characterUpgradeCandidates = [
        ...affordable.slice(0,5),
        ...value.slice(0,5),
        ...stretch.slice(0,5),
        ...plan
      ];

      const target = panel.querySelector('.mduf-character-best');
      target.innerHTML = `
        <div class="mduf-block-title">Лучшие апгрейды персонажа</div>
        <div class="mduf-cards">
          <div class="mduf-card">
            <h4>Самый сильный в бюджет</h4>
            ${affordable[0] ? globalCandidateHtml(affordable[0]) : 'Нет кандидата.'}
          </div>
          <div class="mduf-card">
            <h4>Лучший цена / качество</h4>
            ${value[0] ? globalCandidateHtml(value[0]) : 'Нет кандидата.'}
          </div>
          <div class="mduf-card">
            <h4>Стоит добрать валюту</h4>
            ${stretch[0] ? globalCandidateHtml(stretch[0]) : 'Нет кандидата.'}
          </div>
        </div>
        <div style="margin-top:10px">
          <b>Черновой план покупок в текущий бюджет:</b>
          ${plan.length
            ? plan.map((x,i) => `<div class="mduf-candidate">${i+1}. ${globalCandidateHtml(x)}</div>`).join('')
            : '<div class="mduf-candidate">Нет набора апгрейдов, проходящего по бюджету.</div>'}
        </div>
      `;

      target.querySelectorAll('.mduf-buy').forEach(btn => {
        btn.addEventListener('click', () => requestNativeBuy(panel, btn.dataset.lot));
      });

      const d = state.marketDiagnostics[race] || {};
      status.textContent =
        `Готово. Просмотрено ${state.equipment.length} слотов.
` +
        `Рынок ${race}: сервер сообщил ${d.serverTotal ?? '?'} лотов; ` +
        `получено ${d.fetchedRaw ?? '?'}; уникальных ${d.uniqueRaw ?? '?'}; ` +
        `декодировано ${d.decoded ?? market.length}; страниц ${d.pages ?? '?'}.
` +
        `Профиль оценки: ${PROFILES[state.profile]?.label || state.profile}.`;

    } catch (e) {
      console.error('[MuDream Upgrade Finder]', e);
      status.textContent = `Ошибка общего поиска: ${e.message}`;
    }
  }

  function globalCandidateHtml(x) {
    const deficit = x._price?.affordable
      ? 'хватает'
      : `не хватает: ${formatDeficit(x._price)}`;

    return `
      <b>${esc(SLOT_LABELS[x._current?.slot] || x._current?.slot || x.type)}</b><br>
      ${esc(x.title)}<br>
      GS ${x.gearScore} · черновой прирост ${x._gain.toFixed(1)}<br>
      ${x.allOptions.map(o => esc(o.fullName)).join('<br>')}<br>
      <b>Цена:</b> ${esc(formatCompoundPrice(x))}<br>
      <b>Бюджет:</b> ${esc(deficit)}<br>
      <button class="mduf-btn mduf-buy" type="button" data-lot="${esc(x.lotId)}">Купить</button>
    `;
  }

  function requestNativeBuy(panel, lotId) {
    panel.querySelector('.mduf-status').textContent =
      `Лот ${lotId}: кнопка покупки подготовлена, но безопасная покупка ещё не подключена. ` +
      `Нужен GraphQL mutation, который сайт отправляет после подтверждения покупки.`;
  }

  function getItemClassKeys(item) {
    const c = item?.itemClass || {};
    return Object.entries(c).filter(([,v]) => !!v).map(([k]) => k);
  }

  function optionSignature(item) {
    const map = new Map();
    for (const o of item.allOptions || []) {
      const key = o.code || `${o.type}:${o.name}`;
      const prev = map.get(key);
      if (!prev || Number(o.value || 0) > Number(prev.value || 0)) map.set(key, o);
    }
    return map;
  }

  function similarityScore(target, cand) {
    let score = 0;

    if (cand.name === target.name) score += 55;
    else if (cand.type === target.type) score += 16;
    else return -Infinity;

    const gsDiff = Math.abs(Number(cand.gearScore || 0) - Number(target.gearScore || 0));
    score += Math.max(0, 18 - gsDiff * 0.35);

    const lvlDiff = Math.abs(Number(cand.level || 0) - Number(target.level || 0));
    score += Math.max(0, 8 - lvlDiff * 1.5);

    if (!!cand.hasLuck === !!target.hasLuck) score += 5;
    if (!!cand.hasSkill === !!target.hasSkill) score += 3;
    if (!!cand.isExe === !!target.isExe) score += 3;

    const ta = optionSignature(target);
    const ca = optionSignature(cand);

    for (const [key, to] of ta) {
      const co = ca.get(key);
      if (!co) continue;

      score += 7;
      const tv = Math.max(1, Math.abs(Number(to.value || 0)));
      const cv = Number(co.value || 0);
      const closeness = Math.max(0, 1 - Math.abs(cv - Number(to.value || 0)) / tv);
      score += closeness * 5;

      if (to.rank && co.rank && to.rank === co.rank) score += 2;
    }

    const tc = getItemClassKeys(target);
    const cc = getItemClassKeys(cand);
    if (tc.some(x => cc.includes(x))) score += 4;

    return score;
  }

  function priceVector(item) {
    const out = {};
    for (const [code] of CURRENCIES) out[code] = 0;
    for (const p of item.prices || []) {
      if (p.code in out) out[p.code] = Number(p.value || 0);
    }
    return out;
  }

  function median(nums) {
    const a = nums.filter(Number.isFinite).sort((x,y) => x-y);
    if (!a.length) return 0;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  }

  function quantile(nums, q) {
    const a = nums.filter(Number.isFinite).sort((x,y) => x-y);
    if (!a.length) return 0;
    const pos = (a.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return a[lo];
    return a[lo] + (a[hi] - a[lo]) * (pos - lo);
  }

  function syntheticBasket(items, q) {
    const out = {};
    for (const [code] of CURRENCIES) {
      const vals = items.map(x => priceVector(x)[code]);
      out[code] = Math.max(0, Math.round(quantile(vals, q)));
    }
    return out;
  }

  function basketText(basket) {
    return CURRENCIES
      .filter(([code]) => Number(basket?.[code] || 0) > 0)
      .map(([code,title]) => `${basket[code]} ${title}`)
      .join(' + ') || '—';
  }

  function normalizedBasketCost(item, medians) {
    const v = priceVector(item);
    let score = 0;
    let used = 0;
    for (const [code] of CURRENCIES) {
      const m = Number(medians[code] || 0);
      if (m > 0) {
        score += Number(v[code] || 0) / m;
        used++;
      } else if (Number(v[code] || 0) > 0) {
        score += 1;
        used++;
      }
    }
    return used ? score / used : Infinity;
  }

  function confidenceLabel(exactCount, nearCount, spread) {
    if (exactCount >= 12 && spread < 0.65) return 'высокая';
    if (exactCount >= 6 || nearCount >= 15) return 'средняя';
    return 'низкая';
  }

  function liquidityLabel(analogs, spread) {
    if (analogs >= 15 && spread < 0.55) return 'высокая';
    if (analogs >= 7 && spread < 1.1) return 'средняя';
    return 'низкая';
  }

  function appraiseFromCandidates(target, exact, competitive) {
    const rankedExact = exact
      .map(x => ({...x, _sim: similarityScore(target, x)}))
      .filter(x => Number.isFinite(x._sim))
      .sort((a,b) => b._sim - a._sim);

    const rankedComp = competitive
      .map(x => ({...x, _sim: similarityScore(target, x)}))
      .filter(x => Number.isFinite(x._sim))
      .sort((a,b) => b._sim - a._sim);

    const core = rankedExact.slice(0, 30);
    if (core.length < 8) {
      for (const x of rankedComp) {
        if (core.length >= 20) break;
        if (core.some(y => y.lotId === x.lotId)) continue;
        core.push(x);
      }
    }

    if (!core.length) {
      return {
        quick:null, market:null, high:null,
        exactCount:0, nearCount:0,
        confidence:'низкая', liquidity:'низкая',
        core:[], spread:Infinity
      };
    }

    const med = {};
    for (const [code] of CURRENCIES) {
      med[code] = median(core.map(x => priceVector(x)[code]));
    }

    const scalar = core.map(x => normalizedBasketCost(x, med)).filter(Number.isFinite);
    const q25 = quantile(scalar, 0.25);
    const q75 = quantile(scalar, 0.75);
    const medScalar = median(scalar);
    const spread = medScalar > 0 ? (q75 - q25) / medScalar : 999;

    return {
      quick:syntheticBasket(core, 0.25),
      market:syntheticBasket(core, 0.50),
      high:syntheticBasket(core, 0.75),
      exactCount:rankedExact.length,
      nearCount:rankedComp.length,
      confidence:confidenceLabel(rankedExact.length, rankedComp.length, spread),
      liquidity:liquidityLabel(core.length, spread),
      core:core.slice(0, 12),
      spread
    };
  }

  async function estimateItem(panel) {
    const status = panel.querySelector('.mduf-status');
    const target = state.appraiseItem;
    if (!target) {
      status.textContent = 'Сначала захвати предмет для оценки.';
      return;
    }

    if (!state.ItemClass || !state.sourceData) {
      if (!findDecoderFromReact()) {
        status.textContent = 'Не найден декодер предметов. Наведи мышь на любой предмет MuDream и попробуй снова.';
        return;
      }
    }

    try {
      status.textContent = `Ищу аналоги ${target.title}…`;

      const exactR = await fetchLotsByFilter(
        { name:target.name, type:[target.type] },
        status,
        `точных аналогов "${target.name}"`
      );
      const exactDecoded = decodeMarketLots(exactR.lots)
        .filter(x => x.source !== target.source);

      let raceKey = null;
      const classes = getItemClassKeys(target);
      if (classes.includes('MG')) raceKey = 'MG';
      else if (classes.includes('DL')) raceKey = 'DL';
      else if (classes.includes('ELF')) raceKey = 'EE';

      let compDecoded = [];
      if (raceKey && RACES[raceKey]) {
        const compR = await fetchLotsByFilter(
          {...RACES[raceKey].filter, type:[target.type]},
          status,
          `конкурентов ${raceKey}/${target.type}`
        );
        compDecoded = decodeMarketLots(compR.lots)
          .filter(x => x.source !== target.source);
      } else {
        const compR = await fetchLotsByFilter(
          { type:[target.type] },
          status,
          `конкурентов типа ${target.type}`
        );
        compDecoded = decodeMarketLots(compR.lots)
          .filter(x => x.source !== target.source);
      }

      const result = appraiseFromCandidates(target, exactDecoded, compDecoded);
      state.appraiseResults = result;
      renderAppraisal(panel, target, result);

      status.textContent =
        `Оценка готова. Точных аналогов: ${result.exactCount}; ` +
        `конкурентов того же типа: ${result.nearCount}; ` +
        `уверенность: ${result.confidence}.`;

    } catch (e) {
      console.error('[MuDream Appraiser]', e);
      status.textContent = `Ошибка оценки: ${e.message}`;
    }
  }

  function renderAppraisal(panel, target, result) {
    const box = panel.querySelector('.mduf-appraise-result');

    const analogs = result.core.map((x,i) => `
      <div class="mduf-candidate">
        ${i+1}. <b>${esc(x.title)}</b> · GS ${x.gearScore} · сходство ${x._sim.toFixed(1)}<br>
        ${x.allOptions.map(o => esc(o.fullName)).join('<br>')}<br>
        <b>Цена:</b> ${esc(formatCompoundPrice(x))}
      </div>
    `).join('');

    box.innerHTML = `
      <div class="mduf-block-title">Оценка: ${esc(target.title)}</div>
      <div class="mduf-char-summary">
        <span class="mduf-chip">GS ${target.gearScore}</span>
        <span class="mduf-chip">Точных аналогов: ${result.exactCount}</span>
        <span class="mduf-chip">Ближних конкурентов: ${result.nearCount}</span>
        <span class="mduf-chip">Уверенность: <b>${result.confidence}</b></span>
        <span class="mduf-chip">Ликвидность: <b>${result.liquidity}</b></span>
      </div>

      <div class="mduf-cards" style="margin-top:10px">
        <div class="mduf-card">
          <h4>⚡ Быстрая продажа</h4>
          <b>${esc(basketText(result.quick || {}))}</b>
        </div>
        <div class="mduf-card">
          <h4>💰 Рыночная цена</h4>
          <b>${esc(basketText(result.market || {}))}</b>
        </div>
        <div class="mduf-card">
          <h4>🎣 Верх рынка</h4>
          <b>${esc(basketText(result.high || {}))}</b>
        </div>
      </div>

      <div style="margin-top:10px">
        <b>Похожие лоты, на которых основана оценка:</b>
        ${analogs || '<div class="mduf-candidate">Нет достаточных аналогов.</div>'}
      </div>
    `;
  }


  function extractItemFromTooltipNode(node) {
    let el = node;

    for (let hop = 0; el && hop < 8; hop++, el = el.parentElement) {
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
      if (!fiberKey) continue;

      let fiber = el[fiberKey];

      for (let depth = 0; fiber && depth < 18; depth++, fiber = fiber.return) {
        const item = fiber.memoizedProps?.item;

        if (
          item &&
          item.sourceData &&
          typeof item.constructor === 'function' &&
          typeof item.constructor.prototype?.calcOptions === 'function'
        ) {
          return item;
        }
      }
    }

    return null;
  }

  function openTraderPanelForAppraisal(item) {
    state.ItemClass = item.constructor;
    state.sourceData = item.sourceData;
    state.appraiseItem = normalizeItem(item, {
      source:item.hex || item.source || ''
    });

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      openPanel();
      panel = document.getElementById(PANEL_ID);
    }

    const picked = panel?.querySelector('.mduf-appraise-picked');
    if (picked) {
      picked.innerHTML = `
        <b>${esc(state.appraiseItem.title)}</b><br>
        Тип: ${esc(state.appraiseItem.type)} · GS ${state.appraiseItem.gearScore}<br>
        ${state.appraiseItem.allOptions.map(o => esc(o.fullName)).join('<br>') || 'Без дополнительных опций'}
      `;
    }

    const status = panel?.querySelector('.mduf-status');
    if (status) {
      status.textContent = `Предмет выбран: ${state.appraiseItem.title}. Запускаю оценку по рынку…`;
    }

    // Сразу запускаем оценку: одна кнопка в tooltip = весь процесс.
    estimateItem(panel);
  }


  function findVisibleItemTooltip() {
    const nodes = [...document.querySelectorAll(
      '[class*="Item_tooltip-content"], [class*="HoverTooltip_tooltip"]'
    )];

    // Prefer the actual item-content node and the last visible tooltip in DOM.
    return nodes.reverse().find(el => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 &&
             st.display !== 'none' && st.visibility !== 'hidden';
    }) || null;
  }

  function appraiseVisibleTooltip() {
    const tooltip = findVisibleItemTooltip();
    if (!tooltip) return false;

    const item = extractItemFromTooltipNode(tooltip);
    if (!item) return false;

    openTraderPanelForAppraisal(item);
    return true;
  }

  function installAppraiseHotkey() {
    document.addEventListener('keydown', e => {
      // Ctrl+D normally opens browser bookmarks, so intercept it only when
      // a MuDream item tooltip is actually visible.
      if (!(e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyD')) return;

      const tooltip = findVisibleItemTooltip();
      if (!tooltip) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const item = extractItemFromTooltipNode(tooltip);
      if (!item) {
        console.warn('[MuDream Appraiser] Tooltip найден, но Item из React не извлечён');
        return;
      }

      openTraderPanelForAppraisal(item);
    }, true);
  }

  function buildChatGPTText(panel) {
    const c = state.character;
    const cur = state.selectedItem;
    const budget = getBudget(panel);

    if (!c || !cur) return 'Сначала загрузи персонажа и выбери слот для поиска замены.';

    const uniq = [...new Map(state.selectedCandidates.map(x => [x.lotId,x])).values()]
      .slice(0,12);

    const lines = [];

    lines.push('MuDream x20 — запрос на подбор апгрейда');
    lines.push(`Персонаж: ${c.name}`);
    lines.push(`Раса: ${state.race}`);
    lines.push(`Профиль подбора: ${PROFILES[state.profile]?.label || state.profile}`);
    lines.push(`Level/Reset: ${c.level} / ${c.resets}`);
    lines.push(`Статы: STR ${c.strength}, AGI ${c.dexterity}, VIT ${c.vitality}, ENE ${c.energy}, CMD ${c.leadership ?? 0}`);
    lines.push('');
    lines.push('Бюджет:');
    for (const [code,title] of CURRENCIES) {
      lines.push(`- ${title}: ${budget[code] || 0}`);
    }
    lines.push('');
    lines.push(`Текущий предмет: ${cur.title}`);
    lines.push(`Тип: ${cur.type}, GS: ${cur.gearScore}`);
    for (const o of cur.allOptions) lines.push(`- ${o.fullName}`);
    lines.push('');
    lines.push('Кандидаты рынка (предварительный shortlist):');

    uniq.forEach((x,i) => {
      lines.push('');
      lines.push(`${i+1}. ${x.title}`);
      lines.push(`Lot ID: ${x.lotId}`);
      lines.push(`Тип: ${x.type}, GS: ${x.gearScore}`);
      for (const o of x.allOptions) lines.push(`- ${o.fullName}`);
      lines.push(`Цена (все компоненты одновременно): ${formatCompoundPrice(x)}`);
    });

    if (state.characterUpgradeCandidates.length) {
      lines.push('');
      lines.push('Лучшие кандидаты по всему персонажу:');
      const globalUniq = [...new Map(state.characterUpgradeCandidates.map(x => [x.lotId,x])).values()].slice(0,12);
      globalUniq.forEach((x,i) => {
        lines.push('');
        lines.push(`${i+1}. Слот: ${SLOT_LABELS[x._current?.slot] || x._current?.slot || x.type}`);
        lines.push(`${x.title}`);
        lines.push(`Lot ID: ${x.lotId}`);
        for (const o of x.allOptions) lines.push(`- ${o.fullName}`);
        lines.push(`Цена (все компоненты одновременно): ${formatCompoundPrice(x)}`);
      });
    }

    lines.push('');
    lines.push('Нужно выбрать:');
    lines.push('1) лучшую замену в мой текущий бюджет;');
    lines.push('2) лучший вариант цена/качество;');
    lines.push('3) вариант немного выше бюджета, ради которого реально стоит добрать валюту.');
    lines.push('Черновой рейтинг скрипта не считать финальным DPS — оцени предметы самостоятельно.');

    return lines.join('\n');
  }

  async function copyForChatGPT(panel) {
    const text = buildChatGPTText(panel);
    const ta = panel.querySelector('.mduf-copybox');
    ta.value = text;

    try {
      await navigator.clipboard.writeText(text);
      panel.querySelector('.mduf-status').textContent =
        'Запрос для ChatGPT скопирован в буфер. Просто вставь его в чат.';
    } catch (_) {
      panel.querySelector('.mduf-status').textContent =
        'Текст сформирован ниже. Выдели его и скопируй вручную.';
    }
  }

  function esc(s) {
    return String(s ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;');
  }

  function openPanel() {
    document.getElementById(PANEL_ID)?.remove();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const budgetFields = CURRENCIES.map(([code,title]) => `
      <label>${title}
        <input class="mduf-budget-${code}" type="number" min="0" value="0" aria-label="${title}">
      </label>
    `).join('');

    panel.innerHTML = `
      <div class="mduf-window">
        <div class="mduf-head">
          <div class="mduf-title">MuDream Trader v0.4 hotkey</div>
          <button class="mduf-close" type="button">×</button>
        </div>

        <div class="mduf-block">
          <div class="mduf-block-title">1. Персонаж</div>
          <div class="mduf-row">
            <label>Имя персонажа
              <input class="mduf-name" placeholder="например DRDN">
            </label>

            <label>Раса рынка
              <select class="mduf-race">
                <option value="MG">MG</option>
                <option value="DL">DL</option>
                <option value="EE">EE</option>
              </select>
            </label>

            <label>Профиль
              <select class="mduf-profile">
                <option value="pvm">PvM</option>
                <option value="pvp">PvP</option>
                <option value="hybrid">Универсал</option>
                <option value="zen">Фарм Zen</option>
              </select>
            </label>

            <button class="mduf-btn mduf-primary mduf-load" type="button">Загрузить персонажа</button>
          </div>

          <div class="mduf-char-summary"></div>
        </div>

        <div class="mduf-block">
          <div class="mduf-block-title">2. Сколько камней у меня есть</div>
          <div class="mduf-row">
            ${budgetFields}
          </div>
        </div>

        <div class="mduf-block">
          <div class="mduf-row">
            <button class="mduf-btn mduf-primary mduf-best-character" type="button">Лучшие апгрейды персонажа</button>
            <button class="mduf-btn mduf-refresh-market" type="button">Обновить рынок</button>
          </div>
        </div>

        <div class="mduf-block mduf-character-best"></div>

        <div class="mduf-block">
          <div class="mduf-block-title">3. Экипировка персонажа</div>
          <div class="mduf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Слот</th>
                  <th>Предмет</th>
                  <th>Тип</th>
                  <th>GS</th>
                  <th>Опции</th>
                  <th></th>
                </tr>
              </thead>
              <tbody class="mduf-equip-body"></tbody>
            </table>
          </div>
        </div>

        <div class="mduf-block">
          <div class="mduf-block-title mduf-selected-title">4. Кандидаты</div>

          <div class="mduf-cards">
            <div class="mduf-card">
              <h4>Купить сейчас</h4>
              <div class="mduf-now">Выбери предмет.</div>
            </div>

            <div class="mduf-card">
              <h4>Цена / качество</h4>
              <div class="mduf-value">Выбери предмет.</div>
            </div>

            <div class="mduf-card">
              <h4>Стоит добрать валюту</h4>
              <div class="mduf-stretch">Выбери предмет.</div>
            </div>
          </div>
        </div>

        <div class="mduf-block">
          <div class="mduf-block-title">Оценщик вещи</div>
          <div class="mduf-row">
            <button class="mduf-btn mduf-primary mduf-appraise-run" type="button">Повторить оценку выбранного предмета</button>
          </div>
          <div class="mduf-candidate mduf-appraise-picked" style="margin-top:10px">
            Наведи курсор на предмет, чтобы был открыт tooltip, и нажми <b>Ctrl+D</b>. 
            Горячая клавиша перехватывается только при открытом tooltip предмета.
          </div>
          <div class="mduf-appraise-result" style="margin-top:10px"></div>
        </div>

        <div class="mduf-block">
          <div class="mduf-block-title">5. Передать мне в ChatGPT</div>
          <button class="mduf-btn mduf-copy" type="button" disabled>Скопировать запрос для ChatGPT</button>
          <textarea class="mduf-copybox" placeholder="Здесь появится компактный запрос…"></textarea>
        </div>

        <div class="mduf-block">
          <div class="mduf-status">
            Введи имя персонажа и нажми «Загрузить персонажа».
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('.mduf-close').addEventListener('click', () => panel.remove());
    panel.querySelector('.mduf-profile').addEventListener('change', e => {
      state.profile = e.target.value;
      panel.querySelector('.mduf-status').textContent =
        `Профиль переключён на ${PROFILES[state.profile]?.label || state.profile}. ` +
        `Нажми поиск снова, чтобы пересчитать кандидатов.`;
    });

    panel.querySelector('.mduf-load').addEventListener('click', () => loadProfile(panel));
    panel.querySelector('.mduf-best-character').addEventListener('click', () => findBestCharacterUpgrades(panel));
    panel.querySelector('.mduf-appraise-run').addEventListener('click', () => estimateItem(panel));
    panel.querySelector('.mduf-refresh-market').addEventListener('click', () => {
      const race = panel.querySelector('.mduf-race').value;
      delete state.marketCache[race];
      delete state.marketDiagnostics[race];
      panel.querySelector('.mduf-status').textContent = `Кэш рынка ${race} очищен. Следующий поиск загрузит рынок заново.`;
    });
    panel.querySelector('.mduf-copy').addEventListener('click', () => copyForChatGPT(panel));
  }

  function init() {
    addStyles();
    ensureButton();
    installAppraiseHotkey();
    setInterval(ensureButton, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
