// src/ui.js
(() => {
  const { loadState, saveState, notify, pushLog } = window.MushiState;
  const Core = window.MushiCore;

  // =========================================================
  // ここがこの画面！：DOM参照
  // =========================================================
  const $ = (sel) => document.querySelector(sel);

  // 必要なコンテナ（無ければ自動生成）
  function ensureRoot(){
    if(!$("#app")){
      const d = document.createElement("div");
      d.id = "app";
      document.body.appendChild(d);
    }
  }

  // =========================================================
  // ここがこの画面！：小物UIパーツ
  // =========================================================
  function fmtBug(b){
    const sp = Core.SPECIES.find(s=>s.id===b.specId);
    const trait = b.trait ? ` / 特性:${b.trait}` : "";
    const tag = b.isLegendary ? "👑" : "";
    return `${tag}${b.nickname}（${sp?.type || b.type}） Lv.${b.level} HP ${b.hp}/${b.hpMax}  ATK${b.atk} DEF${b.def} SPD${b.spd}${trait}`;
  }

  function expBar(b){
    const need = Core.expToNext(b.level);
    const cur = b.exp || 0;
    const w = Math.max(0, Math.min(100, Math.floor((cur/need)*100)));
    return `
      <div class="expWrap" style="margin:6px 0;">
        <div style="font-size:12px;opacity:.8;">EXP ${cur}/${need}</div>
        <div style="background:#222;border-radius:999px;overflow:hidden;height:10px;">
          <div style="height:10px;width:${w}%;background:#4aa3ff;"></div>
        </div>
      </div>
    `;
  }

  function trainStatus(state){
    const t = state.train || { points:0, last:Date.now() };
    return `🏋️ トレ回数：${t.points}/3（1時間で1回復）`;
  }

  function btn(html, onClick, cls="btn"){
    const id = "btn_" + Math.random().toString(16).slice(2);
    setTimeout(() => {
      const el = document.getElementById(id);
      if(el) el.addEventListener("click", onClick);
    }, 0);
    return `<button id="${id}" class="${cls}">${html}</button>`;
  }

  function navBtn(state, label, route){
    return btn(label, () => {
      state.route = route;
      saveState(state);
      notify();
      render();
    }, "navbtn");
  }

  // =========================================================
  // ここがこの画面！：共通レイアウト（上：ナビ / 下：画面）
  // =========================================================
  function layout(state, inner){
    const me = Core.getSelected(state);
    return `
      <div class="wrap" style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;padding:14px;max-width:900px;margin:0 auto;">
        <div class="top" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${navBtn(state,"🏠 ホーム","home")}
          ${navBtn(state,"🏋️ 育成","train")}
          ${navBtn(state,"⚔️ バトル","battle")}
          ${navBtn(state,"🎰 ガチャ","gacha")}
          <span style="margin-left:auto;font-weight:700;">🪙 ${state.coins}</span>
        </div>

        <div class="card" style="margin-top:12px;padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;">
          <div style="font-size:13px;opacity:.85;">選択中</div>
          <div style="font-weight:700;margin-top:2px;">${fmtBug(me)}</div>
          ${expBar(me)}
          <div style="margin-top:6px;font-size:13px;opacity:.85;">${trainStatus(state)}</div>
        </div>

        <div class="screen" style="margin-top:12px;">
          ${inner}
        </div>

        <div class="log" style="margin-top:12px;padding:12px;border:1px solid #333;border-radius:10px;background:#0b0b0b;color:#ddd;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-weight:800;">ログ</div>
            <div style="margin-left:auto;">
              ${btn("🧹 クリア", () => { state.battle.log = []; saveState(state); notify(); render(); }, "btn")}
            </div>
          </div>
          <div style="margin-top:8px;white-space:pre-wrap;line-height:1.35;">${(state.battle?.log||[]).slice(-60).join("\n")}</div>
        </div>
      </div>
    `;
  }

  // =========================================================
  // ここがこの画面！：ホーム画面
  // =========================================================
  function viewHome(state){
    const list = state.bugs.map(b => {
      const id = "pick_" + b.uid;
      setTimeout(() => {
        const el = document.getElementById(id);
        if(el){
          el.addEventListener("click", () => {
            state.selectedUid = b.uid;
            saveState(state);
            notify();
            render();
          });
        }
      }, 0);
      return `
        <div style="display:flex;gap:10px;align-items:center;margin:8px 0;">
          <button id="${id}" class="btn" style="white-space:nowrap;">選ぶ</button>
          <div>${fmtBug(b)}</div>
        </div>
      `;
    }).join("");

    return layout(state, `
      <div class="card" style="padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;">
        <div style="font-weight:800;margin-bottom:8px;">所持ムシ</div>
        ${list}
      </div>
    `);
  }

  // =========================================================
  // ここがこの画面！：育成画面（ATK/DEF/SPD/特性トレ + 残り回数表示）
  // =========================================================
  function viewTrain(state){
    const me = Core.getSelected(state);

    const doTrain = (mode) => {
      // ポイント回復も反映したいので都度ensure
      Core.ensureCoreState(state);
      Core.trainSelected(state, mode);
      saveState(state);
      notify();
      render();
    };

    const doHeal = () => {
      Core.ensureCoreState(state);
      Core.healSelected(state);
      saveState(state);
      notify();
      render();
    };

    return layout(state, `
      <div class="card" style="padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;">
        <div style="font-weight:800;margin-bottom:10px;">🏋️ 育成</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${btn("🗡️ ATK寄せ",  () => doTrain("atk"),   "btn")}
          ${btn("🛡️ DEF寄せ",  () => doTrain("def"),   "btn")}
          ${btn("💨 SPD寄せ",  () => doTrain("spd"),   "btn")}
          ${btn("🌟 特性トレ",  () => doTrain("trait"), "btn")}
          ${btn("🩹 休ませる",  () => doHeal(),         "btn")}
        </div>

        <div style="font-size:13px;opacity:.85;line-height:1.5;">
          <div>・トレ回数：最大3、1時間で1回復</div>
          <div>・特性抽選：特性トレでLvUPしたら 1/50、それ以外は 1/100</div>
          <div>・寄せた能力は、LvUP時の伸びが強くなる</div>
        </div>

        <div style="margin-top:10px;padding:10px;border:1px solid #2b2b2b;border-radius:10px;background:#0e0e0e;">
          <div style="font-weight:700;">今のステータス</div>
          <div style="margin-top:6px;">${fmtBug(me)}</div>
          ${expBar(me)}
        </div>
      </div>
    `);
  }

  // =========================================================
  // ここがこの画面！：バトル画面（遭遇/開始/行動/捕獲）
  // =========================================================
  function viewBattle(state){
    const me = Core.getSelected(state);
    const wild = state.wild;

    const spawn = () => { Core.spawnWild(state); saveState(state); notify(); render(); };
    const start = () => { Core.startBattle(state); saveState(state); notify(); render(); };
    const act = (k) => { Core.myAct(state, k); saveState(state); notify(); render(); };
    const cap = () => { Core.tryCapture(state); saveState(state); notify(); render(); };
    const heal = () => { Core.healSelected(state); saveState(state); notify(); render(); };

    let wildBox = `<div style="opacity:.8;">野生なし。遭遇してね。</div>`;
    if(wild){
      wildBox = `
        <div style="font-weight:800;margin-bottom:6px;">野生</div>
        <div>${fmtBug(wild)}</div>
      `;
    }

    return layout(state, `
      <div class="card" style="padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;">
        <div style="font-weight:800;margin-bottom:10px;">⚔️ バトル</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${btn("🌿 遭遇", () => spawn(), "btn")}
          ${btn("▶️ 開始", () => start(), "btn")}
          ${btn("🗡️ 攻撃", () => act("attack"), "btn")}
          ${btn("✨ とくぎ", () => act("skill"), "btn")}
          ${btn("🛡️ ぼうぎょ", () => act("guard"), "btn")}
          ${btn("🫙 捕獲", () => cap(), "btn")}
          ${btn("🩹 休ませる", () => heal(), "btn")}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="padding:10px;border:1px solid #2b2b2b;border-radius:10px;background:#0e0e0e;">
            <div style="font-weight:800;margin-bottom:6px;">自分</div>
            <div>${fmtBug(me)}</div>
            ${expBar(me)}
          </div>
          <div style="padding:10px;border:1px solid #2b2b2b;border-radius:10px;background:#0e0e0e;">
            ${wildBox}
          </div>
        </div>
      </div>
    `);
  }

  // =========================================================
  // ここがこの画面！：ガチャ画面（1連/10連）
  // =========================================================
  function viewGacha(state){
    const pull = (n) => {
      Core.gachaPull(state, n);
      saveState(state);
      notify();
      render();
    };

    const last = state.gacha?.last || null;
    const lastTxt = last
      ? last.map(x => `${x.isLegendary?"👑 ":""}${x.nickname} (${x.specId})`).join("\n")
      : "まだ引いてない";

    return layout(state, `
      <div class="card" style="padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;">
        <div style="font-weight:800;margin-bottom:10px;">🎰 ガチャ</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${btn("🎰 1連（10🪙）", () => pull(1), "btn")}
          ${btn("🎰 10連（100🪙）", () => pull(10), "btn")}
        </div>

        <div style="padding:10px;border:1px solid #2b2b2b;border-radius:10px;background:#0e0e0e;">
          <div style="font-weight:800;margin-bottom:6px;">直近結果</div>
          <div style="white-space:pre-wrap;line-height:1.35;">${lastTxt}</div>
        </div>
      </div>
    `);
  }

  // =========================================================
  // ここがこの画面！：レンダー
  // =========================================================
  function render(){
    ensureRoot();
    let state = loadState();
    state = Core.ensureCoreState(state);

    const route = state.route || "home";

    let html = "";
    if(route === "train") html = viewTrain(state);
    else if(route === "battle") html = viewBattle(state);
    else if(route === "gacha") html = viewGacha(state);
    else html = viewHome(state);

    $("#app").innerHTML = html;
  }

  // 初回描画 + 状態更新時も描画できるように
  window.MushiUI = { render };
  render();

  // notifyが呼ばれたら、外側で render を呼びたい場合があるのでフック（無ければ無視）
  if(typeof window.MushiState?.onNotify === "function"){
    window.MushiState.onNotify(() => render());
  }
})();