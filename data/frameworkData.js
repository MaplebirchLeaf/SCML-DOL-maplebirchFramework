(() => {
  'use strict';
  const maplebirch = window.maplebirch;

  const specialWidget = [
    `<<widget "maplebirchReplace">>
      <<set _key to _args[0]>>
      <<if !_key>><<exit>><</if>>
      <<if _currentOverlay is _key>>
        <<run closeOverlay()>>
        <<exit>>
      <</if>>
      <<script>>
        T.buttons.toggle();
        updateOptions();
        T.currentOverlay = T.key;
        $("#customOverlay").removeClass("hidden").parent().removeClass("hidden");
        $("#customOverlay").attr("data-overlay", T.currentOverlay);
      <</script>>
      <<if _args[1] is 'customize'>><<= '<<'+_key+'>>'>><<exit>><</if>>
      <<if _args[1] is 'title'>><<set _titleKey to "title" + maplebirch.tool.convert(_key,'pascal')>><</if>>
      <<if maplebirch.tool.widget.Macro.has(_titleKey)>><<replace #customOverlayTitle>><<= '<<'+_titleKey+'>>'>><</replace>><</if>>
      <<replace #customOverlayContent>><<= '<<'+_key+'>>'>><</replace>>
    <</widget>>`,
    `<<widget 'maplebirch-playback'>>
      <div class="settingsToggleItemWide">
        <details class="maplebirch-playback">
          <summary class="maplebirch-playback"><<= maplebirch.t('music player')>></summary>
          <div class="maplebirch-playback-content">
            <<set $maplebirch.audio.playlist to maplebirch.audio.getPlayer(_args[0]).audioKeys>>
            <<for _key range $maplebirch.audio.playlist>>
              <<capture _key>>
              <<link _key>>
                <<run $maplebirch.audio.currentTrack = _key>>
                <<run $maplebirch.audio.currentIndex = $maplebirch.audio.playlist.indexOf(_key)>>
                <<run maplebirch.audio.getPlayer(_args[0]).stopAll()>>
                <<run maplebirch.audio.getPlayer(_args[0]).play(_key, { loop: V.maplebirch.audio.loopMode === "single" })>>
                <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
              <</link>><br>
              <</capture>>
            <</for>><br>
            <div id='maplebirch-playback-controls'><<maplebirch-playback-controls _args[0]>></div><br>
            <<= maplebirch.t('import audio')>>: <input type='file' accept='audio/*' onchange='maplebirch.audio.addAudioFromFile(this.files[0]).then(success => {if (success) maplebirch.audio.initStorage()});'>
            <<set $_clearCache to maplebirch.t('Clear',true)+maplebirch.t('Cache')>>
            <<link $_clearCache>><<set $maplebirch.audio.storage to {}>><</link>>
          </div>
        </details>
      </div>
    <</widget>>`,
    `<<widget 'maplebirch-playback-controls'>>
      <<set _playing to maplebirch.audio.getPlayer(_args[0]) ? maplebirch.audio.getPlayer(_args[0]).isPlaying() : []>>
      <<if !V.maplebirch.audio.currentAudio>>
        <<set V.maplebirch.audio.currentAudio to _playing[0] ? _playing[0] : V.maplebirch.audio.currentTrack>>
      <</if>>
      <<if !V.maplebirch.audio.volume>><<set V.maplebirch.audio.volume = 1.0>><</if>>
      <<set _isPaused to false>>
      <<if maplebirch.audio.getPlayer(_args[0]) && maplebirch.audio.getPlayer(_args[0]).pausedStates && V.maplebirch.audio.currentTrack>>
        <<set _isPaused to maplebirch.audio.getPlayer(_args[0]).pausedStates.has('maplebirch-audio:' + V.maplebirch.audio.currentTrack)>>
      <</if>>
      <div class="current-track-display">
        <<if V.maplebirch.audio.currentTrack>>
          <<= maplebirch.t('currently playing')>>: <strong><span class='gold'><<= V.maplebirch.audio.currentTrack>></span></strong>
          <<if V.maplebirch.audio.loopMode === "single">>(<<= maplebirch.t('single repeat')>>)<</if>>
        <<else>>
          <<= maplebirch.t('there are no tracks playing')>>
        <</if>>
      </div>
      <<if V.maplebirch.audio.currentTrack && maplebirch.audio.getPlayer(_args[0])>>
        <<set _duration to maplebirch.audio.getPlayer(_args[0]).getDuration(V.maplebirch.audio.currentTrack)>>
        <<set _currentTime to 0>>
        <<set _progress to 0>>
        <<if _playing.includes(V.maplebirch.audio.currentTrack)>>
          <<set _matchKey to Array.from(maplebirch.audio.getPlayer(_args[0]).activeSources.keys()).find(k => k.startsWith(\`maplebirch-audio:\${V.maplebirch.audio.currentTrack}\`))>>
          <<if _matchKey>>
            <<set _source to maplebirch.audio.getPlayer(_args[0]).activeSources.get(_matchKey)>>
            <<set _currentTime to Math.min(_duration, maplebirch.audio.getPlayer(_args[0]).audioManager.audioContext.currentTime - _source.playStartTime + _source.currentOffset)>>
            <<set _progress to Math.round((_currentTime / _duration) * 1000)>>
          <</if>>
        <</if>>
        <div class="audio-progress-container">
          <input id="maplebirch-progress-range" class="maplebirch-progress" type="range" min="0" max="1000" step="1" value="<<= _progress>>" style="width: 100%;" disabled>
          <div class="audio-time-display">
            <<= Math.floor(_currentTime / 60)>>:<<= ('0' + Math.floor(_currentTime % 60)).slice(-2)>> / 
            <<= Math.floor(_duration / 60)>>:<<= ('0' + Math.floor(_duration % 60)).slice(-2)>>
          </div>
        </div>
        <<script>>
          (function() {
            const player = maplebirch.audio.getPlayer(T.args[0]);
            const currentTrack = V.maplebirch.audio.currentTrack;
            if (!player || !currentTrack) return;
            if (V.maplebirch.audio.progressTimer) clearInterval(V.maplebirch.audio.progressTimer);
            V.maplebirch.audio.progressTimer = setInterval(() => {
              const baseKey = \`maplebirch-audio:\${currentTrack}\`;
              const matchKey = Array.from(player.activeSources.keys()).find(k => k.startsWith(baseKey));
              let currentTime = 0;
              const duration = player.getDuration(currentTrack) || 0;
              if (duration === 0) {
                $('#maplebirch-playback-controls input[type="range"]').val(0);
                $('#maplebirch-playback-controls .audio-time-display').html('0:00 / 0:00');
                return;
              }
              if (matchKey) {
                const sourceWrapper = player.activeSources.get(matchKey);
                const source = sourceWrapper.source;
                const elapsed = player.audioManager.audioContext.currentTime - sourceWrapper.playStartTime;
                if (source.loop) {
                  const loopStart = (typeof source.loopStart === 'number' && source.loopStart >= 0) ? source.loopStart : 0;
                  let loopEnd;
                  if (typeof source.loopEnd === 'number' && source.loopEnd > loopStart) {
                    loopEnd = source.loopEnd;
                  } else {
                    loopEnd = duration;
                  }
                  let loopDuration = loopEnd - loopStart;
                  if (!(loopDuration > 0)) loopDuration = duration;
                  const baseOffset = sourceWrapper.currentOffset || 0;
                  const relative = (baseOffset + elapsed) % loopDuration;
                  currentTime = loopStart + relative;
                } else {
                  currentTime = Math.min(duration, (sourceWrapper.currentOffset || 0) + elapsed);
                }
              } else if (player.pausedStates.has(baseKey)) {
                currentTime = player.pausedStates.get(baseKey).offset || 0;
              }
              const progress = Math.min(1000, Math.max(0, Math.round((currentTime / duration) * 1000)));
              $('#maplebirch-playback-controls input.maplebirch-progress').val(progress);
              const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
              };
              $('#maplebirch-playback-controls .audio-time-display').html(\`\${formatTime(currentTime)} / \${formatTime(duration)}\`);
            }, 100);
          })();
        <</script>>
      <</if>>
      <div class="audio-controls">
        <<langlink 'previous song'>>
          <<if V.maplebirch.audio.currentIndex > 0>>
            <<set V.maplebirch.audio.currentIndex to V.maplebirch.audio.currentIndex - 1>>
          <<else>>
            <<set V.maplebirch.audio.currentIndex to V.maplebirch.audio.playlist.length - 1>>
          <</if>>
          <<set V.maplebirch.audio.currentTrack to V.maplebirch.audio.playlist[V.maplebirch.audio.currentIndex]>>
          <<run maplebirch.audio.getPlayer(_args[0]).stopAll()>>
          <<run maplebirch.audio.getPlayer(_args[0]).play(V.maplebirch.audio.currentTrack, {loop: V.maplebirch.audio.loopMode === "single", volume: V.maplebirch.audio.volume})>>
          <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
        <</langlink>>
        <<if _playing.includes(V.maplebirch.audio.currentTrack)>>
          <<langlink 'pause'>>
            <<run maplebirch.audio.getPlayer(_args[0]).togglePause(V.maplebirch.audio.currentTrack)>>
            <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
          <</langlink>>
        <<elseif _isPaused>>
          <<langlink 'resume'>>
            <<run maplebirch.audio.getPlayer(_args[0]).togglePause(V.maplebirch.audio.currentTrack)>>
            <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
          <</langlink>>
        <<elseif V.maplebirch.audio.currentTrack>>
          <<langlink 'playback'>>
            <<run maplebirch.audio.getPlayer(_args[0]).play(
              V.maplebirch.audio.currentTrack,
              { loop: V.maplebirch.audio.loopMode === "single", volume: V.maplebirch.audio.volume, stopOthers: false }
            )>>
            <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
          <</langlink>>
        <</if>>
        <<langlink 'next song'>>
          <<if V.maplebirch.audio.currentIndex < V.maplebirch.audio.playlist.length - 1>>
            <<set V.maplebirch.audio.currentIndex to V.maplebirch.audio.currentIndex + 1>>
          <<else>>
            <<set V.maplebirch.audio.currentIndex to 0>>
          <</if>>
          <<set V.maplebirch.audio.currentTrack to V.maplebirch.audio.playlist[V.maplebirch.audio.currentIndex]>>
          <<run maplebirch.audio.getPlayer(_args[0]).stopAll()>>
          <<run maplebirch.audio.getPlayer(_args[0]).play(V.maplebirch.audio.currentTrack, {loop: V.maplebirch.audio.loopMode === "single", volume: V.maplebirch.audio.volume})>>
          <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
        <</langlink>>
        <<langlink 'stop'>>
          <<run maplebirch.audio.getPlayer(_args[0]).stopAll()>>
          <<set V.maplebirch.audio.currentTrack to null>>
          <<set V.maplebirch.audio.currentIndex to -1>>
          <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
        <</langlink>>
        <<langlink 'loop mode'>>
          <<if V.maplebirch.audio.loopMode === "none">>
            <<set V.maplebirch.audio.loopMode to "single">>
          <<else>>
            <<set V.maplebirch.audio.loopMode to "none">>
          <</if>>
          <<replace "#maplebirch-playback-controls">><<maplebirch-playback-controls _args[0]>><</replace>>
        <</langlink>>
      </div>
      <label><<= maplebirch.t('volume')>>:</label>
      <<numberslider '$maplebirch.audio.volume' $maplebirch.audio.volume 0 1 0.01 {
        value: v => Math.round(v * 100) + '%',
        onInputChange: value => {
          maplebirch.audio.getPlayer(_args[0]).setVolume(value);
        }
      }>>
    <</widget>>`,
    `<<widget 'maplebirch-npc-model'>>
      <div id="img-npc">
        <<selectmodel "npcmodel" "sidebar">>
        <<if $options.sidebarAnimations>>
          <<animatemodel 'mainCanvas'>>
        <<else>>
          <<rendermodel 'mainCanvas'>>
        <</if>>
      </div>
    <</widget>>`
  ];

  const defaultData = {
    Init   : '<<run maplebirch.tool.framework.storyInit()>>',
    DataInit:'<<run maplebirch.trigger(":dataInit");>>',
    Header : '',
    Footer : '<<maplebirchFrameworkVersions>>',
    Information : '<<maplebirchFrameworkInfo>>',
    Options: `
      <<setupOptions>>
      <div class="settingsGrid">
        <div class="settingsHeader options">
          <span class="gold"><<= maplebirch.t("Maplebirch Frameworks")>></span>
        </div>
        <div class="settingsToggleItem">
          <span class="gold"><<= maplebirch.t("Current Mods Language Setting")>>:</span>
          <<set _selectedLang to maplebirch.lang.language>>
          <<set _langOptions = { [maplebirch.t('English')]: "EN", [maplebirch.t('Chinese')]: "CN", }>>
          <<listbox "_selectedLang" autoselect>><<optionsfrom _langOptions>><</listbox>>
        </div>
        <div class="settingsToggleItem">
          <label><<checkbox "$options.maplebirch.debug" false true autocheck>><<= maplebirch.t('DEBUG')+maplebirch.t('Mode')>></label>
        </div>
        <div class="settingsToggleItem">
          <span class="gold"><<= maplebirch.tool.convert(maplebirch.t('maplebirch',true)+maplebirch.t('sidebar',true)+maplebirch.t('position',true)+maplebirch.t('selection'),'capitalize')>>：</span>
          <span class="tooltip-anchor linkBlue" tooltip="<span class='teal'><<lanSwitch 'Update next time the interface is opened' '在下次打开界面时更新'>></span>">(?)</span><br>
          <<set _modHintLocation = {
            [maplebirch.t('mobile client')]: "mobile",
            [maplebirch.t('desktop client')]: "desktop",
            [maplebirch.t('disable')]: "disable"
          }>>
          <<listbox "$options.maplebirch.modHint" autoselect>><<optionsfrom _modHintLocation>><</listbox>>
        </div>
        <div class="settingsToggleItem">
          <<set _npcsidebarName = {}>>
          <<set setup.NPCNameList.forEach(name => T.npcsidebarName[maplebirch.autoTranslate(maplebirch.tool.convert(name, 'title'))] = name)>>
          <label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.npcsidebar.show" false true autocheck>><<= maplebirch.tool.convert('NPC '+maplebirch.t('model',true)+maplebirch.t('display',true),'title')>></label> |
          <label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.npcsidebar.model" false true autocheck>><<= maplebirch.tool.convert(maplebirch.t('canvas')+maplebirch.t('Mode'),'pascal')>></label>
          <span class="tooltip-anchor linkBlue" tooltip="<span class='teal'><<lanSwitch 'After enabling the display, named NPCs will show their models when nearby, with the canvas mode set to the player model' '开启显示后命名NPC在附近将显示模型，画布模式为玩家模型'>></span>">(?)</span><br>
          <<listbox "$options.maplebirch.npcsidebar.nnpc" autoselect>><<optionsfrom _npcsidebarName>><</listbox>><br>
          <<if $options.maplebirch.npcsidebar.nnpc>>
            <<if !['none'].concat(Array.from(maplebirch.npc.Sidebar.display[$options.maplebirch.npcsidebar.nnpc])).includes($options.maplebirch.npcsidebar.display[$options.maplebirch.npcsidebar.nnpc])>>
              <<set $options.maplebirch.npcsidebar.display[$options.maplebirch.npcsidebar.nnpc] = 'none'>>
            <</if>>
            <<set _fixedName = \`$options.maplebirch.npcsidebar.display.\${$options.maplebirch.npcsidebar.nnpc}\`>>
            <<set _npcsidebarDisplay = ['none'].concat(Array.from(maplebirch.npc.Sidebar.display[$options.maplebirch.npcsidebar.nnpc]))>>
            <<= maplebirch.tool.convert(maplebirch.t('graphic',true)+maplebirch.t('selection'), 'capitalize')>>：<<radiobuttonsfrom _fixedName _npcsidebarDisplay>>
          <</if>>
        </div>
        <div class="settingsToggleItem">
          <span class="gold"><<= maplebirch.tool.convert(maplebirch.t('maplebirch',true)+maplebirch.t('celestial phenomenons',true)+maplebirch.t('settings'),'capitalize')>>：</span><br>
          <label><<checkbox "$options.maplebirch.solarEclipse" false true autocheck>><<= maplebirch.t('solar eclipse')>></label>
          <span class="tooltip-anchor linkBlue" tooltip="<span class='teal'><<lanSwitch 'When enabled, a solar eclipse will occur in the specified month.' '启用后将在指定月份出现日蚀'>></span>">(?)</span>
        </div>
      </div><hr>`,
    Cheats : `
      <div class="settingsGrid">
        <div class="settingsHeader options">
          <span class="gold"><<= maplebirch.t("Mods Cheats")>></span>
        </div>
        <<if $options.maplebirch.debug>><<run maplebirch.trigger("update")>>
          <div class="settingsToggleItem"><label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.sandbox.V" false true autocheck>> V <<= maplebirch.t('permission')>></label></div>
          <div class="settingsToggleItem"><label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.sandbox.T" false true autocheck>> T <<= maplebirch.t('permission')>></label></div>
          <div class="settingsToggleItem"><label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.sandbox.maplebirch" false true autocheck>> Maplebirch <<= maplebirch.t('permission')>></label></div>
          <div class="settingsToggleItem"><label onclick='maplebirch.trigger("update")'><<checkbox "$options.maplebirch.sandbox.window" false true autocheck>> window <<= maplebirch.t('permission')>></label></div>
          <div id="ConsoleCheat" class="settingsToggleItemWide">
            <<set _CodeCheater to maplebirch.t('Code Cheater')>>
            <details class="JSCheatConsole">
              <summary class="JSCheatConsole">JavaScript <<= maplebirch.t('Code Cheater')>></summary>
              <div class="searchButtons">
                <div class="input-row">
                  <<textbox '_maplebirchJSCheatConsole' ''>>
                  <<langbutton 'execute'>>
                    <<run maplebirch.tool.console.execute('javascript')>>
                  <</langbutton>>
                </div>
                <span id="js-cheat-console-status" class="cheat-console-status"></span>
              </div>
            </details>
            <details class="TwineCheatConsole">
              <summary class="TwineCheatConsole">Twine <<= maplebirch.t('Code Cheater')>></summary>
              <div class="searchButtons">
                <div class="input-row">
                  <<textbox '_maplebirchTwineCheatConsole' ''>>
                  <<langbutton 'execute'>>
                    <<run maplebirch.tool.console.execute('twine')>>
                  <</langbutton>>
                </div>
                <span id="twine-cheat-console-status" class="cheat-console-status"></span>
              </div>
            </details>
          </div>
        <</if>>
      </div><hr>`,
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
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleSaves">>', applybefore : '\t<<langbutton "Mods Settings">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>\n\t\t<</langbutton>>\n\t' },
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleOptions">>', applybefore : '\t<<langbutton "Mods">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #cheatsShown>><<maplebirchCheats>><</replace>>\n\t\t\t<<run $("#customOverlayContent").scrollTop(0);>>\n\t\t<</langbutton>>\n\t' },
      { src: '</div>\n\t<<closeButton>>\n<</widget>>\n\n<<widget "titleFeats">>', applybefore : '\t<<langbutton "Mods Statistics">>\n\t\t\t<<toggleTab>>\n\t\t\t<<replace #customOverlayContent>><<maplebirchStatistics>><</replace>>\n\t\t<</langbutton>>\n\t' }
    ],
    'Options Overlay': [
      { src: '<</widget>>\n\n<<widget "setFont">>', applybefore : '\t<<maplebirchInformation>>\n' }
    ],
    npcNamed: [
      { src: '<</widget>>\n\n<<widget "npcNamedUpdate">>', applybefore : '\t<<run maplebirch.npc.injectModNPCs()>>\n' }
    ],
    Social: [
      { src: 'T.importantNPCs = T.importantNpcOrder', applybefore : 'maplebirch.npc.vanillaNPCConfig(T.npcConfig);\n\t\t\t\t' },
      { src: '<<relation-box-wolves>>', applyafter : '\n\n\t\t<<maplebirchReputation>>' },
      { src: '<<relation-box-simple _overallFameBoxConfig>>', applyafter : '\n\n\t\t\t<<maplebirchFame>>' },
      { src: '\t</div>\n\t<br>', applybefore: '\t<<maplebirchStatusSocial>>\n\t' }
    ],
    'Widgets Named Npcs': [
      { srcmatch: /\t\t\t<<NPC_CN_NAME _npc>>|\t\t\t_npc/, to: '\t\t<<if Object.keys(maplebirch.npc.data).includes(_npc) && maplebirch.tool.widget.Macro.has(_npc+"relationshiptext")>>\n\t\t\t<<= maplebirch.autoTranslate(_npc)>><<= "<<"+_npc+"relationshiptext>>">>\n\t\t<<else>>\n\t\t\t<<= maplebirch.autoTranslate(_npc)>>' },
      { src: '<</if>>\n\t<</switch>>\n<</widget>>', to: '<</if>>\n\t\t<</if>>\n\t<</switch>>\n<</widget>>' },
      { src: '<</if>>\n<</widget>>\n\n<<widget "initNNPCClothes">>', applybefore: '\t<<maplebirchNPCinit _nam>>\n\t' },
      { src: '<</widget>>\n\n<<widget "npcrelationship">>', applybefore: '\t<<maplebirchNPCspawn _nam _npcno>>\n\t' },
    ],
    'Widgets Settings': [
      { srcmatch: /<<set\s+_npcList\s*\[\s*clone\s*\(\s*\$NPCNameList\s*\[\s*\$_i\s*\]\s*\)\s*(?:\.replace\s*\(\s*"[^"]+"\s*,\s*"[^"]+"\s*\)\s*)*\]\s+to\s+clone\s*\(\s*\$_i\s*\)\s*>>/, to: '<<set _npcList[maplebirch.autoTranslate(clone($NPCNameList[$_i]))] to clone($_i)>>' },
      { srcmatch: /<<run delete _npcList\["(?:象牙怨灵|Ivory Wraith)"\]>>/, to: '<<run delete _npcList[maplebirch.autoTranslate("Ivory Wraith")]>>' },
      { srcmatch: /(?:<<NPC_CN_NAME \$NPCName\[_npcId\]\.nam>>——<span style="text-transform: capitalize;"><<print[\s\S]*?>><\/span>|\$NPCName\[_npcId\]\.nam the <span style="text-transform: capitalize;">\$NPCName\[_npcId\]\.title<\/span>)/, to: '<<= maplebirch.autoTranslate($NPCName[_npcId].nam) + (maplebirch.Language is "CN" ? "——" : " the ")>><span style="text-transform: capitalize;"><<= maplebirch.autoTranslate($NPCName[_npcId].title)>></span>' },
      { srcmatchgroup: /<<if _npcList\[\$NPCName\[_npcId\]\.nam(?:\.replace\([^)]+\))*\] is undefined>>/g, to: '<<if _npcList[maplebirch.lang.t($NPCName[_npcId].nam)] is undefined>>' },
      { src: '\t\t\t</span>\n\t\t</div>\n\t\t<div class="settingsToggleItem">\n\t\t\t<span class="gold">', applybefore: '\t\t\t<<if $debug is 1>>| <label><<radiobutton "$NPCName[_npcId].pronoun" "n" autocheck>><<= maplebirch.lang.t("hermaphrodite")+"/"+maplebirch.lang.t("asexual")>></label><</if>>\n' },
    ],
    Widgets: [
      { src: 'T.getStatConfig = function(stat) {', applybefore: 'maplebirch.npc.applyStatDefaults(statDefaults);\n\t\t\t' },
      { srcmatchgroup: /\t_npcData.nam|\t<<NPC_CN_NAME _npcData.nam>>/g, to: '\t<<= maplebirch.autoTranslate(_npcData.nam)>>' },
      { srcmatchgroup: /(?:<<print\s*_npcData\.title(?:\.replace\([^)]+\))+>>|The _npcData\.title)/g, to: '<<= (maplebirch.Language is "CN" ? "" : "The ") + maplebirch.autoTranslate(_npcData.title)>>' },
    ],
    Traits: [
      { src: '<div id="traitListsSearch">', applybefore: '<<run maplebirch.tool.other.initTraits(_traitLists)>>\n\t' }
    ],
    'Widgets Journal': [
      { src: '<br>\n<</widget>>', applybefore: '<br><hr>\n\t<<maplebirchJournal>>\n' }
    ]
  };

  maplebirch.once(':framework-init', (data) => {
    Object.assign(data, {
      specialWidget,
      default: defaultData,
      locationPassage,
      widgetPassage
    });
  });
})();