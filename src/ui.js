// src/ui.js
(() => {
  // ============================
  // 依存（ここが死ぬと全滅する）
  // ============================
  const MS = window.MushiState;
  const Core = window.MushiCore;

  if(!MS || !Core){
    document.body.innerHTML = `
      <div style="padding:16px;font-family:sans-serif">
        <h2>起動エラー</h2>
        <p>MushiState または MushiCore が読み込めてない。</p>
        <p>index.html の script 読み込み順を確認してね。</p>
      </div>
    `;
    return;
  }

  // 使う関数（キミの既存APIに寄せる）
  const setRoute    = MS.setRoute;
  const setSelected = MS.setSelected;
  const save        = MS.save;
  const hardReset   = MS.hardReset;
  const notify      = MS.notify;

  const { SPECIES, TRAITS, expToNext, getSelected } = Core;

  // タブ
  const TABS = [
    { id:"home",  label:"🏠\nHOME" },
    { id:"train", label:"🏋️\n育成" },
    { id:"battle",label:"⚔️\nバトル" },
    { id:"gacha", label:"🎲\nガチャ" },
    { id:"dex",   label:"📚\n図鑑" },
    { id:"settings", label:"⚙️\n設定" },
  ];

  const $ = (q) => document.querySelector(q);

  function toast(msg){
    const el = $("#toast");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    el.setAttribute("aria-hidden","false");
    setTimeout(() => {
      el.classList.remove("show");
      el.setAttribute("aria-hidden","true");
    }, 1100);
  }

  // ============================
  // 上部：タブとタイトル
  // ============================
  function renderTabs(state){
    const tabbar = $("#tabbar");
    if(!tabbar) return;

    tabbar.innerHTML = TABS.map(t => {
      const active = (state.route === t.id) ? "active" : "";
      return `<div class="tab ${active}" data-route="${t.id}">${t.label.replace("\n","<br>")}</div>`;
    }).join("");

    tabbar.querySelectorAll(".tab").forEach(el => {
      el.addEventListener("click", () => {
        const r = el.getAttribute("data-route");
        setRoute(state, r);
        notify();
      });
    });
  }

  function renderTop(state){
    const chip = $("#chipCoins");
    if(chip) chip.textContent = `🪙 ${state.coins}`;

    const titleMap = {
      home:"HOME",
      train:"ムシ育成",
      battle:"バトル",
      gacha:"ガチャ",
      dex:"図鑑",
      settings:"設定",
    };

    const titleEl = $("#topTitle");
    if(titleEl) titleEl.textContent = `ムシ育成バトル / ${titleMap[state.route] || "HOME"}`;
  }

  // ============================
  // カード表示（自分 / 野生）
  // ============================
  function renderBugCard(b){
    const sp = SPECIES.find(s=>s.id===b.specId);
    const expNeed = expToNext(b.level);
    const expPct = Math.max(0, Math.min(1, (b.exp||0)/expNeed));
    const hpPct = Math.max(0, Math.min(1, b.hp/b.hpMax));

    const trait = b.trait
      ? `<span class="tag">特性：${b.trait}</span><span class="muted">${TRAITS[b.trait]?.desc||""}</span>`
      : `<span class="muted">特性：なし</span>`;

    const legendTag = b.isLegendary
      ? `<span class="tag tagLegend">伝説</span>`
      : "";

    return `
      <div class="card">
        <div class="h3">${b.isLegendary?"👑 ":""}${b.nickname} <span class="muted">(${sp?.name||b.specId}/${b.type})</span></div>
        <div class="muted">Lv.${b.level} / EXP ${b.exp||0} / ${expNeed}</div>

        <div class="sep"></div>

        <div class="muted">HP ${b.hp} / ${b.hpMax}</div>
        <div class="bar"><div class="fill fillHp" style="width:${Math.round(hpPct*100)}%"></div></div>

        <div class="sep"></div>

        <div class="grid2">
          <div class="muted">ATK：<b>${b.atk}</b></div>
          <div class="muted">DEF：<b>${b.def}</b></div>
          <div class="muted">SPD：<b>${b.spd}</b></div>
          <div class="muted">属性：<b>${b.type}</b></div>
        </div>

        <div style="margin-top:10px">${legendTag}</div>
        <div style="margin-top:10px">${trait}</div>

        <div style="margin-top:10px">
          <div class="muted">レベル進行</div>
          <div class="bar"><div class="fill" style="width:${Math.round(expPct*100)}%"></div></div>
        </div>
      </div>
    `;
  }

  function renderWildCard(w){
    const sp = SPECIES.find(s=>s.id===w.specId);
    const hpPct = Math.max(0, Math.min(1, w.hp/w.hpMax));

    const trait = w.trait
      ? `<span class="tag">特性：${w.trait}</span><span class="muted">${TRAITS[w.trait]?.desc||""}</span>`
      : `<span class="muted">特性：なし</span>`;

    const legendTag = w.isLegendary
      ? `<span class="tag tagLegend">伝説</span>`
      : "";

    return `
      <div class="card">
        <div class="h3">${w.isLegendary?"👑 伝説の":"野生の"}${w.nickname} <span class="muted">(${sp?.name||w.specId}/${w.type})</span></div>
        <div class="muted">Lv.${w.level}</div>

        <div class="sep"></div>

        <div class="muted">HP ${w.hp} / ${w.hpMax}</div>
        <div class="bar"><div class="fill ${w.hp>0?"fillBad":"fill"}" style="width:${Math.round(hpPct*100)}%"></div></div>

        <div class="sep"></div>

        <div class="grid2">
          <div class="muted">ATK：<b>${w.atk}</b></div>
          <div class="muted">DEF：<b>${w.def}</b></div>
          <div class="muted">SPD：<b>${w.spd}</b></div>
          <div class="muted">属性：<b>${w.type}</b></div>
        </div>

        <div style="margin-top:10px">${legendTag}</div>
        <div style="margin-top:10px">${trait}</div>
      </div>
    `;
  }

  // ============================
  // 画面：HOME
  // ============================
  function screenHome(state){
    const me = getSelected(state);
    return `
      <div class="row">
        <div class="card">
          <div class="h2">🏠 メインメニュー</div>
          <div class="muted">下タブで画面切替。まずは育成かバトルいけるぢゃん？</div>
          <div class="sep"></div>

          <div class="grid2">
            <button class="btn" data-go="train">🏋️ 育成へ</button>
            <button class="btn btn2" data-go="battle">⚔️ バトルへ</button>
            <button class="btn btn2" data-go="gacha">🎲 ガチャへ</button>
            <button class="btn btn2" data-go="dex">📚 図鑑へ</button>
          </div>
        </div>

        ${renderBugCard(me)}
      </div>
    `;
  }

  // ============================
  // 画面：育成
  // ============================
  function screenTrain(state){
    const me = getSelected(state);
    const options = state.bugs.map(b => `<option value="${b.uid}">${b.isLegendary?"👑 ":""}${b.nickname}（Lv.${b.level}）</option>`).join("");

    // train points 表示（あれば）
    const pts = state.train?.points ?? 0;

    return `
      <div class="row">
        <div class="card">
          <div class="h2">🏋️ ムシ育成</div>
          <div class="muted">トレ回数：<b>${pts}</b>/3（1時間で1回復）</div>

          <div class="sep"></div>

          <div class="grid2">
            <div>
              <div class="muted">育てるムシ</div>
              <select id="selBug">${options}</select>
            </div>
            <div>
              <div class="muted">名前変更（任意）</div>
              <input id="renameBug" placeholder="例：ギラツノ" />
            </div>
          </div>

          <div class="sep"></div>

          <div class="grid2">
            <button class="btn btn2" id="btnTrainAtk">🗡️ ATK寄せ</button>
            <button class="btn btn2" id="btnTrainDef">🛡️ DEF寄せ</button>
            <button class="btn btn2" id="btnTrainSpd">💨 SPD寄せ</button>
            <button class="btn btn2" id="btnTrainTrait">🌟 特性トレ</button>
          </div>

          <div class="sep"></div>
          <div class="grid2">
            <button class="btn" id="btnHeal">🩹 休ませる（全回復）</button>
            <button class="btn btn2" id="btnSave">💾 保存</button>
          </div>
        </div>

        ${renderBugCard(me)}
      </div>
    `;
  }

  // ============================
  // 画面：バトル（ログ上/コマンド下）
  // ============================
  function screenBattle(state){
    const me = getSelected(state);
    const wild = state.wild;

    const canAct = !!(wild && state.battle.active && !state.battle.over && state.battle.turn==="me");
    const canCapture = !!(wild && state.battle.active && state.battle.over && wild.hp<=0);

    return `
      <div class="battle">

        <div class="battle-top">
          <div class="mini-card">
            <div class="h3">🧍 自分</div>
            ${renderBugCard(me)}
          </div>

          <div class="mini-card">
            <div class="h3">🌿 野生</div>
            ${wild ? renderWildCard(wild) : `<div class="muted">まだいない。遭遇してね。</div>`}
          </div>
        </div>

        <div class="battle-mid">
          <div class="card battle-log-wrap">
            <div class="h3">ログ</div>
            <div class="muted" id="battleLast"></div>
            <pre class="log" id="logBattle">${(state.battle.log||[]).join("\n")}</pre>
          </div>
        </div>

        <div class="battle-bottom">
          <div class="card">
            <div class="h2">⚔️ バトル</div>
            <div class="muted">遭遇 → 開始 → コマンド。勝ったら捕獲。</div>

            <div class="sep"></div>

            <div class="grid2">
              <button class="btn" id="btnSpawn">🌿 遭遇する</button>
              <button class="btn btn2" id="btnStartBattle" ${wild ? "" : "disabled"}>⚔️ 戦う（開始）</button>
            </div>

            <div class="sep"></div>

            <div class="grid2 battle-commands">
              <button class="btn btn2" id="btnAtk" ${canAct ? "" : "disabled"}>🗡️ こうげき</button>
              <button class="btn btn2" id="btnGuard" ${canAct ? "" : "disabled"}>🛡️ ぼうぎょ</button>
              <button class="btn btn2" id="btnSkill" ${canAct ? "" : "disabled"}>✨ とくぎ</button>
              <button class="btn" id="btnCapture" ${canCapture ? "" : "disabled"}>🫙 捕獲</button>
            </div>

            <div class="sep"></div>

            <div class="grid2">
              <button class="btn btn2" id="btnHealBattle">🩹 自分を回復</button>
              <button class="btn btn2" id="btnSaveBattle">💾 保存</button>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  function postRenderBattle(state){
    const logEl = document.getElementById("logBattle");
    if(logEl) logEl.scrollTop = logEl.scrollHeight;

    const lastEl = document.getElementById("battleLast");
    if(lastEl){
      const logs = state.battle.log || [];
      lastEl.textContent = logs.length ? ("直近：" + logs[logs.length-1]) : "";
    }
  }

  // ============================
  // 画面：ガチャ
  // ============================
  function screenGacha(state){
    const last = state.gacha?.last || null;
    const lastHtml = last
      ? `<div class="sep"></div>
         <div class="h3">直近の結果</div>
         ${last.map(x => `<div class="muted">・${x.isLegendary?"👑 ":""}${x.nickname}</div>`).join("")}`
      : `<div class="sep"></div><div class="muted">まだ引いてない。</div>`;

    return `
      <div class="card">
        <div class="h2">🎲 ガチャ</div>
        <div class="muted">1回10🪙。伝説も混ざる。</div>

        <div class="sep"></div>

        <div class="grid2">
          <button class="btn" id="btnGacha1">🎲 1回（10🪙）</button>
          <button class="btn btn2" id="btnGacha10">🎲 10回（100🪙）</button>
        </div>

        ${lastHtml}

        <div class="sep"></div>
        <button class="btn btn2" id="btnSaveGacha">💾 保存</button>
      </div>
    `;
  }

  function screenDex(state){
    const rows = SPECIES.map(s=>{
      const owned = state.bugs.filter(b=>b.specId===s.id).length;
      const ownedLegend = state.bugs.filter(b=>b.specId===s.id && b.isLegendary).length;
      const captured = state.dex[s.id] || 0;
      return `
        <div style="padding:8px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div><b>${s.name}</b> <span class="muted">(${s.type})</span></div>
            <div class="muted">所持:${owned}（👑${ownedLegend}） / 捕獲:${captured}</div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="card">
        <div class="h2">📚 図鑑 / 所持</div>
        <div class="muted">所持ムシ：${state.bugs.length}匹</div>
        <div class="sep"></div>
        ${rows}
      </div>
    `;
  }

  function screenSettings(state){
    return `
      <div class="card">
        <div class="h2">⚙️ 設定</div>
        <div class="sep"></div>

        <div class="grid2">
          <button class="btn btn2" id="btnSaveSet">💾 保存</button>
          <button class="btn btnDanger" id="btnResetSet">🧼 初期化</button>
        </div>
      </div>
    `;
  }

  // ============================
  // 画面ごとのイベント紐付け
  // ============================
  function bindScreenEvents(state){
    // HOME
    document.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => setRoute(state, btn.getAttribute("data-go")));
    });

    // TRAIN
    const sel = $("#selBug");
    if(sel){
      sel.value = state.selectedUid;
      sel.addEventListener("change", () => setSelected(state, sel.value));
    }

    const ren = $("#renameBug");
    if(ren){
      ren.addEventListener("change", () => {
        const v = ren.value.trim();
        if(!v) return;
        const me = getSelected(state);
        me.nickname = v.slice(0,10);
        ren.value = "";
        toast("名前変更した");
        notify();
      });
    }

    const atk = $("#btnTrainAtk");
    if(atk) atk.addEventListener("click", () => { Core.trainSelected(state,"atk"); toast("鍛えた"); notify(); });

    const def = $("#btnTrainDef");
    if(def) def.addEventListener("click", () => { Core.trainSelected(state,"def"); toast("鍛えた"); notify(); });

    const spd = $("#btnTrainSpd");
    if(spd) spd.addEventListener("click", () => { Core.trainSelected(state,"spd"); toast("鍛えた"); notify(); });

    const tr = $("#btnTrainTrait");
    if(tr) tr.addEventListener("click", () => { Core.trainSelected(state,"trait"); toast("鍛えた"); notify(); });

    const btnHeal = $("#btnHeal");
    if(btnHeal) btnHeal.addEventListener("click", () => { Core.healSelected(state); toast("回復した"); notify(); });

    const btnSave = $("#btnSave");
    if(btnSave) btnSave.addEventListener("click", () => { save(state); toast("保存した"); });

    // BATTLE
    const btnSpawn = $("#btnSpawn");
    if(btnSpawn) btnSpawn.addEventListener("click", () => { Core.spawnWild(state); toast("遭遇！"); notify(); });

    const btnStart = $("#btnStartBattle");
    if(btnStart) btnStart.addEventListener("click", () => { Core.startBattle(state); toast("開戦"); notify(); });

    const btnAtk = $("#btnAtk");
    if(btnAtk) btnAtk.addEventListener("click", () => { Core.myAct(state, "attack"); notify(); });

    const btnGuard = $("#btnGuard");
    if(btnGuard) btnGuard.addEventListener("click", () => { Core.myAct(state, "guard"); notify(); });

    const btnSkill = $("#btnSkill");
    if(btnSkill) btnSkill.addEventListener("click", () => { Core.myAct(state, "skill"); notify(); });

    const btnCapture = $("#btnCapture");
    if(btnCapture) btnCapture.addEventListener("click", () => { Core.tryCapture(state); toast("捕獲判定"); notify(); });

    const btnHealBattle = $("#btnHealBattle");
    if(btnHealBattle) btnHealBattle.addEventListener("click", () => { Core.healSelected(state); toast("回復した"); notify(); });

    const btnSaveBattle = $("#btnSaveBattle");
    if(btnSaveBattle) btnSaveBattle.addEventListener("click", () => { save(state); toast("保存した"); });

    // GACHA
    const g1 = $("#btnGacha1");
    if(g1) g1.addEventListener("click", () => { const r = Core.gachaPull(state,1); toast(r.length?"ガチャ引いた":"コイン足りん"); notify(); });

    const g10 = $("#btnGacha10");
    if(g10) g10.addEventListener("click", () => { const r = Core.gachaPull(state,10); toast(r.length?"10連！":"コイン足りん"); notify(); });

    const btnSaveGacha = $("#btnSaveGacha");
    if(btnSaveGacha) btnSaveGacha.addEventListener("click", () => { save(state); toast("保存した"); });

    // SETTINGS
    const btnSaveSet = $("#btnSaveSet");
    if(btnSaveSet) btnSaveSet.addEventListener("click", () => { save(state); toast("保存した"); });

    const btnResetSet = $("#btnResetSet");
    if(btnResetSet){
      btnResetSet.addEventListener("click", () => {
        if(!confirm("初期化する？（セーブ消える）")) return;
        hardReset();
        location.reload();
      });
    }
  }

  // ============================
  // 画面描画（notifyで呼ばれる想定）
  // ============================
  function render(state){
    renderTop(state);
    renderTabs(state);

    const view = $("#view");
    if(!view) return;

    if(state.route === "home") view.innerHTML = screenHome(state);
    else if(state.route === "train") view.innerHTML = screenTrain(state);
    else if(state.route === "battle") view.innerHTML = screenBattle(state);
    else if(state.route === "gacha") view.innerHTML = screenGacha(state);
    else if(state.route === "dex") view.innerHTML = screenDex(state);
    else if(state.route === "settings") view.innerHTML = screenSettings(state);
    else view.innerHTML = screenHome(state);

    bindScreenEvents(state);

    if(state.route === "battle") postRenderBattle(state);
  }

  // 公開
  window.MushiUI = { render, toast };
})();