// src/core.js
(() => {
  const {
    pushLog, clearLog,
  } = window.MushiState;

  // ===== 要望（伝説仕様） =====
  const LEGENDARY_RATE = 0.001;        // 0.1% = 1/1000
  const LEGENDARY_STAT_MULT = 3;       // 能力値3倍
  const LEGENDARY_WIN_EXP_MULT = 5;    // 勝利EXP 5倍
  const LEGENDARY_GROWTH_MULT = 3;     // 成長3倍

  const SPECIES = [
    { id:"kabuto", name:"カブト", type:"甲", base:{hp:28, atk:8, def:7, spd:5}, skill:"ツノ突き", traitPool:["硬化","突進","不屈"] },
    { id:"kuwa",   name:"クワガタ", type:"刃", base:{hp:24, atk:9, def:6, spd:7}, skill:"ハサミ斬り", traitPool:["急所狙い","連撃","夜行性"] },
    { id:"bee",    name:"ハチ", type:"飛", base:{hp:20, atk:7, def:4, spd:10}, skill:"毒針", traitPool:["毒","回避","先制"] },
    { id:"spider", name:"クモ", type:"糸", base:{hp:22, atk:6, def:6, spd:8}, skill:"糸縛り", traitPool:["拘束","吸収","狡猾"] },
    { id:"mantis", name:"カマキリ", type:"刃", base:{hp:21, atk:10, def:4, spd:9}, skill:"鎌乱舞", traitPool:["急所狙い","狂戦士","連撃"] },
  ];

  const TYPE_EFFECT = {
    "甲": { strong:["刃"], weak:["糸"] },
    "刃": { strong:["糸"], weak:["甲"] },
    "飛": { strong:["甲"], weak:["刃"] },
    "糸": { strong:["甲"], weak:["飛"] },
  };

  const TRAITS = {
    "硬化":  { desc:"被ダメ -15%" },
    "急所狙い": { desc:"とくぎが会心しやすい" },
    "毒": { desc:"とくぎ命中で毒付与" },
    "回避": { desc:"たまにダメージ無効" },
    "先制": { desc:"（演出だけ）速そう" },
    "連撃": { desc:"こうげきがたまに2回" },
    "不屈": { desc:"HP30%以下で防御UP" },
    "突進": { desc:"こうげきの火力UP" },
    "夜行性": { desc:"低確率で追加回復" },
    "拘束": { desc:"とくぎで相手の速度DOWN" },
    "吸収": { desc:"与ダメの一部回復" },
    "狡猾": { desc:"ぼうぎょで次ターン会心UP" },
    "狂戦士": { desc:"HP減るほど火力UP" },
  };

  const r = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
  const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

  function typeMul(att, def){
    const e = TYPE_EFFECT[att];
    if(!e) return 1;
    if(e.strong.includes(def)) return 1.2;
    if(e.weak.includes(def)) return 0.85;
    return 1;
  }

  function makeUID(){
    return (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function expToNext(L){ return 10 + L*6; }

  function recalc(bug){
    const sp = SPECIES.find(s=>s.id===bug.specId);
    const L = bug.level;

    const baseHp  = sp.base.hp + bug.iv.hp + Math.floor(L*2.2);
    const baseAtk = sp.base.atk + bug.iv.atk + Math.floor(L*1.2);
    const baseDef = sp.base.def + bug.iv.def + Math.floor(L*1.0);
    const baseSpd = sp.base.spd + bug.iv.spd + Math.floor(L*0.9);

    const m = bug.statMult || 1;
    bug.hpMax = Math.max(1, Math.floor(baseHp  * m));
    bug.atk   = Math.max(1, Math.floor(baseAtk * m));
    bug.def   = Math.max(1, Math.floor(baseDef * m));
    bug.spd   = Math.max(1, Math.floor(baseSpd * m));

    if(typeof bug.hp !== "number") bug.hp = bug.hpMax;
    bug.hp = clamp(bug.hp, 0, bug.hpMax);
  }

  function makeBug(specId, level=1, isWild=false, isLegendary=false){
    const sp = SPECIES.find(s=>s.id===specId) || pick(SPECIES);
    const iv = { hp:r(0,6), atk:r(0,4), def:r(0,4), spd:r(0,4) };
    const trait = Math.random()<0.35 ? pick(sp.traitPool) : null;

    const bug = {
      uid: makeUID(),
      specId: sp.id,
      nickname: sp.name,
      type: sp.type,
      level,
      exp: 0,
      iv,
      trait,
      status: { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true },

      isLegendary: !!isLegendary,
      statMult: isLegendary ? LEGENDARY_STAT_MULT : 1,
      growthMult: isLegendary ? LEGENDARY_GROWTH_MULT : 1,

      hpMax: 1, atk:1, def:1, spd:1,
      hp: 1,
      isWild: !!isWild,
    };

    recalc(bug);
    bug.hp = bug.hpMax;
    return bug;
  }

  function ensureCoreState(state){
    // 旧セーブ互換にも効く初期化
    if(!state.route) state.route = "home";
    if(typeof state.coins !== "number") state.coins = 0;
    if(!Array.isArray(state.bugs)) state.bugs = [];
    if(!state.dex) state.dex = {};
    if(!state.battle) state.battle = { active:false, over:false, turn:"", log:[] };
    if(!Array.isArray(state.battle.log)) state.battle.log = [];
    if(!state.gacha) state.gacha = { last:null };

    // bugs が空なら初期個体を付与
    if(state.bugs.length === 0){
      const a = makeBug("kabuto", 2, false, false);
      const b = makeBug("kuwa", 1, false, false);
      const c = makeBug("bee", 1, false, false);
      state.bugs = [a,b,c];
      state.selectedUid = a.uid;
    }

    // 個体の整形
    for(const b of state.bugs){
      b.isLegendary = !!b.isLegendary;
      b.statMult = b.isLegendary ? LEGENDARY_STAT_MULT : (b.statMult || 1);
      b.growthMult = b.isLegendary ? LEGENDARY_GROWTH_MULT : (b.growthMult || 1);
      if(!b.status) b.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };
      recalc(b);
      if(typeof b.hp !== "number") b.hp = b.hpMax;
    }

    if(!state.selectedUid || !state.bugs.some(x=>x.uid===state.selectedUid)){
      state.selectedUid = state.bugs[0].uid;
    }

    // wild 互換
    if(state.wild){
      state.wild.isLegendary = !!state.wild.isLegendary;
      state.wild.statMult = state.wild.isLegendary ? LEGENDARY_STAT_MULT : (state.wild.statMult || 1);
      state.wild.growthMult = state.wild.isLegendary ? LEGENDARY_GROWTH_MULT : (state.wild.growthMult || 1);
      if(!state.wild.status) state.wild.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };
      recalc(state.wild);
      if(typeof state.wild.hp !== "number") state.wild.hp = state.wild.hpMax;
    }

    return state;
  }

  function getSelected(state){
    return state.bugs.find(b=>b.uid===state.selectedUid) || state.bugs[0];
  }

  // ===== 育成 =====
  function gainExp(state, bug, amount, sourceMode="atk"){
  bug.exp += amount;

  while(bug.exp >= expToNext(bug.level)){
    bug.exp -= expToNext(bug.level);
    bug.level++;

    const g = bug.growthMult || 1;

    // -----------------------------
    // レベルアップ時の成長（寄せで伸びが変わる）
    // ここが「ゲーム性」になる部分
    // -----------------------------

    // HPは毎回ちょい伸び（好みで調整）
    bug.iv.hp += r(0,1) * g;

    // 基本：そこそこ伸びる
    let atkChance = 0.70;
    let defChance = 0.70;
    let spdChance = 0.60;

    // 寄せ：対象だけ伸びやすくする
    if(sourceMode === "atk"){
      atkChance = 0.90;
      defChance = 0.60;
      spdChance = 0.55;
    }else if(sourceMode === "def"){
      atkChance = 0.60;
      defChance = 0.90;
      spdChance = 0.55;
    }else if(sourceMode === "spd"){
      atkChance = 0.60;
      defChance = 0.60;
      spdChance = 0.85;
    }else if(sourceMode === "trait"){
      // 特性トレは「伸びはやや控えめ＆均し」でもいい
      atkChance = 0.65;
      defChance = 0.65;
      spdChance = 0.60;
    }

    // 伸び量：寄せ対象は +1が出やすいようにする（好みで調整）
    const grow1 = () => (r(0,1) * g);         // 0 or 1
    const grow2 = () => ((r(0,1) + r(0,1)) * g); // 0〜2（寄せボーナス）

    if(Math.random() < atkChance) bug.iv.atk += (sourceMode==="atk" ? grow2() : grow1());
    if(Math.random() < defChance) bug.iv.def += (sourceMode==="def" ? grow2() : grow1());
    if(Math.random() < spdChance) bug.iv.spd += (sourceMode==="spd" ? grow2() : grow1());

    // -----------------------------
    // 特性獲得抽選（LvUP時）
    //  特性トレ: 1/50
    //  それ以外: 1/100
    // -----------------------------
    const sp = SPECIES.find(s=>s.id===bug.specId);

    if(!bug.trait){
      const rate = (sourceMode === "trait") ? (1/50) : (1/100);
      if(Math.random() < rate){
        // speciesごとのtraitPoolを使う（タイプ別特性はここで担保）
        if(sp && Array.isArray(sp.traitPool) && sp.traitPool.length){
          bug.trait = pick(sp.traitPool);
          pushLog(state, `🌟 特性が覚醒！「${bug.trait}」`);
        }
      }
    }

    recalc(bug);
    bug.hp = bug.hpMax;

    // ログ（どの寄せで上がったか分かるように）
    const tag =
      sourceMode==="atk" ? "ATK寄せ" :
      sourceMode==="def" ? "DEF寄せ" :
      sourceMode==="spd" ? "SPD寄せ" :
      sourceMode==="trait" ? "特性トレ" : "トレ";

    pushLog(state, `⬆️ レベルアップ！ Lv.${bug.level}${bug.isLegendary?"（伝説成長）":""} / ${tag}`);
  }

  recalc(bug);
}

  function trainSelected(state){
    // =============================
// 育成：トレーニング（mode付き）
// mode: "atk" | "def" | "spd" | "trait"
// =============================
const TRAIN_MAX = 3;
const TRAIN_REGEN_MS = 60 * 60 * 1000;

const TRAIN_CFG = {
  atk:   { label:"ATK寄せ",   success:0.80, expMin:6, expMax:10 },
  def:   { label:"DEF寄せ",   success:0.80, expMin:6, expMax:10 },
  spd:   { label:"SPD寄せ",   success:0.70, expMin:6, expMax:10 },
  trait: { label:"特性トレ",  success:0.55, expMin:5, expMax:9  },
};

function ensureTrain(state){
  if(!state.train){
    state.train = { points: TRAIN_MAX, last: Date.now() };
  }
  if(typeof state.train.points !== "number") state.train.points = TRAIN_MAX;
  if(typeof state.train.last !== "number") state.train.last = Date.now();
}

function tickTrain(state){
  ensureTrain(state);
  const now = Date.now();
  if(state.train.points >= TRAIN_MAX){
    state.train.last = now;
    return;
  }
  const elapsed = now - state.train.last;
  if(elapsed < TRAIN_REGEN_MS) return;
  const add = Math.floor(elapsed / TRAIN_REGEN_MS);
  state.train.points = Math.min(TRAIN_MAX, state.train.points + add);
  state.train.last += add * TRAIN_REGEN_MS;
}

function trainSelected(state, mode="atk"){
  const me = getSelected(state);

  if(me.hp <= 0){
    pushLog(state, "瀕死でトレーニングは無理。休ませて。");
    return;
  }

  tickTrain(state);
  if(state.train.points <= 0){
    pushLog(state, "🏋️ トレ回数がない（1時間で1回復 / 最大3）");
    return;
  }

  const cfg = TRAIN_CFG[mode] || TRAIN_CFG.atk;

  // 1回消費
  state.train.points -= 1;

  const ok = Math.random() < cfg.success;
  const gain = ok ? (cfg.expMin + r(0, cfg.expMax - cfg.expMin)) : 2 + r(0,2);

  pushLog(state, `🏋️ ${me.nickname} は ${cfg.label}！ ${ok ? "成功" : "失敗"} / EXP +${gain}`);

  // ★重要：gainExpに「どのトレで増えたEXPか」を渡す
  gainExp(state, me, gain, mode);
}

  function healSelected(state){
    const me = getSelected(state);
    me.hp = me.hpMax;
    me.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };
    pushLog(state, `🩹 ${me.nickname} は元気になった`);
  }

  // ===== バトル =====
  function effectiveSpd(b){
    let s = b.spd;
    if(b.status.slow>0) s = Math.floor(s*0.75);
    return s;
  }

  function applyStartTurn(state, b){
    if(b.status.poison>0){
      const dmg = Math.max(1, Math.floor(b.hpMax*0.06));
      b.hp = clamp(b.hp - dmg, 0, b.hpMax);
      b.status.poison--;
      pushLog(state, `☠️ ${b.isLegendary?"伝説の":(b.isWild?"野生の":"")}${b.nickname} は毒で ${dmg} ダメージ`);
    }
    if(b.trait==="夜行性" && Math.random()<0.18){
      const heal = Math.max(1, Math.floor(b.hpMax*0.05));
      b.hp = clamp(b.hp + heal, 0, b.hpMax);
      pushLog(state, `🌙 ${b.nickname} は回復（+${heal}）`);
    }
    if(b.trait==="不屈" && b.hp>0 && b.hp/b.hpMax<=0.3){
      pushLog(state, `🔥 ${b.nickname} の不屈が燃えてる`);
    }
    b.status.firstTurn = false;
  }

  function calcDamage(att, def, basePower, isSkill=false){
    let atk = att.atk;
    let d = def.def;

    if(att.trait==="突進") atk = Math.floor(atk*1.1);
    if(att.trait==="狂戦士"){
      const missing = 1 - (att.hp/att.hpMax);
      atk = Math.floor(atk * (1 + missing*0.35));
    }
    if(def.trait==="不屈" && def.hp/def.hpMax<=0.3) d = Math.floor(d*1.25);

    let dmg = (basePower + atk*1.15) - (d*0.9);
    dmg = Math.max(1, Math.floor(dmg));

    dmg = Math.floor(dmg * typeMul(att.type, def.type));

    if(def.status.guard>0) dmg = Math.floor(dmg*0.6);
    if(def.trait==="硬化") dmg = Math.floor(dmg*0.85);

    if(def.trait==="回避" && Math.random()<0.12){
      return { dmg:0, evaded:true, crit:false };
    }

    let critRate = isSkill ? 0.12 : 0.06;
    if(att.trait==="急所狙い" && isSkill) critRate += 0.12;
    if(att.status.critBuff>0) critRate += 0.18;

    const crit = Math.random()<critRate;
    if(crit) dmg = Math.floor(dmg*1.55);

    return { dmg, evaded:false, crit };
  }

  function afterHit(state, att, def, dealt, usedSkill=false){
    if(att.trait==="毒" && usedSkill && dealt>0 && Math.random()<0.35){
      def.status.poison = Math.max(def.status.poison, 3);
      pushLog(state, `☠️ 毒が回った！（3ターン）`);
    }
    if(att.trait==="拘束" && usedSkill && dealt>0 && Math.random()<0.35){
      def.status.slow = Math.max(def.status.slow, 2);
      pushLog(state, `🕸️ 動きが鈍った！（2ターン）`);
    }
    if(att.trait==="吸収" && dealt>0){
      const heal = Math.max(1, Math.floor(dealt*0.25));
      att.hp = clamp(att.hp + heal, 0, att.hpMax);
      pushLog(state, `🩸 吸収して回復（+${heal}）`);
    }
  }

  function endTurn(state){
    const me = getSelected(state);
    const wild = state.wild;

    if(me.status.guard>0) me.status.guard--;
    if(wild.status.guard>0) wild.status.guard--;
    if(me.status.slow>0) me.status.slow--;
    if(wild.status.slow>0) wild.status.slow--;
    if(me.status.critBuff>0) me.status.critBuff--;
    if(wild.status.critBuff>0) wild.status.critBuff--;

    if(me.hp<=0 || wild.hp<=0){
      state.battle.over = true;

      if(wild.hp<=0){
        pushLog(state, `✅ 勝利！ ${wild.isLegendary?"伝説の":"野生の"}${wild.nickname} を倒した`);
        const baseGain = 8 + wild.level*3;
        const mult = wild.isLegendary ? LEGENDARY_WIN_EXP_MULT : 1;
        const gain = baseGain * mult;
        gainExp(state, me, gain);

        const coinGain = 5 + wild.level + (wild.isLegendary ? 20 : 0);
        state.coins += coinGain;

        pushLog(state, `🎁 EXP +${gain}${wild.isLegendary?`（×${LEGENDARY_WIN_EXP_MULT}）`:""} / 🪙 +${coinGain}`);
        pushLog(state, `🫙 捕獲できるよ（捕獲ボタン）`);
      }else{
        pushLog(state, `💀 敗北… ${me.nickname} は倒れた`);
        pushLog(state, `🩹 『休ませる』して出直し`);
      }
      return;
    }

    state.battle.turn = (state.battle.turn==="me") ? "wild" : "me";
    window.MushiState.notify();
    if(state.battle.turn==="wild") wildAct(state);
  }

  function myAct(state, kind){
    if(!state.wild){ pushLog(state, "野生がいない。遭遇してね。"); return; }
    if(!state.battle.active || state.battle.over) return;

    const me = getSelected(state);
    const wild = state.wild;

    applyStartTurn(state, me);
    if(me.hp<=0){ endTurn(state); return; }

    if(kind==="attack"){
      const hits = (me.trait==="連撃" && Math.random()<0.2) ? 2 : 1;
      for(let i=0;i<hits;i++){
        const res = calcDamage(me, wild, 6, false);
        if(res.evaded) pushLog(state, `💨 ${wild.isLegendary?"伝説":"野生"}は回避した！`);
        else{
          wild.hp = clamp(wild.hp - res.dmg, 0, wild.hpMax);
          pushLog(state, `🗡️ ${me.nickname} のこうげき！ ${res.dmg} ダメージ${res.crit?"（会心）":""}`);
          afterHit(state, me, wild, res.dmg, false);
        }
        if(wild.hp<=0) break;
      }
    }

    if(kind==="guard"){
      me.status.guard = 1;
      pushLog(state, `🛡️ ${me.nickname} は身を固めた（次の被ダメ軽減）`);
      if(me.trait==="狡猾"){
        me.status.critBuff = 1;
        pushLog(state, `😼 狡猾：次ターン会心率UP`);
      }
    }

    if(kind==="skill"){
      const sp = SPECIES.find(s=>s.id===me.specId);
      let power = 10;
      if(me.type==="甲") power = 11;
      if(me.type==="刃") power = 12;
      if(me.type==="飛") power = 9;
      if(me.type==="糸") power = 8;

      const res = calcDamage(me, wild, power, true);
      if(res.evaded) pushLog(state, `💨 ${wild.isLegendary?"伝説":"野生"}は回避した！`);
      else{
        wild.hp = clamp(wild.hp - res.dmg, 0, wild.hpMax);
        pushLog(state, `✨ ${me.nickname} の「${sp.skill}」！ ${res.dmg} ダメージ${res.crit?"（会心）":""}`);
        afterHit(state, me, wild, res.dmg, true);
      }
    }

    endTurn(state);
  }

  function wildAct(state){
    const wild = state.wild;
    if(!wild || !state.battle.active || state.battle.over) return;

    applyStartTurn(state, wild);
    if(wild.hp<=0){ endTurn(state); return; }

    const roll = Math.random();
    const act = (wild.hp/wild.hpMax<0.35 && roll<0.35) ? "guard" : (roll<0.25 ? "attack" : "skill");

    if(act==="guard"){
      wild.status.guard = 1;
      pushLog(state, `🛡️ ${wild.isLegendary?"伝説の":"野生の"}${wild.nickname} は身構えた`);
      if(wild.trait==="狡猾") wild.status.critBuff = 1;
      endTurn(state);
      return;
    }

    const me = getSelected(state);
    const res = calcDamage(wild, me, act==="skill" ? 11 : 6, act==="skill");

    if(res.evaded) pushLog(state, `💨 ${me.nickname} は回避した！`);
    else{
      me.hp = clamp(me.hp - res.dmg, 0, me.hpMax);
      pushLog(state, `⚠️ ${wild.isLegendary?"伝説の":"野生の"}${wild.nickname} の${act==="skill"?"とくぎ":"こうげき"}！ ${res.dmg} ダメージ${res.crit?"（会心）":""}`);
      afterHit(state, wild, me, res.dmg, act==="skill");
    }

    endTurn(state);
  }

  function spawnWild(state){
    const my = getSelected(state);
    const spec = pick(SPECIES);

    const isLegendary = Math.random() < LEGENDARY_RATE;
    const lvl = isLegendary ? 1 : clamp(my.level + r(-1,2), 1, 50);

    const wild = makeBug(spec.id, lvl, true, isLegendary);

    // 野生は特性ちょい付きやすい
    if(!wild.trait && Math.random()<0.25){
      wild.trait = pick(spec.traitPool);
      recalc(wild);
      wild.hp = wild.hpMax;
    }

    state.wild = wild;
    state.battle = { active:false, over:false, turn:"", log:[] };

    if(isLegendary){
      pushLog(state, `👑 伝説の${wild.nickname} が現れた！！（Lv.${wild.level} / 能力値×${LEGENDARY_STAT_MULT}）`);
    }else{
      pushLog(state, `🌿 野生の${wild.nickname} が現れた！（Lv.${wild.level}）`);
    }
  }

  function startBattle(state){
    if(!state.wild){ pushLog(state, "野生がいない。遭遇してね。"); return; }
    const me = getSelected(state);
    if(me.hp<=0){ pushLog(state, "瀕死。休ませて。"); return; }

    state.battle.active = true;
    state.battle.over = false;

    me.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };
    state.wild.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };

    clearLog(state);
    pushLog(state, `⚔️ バトル開始！ ${me.nickname} vs ${state.wild.isLegendary ? "伝説の" : "野生の"}${state.wild.nickname}`);
    if(state.wild.isLegendary){
      pushLog(state, `👑 伝説補正：能力値×${LEGENDARY_STAT_MULT} / 勝利EXP×${LEGENDARY_WIN_EXP_MULT} / 成長×${LEGENDARY_GROWTH_MULT}`);
    }

    const ms = effectiveSpd(me);
    const ws = effectiveSpd(state.wild);
    state.battle.turn = (ms>ws) ? "me" : (ws>ms ? "wild" : (Math.random()<0.5 ? "me" : "wild"));
    pushLog(state, `▶️ 先手: ${state.battle.turn==="me" ? me.nickname : (state.wild.isLegendary?"伝説":"野生")}`);

    if(state.battle.turn==="wild") wildAct(state);
  }

  function tryCapture(state){
    if(!state.wild){ pushLog(state, "捕獲対象がいないよ"); return false; }
    if(!state.battle.active){ pushLog(state, "先にバトル開始してね"); return false; }
    if(!state.battle.over || state.wild.hp>0){
      pushLog(state, "まだ倒してない。勝ってから捕獲（試作ルール）");
      return false;
    }

    const me = getSelected(state);
    let base = state.wild.isLegendary ? 0.18 : 0.35;
    const lvlPenalty = clamp((state.wild.level - me.level)*0.05, -0.15, 0.25);
    const chance = clamp(base + 0.25 - lvlPenalty, 0.05, 0.85);

    if(Math.random() < chance){
      const got = state.wild;
      pushLog(state, `🫙 捕獲成功！ ${got.isLegendary ? "伝説の" : ""}${got.nickname} が仲間になった`);

      got.isWild = false;
      got.hp = got.hpMax;
      got.statMult = got.isLegendary ? LEGENDARY_STAT_MULT : (got.statMult||1);
      got.growthMult = got.isLegendary ? LEGENDARY_GROWTH_MULT : (got.growthMult||1);
      got.status = { poison:0, slow:0, guard:0, critBuff:0, firstTurn:true };

      state.bugs.push(got);
      state.dex[got.specId] = (state.dex[got.specId]||0) + 1;

      state.wild = null;
      state.battle.active = false;
      state.battle.over = false;
      return true;
    }else{
      pushLog(state, `🫙 捕獲失敗…（成功率 ${Math.round(chance*100)}%）`);
      return false;
    }
  }

  // ===== ガチャ（簡易）=====
  // 10連とか演出は後で盛れる。まず「引ける」「増える」が大事。
  function gachaPull(state, times=1){
    const cost = 10 * times;
    if(state.coins < cost){
      pushLog(state, `🪙 足りない（必要 ${cost} / 所持 ${state.coins}）`);
      return [];
    }
    state.coins -= cost;

    const results = [];
    for(let i=0;i<times;i++){
      // ガチャでも伝説を出したいなら 0.1% で伝説
      const isLegendary = Math.random() < LEGENDARY_RATE;

      const spec = pick(SPECIES);
      const lvl = isLegendary ? 1 : 1;

      const b = makeBug(spec.id, lvl, false, isLegendary);
      // ガチャ産は特性少しつきやすい
      if(!b.trait && Math.random()<0.35){
        b.trait = pick(spec.traitPool);
        recalc(b);
        b.hp = b.hpMax;
      }

      state.bugs.push(b);
      state.dex[b.specId] = (state.dex[b.specId]||0) + 1;
      results.push(b);
    }

    state.gacha.last = results.map(x => ({ uid:x.uid, specId:x.specId, nickname:x.nickname, isLegendary:x.isLegendary }));
    return results;
  }

  window.MushiCore = {
    LEGENDARY_RATE,
    LEGENDARY_STAT_MULT,
    LEGENDARY_WIN_EXP_MULT,
    LEGENDARY_GROWTH_MULT,
    SPECIES,
    TRAITS,
    expToNext,
    ensureCoreState,
    getSelected,
    recalc,
    makeBug,
    trainSelected,
    healSelected,
    spawnWild,
    startBattle,
    myAct,
    tryCapture,
    gachaPull,
  };
})();
