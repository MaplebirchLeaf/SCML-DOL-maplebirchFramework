// ./src/replace.ts
import { widgets } from './utils';
import TransformationMirror from '@/twee/TransformationMirror.twee';
import NPCHairStyleOptions from '@/twee/NPCHairStyleOptions.twee';
import Options from '@/twee/Options.twee';
import Cheats from '@/twee/Cheats.twee';

const specialWidget = widgets(TransformationMirror, NPCHairStyleOptions);

// prettier-ignore
const defaultData = {
  Init   : '<<run maplebirch.tool.zone.storyInit()>>',
  State  : '<<run maplebirch.tool.patch.applyFoodstuff()>><<run maplebirch.trigger(":variable")>>',
  Header : '',
  Footer : '<<maplebirchFrameworkVersions>>',
  Information : '<<maplebirchFrameworkInfo>>',
  Options: widgets(Options),
  Cheats: widgets(Cheats),
  NPCinit   : `<<run maplebirch.npc.vanillaInit(_nam)>>`,
  NPCinject : `<<run maplebirch.npc.vanillaInject(_nam, _npcno)>>`
}

// prettier-ignore
const locationPassage = {
  Start: [
    { src: '<</dialog>>', applybefore: '\t<<onclose>><<maplebirchFrameworkNotice>>\n\t\t' },
  ],
  StoryCaption: [
    { src: '<<questmarker>>', applyafter: '\n\t\t<<maplebirchCaptionDescription>>' },
    { src: '<<allurecaption>>', applybefore: '<<maplebirchStatusBar>>\n\t\t\t' },
    { src: '<</button>>\n\t\t\t<div class="sidebarButtonSplit">', to: '<</button>>\n\t\t\t<<maplebirchMenuBig>>\n\t\t\t<div class="sidebarButtonSplit">' },
    { src: '</div>\n\t\t\t<div class="sidebarButtonSplit">', to: '</div>\n\t\t\t<div class="sidebarButtonSplit"><<maplebirchMenuSmall>></div>\n\t\t\t<div class="sidebarButtonSplit">' },
    { src: '<<goo>>', applybefore: '<<maplebirchCaptionAfterDescription>>\n\t\t' },
    { src: '<<if $options.sidebarStats isnot "disabled">>', applybefore: '<<maplebirchHintMobile>>\n\t\t\t' },
    { src: '<<mobileStats>>', applyafter: '\n\t\t\t\t<<maplebirchMobileStats>>' },
  ]
}

// prettier-ignore
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
    { srcmatch: /\t\t\t<<NPC_CN_NAME _npc>>|\t\t\t_npc/, to: '\t\t<<if Object.keys(maplebirch.npc.data).includes(_npc) && maplebirch.SugarCube.Macro.has(_npc+"relationshiptext")>>\n\t\t\t<<= maplebirch.auto(_npc)>><<= "<<"+_npc+"relationshiptext>>">>\n\t\t<<else>>\n\t\t\t<<= maplebirch.auto(_npc)>>' },
    { src: '<</if>>\n\t<</switch>>\n<</widget>>', to: '<</if>>\n\t\t<</if>>\n\t<</switch>>\n<</widget>>' },
    { src: '<</if>>\n<</widget>>\n\n<<widget "initNNPCClothes">>', applybefore: '\t<<maplebirchNPCinit _nam>>\n\t' },
    { src: '<</widget>>\n\n<<widget "npcrelationship">>', applybefore: '\t<<maplebirchNPCinject _nam _npcno>>\n' },
  ],
  'Widgets Settings': [
    { srcmatch: /\[(?:setup\.NPC_CN_NAME\()?_sortedNPCList\[\$_\w+\](?:\))?\]/, to: '[maplebirch.auto(_sortedNPCList[$_i])]' },
    { srcmatch: /<<run delete _npcList\["(?:象牙怨灵|Ivory Wraith)"\]>>/, to: '<<run delete _npcList[maplebirch.auto("Ivory Wraith")]>>' },
    { srcmatch: /(?:<<NPC_CN_NAME \$NPCName\[_npcId\]\.nam>>——<span style="text-transform: capitalize;"><<print[\s\S]*?>><\/span>|\$NPCName\[_npcId\]\.nam the <span style="text-transform: capitalize;">\$NPCName\[_npcId\]\.title<\/span>|<<NPC_CN_NAME \$NPCName\[_npcId\]\.nam>>——<span style="text-transform: capitalize;"><<print setup\.NPC_CN_TITLE\(\$NPCName\[_npcId\]\.title\)>><\/span>)/, to: '<<= maplebirch.auto($NPCName[_npcId].nam) + (lanSwitch(" the ","——"))>><span style="text-transform: capitalize;"><<= maplebirch.auto($NPCName[_npcId].title)>></span>' },
    { srcmatchgroup: /\[(?:setup\.NPC_CN_NAME\()?_sortedNPCList\[_sortedId](?:\))?\]/g, to: '[maplebirch.auto(_sortedNPCList[_sortedId])]' },
    { src: '\t\t\t</span>\n\t\t</div>\n\t\t<div class="settingsToggleItem">\n\t\t\t<span class="gold">', applybefore: '\t\t\t<<if $debug is 1>>| <label><<radiobutton "$NPCName[_npcId].pronoun" "n" autocheck>><<= maplebirch.lang.t("hermaphrodite")+"/"+maplebirch.lang.t("asexual")>></label><</if>>\n' },
    { src: '</span>\n\t\t\t<</if>>\n\t\t</div>', applyafter: '\n\t\t<div id="maplebirchNPCHairStyleOptions" class="settingsToggleItemWide"><<maplebirchNPCHairStyleOptions>></div>' },
  ],
  Widgets: [
    { src: 'T.getStatConfig = function(stat) {', applybefore: 'maplebirch.npc.applyStatDefaults(statDefaults);\n\t\t\t' },
    { srcmatchgroup: /\t_npcData.nam|\t<<NPC_CN_NAME _npcData.nam>>/g, to: '\t<<= maplebirch.auto(_npcData.nam)>>' },
    { srcmatchgroup: /(?:<<print\s*_npcData\.title(?:\.replace\([^)]+\))+>>|<<print setup\.NPC_CN_TITLE\(_npcData\.title\)>>|The _npcData\.title)/g, to: '<<= (lanSwitch("The ","")) + maplebirch.auto(_npcData.title)>>' },
    { srcmatchgroup: /<<for _j to \$_statCount; _j lt 3; _j\+\+>>/g, to: '<<for _j to $_statCount; _j lt (($options.maplebirch?.relationcount ?? 4) - 1); _j++>>' },
  ],
  Traits: [
    { src: '<div id="traitListsSearch">', applybefore: '<<run maplebirch.tool.patch.injectTraits(_traitLists)>>\n\t' }
  ],
  'Widgets Journal': [
    { srcmatch: /<<print\s*("It is "\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*",\s*"\s*\+\s*Time\.year\s*\+\s*"\."|"今天是"\s*\+\s*Time\.year\s*\+\s*"年"\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*"。"|ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"\s*"\s*\+\s*Time\.monthName\.slice\(0,3\)|Time\.month\s*\+\s*"月"\s*\+\s*ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"日")\s*>>/, to: '<<= maplebirch.dynamic.Time.updateTimeLanguage("JournalTime")>>' },
    { src: '<br>\n<</widget>>', applybefore: '<br><hr>\n\t<<maplebirchJournal>>\n' },
  ],
  'Widgets Mirror': [
    { src: '<</if>>\n\t\t<<if ![', to: '<</if>>\n\t\t<<maplebirchTransformationMirror>>\n\t\t<<if ![' },
    { src: '<<tficon $_icon>>', to: '<<= maplebirch.char.transformation.icon>>' },
  ],
  'Widgets NPCs': [
    { src: '<<if $genderknown.includes($npc[_iii])>>', to: '<<if contains($genderknown, $npc)>>' },
  ]
}

export { specialWidget, defaultData, locationPassage, widgetPassage };
