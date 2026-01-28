// @ts-check
/// <reference path='../maplebirch.d.ts' />
(() => {
  'use strict';

  const specialWidget = [
    `<<widget 'maplebirchTransformationMirror'>>
      <<set _modTransforms = []>>
      <<if V.maplebirch?.transformation>><<for _modName range Object.keys(V.maplebirch.transformation)>><<if V.maplebirch.transformation[_modName].level > 0>><<set _modTransforms.push(_modName)>><</if>><</for>><</if>>
      <<if _modTransforms.length>>
        <<for _modName range _modTransforms>>
          <<capture _modName>>
            <<set _config to maplebirch.char.transformation.config.get(_modName)>>
            <div class='settingsToggleItemWide'>
              <<if _config.icon>><<icon _config.icon>><</if>>
              <span class='gold bold'><<lanSwitch 'Mods: ' '模组：'>><<= maplebirch.t(_modName)>></span>
              <<if $transformationParts[_modName]>><<for _partName, $_partValue range $transformationParts[_modName]>><<capture _partName, $_partValue>>
                <<if $_partValue isnot 'disabled'>>
                  <<set _varPath to '$transformationParts.'+_modName+'.'+_partName>>
                  <div class='tf-part-item'><<= maplebirch.t(String(_partName))>>：<<lanListbox _varPath autoselect>><<option 'hidden' 'hidden'>><<option 'default' 'default'>><</lanListbox>></div>
                <</if>>
              <</capture>><</for>><</if>>
            </div>
          <</capture>>
        <</for>>
      <</if>>
      <<if !_modTransforms.every(transform => V.transformationParts[transform]?.horns is 'disabled') && ['demon', 'cow'].every(transform => T[transform].horns is 'disabled') || 
        !_modTransforms.every(transform => V.transformationParts[transform]?.tail is 'disabled') && ['demon', 'cat', 'cow', 'wolf', 'bird', 'fox'].every(transform => T[transform].tail is 'disabled') || 
        !_modTransforms.every(transform => V.transformationParts[transform]?.wings is 'disabled') && ['angel', 'fallen', 'demon', 'bird'].every(transform => T[transform].wings is 'disabled')>>
        <div class='settingsToggleItemWide no-numberify'>
          <span class='gold bold'><<lanSwitch 'Layer Adjustments: ' '图层调整：'>></span>
          <br><div class='no-numberify'>
          <<if !_modTransforms.every(transform => V.transformationParts[transform]?.horns is 'disabled')>>
            <<set _front_text to $hornslayer is 'front' ? 'Prioritise headwear over horns' : 'Prioritise horns over headwear'>>
            <<set _front_value to $hornslayer is 'front' ? 'back' : 'front'>>
            <<lanLink _front_text>><<run State.setVar('$hornslayer', _front_value)>><<run Engine.show()>><<updatesidebarimg true>><</lanLink>><br>
          <</if>>
          <<if !_modTransforms.every(transform => V.transformationParts[transform]?.tail is 'disabled')>>
            <<set _tail_text = $taillayer === 'front' ? 'Push tail back' : 'Move tail forward'>>
            <<set _tail_value = $taillayer === 'front' ? 'back' : 'front'>>
            <<lanLink _tail_text>><<run State.setVar('$taillayer', _tail_value)>><<run Engine.show()>><<updatesidebarimg true>><</lanLink>><br>
          <</if>>
          <<if !_modTransforms.every(transform => V.transformationParts[transform]?.wings is 'disabled')>>
            <<set _wings_text = $wingslayer === 'front' ? 'Push wings behind' : 'Move wings forward'>>
            <<set _wings_value = $wingslayer === 'front' ? 'back' : 'front'>>
            <<lanLink _wings_text>><<run State.setVar('$wingslayer', _wings_value)>><<run Engine.show()>><<updatesidebarimg true>><</lanLink>><br>
          <</if>>
        </div>
        <<script>>jQuery('.passage').on('change', 'select.macro-lanListbox', function (e) { maplebirch.SugarCube.Wikifier.wikifyEval('<<updatesidebarimg true>>'); });<</script>>
      <</if>>
    <</widget>>`,
    `<<widget 'maplebirchNPCHairStyleOptions'>>
      <span class='gold'><<lanSwitch 'Hair Style: ' '发型：'>></span><span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'Adjust hair style' '调整发型样式'>></span>">(?)</span><br> 
      <<lanSwitch 'Sides: ' '侧发：'>><<lanListbox  '$NPCName[_npcId].hair_side_type' autoselect>><<optionsfrom maplebirch.npc.Sidebar.hair_type('sides')>><</lanListbox>><br>
      <<lanSwitch 'Fringe: ' '刘海：'>><<lanListbox  '$NPCName[_npcId].hair_fringe_type' autoselect>><<optionsfrom maplebirch.npc.Sidebar.hair_type('fringe')>><</lanListbox>><br>
      <<radiobuttonsfrom '$NPCName[_npcId].hair_position' 'front[Sides in front,两侧头发在身体前]|back[Sides behind,两侧头发在身体后]'>><</radiobuttonsfrom>><br>
      <<numberStepper '<<lanSwitch "Length" "长度">>' $NPCName[_npcId].hairlength {max: 1000, callback: value => { V.NPCName[T.npcId].hairlength = value; $.wiki('<<replace #maplebirchNPCHairStyleOptions>><<maplebirchNPCHairStyleOptions>><</replace>>') }}>>
      <<set _NPCHairLength to (function(v) { if (v < 200) return 'ear'; if (v < 400) return 'neck'; if (v < 600) return 'chest'; if (v < 800) return 'waist'; if (v < 1000) return 'knees'; return 'ankles'; })($NPCName[_npcId].hairlength)>>
      <<radiobuttonsfrom '_NPCHairLength' 'ear[Ear,耳朵]|neck[Neck,颈部]|chest[Chest,胸前]|waist[Waist,腰际]|knees[Knees,膝盖]|ankles[Ankles,脚踝]'>>
        <<set $NPCName[_npcId].hairlength to { ear:0, neck:200, chest:400, waist:600, knees:800, ankles:1000 }[_NPCHairLength]>>
        <<replace #maplebirchNPCHairStyleOptions>><<maplebirchNPCHairStyleOptions>><</replace>>
      <</radiobuttonsfrom>>
    <</widget>>`
  ];

  const defaultData = {
    Init   : '<<run maplebirch.tool.framework.storyInit()>>',
    DataInit:'<<run maplebirch.trigger(":dataInit");>>',
    Header : '',
    Footer : '<<maplebirchFrameworkVersions>>',
    Information : '<<maplebirchFrameworkInfo>>',
    Options: `<<setupOptions>>
      <div class='settingsGrid'>
        <div class='settingsHeader options'>
          <span class='gold'><<lanSwitch 'Maplebirch Framework' '秋枫白桦框架'>></span>
        </div>
        <div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Current Framework Language' '当前框架语言'>></span>
          <<set _maplebirchLanguage to maplebirch.Language>>
          <<lanListbox '_maplebirchLanguage' autoselect>><<option 'English' 'EN'>><<option 'Chinese' 'CN'>><</lanListbox>>
        </div>
        <div class='settingsToggleItem'>
          <label><<checkbox '$options.maplebirch.npcschedules' false true autocheck>><<lanSwitch 'NPC Schedules' 'NPC 日程表'>></label>
          <span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'After enabling, it overrides the original schedule location detection for Robin and Sydney.' '启用后覆盖原版的罗宾和悉尼的日程地点检测。'>></span>">(?)</span>
        </div>
        <div class='settingsToggleItem maplebirch-relationcount-slider'><label>
            <span class='gold'><<lanSwitch 'Total Number Of Social Status Displays' '社交栏状态显示总数'>></span>
            <<numberslider '$options.maplebirch.relationcount' $options.maplebirch.relationcount 2 10 2 { value: v => \`\${v}\${lanSwitch(' types','种')}\`}>>
            <span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'Adjust the total number of status displays for Primary Relationships NPCs in the SOCIAL bar.' '调整社交栏中主要关系NPC的状态显示总数。'>></span>">(?)</span>
        </label></div>
        <div class='settingsToggleItem'></div>
        <div class='settingsToggleItemWide maplebirch-relationcount-slider'><label>
          <span class='gold'><<lanSwitch 'Close-up Mask Divider' '特写遮罩分割线'>></span><<numberslider '$options.maplebirch.character.mask' $options.maplebirch.character.mask -128 128 1 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${v}px\` }>>
          <<lanLink 'reset' 'capitalize'>><<set $options.maplebirch.character.mask to 0>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>>
        </label></div>
        <div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Standing illustration hair color gradient settings' '立绘发色渐变调整'>></span><br>
          <<radiobuttonsfrom '$options.maplebirch.character.charArt.type' 'fringe[Fringe,刘海]|sides[Sides,侧发]'>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</radiobuttonsfrom>>
          <<lanListbox '$options.maplebirch.character.charArt.select' autoselect>>
            <<option 'low ombré' 'low-ombre' 'title'>>
            <<option 'high ombré' 'high-ombre' 'title'>>
            <<option 'split' 'split' 'title'>>
            <<option 'face-framing highlights' 'face-frame' 'title'>>
          <</lanListbox>>
          <<lanLink 'reset' 'capitalize'>><<set $options.maplebirch.character.charArt.value to maplebirch.var.hairgradients()>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>>
          <<set _charArtStart to \`$options.maplebirch.character.charArt.value['\${$options.maplebirch.character.charArt.type}']['\${$options.maplebirch.character.charArt.select}'][0]\`>><br>
          <<lanSwitch 'Gradient Start: ' '渐变起点：'>><<numberbox _charArtStart $options.maplebirch.character.charArt.value[$options.maplebirch.character.charArt.type][$options.maplebirch.character.charArt.select][0]>>
          <div class='maplebirch-relationcount-slider'><label><<numberslider _charArtStart $options.maplebirch.character.charArt.value[$options.maplebirch.character.charArt.type][$options.maplebirch.character.charArt.select][0] 0 1 0.01 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${Math.floor(v*100)}%\` }>></label></div>
          <<set _charArtEnd to \`$options.maplebirch.character.charArt.value['\${$options.maplebirch.character.charArt.type}']['\${$options.maplebirch.character.charArt.select}'][1]\`>><br>
          <<lanSwitch 'Gradient End: ' '渐变终点：'>><<numberbox _charArtEnd $options.maplebirch.character.charArt.value[$options.maplebirch.character.charArt.type][$options.maplebirch.character.charArt.select][1]>>
          <div class='maplebirch-relationcount-slider'><label><<numberslider _charArtEnd $options.maplebirch.character.charArt.value[$options.maplebirch.character.charArt.type][$options.maplebirch.character.charArt.select][1] 0 1 0.01 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${Math.floor(v*100)}%\` }>></label></div>
        </div>
        <div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Close-up hair color gradient settings' '特写发色渐变调整'>></span><br>
          <<radiobuttonsfrom '$options.maplebirch.character.closeUp.type' 'fringe[Fringe,刘海]|sides[Sides,侧发]'>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</radiobuttonsfrom>>
          <<lanListbox '$options.maplebirch.character.closeUp.select' autoselect>>
            <<option 'low ombré' 'low-ombre' 'title'>>
            <<option 'high ombré' 'high-ombre' 'title'>>
            <<option 'split' 'split' 'title'>>
            <<option 'face-framing highlights' 'face-frame' 'title'>>
          <</lanListbox>>
          <<lanLink 'reset' 'capitalize'>><<set $options.maplebirch.character.closeUp.value to maplebirch.var.hairgradients()>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>>
          <<set _closeUpStart to \`$options.maplebirch.character.closeUp.value['\${$options.maplebirch.character.closeUp.type}']['\${$options.maplebirch.character.closeUp.select}'][0]\`>><br>
          <<lanSwitch 'Gradient Start: ' '渐变起点：'>><<numberbox _closeUpStart $options.maplebirch.character.closeUp.value[$options.maplebirch.character.closeUp.type][$options.maplebirch.character.closeUp.select][0]>>
          <div class='maplebirch-relationcount-slider'><label><<numberslider _closeUpStart $options.maplebirch.character.closeUp.value[$options.maplebirch.character.closeUp.type][$options.maplebirch.character.closeUp.select][0] 0 1 0.01 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${Math.floor(v*100)}%\` }>></label></div>
          <<set _closeUpEnd to \`$options.maplebirch.character.closeUp.value['\${$options.maplebirch.character.closeUp.type}']['\${$options.maplebirch.character.closeUp.select}'][1]\`>><br>
          <<lanSwitch 'Gradient End: ' '渐变终点：'>><<numberbox _closeUpEnd $options.maplebirch.character.closeUp.value[$options.maplebirch.character.closeUp.type][$options.maplebirch.character.closeUp.select][1]>>
          <div class='maplebirch-relationcount-slider'><label><<numberslider _closeUpEnd $options.maplebirch.character.closeUp.value[$options.maplebirch.character.closeUp.type][$options.maplebirch.character.closeUp.select][1] 0 1 0.01 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${Math.floor(v*100)}%\` }>></label></div>
        </div>
        <div class='settingsToggleItem'><label><<checkbox '$options.maplebirch.npcsidebar.show' false true autocheck>><<lanSwitch 'NPC Sidebar Image Display' 'NPC侧边栏图像显示'>></label><span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'After enabling the display, named NPCs will show their models when nearby.' '开启显示后命名NPC在附近将显示模型。'>></span>">(?)</span></div>
        <div class='settingsToggleItem'><label><<checkbox '$options.maplebirch.npcsidebar.model' false true autocheck>><<lanSwitch 'PC MODEL MODE' 'PC模型模式'>></label><span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'PC model mode is using the player character standing illustration data.' 'PC模型模式为是用玩家角色立绘数据。'>></span>">(?)</span></div>
        <div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Image Position: ' '图像位置：'>></span><<radiobuttonsfrom '$options.maplebirch.npcsidebar.position' 'front[Front,前置]|back[Back,后置]'>><<updatesidebarimg>><</radiobuttonsfrom>>
          <span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'Front: Model appears in front. Back: Model appears behind.' '前置：模型显示在前面。后置：模型显示在后面。'>></span>">(?)</span><br>
          <div class='maplebirch-relationcount-slider'><span class='gold'><<lanSwitch 'Model Mask: ' '模型遮罩：'>></span><<lanLink 'reset' 'capitalize'>><<set $options.maplebirch.npcsidebar.mask to 0>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>>
          <<numberslider '$options.maplebirch.npcsidebar.mask' $options.maplebirch.npcsidebar.mask -128 128 1 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${v}px\` }>></div>
          <span class='gold'><<lanSwitch 'Canvas Model Offset: ' '画布模型偏移：'>></span><<lanLink 'reset' 'capitalize'>><<set $options.maplebirch.npcsidebar.dxfn to -48>><<set $options.maplebirch.npcsidebar.dyfn to -8>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>><br>
          <div class='maplebirch-relationcount-slider'><label><<lanSwitch 'Horizontal Offset' '水平偏移'>><<numberslider '$options.maplebirch.npcsidebar.dxfn' $options.maplebirch.npcsidebar.dxfn -96 96 1 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${v}px\` }>></label></div>
          <div class='maplebirch-relationcount-slider'><label><<lanSwitch 'Vertical Offset' '垂直偏移'>><<numberslider '$options.maplebirch.npcsidebar.dyfn' $options.maplebirch.npcsidebar.dyfn -62 46 1 { onInputChange: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }, value: v => \`\${v}px\` }>></label></div>
        </div>
        <div class='settingsToggleItem'>
          <label><<checkbox '$options.maplebirch.npcsidebar.freckles' false true autocheck>><<lanSwitch 'Enable Freckles' '启用雀斑'>></label><br>
          <<switch $options.maplebirch.npcsidebar.ears>><<case 'front'>><<set _npcsidebarEars to lanSwitch('Position hair in front of ears','置头发于耳朵前')>><<set _npcsidebarEarsPosition to 'back'>><<default>><<set _npcsidebarEars to lanSwitch('Tuck hair behind ears','置头发于耳朵后')>><<set _npcsidebarEarsPosition to 'front'>><</switch>>
          <span class='gold'><<lanSwitch 'Ears Position: ' '耳朵位置：'>></span><<lanLink _npcsidebarEars 'class:teal'>><<set $options.maplebirch.npcsidebar.ears to _npcsidebarEarsPosition>><<updatesidebarimg>><<replace #customOverlayContent>><<maplebirchOptions>><</replace>><</lanLink>><br>
          <span class='gold'><<lanSwitch 'Face Style: ' '脸部类型：'>></span><label><<lanListbox '$options.maplebirch.npcsidebar.facevariant'>><<optionsfrom setup.faceStyleOptions>><</lanListbox>></label><br>
          <span class='gold'><<lanSwitch 'Face Demeanour: ' '脸部仪态：'>></span><label><<lanListbox '$options.maplebirch.npcsidebar.facevariant'>><<optionsfrom setup.faceVariantOptions[$options.maplebirch.npcsidebar.facestyle]>><</lanListbox>></label><br>
          <span class='gold'><<lanSwitch 'Skin Tone: ' '皮肤色调：'>></span><<set _npcsidebarSkinTone to ''>>
          <<radiobuttonsfrom '_npcsidebarSkinTone' '[Neutral,中性]|r[Warm,暖色]|g[Golden,金色]|y[Olive,橄榄色]|b[Cool,冷色]'>><<set $options.maplebirch.npcsidebar.skin_type to _npcsidebarSkinTone + _npcsidebarSkinShade>><</radiobuttonsfrom>><br>
          <span class='gold'><<lanSwitch 'Skin Shade: ' '肤色明暗：'>></span><<set _npcsidebarSkinShade to 'light'>>
          <<radiobuttonsfrom '_npcsidebarSkinShade' 'light[Light,明亮]|medium[Medium,适中]|dark[Dark,暗沉]|gyaru[Gyaru,辣妹]'>><<set $options.maplebirch.npcsidebar.skin_type to _npcsidebarSkinTone + _npcsidebarSkinShade>><</radiobuttonsfrom>>
          <span class='tooltip-anchor linkBlue' tooltip="<span class='teal'><<lanSwitch 'Skin Tone: The underlying tone of the skin. Cool, Warm, Golden, Olive, or Neutral. Skin Shade: The lightness or darkness of the skin surface. Gyaru is a tanned style.' '皮肤色调：皮肤的底层色调。冷色、暖色、金色、橄榄色或中性。肤色明暗：皮肤表面的明暗程度。辣妹为美黑风格。'>></span>">(?)</span><br>
          <<numberStepper '<<lanSwitch "Tan" "日晒">>' $options.maplebirch.npcsidebar.tan {max: 100, callback: value => { Wikifier.wikifyEval('<<updatesidebarimg>>'); }}>>
        </div>
        <div class='settingsToggleItemWide'>
          <<set _npcsidebarName = {}>>
          <<set setup.NPCNameList.forEach(name => T.npcsidebarName[maplebirch.auto(maplebirch.tool.convert(name, 'title'))] = name)>>
          <<lanListbox '$options.maplebirch.npcsidebar.nnpc' autoselect>><<optionsfrom _npcsidebarName>><</lanListbox>>
          <<if $options.maplebirch.npcsidebar.nnpc>>
            <<set _npcsidebarSet to maplebirch.npc.Sidebar.display.get($options.maplebirch.npcsidebar.nnpc) ?? new Set()>>
            <<if !['none'].concat(Array.from(_npcsidebarSet)).includes($options.maplebirch.npcsidebar.display[$options.maplebirch.npcsidebar.nnpc])>>
              <<set $options.maplebirch.npcsidebar.display[$options.maplebirch.npcsidebar.nnpc] = 'none'>>
            <</if>>
            <<set _fixedName = \`$options.maplebirch.npcsidebar.display.\${$options.maplebirch.npcsidebar.nnpc}\`>>
            <<set _npcsidebarDisplay = ['none'].concat(Array.from(_npcsidebarSet))>>
            <<lanSwitch 'Graphic Selection: ' '图形选择：'>><<radiobuttonsfrom _fixedName _npcsidebarDisplay>>
          <</if>>
        </div>
      </div><hr>`,
    Cheats : `
      <div class='settingsGrid'>
        <div id='ConsoleCheat' class='settingsToggleItemWide'>
          <details class='JSCheatConsole'>
            <summary class='JSCheatConsole'><span class='light-blue'>JavaScript <<lanSwitch 'Code Cheater' '作弊器'>></span></summary>
            <div class='searchButtons'>
              <div class='input-row'><<textbox '_maplebirchJSCheatConsole' ''>><<lanButton 'execute' 'capitalize'>><<run maplebirch.tool.console.execute('javascript')>><</lanButton>></div>
              <span id='js-cheat-console-status'></span>
            </div>
          </details>
          <details class='TwineCheatConsole'>
            <summary class='TwineCheatConsole'><span class='brightpurple'>Twine <<lanSwitch 'Code Cheater' '作弊器'>></span></summary>
            <div class='searchButtons'>
              <div class='input-row'><<textbox '_maplebirchTwineCheatConsole' ''>><<lanButton 'execute' 'capitalize'>><<run maplebirch.tool.console.execute('twine')>><</lanButton>></div>
              <span id='twine-cheat-console-status'></span>
            </div>
          </details>
        </div>
      </div>
      <div class='settingsGrid'>
        <div class='settingsHeader options'><<lanSwitch 'Mods Transformation' '模组转化'>></div>
        <<if Object.keys(V.maplebirch?.transformation).length>><div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Transformation Type' '转化种类'>></span><br>
          <<for _modName range Object.keys(V.maplebirch?.transformation)>>
            <<capture _modName>>
              <<set $_config to maplebirch.char.transformation.config.get(_modName)>>
              <<if $_config.icon>><<icon $_config.icon>><</if>>
              <<= maplebirch.t(_modName)>>：
              <<lanLink 'set' 'capitalize'>><<run maplebirch.char.transformation.setTransform(_modName)>><<updatesidebarimg>><</lanLink>> | 
              <<lanLink 'clear' 'capitalize'>><<run maplebirch.char.transformation.setTransform(_modName, 0)>><<updatesidebarimg>><</lanLink>>
            <</capture>>
            <br>
          <</for>>
        </div>
        <div class='settingsToggleItem'>
          <span class='gold'><<lanSwitch 'Transformation Points' '转化点数'>></span><br>
          <<for _modName range Object.keys(V.maplebirch?.transformation || {})>>
            <<capture _modName>>
              <<set _config to maplebirch.char.transformation.config.get(_modName)>>
              <<set _title to _config.icon ? \`<<icon _config.icon>> \${maplebirch.t(_modName)}\` : maplebirch.t(_modName)>>
              <<set _value to $maplebirch.transformation[_modName].build ?? 0>>
              <<numberStepper _title _value {
                callback: (value) => { 
                  V.maplebirch.transformation[_modName].build = value; 
                  maplebirch.char.transformation.updateTransform(_modName);
                  Wikifier.wikifyEval('<<updatesidebarimg>>'); 
                },
                max: _config.build || 100, 
                percentage: false, 
                colorArr: ['--teal', '--purple']
              }>>
            <</capture>>
          <</for>>
        </div><</if>>
      </div>`,
    NPCinit : `<<run maplebirch.npc._vanillaNPCInit(_nam)>>`,
    NPCspawn : `<<run maplebirch.npc.NPCSpawn(_nam, _npcno)>>`
  };

  const locationPassage = {
    StoryCaption: [
      { src: '<<schoolday>>\n\t\t<br>', to: '<<schoolday>>\n\t\t<div id="maplebirchCaptionTextBox">\n\t\t<<maplebirchCaptionDescription>>\n\t\t<br>' },
      { src: '<<allurecaption>>', applybefore: '<<maplebirchStatusBar>>\n\t\t\t' },
      { src: '<</button>>\n\t\t\t<div class="sidebarButtonSplit">', to: '<</button>>\n\t\t\t<<maplebirchMenuBig>>\n\t\t\t<div class="sidebarButtonSplit">' },
      { src: '</div>\n\t\t\t<div class="sidebarButtonSplit">', to: '</div>\n\t\t\t<div class="sidebarButtonSplit"><<maplebirchMenuSmall>></div>\n\t\t\t<div class="sidebarButtonSplit">' },
      { src: '<<goo>>', to: '<<maplebirchCaptionAfterDescription>>\n\t\t<<goo>>\n\t\t</div>' },
      { src: '<<if $options.sidebarStats isnot "disabled">>', applybefore: '<<maplebirchHintMobile>>\n\t\t\t' },
      { src: '<<mobileStats>>', applyafter: '\n\t\t\t\t<<maplebirchStatsMobile>>' },
    ]
  };

  const widgetPassage = {
    Characteristics: [
      { src: '<<bodywriting>>', applyafter: '\n\n\t<<maplebirchCharaDescription>>' },
      { src: '<</silently>>\n\n\t\t\t<<characteristic-box _purityConfig>>', applybefore: '\t<<maplebirchDegreesBonusDisplay>>\n\t\t\t' },
      { src: '</div>\n\n\t\t<!--Common states for skills with grades-->', applybefore: '\t<<maplebirchDegreesBox>>\n\t\t' },
      { src: '<</silently>>\n\t\t\t<<characteristic-box _skulduggeryConfig>>', applybefore: '\t<<maplebirchSkillsBonusDisplay>>\n\t\t\t' },
      { src: '<<characteristic-box _housekeepingConfig>>', applyafter: '\n\n\t\t\t<<maplebirchSkillsBox>>' },
      { src: '<</silently>>\n\n\t\t\t<<characteristic-box _scienceConfig>>', applybefore: '\t<<maplebirchSubjectBoxBonusDisplay>>\n\t\t\t' },
      { src: '</div>\n\t\t<div class="characteristic-box-extras">', applybefore: '\t<<maplebirchSchoolSubjectsBox>>\n\t\t' },
      { src: '<<characteristic-text _schoolPerformanceConfig>>', applyafter: '\n\n\t\t\t<<maplebirchSchoolMarksText>>' },
      { src: '\t\t</div>\n\t</div>', applybefore: '\t\t\t<<maplebirchWeaponBox>>\n\t\t' }
    ],
    overlayReplace: [
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleSaves">>', applybefore: '\t<<lanButton "mods settings" "title">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>\n\t\t<</lanButton>>\n\t' },
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleOptions">>', applybefore: '\t<<lanButton "mods cheats" "title">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #cheatsShown>><<maplebirchCheats>><</replace>>\n\t\t\t<<run $("#customOverlayContent").scrollTop(0);>>\n\t\t<</lanButton>>\n\t' },
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleFeats">>', applybefore: '\t<<lanButton "mods statistics" "title">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #customOverlayContent>><<maplebirchStatistics>><</replace>>\n\t\t<</lanButton>>\n\t' }
    ],
    'Options Overlay': [
      { src: '<</widget>>\n\n<<widget "setFont">>', applybefore: '\t<<maplebirchInformation>>\n' }
    ],
    npcNamed: [
      { src: '<</widget>>\n\n<<widget "npcNamedUpdate">>', applybefore: '\t<<run maplebirch.npc.injectModNPCs()>>\n' }
    ],
    Social: [
      { src: 'T.importantNPCs = T.importantNpcOrder', applybefore: 'maplebirch.npc.vanillaNPCConfig(T.npcConfig);\n\t\t\t\t' },
      { src: '<</silently>>\n\t\t\t<<relation-box-simple _policeBoxConfig>>', applybefore: '\t<<maplebirchReputationModify>>\n\t\t\t' },
      { src: '<<relation-box-wolves>>', applyafter: '\n\n\t\t<<maplebirchReputation>>' },
      { src: '<</silently>>\n\n\t\t\t<<relation-box-simple _sexFameBoxConfig>>', applybefore: '\t<<maplebirchFameModify>>\n\t\t\t' },
      { src: '<<relation-box-simple _overallFameBoxConfig>>', applyafter: '\n\n\t\t\t<<maplebirchFame>>' },
      { src: '\t</div>\n\t<br>', applybefore: '\t<<maplebirchStatusSocial>>\n\t' }
    ],
    'Widgets Named Npcs': [
      { srcmatch: /\t\t\t<<NPC_CN_NAME _npc>>|\t\t\t_npc/, to: '\t\t<<if Object.keys(maplebirch.npc.data).includes(_npc) && maplebirch.tool.widget.Macro.has(_npc+"relationshiptext")>>\n\t\t\t<<= maplebirch.auto(_npc)>><<= "<<"+_npc+"relationshiptext>>">>\n\t\t<<else>>\n\t\t\t<<= maplebirch.auto(_npc)>>' },
      { src: '<</if>>\n\t<</switch>>\n<</widget>>', to: '<</if>>\n\t\t<</if>>\n\t<</switch>>\n<</widget>>' },
      { src: '<</if>>\n<</widget>>\n\n<<widget "initNNPCClothes">>', applybefore: '\t<<maplebirchNPCinit _nam>>\n\t' },
      { src: '<</widget>>\n\n<<widget "npcrelationship">>', applybefore: '\t<<maplebirchNPCspawn _nam _npcno>>\n\t' },
    ],
    'Widgets Settings': [
      { srcmatch: /_npcList\[(?:setup\.NPC_CN_NAME\()?_sortedNPCList\[\$_\w+\](?:\))?\]/, to: '_npcList[maplebirch.auto(_sortedNPCList[$_i])]' },
      { srcmatch: /<<run delete _npcList\["(?:象牙怨灵|Ivory Wraith)"\]>>/, to: '<<run delete _npcList[maplebirch.auto("Ivory Wraith")]>>' },
      { srcmatch: /(?:<<NPC_CN_NAME \$NPCName\[_npcId\]\.nam>>——<span style="text-transform: capitalize;"><<print[\s\S]*?>><\/span>|\$NPCName\[_npcId\]\.nam the <span style="text-transform: capitalize;">\$NPCName\[_npcId\]\.title<\/span>|<<NPC_CN_NAME \$NPCName\[_npcId\]\.nam>>——<span style="text-transform: capitalize;"><<print setup\.NPC_CN_TITLE\(\$NPCName\[_npcId\]\.title\)>><\/span>)/, to: '<<= maplebirch.auto($NPCName[_npcId].nam) + (maplebirch.Language is "CN" ? "——" : " the ")>><span style="text-transform: capitalize;"><<= maplebirch.auto($NPCName[_npcId].title)>></span>' },
      { srcmatchgroup: /<<if _npcList\[(?:\$NPCName\[_npcId\]\.nam(?:\.replace\([^)]+\))*|setup\.NPC_CN_NAME\(\$NPCName\[_npcId\]\.nam\))\] is undefined>>/g, to: '<<if _npcList[maplebirch.lang.t($NPCName[_npcId].nam)] is undefined>>' },
      { src: '\t\t\t</span>\n\t\t</div>\n\t\t<div class="settingsToggleItem">\n\t\t\t<span class="gold">', applybefore: '\t\t\t<<if $debug is 1>>| <label><<radiobutton "$NPCName[_npcId].pronoun" "n" autocheck>><<= maplebirch.lang.t("hermaphrodite")+"/"+maplebirch.lang.t("asexual")>></label><</if>>\n' },
      { src: '</span>\n\t\t\t<</if>>\n\t\t</div>', applyafter: '\n\t\t<div id="maplebirchNPCHairStyleOptions" class="settingsToggleItemWide"><<maplebirchNPCHairStyleOptions>></div>' },
    ],
    Widgets: [
      { src: 'T.getStatConfig = function(stat) {', applybefore: 'maplebirch.npc.applyStatDefaults(statDefaults);\n\t\t\t' },
      { srcmatchgroup: /\t_npcData.nam|\t<<NPC_CN_NAME _npcData.nam>>/g, to: '\t<<= maplebirch.auto(_npcData.nam)>>' },
      { srcmatchgroup: /(?:<<print\s*_npcData\.title(?:\.replace\([^)]+\))+>>|<<print setup\.NPC_CN_TITLE\(_npcData\.title\)>>|The _npcData\.title)/g, to: '<<= (maplebirch.Language is "CN" ? "" : "The ") + maplebirch.auto(_npcData.title)>>' },
      { srcmatchgroup: /<<for _j to \$_statCount; _j lt 3; _j\+\+>>/g, to: '<<for _j to $_statCount; _j lt (($options.maplebirch?.relationcount ?? 4) - 1); _j++>>' },
    ],
    Traits: [
      { src: '<div id="traitListsSearch">', applybefore: '<<run maplebirch.tool.other.initTraits(_traitLists)>>\n\t' }
    ],
    'Widgets Journal': [
      { srcmatch: /<<print\s*("It is "\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*",\s*"\s*\+\s*Time\.year\s*\+\s*"\."|"今天是"\s*\+\s*Time\.year\s*\+\s*"年"\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*"。"|ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"\s*"\s*\+\s*Time\.monthName\.slice\(0,3\)|Time\.month\s*\+\s*"月"\s*\+\s*ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"日")\s*>>/, to: '<<= maplebirch.state.TimeManager.updateTimeLanguage("JournalTime")>>' },
      { src: '<br>\n<</widget>>', applybefore: '<br><hr>\n\t<<maplebirchJournal>>\n' },
    ],
    'Widgets Mirror': [
      { src: '<</if>>\n\t\t<<if ![', to: '<</if>>\n\t\t<<maplebirchTransformationMirror>>\n\t\t<<if ![' },
      { src: '<<tficon $_icon>>', to: '<<= maplebirch.char.transformation.icon>>' },
    ],
    'Widgets Ejaculation': [
      { srcmatch: /<<if \$npc\[\$npcrow\.indexOf\(_nn\)\] is "Eden"\s*>>[\s\S]*?<<ejaculation-wraith _args\[0\]>>\s*/, to: '<<if !!maplebirch.combat.ejaculation(_nn, _args[0])>>\n\t\t\t\t<<= maplebirch.combat.ejaculation(_nn, _args[0])>>' },
    ],
    'Widgets NPCs': [
      { src: '<<if $genderknown.includes($npc[_iii])>>', to: '<<if maplebirch.tool.contains($genderknown, $npc)>>' },
      { srcmatch: /<<if \$npc\.length is 1 and \(\["Kylar","Sydney","Gwylan"\]\.includes\(\$npc\[0\]\)\)>>[\s\S]*?<<if \$npc\[0\] is "Sydney" and !\$sydneySeen\.includes\("herm"\)\s*>>[\s\S]*?<<set \$sydneySeen\.pushUnique\("herm"\)>>[\s\S]*?<<elseif \$npc\[0\] is "Kylar">>[\s\S]*?<<elseif \$npc\[0\] is "Gwylan" and !\$gwylanSeen\.includes\("herm"\)>>[\s\S]*?<<\/if>>/, to: '<<if $npc.some(npc => maplebirch.combat.Reaction.HermNameList.includes(npc))>>\n\t\t\t\t<<= maplebirch.combat.Reaction.check("herm")>>'},
      { srcmatch: /<<if \$npc\.length is 1 and \(\["Kylar","Sydney","Gwylan"\]\.includes\(\$npc\[0\]\)\)>>\s*<<if \$npc\[0\] is "Sydney" and !\$sydneySeen\.includes\("crossdress"\)\s*>>\s*<<set \$sydneySeen\.pushUnique\("crossdress"\)>>[\s\S]*?<<elseif \$npc\[0\] is "Kylar">>[\s\S]*?<<elseif \$npc\[0\] is "Gwylan" and !\$gwylanSeen\.includes\("crossdress"\)>>[\s\S]*?<<\/if>>/, to: '<<if $npc.some(npc => maplebirch.combat.Reaction.CDNameList.includes(npc))>>\n\t\t\t\t<<= maplebirch.combat.Reaction.check("crossdress")>>'},
    ],
    'Widgets Speech': [
      { src: '<</if>>\n\t<</switch>>', to: '<</if>>\n\t\t<<default>><<set $_text_output to maplebirch.combat.Speech.output(_args[0])>>\n\t<</switch>>' },
    ]
  };

  maplebirch.once(':framework-init', (/**@type {frameworks}*/data) => {
    Object.assign(data, {
      specialWidget,
      default: defaultData,
      locationPassage,
      widgetPassage
    });
  });
})();