// src/ui.js
(() => {
  const { setRoute, setSelected, save, hardReset } = window.MushiState;
  const {
    SPECIES, TRAITS, expToNext,
    getSelected,
    LEGENDARY_RATE,
    LEGENDARY_STAT_MULT, LEGENDARY_WIN_EXP_MULT, LEGENDARY_GROWTH_MULT,
    TRAIN_MAX, TRAIN_REGEN_MS, TRAIN_CFG, tickTrain,
    getEffectiveStats
  } = window.MushiCore;

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
    el.textContent = msg;
    el.classList.add("show");
    el.setAttribute("aria-hidden","false");
    setTimeout(() => {
      el.classList.remove("show");
      el.setAttribute("aria-hidden","true");
    }, 1100);
  }

  function renderTabs(state){
    const tabbar = $("#tabbar");
    tabbar.innerHTML = TABS.map(t => {
      const active = (state.route === t.id) ? "active" : "";
      return `<div class="tab ${active}" data-route="${t.id}">${t.label.replace("\n","<br>")}</div>`;
    }).join("");

    tabbar.querySelectorAll(".tab").forEach(el => {
      el.addEventListener("click", () => {
        const r = el.getAttribute("data-route");
        setRoute(state, r);
      });
    });
  }

  function renderTop(state){
    $("#chipCoins").textContent = `🪙 ${state.coins}`;
    const titleMap = {
      home:"HOME",
      train:"ムシ育成",
      battle:"バトル",
      gacha:"ガチャ",
      dex:"図鑑",
      settings:"設定",
    };
    $("#topTitle").textContent = `ムシ育成バトル / ${titleMap[state.route] || "HOME"}`;
  }

  function renderBugCard(b, state){
    const sp = SPECIES.find(s=>s.id===b.specId);
    const expNeed = expToNext(b.level);
    const expPct = Math.max(0, Math.min(1, b.exp/expNeed));
    const hpPct = Math.max(0, Math.min(1, b.hp/b.hpMax));

    const trait = b.trait
      ? `<span class="tag">特性：${b.trait}</span><span class="muted">${TRAITS[b.trait]?.desc||""}</span>`
      : `<span class="muted">特性：なし</span>`;

    const legendTag = b.isLegendary
      ? `<span class="tag tagLegend">伝説</span><span class="muted">能力値×${LEGENDARY_STAT_MULT} / 成長×${LEGENDARY_GROWTH_MULT}</span>`
      : "";

    return `
      <div class="card">
        <div class="h3">${b.isLegendary?"👑 ":""}${b.nickname} <span class="muted">(${sp.name}/${b.type})</span></div>
        <div class="muted">Lv.${b.level} / EXP ${b.exp} / ${expNeed}</div>

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
      ? `<span class="tag tagLegend">伝説</span><span class="muted">能力値×${LEGENDARY_STAT_MULT} / 勝利EXP×${LEGENDARY_WIN_EXP_MULT}</span>`
      : "";

    return `
      <div class="card">
        <div class="h3">${w.isLegendary?"👑 伝説の":"野生の"}${w.nickname} <span class="muted">(${sp.name}/${w.type})</span></div>
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

  // =========================
  // 画面：HOME
  // =========================
  function screenHome(state){
    const me = getSelected(state);
    return `
      <div class="row">
        <div class="card">
          <div class="h2">🏠 メインメニュー</div>
          <div class="muted">下タブで画面切替。まずは育成かバトル行けるぢゃん？</div>
          <div class="sep"></div>

          <div class="grid2">
            <button class="btn" data-go="train">🏋️ 育成へ</button>
            <button class="btn btn2" data-go="battle">⚔️ バトルへ</button>
            <button class="btn btn2" data-go="gacha">🎲 ガチャへ</button>
            <button class="btn btn2" data-go="dex">📚 図鑑へ</button>
          </div>

          <div class="sep"></div>
          <div class="muted">伝説出現率：${(LEGENDARY_RATE*100).toFixed(1)}%（=1/1000）</div>
        </div>

        ${renderBugCard(me, state)}
      </div>
    `;
  }

  // =========================
  // 画面：育成（サポ選択ここで実装）
  // =========================
  function screenTrain(state){
    const me = getSelected(state);

    // ★トレ回数の回復を画面表示でも更新
    tickTrain(state);

    const options = state.bugs
      .map(b => `<option value="${b.uid}">${b.isLegendary?"👑 ":""}${b.nickname}（Lv.${b.level}）</option>`)
      .join("");

    const supportOptions = state.bugs
      .filter(b => b.uid !== state.selectedUid)
      .map(b => `<option value="${b.uid}" ${state.party?.supportUid===b.uid?"selected":""}>${b.isLegendary?"👑 ":""}${b.nickname}（Lv.${b.level}）</option>`)
      .join("");

    const p = state.train?.points ?? TRAIN_MAX;
    const nextMs = (() => {
      if(!state.train) return 0;
      if(p >= TRAIN_MAX) return 0;
      const now = Date.now();
      const left = Math.max(0, (state.train.last + TRAIN_REGEN_MS) - now);
      return left;
    })();
    const nextMin = Math.ceil(nextMs / 60000);

    const eff = getEffectiveStats(state, me);
    const effHint = (state.party?.supportUid)
      ? `<div class="muted">サポ反映（育成中のムシ）: ATK ${me.atk}→<b>${eff.atk}</b> / DEF ${me.def}→<b>${eff.def}</b> / SPD ${me.spd}→<b>${eff.spd}</b></div>`
      : `<div class="muted">サポ: なし（設定すると有効ステが上がる）</div>`;

    return `
      <div class="row">
        <div class="card">
          <div class="h2">🏋️ ムシ育成</div>
          <div class="muted">鍛えて強くする。伝説は成長×${LEGENDARY_GROWTH_MULT}で伸びる。</div>

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

          <div>
            <div class="muted">サポート（バトル時に能力が少し乗る）</div>
            <select id="selSupport">
              <option value="">（なし）</option>
              ${supportOptions}
            </select>
            <div class="muted" style="margin-top:6px">※選択中のムシはサポにできない</div>
          </div>

          <div class="sep"></div>
          ${effHint}

          <div class="sep"></div>

          <div class="muted">トレ回数：<b>${p}</b> / ${TRAIN_MAX}　${p<TRAIN_MAX?`（次の回復まで約 ${nextMin} 分）`:"（満タン）"}</div>

          <div class="sep"></div>

          <div class="grid2">
            <button class="btn btn2" id="btnTrainAtk">🏋️ ${TRAIN_CFG.atk.label}</button>
            <button class="btn btn2" id="btnTrainDef">🏋️ ${TRAIN_CFG.def.label}</button>
            <button class="btn btn2" id="btnTrainSpd">🏋️ ${TRAIN_CFG.spd.label}</button>
            <button class="btn" id="btnTrainTrait">🌟 ${TRAIN_CFG.trait.label}</button>
          </div>

          <div class="sep"></div>

          <div class="grid2">
            <button class="btn btn2" id="btnHeal">🩹 休ませる（全回復）</button>
            <button class="btn btn2" id="btnSave">💾 保存</button>
          </div>
        </div>

        ${renderBugCard(me, state)}
      </div>

      <pre class="log" id="logTrain">${(state.battle.log||[]).join("\n")}</pre>
    `;
  }

  // =========================
  // 画面：バトル
  // =========================
  function screenBattle(state){
    const me = getSelected(state);
    const wild = state.wild;
    const canAct = !!(wild && state.battle.active && !state.battle.over && state.battle.turn==="me");
    const canCapture = !!(wild && state.battle.active && state.battle.over && wild.hp<=0);

    const eff = getEffectiveStats(state, me);
    const effLine = state.party?.supportUid
      ? `<div class="muted">サポ反映: ATK ${me.atk}→<b>${eff.atk}</b> / DEF ${me.def}→<b>${eff.def}</b> / SPD ${me.spd}→<b>${eff.spd}</b></div>`
      : `<div class="muted">サポ: なし</div>`;

    return `
      <div class="row">
        <div class="card">
          <div class="h2">⚔️ バトル</div>
          <div class="muted">遭遇 → 戦う（開始） → コマンド。勝ったら捕獲。</div>
          ${effLine}

          <div class="sep"></div>

          <div class="grid2">
            <button class="btn" id="btnSpawn">🌿 遭遇する</button>
            <button class="btn btn2" id="btnStartBattle" ${wild ? "" : "disabled"}>⚔️ 戦う（開始）</button>
          </div>

          <div class="sep"></div>

          <div class="grid2">
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

        ${renderBugCard(me, state)}
      </div>

      <div class="row">
        ${wild ? renderWildCard(wild) : `<div class="card"><div class="h3">野生ムシ</div><div class="muted">まだいない。遭遇してね。</div></div>`}
        <div class="card">
          <div class="h3">ログ</div>
          <pre class="log" id="logBattle">${(state.battle.log||[]).join("\n")}</pre>
        </div>
      </div>
    `;
  }

  // =========================
  // 画面：ガチャ
  // =========================
  function screenGacha(state){
    const last = state.gacha?.last || null;
    const lastHtml = last
      ? `<div class="sep"></div>
         <div class="h3">直近の結果</div>
         ${last.map(x => `<div class="muted">・${x.isLegendary?"👑 ":""}${x.nickname}（${SPECIES.find(s=>s.id===x.specId)?.name||x.specId}）</div>`).join("")}`
      : `<div class="sep"></div><div class="muted">まだ引いてない。</div>`;

    return `
      <div class="card">
        <div class="h2">🎲 ガチャ</div>
        <div class="muted">1回10🪙。伝説も ${(LEGENDARY_RATE*100).toFixed(1)}% で混ざる。</div>

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

  // =========================
  // 画面：図鑑
  // =========================
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

    const party = state.bugs
      .map((b,i)=>`<div class="muted">・${i+1}. ${b.isLegendary?"👑 ":""}${b.nickname}（Lv.${b.level} / ${b.type}${b.trait?` / ${b.trait}`:""}）</div>`)
      .join("");

    return `
      <div class="card">
        <div class="h2">📚 図鑑 / 所持</div>
        <div class="muted">所持ムシ：${state.bugs.length}匹</div>
        <div class="sep"></div>
        ${party}
        <div class="sep"></div>
        ${rows}
      </div>
    `;
  }

  // =========================
  // 画面：設定
  // =========================
  function screenSettings(state){
    return `
      <div class="card">
        <div class="h2">⚙️ 設定</div>
        <div class="muted">セーブと初期化。</div>

        <div class="sep"></div>

        <div class="grid2">
          <button class="btn btn2" id="btnSaveSet">💾 保存</button>
          <button class="btn btnDanger" id="btnResetSet">🧼 初期化</button>
        </div>

        <div class="sep"></div>
        <div class="muted">
          ・初期化はこのゲームのセーブを消す（戻せない）<br>
          ・ガチャは簡易版（確率や演出は後で盛る）
        </div>
      </div>
    `;
  }

  function bindScreenEvents(state){
    // HOME
    document.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => setRoute(state, btn.getAttribute("data-go")));
    });

    // TRAIN：選択
    const sel = $("#selBug");
    if(sel){
      sel.value = state.selectedUid;
      sel.addEventListener("change", () => setSelected(state, sel.value));
    }

    // TRAIN：サポート選択
    const selSup = $("#selSupport");
    if(selSup){
      selSup.addEventListener("change", () => {
        const v = selSup.value || null;
        if(!state.party) state.party = { supportUid: null };
        state.party.supportUid = v;

        // 選択ムシと同じはNG
        if(state.party.supportUid && state.party.supportUid === state.selectedUid){
          state.party.supportUid = null;
        }

        toast(state.party.supportUid ? "サポート設定した" : "サポート解除した");
        window.MushiState.notify();
      });
    }

    // TRAIN：名前変更
    const ren = $("#renameBug");
    if(ren){
      ren.addEventListener("change", () => {
        const v = ren.value.trim();
        if(!v) return;
        const me = getSelected(state);
        me.nickname = v.slice(0,10);
        ren.value = "";
        toast("名前変更した");
        window.MushiState.notify();
      });
    }

    // TRAIN：トレ
    const a = $("#btnTrainAtk");
    if(a) a.addEventListener("click", () => { window.MushiCore.trainSelected(state,"atk"); toast("鍛えた"); });

    const d = $("#btnTrainDef");
    if(d) d.addEventListener("click", () => { window.MushiCore.trainSelected(state,"def"); toast("鍛えた"); });

    const s = $("#btnTrainSpd");
    if(s) s.addEventListener("click", () => { window.MushiCore.trainSelected(state,"spd"); toast("鍛えた"); });

    const t = $("#btnTrainTrait");
    if(t) t.addEventListener("click", () => { window.MushiCore.trainSelected(state,"trait"); toast("鍛えた"); });

    const btnHeal = $("#btnHeal");
    if(btnHeal){
      btnHeal.addEventListener("click", () => {
        window.MushiCore.healSelected(state);
        toast("回復した");
      });
    }
    const btnSave = $("#btnSave");
    if(btnSave){
      btnSave.addEventListener("click", () => {
        save(state);
        toast("保存した");
      });
    }

    // BATTLE
    const btnSpawn = $("#btnSpawn");
    if(btnSpawn){
      btnSpawn.addEventListener("click", () => {
        window.MushiCore.spawnWild(state);
        toast("遭遇！");
      });
    }
    const btnStart = $("#btnStartBattle");
    if(btnStart){
      btnStart.addEventListener("click", () => {
        window.MushiCore.startBattle(state);
        toast("開戦");
      });
    }
    const btnAtk = $("#btnAtk");
    if(btnAtk) btnAtk.addEventListener("click", () => window.MushiCore.myAct(state, "attack"));
    const btnGuard = $("#btnGuard");
    if(btnGuard) btnGuard.addEventListener("click", () => window.MushiCore.myAct(state, "guard"));
    const btnSkill = $("#btnSkill");
    if(btnSkill) btnSkill.addEventListener("click", () => window.MushiCore.myAct(state, "skill"));

    const btnCapture = $("#btnCapture");
    if(btnCapture){
      btnCapture.addEventListener("click", () => {
        const ok = window.MushiCore.tryCapture(state);
        if(ok) toast("捕獲成功");
      });
    }
    const btnHealBattle = $("#btnHealBattle");
    if(btnHealBattle){
      btnHealBattle.addEventListener("click", () => {
        window.MushiCore.healSelected(state);
        toast("回復した");
      });
    }
    const btnSaveBattle = $("#btnSaveBattle");
    if(btnSaveBattle){
      btnSaveBattle.addEventListener("click", () => { save(state); toast("保存した"); });
    }

    // GACHA
    const g1 = $("#btnGacha1");
    if(g1){
      g1.addEventListener("click", () => {
        const res = window.MushiCore.gachaPull(state, 1);
        toast(res.length ? "ガチャ引いた" : "コイン足りん");
      });
    }
    const g10 = $("#btnGacha10");
    if(g10){
      g10.addEventListener("click", () => {
        const res = window.MushiCore.gachaPull(state, 10);
        toast(res.length ? "10連！" : "コイン足りん");
      });
    }
    const btnSaveGacha = $("#btnSaveGacha");
    if(btnSaveGacha){
      btnSaveGacha.addEventListener("click", () => { save(state); toast("保存した"); });
    }

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

  function render(state){
    renderTop(state);
    renderTabs(state);

    const view = $("#view");
    if(state.route === "home") view.innerHTML = screenHome(state);
    else if(state.route === "train") view.innerHTML = screenTrain(state);
    else if(state.route === "battle") view.innerHTML = screenBattle(state);
    else if(state.route === "gacha") view.innerHTML = screenGacha(state);
    else if(state.route === "dex") view.innerHTML = screenDex(state);
    else if(state.route === "settings") view.innerHTML = screenSettings(state);
    else view.innerHTML = screenHome(state);

    bindScreenEvents(state);
  }

  window.MushiUI = { render, toast };
})();