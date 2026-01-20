// src/state.js
(() => {
  const SAVE_KEY_NEW = "mushi_game_save_v1_tabs";
  const SAVE_KEYS_OLD = [
    "mushi_battle_save_v3_legend_ok",
    "mushi_battle_save_v2_legend",
    "mushi_battle_save_v1",
  ];

  const listeners = new Set();

  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

  function notify(){
    for(const fn of listeners) fn();
  }

  function onChange(fn){
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function defaultState(){
    // core.js が後で上書きして整える
    return {
      route: "home",
      coins: 0,
      bugs: [],
      dex: {},
      selectedUid: null,
      wild: null,
      battle: { active:false, over:false, turn:"", log:[] },
      gacha: { last: null }
    };
  }

  function save(state){
    localStorage.setItem(SAVE_KEY_NEW, JSON.stringify(state));
  }

  function load(){
    // 1) 新キー
    let raw = localStorage.getItem(SAVE_KEY_NEW);
    if(raw){
      try{ return JSON.parse(raw); }catch(e){}
    }
    // 2) 旧キー（互換）
    for(const k of SAVE_KEYS_OLD){
      raw = localStorage.getItem(k);
      if(!raw) continue;
      try{
        const s = JSON.parse(raw);
        return s;
      }catch(e){}
    }
    return null;
  }

  function hardReset(){
    localStorage.removeItem(SAVE_KEY_NEW);
  }

  function setRoute(state, route){
    state.route = route;
    notify();
  }

  function setSelected(state, uid){
    state.selectedUid = uid;
    notify();
  }

  function setCoins(state, coins){
    state.coins = coins;
    notify();
  }

  function pushLog(state, msg){
    const log = state.battle?.log || (state.battle = {active:false,over:false,turn:"",log:[]}).log;
    log.push(msg);
    if(log.length > 200) log.splice(0, log.length - 200);
    notify();
  }

  function clearLog(state){
    if(!state.battle) state.battle = {active:false,over:false,turn:"",log:[]};
    state.battle.log = [];
    notify();
  }

  window.MushiState = {
    defaultState,
    deepClone,
    onChange,
    notify,
    save,
    load,
    hardReset,
    setRoute,
    setSelected,
    setCoins,
    pushLog,
    clearLog,
    SAVE_KEY_NEW,
  };
})();
