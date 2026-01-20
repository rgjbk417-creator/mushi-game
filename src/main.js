// src/main.js
(() => {
  const S = window.MushiState;
  const C = window.MushiCore;
  const U = window.MushiUI;

  function boot(){
    // 旧セーブ互換ロード → コア整形
    let state = S.load() || S.defaultState();
    state = C.ensureCoreState(state);

    // 初回ちょいログ（分かりやすさ）
    if(!state.battle || !Array.isArray(state.battle.log) || state.battle.log.length===0){
      state.battle = state.battle || {active:false,over:false,turn:"",log:[]};
      state.battle.log.push("✅ 準備OK。下タブで画面切替。");
      state.battle.log.push("おすすめ：バトル→遭遇→戦う→コマンド。");
      state.battle.log.push("ガチャは1回10🪙。勝ってコイン稼げ。");
    }

    // レンダリング
    const rerender = () => {
      U.render(state);
      // オート保存（雑に強い）
      try{ S.save(state); }catch(e){}
    };

    // UI更新登録
    S.onChange(rerender);

    // 初回描画
    rerender();

    // 直に state を使うために window に置く（デバッグ用）
    window.__MUSHI_STATE__ = state;
  }

  boot();
})();
