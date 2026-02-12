// .//modules/Combat/Reaction.ts

import maplebirch from '../../core';

interface TriggerItem {
  npc: string;
  cond: () => boolean;
  action: () => string;
}

interface Triggers {
  herm: TriggerItem[];
  crossdress: TriggerItem[];
}

interface TextConfig {
  CN: { s: string; m: string };
  EN: { s: string; m: string };
}

type TextsType = TextConfig | ((lang: 'CN' | 'EN', single: boolean) => string);

interface ReactionConfig {
  texts: TextsType;
  before?: string | (() => string);
  affter?: string | (() => string);
}

const _ = maplebirch.lodash;

const Reaction = {
  Triggers: { herm: [], crossdress: [] } as Triggers,
  HermNameList: ['Sydney', 'Kylar', 'Gwylan'] as string[],
  CDNameList:   ['Sydney', 'Kylar', 'Gwylan'] as string[],

  reg(type: 'herm' | 'crossdress', npc: string, cond: () => boolean, action: () => string): void {
    this.Triggers[type].push({ npc, cond, action });
    const list = type === 'herm' ? this.HermNameList : this.CDNameList;
    if (!_.includes(list, npc)) list.push(npc);
  },

  regReaction(type: 'herm' | 'crossdress', npc: string, config: ReactionConfig): void {
    this.reg(
      type,
      npc,
      () => !_.includes(V[`${npc.toLowerCase()}Seen`], type),
      () => {
        if (_.includes(V[`${npc.toLowerCase()}Seen`], type)) return '';
        const single = V.npc.length === 1;
        const lang = maplebirch.Language as 'CN' | 'EN';
        let output: string;
        if (_.isFunction(config.texts)) { output = config.texts(lang, single); }
        else { output = single ? config.texts[lang].s : config.texts[lang].m; }
        const before = _.isFunction(config.before) ? config.before() : (config.before || '');
        const affter = _.isFunction(config.affter) ? config.affter() : (config.affter || '');
        return `<<set $${npc.toLowerCase()}Seen.pushUnique('${type}')>>${before}${output}${affter}`;
      }
    );
  },

  check(type: 'herm' | 'crossdress'): string {
    const npcList = type === 'herm' ? this.HermNameList : this.CDNameList;
    const outputs: string[] = [];
    const filtered = _.filter(V.npc as string[], (n: string) => _.includes(npcList, n));
    _.forEach(filtered, (npcName: string) => {
      const triggers = _.filter(this.Triggers[type], t => t.npc === npcName && t.cond());
      _.forEach(triggers, trigger => {
        const output = trigger.action();
        if (output) outputs.push(output);
      });
    });
    return outputs.join('<br><br>');
  },

  init(): void {
    const reg = this.regReaction.bind(this);
    
    reg('herm', 'Sydney', {
      texts: {
        CN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>>惊奇地盯着你的<<genitals>>。<<else>><<He>>将好奇的目光投向你的<<genitals>>。<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>悉尼惊奇地盯着你的<<genitals>>。<<else>>悉尼将好奇的目光投向你的<<genitals>>。<</if>>` },
        EN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>> stares with wonder at your <<genitals>>.<<else>><<He>> eyes your <<genitals>> with great curiosity.<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>Sydney stares with wonder at your <<genitals>>.<<else>>Sydney eyes your <<genitals>> with great curiosity.<</if>>` }
      },
      affter: '<<npcincr Sydney purity -2>><<lspurity>><<set $speechhermaroused to 2>>'
    });

    reg('crossdress', 'Sydney', {
      before: '<<run statusCheck("Sydney")>>',
      texts: {
        CN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>>被你的<<genitals>>吓了一跳。虽然这不是<<he>>所期望的，但是<<he>>好像并不介意。<<else>><<He>>迷茫地看着你的<<genitals>>。这不是<<he>>所期望的，但是<<he>>好像并不在乎。<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>悉尼被你的<<genitals>>吓了一跳。虽然这不是<<nnpc_he 'Sydney'>>所期望的，但是<<nnpc_he 'Sydney'>>好像并不介意。<<else>>悉尼迷茫地看着你的<<genitals>>。这不是<<nnpc_he 'Sydney'>>所期望的，但是<<nnpc_he 'Sydney'>>好像并不在乎。<</if>>` },
        EN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>> looks taken aback by your <<genitals>>. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.<<else>><<He>> stares at your <<genitals>> with confusion. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>Sydney looks taken aback by your <<genitals>>. It wasn't what <<nnpc_he 'Sydney'>> was expecting, but <<nnpc_he 'Sydney'>> doesn't seem to mind.<<else>>Sydney stares at your <<genitals>> with confusion. It wasn't what <<nnpc_he 'Sydney'>> was expecting, but <<nnpc_he 'Sydney'>> doesn't seem to mind.<</if>>` }
      },
      affter: '<<npcincr Sydney purity -2>><<lspurity>><<set $speechcrossdressaroused to 2>>'
    });

    reg('herm', 'Kylar', {
      texts: {
        CN: { s: `<span class='purple'><<He>>挥了挥手，在看到你的<<genitals>>后，<<his>>呼吸急促起来。</span>`, m: `<span class='purple'>凯拉尔挥了挥手，在看到你的<<genitals>>后，<<nnpc_his 'Kylar'>>呼吸急促起来。</span>` },
        EN: { s: `<span class='purple'><<His>> hands shake and <<his>> breath quickens at the sight of your <<genitals>>.</span>`, m: `<span class='purple'>Kylar hands shake and <<nnpc_his 'Kylar'>> breath quickens at the sight of your <<genitals>>.</span>` }
      },
      affter: '<<set $enemyarousal += 50>><<set $speechhermaroused to 2>>'
    });

    reg('crossdress', 'Kylar', {
      before: '<<set _kylar to statusCheck("Kylar")>>',
      texts: (lang: 'CN' | 'EN', s: boolean) => {
        const p = T.kylar.gender !== V.player.sex || T.kylar.gender === 'h';
        const t = {
          CN: { s: { p: `你的<<genitals 1>>显然不是<<he>>所期望的，但是<<he>>好像并不在乎。<<if _kylar.gender isnot 'h'>><span class='purple'>事实上，如果从<<his>>兴奋着颤抖的双手来看，<<he>>是相当高兴的！</span><</if>>`, n: `当<<He>>看到你的<<genitals>>时，<<he>>似乎很失望。这不是<<he>>所期望的。` }, m: { p: `你的<<genitals 1>>显然不是凯拉尔所期望的，但是凯拉尔好像并不在乎。<<if _kylar.gender isnot 'h'>><span class='purple'>事实上，如果从<<nnpc_his 'Kylar'>>兴奋着颤抖的双手来看，<<nnpc_he 'Kylar'>>是相当高兴的！</span><</if>>`, n: `当凯拉尔看到你的<<genitals>>时，凯拉尔似乎很失望。这不是凯拉尔所期望的。` } },
          EN: { s: { p: `Your <<genitals 1>> was clearly not what <<he>> was expecting, but <<he>> doesn't seem to mind. <<if _kylar.gender isnot 'h'>><span class='purple'>In fact, if <<his>> shaking hands are anything to go by <<he>> is quite pleased.</span><</if>>`, n: `<<He>> looks disappointed by your <<genitals>>. It wasn't what <<he>> was expecting.` }, m: { p: `Your <<genitals 1>> was clearly not what kylar was expecting, but <<nnpc_he 'Kylar'>> doesn't seem to mind. <<if _kylar.gender isnot 'h'>><span class='purple'>In fact, if <<nnpc_his 'Kylar'>> shaking hands are anything to go by <<nnpc_he 'Kylar'>> is quite pleased.</span><</if>>`, n: `Kylar looks disappointed by your <<genitals>>. It wasn't what <<nnpc_he 'Kylar'>> was expecting.` } }
        };
        return s ? t[lang].s[p ? 'p' : 'n'] : t[lang].m[p ? 'p' : 'n'];
      },
      affter: () => {
        const p = T.kylar.gender !== V.player.sex || T.kylar.gender === 'h';
        return p ? '<<set $enemyarousal += 50>><<set $speechcrossdressaroused to 2>>' : '<<set $enemyarousal -= 100>><<set $enemytrust -= 50>><<set $speechcrossdressdisappointed to 2>>';
      }
    });

    reg('herm', 'Gwylan', {
      texts: {
        CN: { s: `<<He>>见到你的<<genitals>>后，稍稍睁大了眼睛。`, m: `格威岚见到你的<<genitals>>后，稍稍睁大了眼睛。` },
        EN: { s: `<<His>> eyebrows raise upon seeing your <<genitals>>.`, m: `Gwylan's eyebrows raise upon seeing your <<genitals>>.` }
      },
      affter: '<<set $speechhermaroused to 2>>'
    });

    reg('crossdress', 'Gwylan', {
      texts: {
        CN: { s: `<<He>>看到你的<<genitals>>时挠了挠头。虽然这不是<<he>>预想中的样子，但<<he>>似乎并不在意。`, m: `格威岚看到你的<<genitals>>时挠了挠头。虽然这不是<<nnpc_he 'Gwylan'>>预想中的样子，但<<nnpc_he 'Gwylan'>>似乎并不在意。` },
        EN: { s: `<<He>> scratches <<his>> head upon seeing your <<genitals>>. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.`, m: `Gwylan scratches <<nnpc_his 'Gwylan'>> head upon seeing your <<genitals>>. It wasn't what <<nnpc_he 'Gwylan'>> was expecting, but <<nnpc_he 'Gwylan'>> doesn't seem to mind.` }
      },
      affter: '<<set $speechcrossdressaroused to 2>>'
    });
  }
};

export default Reaction;