// @ts-check
/// <reference path='../maplebirch.d.ts' />
var maplebirch = (() => {
  'use strict';
  const frameworkVersion = modUtils.getMod('maplebirch').version;
  const lastUpdate = '2026.01.02';
  const lastModifiedBy = '楓樺葉';
  const DEBUGMODE = true;

  const ModuleState = {
    PENDING:   0,
    MOUNTED:   1,
    ERROR:     2,
    EXTENSION: 3
  };

  /** @param {string} modName */
  async function disabled(modName) {
    const modLoadController = modUtils.getModLoadController();
    const [enabledMods, disabledMods] = await Promise.all([
      modLoadController.listModIndexDB(),
      modLoadController.loadHiddenModList()
    ]);
    if (!enabledMods.includes(modName)) return false;
    enabledMods.splice(enabledMods.indexOf(modName), 1);
    if (!disabledMods.includes(modName)) disabledMods.push(modName);
    await Promise.all([
      modLoadController.overwriteModIndexDBModList(enabledMods),
      modLoadController.overwriteModIndexDBHiddenModList(disabledMods)
    ]);
    location.reload();
  }

  const jsyaml = (function() {
    /**@type {any}*/var exports = {};// @ts-ignore
    !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e=exports).jsyaml={})}(exports,(function(e){"use strict";function t(e){return null==e}var n={isNothing:t,isObject:function(e){return"object"==typeof e&&null!==e},toArray:function(e){return Array.isArray(e)?e:t(e)?[]:[e]},repeat:function(e,t){var n,i="";for(n=0;n<t;n+=1)i+=e;return i},isNegativeZero:function(e){return 0===e&&Number.NEGATIVE_INFINITY===1/e},extend:function(e,t){var n,i,r,o;if(t)for(n=0,i=(o=Object.keys(t)).length;n<i;n+=1)e[r=o[n]]=t[r];return e}};function i(e,t){var n="",i=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(n+='in "'+e.mark.name+'" '),n+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!t&&e.mark.snippet&&(n+="\n\n"+e.mark.snippet),i+" "+n):i}function r(e,t){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=t,this.message=i(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=(new Error).stack||""}r.prototype=Object.create(Error.prototype),r.prototype.constructor=r,r.prototype.toString=function(e){return this.name+": "+i(this,e)};var o=r;function a(e,t,n,i,r){var o="",a="",l=Math.floor(r/2)-1;return i-t>l&&(t=i-l+(o=" ... ").length),n-i>l&&(n=i+l-(a=" ...").length),{str:o+e.slice(t,n).replace(/\t/g,"→")+a,pos:i-t+o.length}}function l(e,t){return n.repeat(" ",t-e.length)+e}var c=function(e,t){if(t=Object.create(t||null),!e.buffer)return null;t.maxLength||(t.maxLength=79),"number"!=typeof t.indent&&(t.indent=1),"number"!=typeof t.linesBefore&&(t.linesBefore=3),"number"!=typeof t.linesAfter&&(t.linesAfter=2);for(var i,r=/\r?\n|\r|\0/g,o=[0],c=[],s=-1;i=r.exec(e.buffer);)c.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var u,p,f="",d=Math.min(e.line+t.linesAfter,c.length).toString().length,h=t.maxLength-(t.indent+d+3);for(u=1;u<=t.linesBefore&&!(s-u<0);u++)p=a(e.buffer,o[s-u],c[s-u],e.position-(o[s]-o[s-u]),h),f=n.repeat(" ",t.indent)+l((e.line-u+1).toString(),d)+" | "+p.str+"\n"+f;for(p=a(e.buffer,o[s],c[s],e.position,h),f+=n.repeat(" ",t.indent)+l((e.line+1).toString(),d)+" | "+p.str+"\n",f+=n.repeat("-",t.indent+d+3+p.pos)+"^\n",u=1;u<=t.linesAfter&&!(s+u>=c.length);u++)p=a(e.buffer,o[s+u],c[s+u],e.position-(o[s]-o[s+u]),h),f+=n.repeat(" ",t.indent)+l((e.line+u+1).toString(),d)+" | "+p.str+"\n";return f.replace(/\n$/,"")},s=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],u=["scalar","sequence","mapping"];var p=function(e,t){if(t=t||{},Object.keys(t).forEach((function(t){if(-1===s.indexOf(t))throw new o('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')})),this.options=t,this.tag=e,this.kind=t.kind||null,this.resolve=t.resolve||function(){return!0},this.construct=t.construct||function(e){return e},this.instanceOf=t.instanceOf||null,this.predicate=t.predicate||null,this.represent=t.represent||null,this.representName=t.representName||null,this.defaultStyle=t.defaultStyle||null,this.multi=t.multi||!1,this.styleAliases=function(e){var t={};return null!==e&&Object.keys(e).forEach((function(n){e[n].forEach((function(e){t[String(e)]=n}))})),t}(t.styleAliases||null),-1===u.indexOf(this.kind))throw new o('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')};function f(e,t){var n=[];return e[t].forEach((function(e){var t=n.length;n.forEach((function(n,i){n.tag===e.tag&&n.kind===e.kind&&n.multi===e.multi&&(t=i)})),n[t]=e})),n}function d(e){return this.extend(e)}d.prototype.extend=function(e){var t=[],n=[];if(e instanceof p)n.push(e);else if(Array.isArray(e))n=n.concat(e);else{if(!e||!Array.isArray(e.implicit)&&!Array.isArray(e.explicit))throw new o("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");e.implicit&&(t=t.concat(e.implicit)),e.explicit&&(n=n.concat(e.explicit))}t.forEach((function(e){if(!(e instanceof p))throw new o("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(e.loadKind&&"scalar"!==e.loadKind)throw new o("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(e.multi)throw new o("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")})),n.forEach((function(e){if(!(e instanceof p))throw new o("Specified list of YAML types (or a single Type object) contains a non-Type object.")}));var i=Object.create(d.prototype);return i.implicit=(this.implicit||[]).concat(t),i.explicit=(this.explicit||[]).concat(n),i.compiledImplicit=f(i,"implicit"),i.compiledExplicit=f(i,"explicit"),i.compiledTypeMap=function(){var e,t,n={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}};function i(e){e.multi?(n.multi[e.kind].push(e),n.multi.fallback.push(e)):n[e.kind][e.tag]=n.fallback[e.tag]=e}for(e=0,t=arguments.length;e<t;e+=1)arguments[e].forEach(i);return n}(i.compiledImplicit,i.compiledExplicit),i};var h=d,g=new p("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return null!==e?e:""}}),m=new p("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return null!==e?e:[]}}),y=new p("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return null!==e?e:{}}}),b=new h({explicit:[g,m,y]});var A=new p("tag:yaml.org,2002:null",{kind:"scalar",resolve:function(e){if(null===e)return!0;var t=e.length;return 1===t&&"~"===e||4===t&&("null"===e||"Null"===e||"NULL"===e)},construct:function(){return null},predicate:function(e){return null===e},represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});var v=new p("tag:yaml.org,2002:bool",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t=e.length;return 4===t&&("true"===e||"True"===e||"TRUE"===e)||5===t&&("false"===e||"False"===e||"FALSE"===e)},construct:function(e){return"true"===e||"True"===e||"TRUE"===e},predicate:function(e){return"[object Boolean]"===Object.prototype.toString.call(e)},represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function w(e){return 48<=e&&e<=55}function k(e){return 48<=e&&e<=57}var C=new p("tag:yaml.org,2002:int",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,n,i=e.length,r=0,o=!1;if(!i)return!1;if("-"!==(t=e[r])&&"+"!==t||(t=e[++r]),"0"===t){if(r+1===i)return!0;if("b"===(t=e[++r])){for(r++;r<i;r++)if("_"!==(t=e[r])){if("0"!==t&&"1"!==t)return!1;o=!0}return o&&"_"!==t}if("x"===t){for(r++;r<i;r++)if("_"!==(t=e[r])){if(!(48<=(n=e.charCodeAt(r))&&n<=57||65<=n&&n<=70||97<=n&&n<=102))return!1;o=!0}return o&&"_"!==t}if("o"===t){for(r++;r<i;r++)if("_"!==(t=e[r])){if(!w(e.charCodeAt(r)))return!1;o=!0}return o&&"_"!==t}}if("_"===t)return!1;for(;r<i;r++)if("_"!==(t=e[r])){if(!k(e.charCodeAt(r)))return!1;o=!0}return!(!o||"_"===t)},construct:function(e){var t,n=e,i=1;if(-1!==n.indexOf("_")&&(n=n.replace(/_/g,"")),"-"!==(t=n[0])&&"+"!==t||("-"===t&&(i=-1),t=(n=n.slice(1))[0]),"0"===n)return 0;if("0"===t){if("b"===n[1])return i*parseInt(n.slice(2),2);if("x"===n[1])return i*parseInt(n.slice(2),16);if("o"===n[1])return i*parseInt(n.slice(2),8)}return i*parseInt(n,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&e%1==0&&!n.isNegativeZero(e)},represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),x=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");var I=/^[-+]?[0-9]+e/;var S=new p("tag:yaml.org,2002:float",{kind:"scalar",resolve:function(e){return null!==e&&!(!x.test(e)||"_"===e[e.length-1])},construct:function(e){var t,n;return n="-"===(t=e.replace(/_/g,"").toLowerCase())[0]?-1:1,"+-".indexOf(t[0])>=0&&(t=t.slice(1)),".inf"===t?1===n?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:".nan"===t?NaN:n*parseFloat(t,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&(e%1!=0||n.isNegativeZero(e))},represent:function(e,t){var i;if(isNaN(e))switch(t){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(t){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(t){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(n.isNegativeZero(e))return"-0.0";return i=e.toString(10),I.test(i)?i.replace("e",".e"):i},defaultStyle:"lowercase"}),O=b.extend({implicit:[A,v,C,S]}),j=O,T=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),N=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");var F=new p("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:function(e){return null!==e&&(null!==T.exec(e)||null!==N.exec(e))},construct:function(e){var t,n,i,r,o,a,l,c,s=0,u=null;if(null===(t=T.exec(e))&&(t=N.exec(e)),null===t)throw new Error("Date resolve error");if(n=+t[1],i=+t[2]-1,r=+t[3],!t[4])return new Date(Date.UTC(n,i,r));if(o=+t[4],a=+t[5],l=+t[6],t[7]){for(s=t[7].slice(0,3);s.length<3;)s+="0";s=+s}return t[9]&&(u=6e4*(60*+t[10]+ +(t[11]||0)),"-"===t[9]&&(u=-u)),c=new Date(Date.UTC(n,i,r,o,a,l,s)),u&&c.setTime(c.getTime()-u),c},instanceOf:Date,represent:function(e){return e.toISOString()}});var E=new p("tag:yaml.org,2002:merge",{kind:"scalar",resolve:function(e){return"<<"===e||null===e}}),M="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";var L=new p("tag:yaml.org,2002:binary",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,n,i=0,r=e.length,o=M;for(n=0;n<r;n++)if(!((t=o.indexOf(e.charAt(n)))>64)){if(t<0)return!1;i+=6}return i%8==0},construct:function(e){var t,n,i=e.replace(/[\r\n=]/g,""),r=i.length,o=M,a=0,l=[];for(t=0;t<r;t++)t%4==0&&t&&(l.push(a>>16&255),l.push(a>>8&255),l.push(255&a)),a=a<<6|o.indexOf(i.charAt(t));return 0===(n=r%4*6)?(l.push(a>>16&255),l.push(a>>8&255),l.push(255&a)):18===n?(l.push(a>>10&255),l.push(a>>2&255)):12===n&&l.push(a>>4&255),new Uint8Array(l)},predicate:function(e){return"[object Uint8Array]"===Object.prototype.toString.call(e)},represent:function(e){var t,n,i="",r=0,o=e.length,a=M;for(t=0;t<o;t++)t%3==0&&t&&(i+=a[r>>18&63],i+=a[r>>12&63],i+=a[r>>6&63],i+=a[63&r]),r=(r<<8)+e[t];return 0===(n=o%3)?(i+=a[r>>18&63],i+=a[r>>12&63],i+=a[r>>6&63],i+=a[63&r]):2===n?(i+=a[r>>10&63],i+=a[r>>4&63],i+=a[r<<2&63],i+=a[64]):1===n&&(i+=a[r>>2&63],i+=a[r<<4&63],i+=a[64],i+=a[64]),i}}),_=Object.prototype.hasOwnProperty,D=Object.prototype.toString;var U=new p("tag:yaml.org,2002:omap",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,n,i,r,o,a=[],l=e;for(t=0,n=l.length;t<n;t+=1){if(i=l[t],o=!1,"[object Object]"!==D.call(i))return!1;for(r in i)if(_.call(i,r)){if(o)return!1;o=!0}if(!o)return!1;if(-1!==a.indexOf(r))return!1;a.push(r)}return!0},construct:function(e){return null!==e?e:[]}}),q=Object.prototype.toString;var Y=new p("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,n,i,r,o,a=e;for(o=new Array(a.length),t=0,n=a.length;t<n;t+=1){if(i=a[t],"[object Object]"!==q.call(i))return!1;if(1!==(r=Object.keys(i)).length)return!1;o[t]=[r[0],i[r[0]]]}return!0},construct:function(e){if(null===e)return[];var t,n,i,r,o,a=e;for(o=new Array(a.length),t=0,n=a.length;t<n;t+=1)i=a[t],r=Object.keys(i),o[t]=[r[0],i[r[0]]];return o}}),R=Object.prototype.hasOwnProperty;var B=new p("tag:yaml.org,2002:set",{kind:"mapping",resolve:function(e){if(null===e)return!0;var t,n=e;for(t in n)if(R.call(n,t)&&null!==n[t])return!1;return!0},construct:function(e){return null!==e?e:{}}}),K=j.extend({implicit:[F,E],explicit:[L,U,Y,B]}),P=Object.prototype.hasOwnProperty,W=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,H=/[\x85\u2028\u2029]/,$=/[,\[\]\{\}]/,G=/^(?:!|!!|![a-z\-]+!)$/i,V=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function Z(e){return Object.prototype.toString.call(e)}function J(e){return 10===e||13===e}function Q(e){return 9===e||32===e}function z(e){return 9===e||32===e||10===e||13===e}function X(e){return 44===e||91===e||93===e||123===e||125===e}function ee(e){var t;return 48<=e&&e<=57?e-48:97<=(t=32|e)&&t<=102?t-97+10:-1}function te(e){return 48===e?"\0":97===e?"":98===e?"\b":116===e||9===e?"\t":110===e?"\n":118===e?"\v":102===e?"\f":114===e?"\r":101===e?"":32===e?" ":34===e?'"':47===e?"/":92===e?"\\":78===e?"":95===e?" ":76===e?"\u2028":80===e?"\u2029":""}function ne(e){return e<=65535?String.fromCharCode(e):String.fromCharCode(55296+(e-65536>>10),56320+(e-65536&1023))}for(var ie=new Array(256),re=new Array(256),oe=0;oe<256;oe++)ie[oe]=te(oe)?1:0,re[oe]=te(oe);function ae(e,t){this.input=e,this.filename=t.filename||null,this.schema=t.schema||K,this.onWarning=t.onWarning||null,this.legacy=t.legacy||!1,this.json=t.json||!1,this.listener=t.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function le(e,t){var n={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return n.snippet=c(n),new o(t,n)}function ce(e,t){throw le(e,t)}function se(e,t){e.onWarning&&e.onWarning.call(null,le(e,t))}var ue={YAML:function(e,t,n){var i,r,o;null!==e.version&&ce(e,"duplication of %YAML directive"),1!==n.length&&ce(e,"YAML directive accepts exactly one argument"),null===(i=/^([0-9]+)\.([0-9]+)$/.exec(n[0]))&&ce(e,"ill-formed argument of the YAML directive"),r=parseInt(i[1],10),o=parseInt(i[2],10),1!==r&&ce(e,"unacceptable YAML version of the document"),e.version=n[0],e.checkLineBreaks=o<2,1!==o&&2!==o&&se(e,"unsupported YAML version of the document")},TAG:function(e,t,n){var i,r;2!==n.length&&ce(e,"TAG directive accepts exactly two arguments"),i=n[0],r=n[1],G.test(i)||ce(e,"ill-formed tag handle (first argument) of the TAG directive"),P.call(e.tagMap,i)&&ce(e,'there is a previously declared suffix for "'+i+'" tag handle'),V.test(r)||ce(e,"ill-formed tag prefix (second argument) of the TAG directive");try{r=decodeURIComponent(r)}catch(t){ce(e,"tag prefix is malformed: "+r)}e.tagMap[i]=r}};function pe(e,t,n,i){var r,o,a,l;if(t<n){if(l=e.input.slice(t,n),i)for(r=0,o=l.length;r<o;r+=1)9===(a=l.charCodeAt(r))||32<=a&&a<=1114111||ce(e,"expected valid JSON character");else W.test(l)&&ce(e,"the stream contains non-printable characters");e.result+=l}}function fe(e,t,i,r){var o,a,l,c;for(n.isObject(i)||ce(e,"cannot merge mappings; the provided source object is unacceptable"),l=0,c=(o=Object.keys(i)).length;l<c;l+=1)a=o[l],P.call(t,a)||(t[a]=i[a],r[a]=!0)}function de(e,t,n,i,r,o,a,l,c){var s,u;if(Array.isArray(r))for(s=0,u=(r=Array.prototype.slice.call(r)).length;s<u;s+=1)Array.isArray(r[s])&&ce(e,"nested arrays are not supported inside keys"),"object"==typeof r&&"[object Object]"===Z(r[s])&&(r[s]="[object Object]");if("object"==typeof r&&"[object Object]"===Z(r)&&(r="[object Object]"),r=String(r),null===t&&(t={}),"tag:yaml.org,2002:merge"===i)if(Array.isArray(o))for(s=0,u=o.length;s<u;s+=1)fe(e,t,o[s],n);else fe(e,t,o,n);else e.json||P.call(n,r)||!P.call(t,r)||(e.line=a||e.line,e.lineStart=l||e.lineStart,e.position=c||e.position,ce(e,"duplicated mapping key")),"__proto__"===r?Object.defineProperty(t,r,{configurable:!0,enumerable:!0,writable:!0,value:o}):t[r]=o,delete n[r];return t}function he(e){var t;10===(t=e.input.charCodeAt(e.position))?e.position++:13===t?(e.position++,10===e.input.charCodeAt(e.position)&&e.position++):ce(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function ge(e,t,n){for(var i=0,r=e.input.charCodeAt(e.position);0!==r;){for(;Q(r);)9===r&&-1===e.firstTabInLine&&(e.firstTabInLine=e.position),r=e.input.charCodeAt(++e.position);if(t&&35===r)do{r=e.input.charCodeAt(++e.position)}while(10!==r&&13!==r&&0!==r);if(!J(r))break;for(he(e),r=e.input.charCodeAt(e.position),i++,e.lineIndent=0;32===r;)e.lineIndent++,r=e.input.charCodeAt(++e.position)}return-1!==n&&0!==i&&e.lineIndent<n&&se(e,"deficient indentation"),i}function me(e){var t,n=e.position;return!(45!==(t=e.input.charCodeAt(n))&&46!==t||t!==e.input.charCodeAt(n+1)||t!==e.input.charCodeAt(n+2)||(n+=3,0!==(t=e.input.charCodeAt(n))&&!z(t)))}function ye(e,t){1===t?e.result+=" ":t>1&&(e.result+=n.repeat("\n",t-1))}function be(e,t){var n,i,r=e.tag,o=e.anchor,a=[],l=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=a),i=e.input.charCodeAt(e.position);0!==i&&(-1!==e.firstTabInLine&&(e.position=e.firstTabInLine,ce(e,"tab characters must not be used in indentation")),45===i)&&z(e.input.charCodeAt(e.position+1));)if(l=!0,e.position++,ge(e,!0,-1)&&e.lineIndent<=t)a.push(null),i=e.input.charCodeAt(e.position);else if(n=e.line,we(e,t,3,!1,!0),a.push(e.result),ge(e,!0,-1),i=e.input.charCodeAt(e.position),(e.line===n||e.lineIndent>t)&&0!==i)ce(e,"bad indentation of a sequence entry");else if(e.lineIndent<t)break;return!!l&&(e.tag=r,e.anchor=o,e.kind="sequence",e.result=a,!0)}function Ae(e){var t,n,i,r,o=!1,a=!1;if(33!==(r=e.input.charCodeAt(e.position)))return!1;if(null!==e.tag&&ce(e,"duplication of a tag property"),60===(r=e.input.charCodeAt(++e.position))?(o=!0,r=e.input.charCodeAt(++e.position)):33===r?(a=!0,n="!!",r=e.input.charCodeAt(++e.position)):n="!",t=e.position,o){do{r=e.input.charCodeAt(++e.position)}while(0!==r&&62!==r);e.position<e.length?(i=e.input.slice(t,e.position),r=e.input.charCodeAt(++e.position)):ce(e,"unexpected end of the stream within a verbatim tag")}else{for(;0!==r&&!z(r);)33===r&&(a?ce(e,"tag suffix cannot contain exclamation marks"):(n=e.input.slice(t-1,e.position+1),G.test(n)||ce(e,"named tag handle cannot contain such characters"),a=!0,t=e.position+1)),r=e.input.charCodeAt(++e.position);i=e.input.slice(t,e.position),$.test(i)&&ce(e,"tag suffix cannot contain flow indicator characters")}i&&!V.test(i)&&ce(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch(t){ce(e,"tag name is malformed: "+i)}return o?e.tag=i:P.call(e.tagMap,n)?e.tag=e.tagMap[n]+i:"!"===n?e.tag="!"+i:"!!"===n?e.tag="tag:yaml.org,2002:"+i:ce(e,'undeclared tag handle "'+n+'"'),!0}function ve(e){var t,n;if(38!==(n=e.input.charCodeAt(e.position)))return!1;for(null!==e.anchor&&ce(e,"duplication of an anchor property"),n=e.input.charCodeAt(++e.position),t=e.position;0!==n&&!z(n)&&!X(n);)n=e.input.charCodeAt(++e.position);return e.position===t&&ce(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(t,e.position),!0}function we(e,t,i,r,o){var a,l,c,s,u,p,f,d,h,g=1,m=!1,y=!1;if(null!==e.listener&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,a=l=c=4===i||3===i,r&&ge(e,!0,-1)&&(m=!0,e.lineIndent>t?g=1:e.lineIndent===t?g=0:e.lineIndent<t&&(g=-1)),1===g)for(;Ae(e)||ve(e);)ge(e,!0,-1)?(m=!0,c=a,e.lineIndent>t?g=1:e.lineIndent===t?g=0:e.lineIndent<t&&(g=-1)):c=!1;if(c&&(c=m||o),1!==g&&4!==i||(d=1===i||2===i?t:t+1,h=e.position-e.lineStart,1===g?c&&(be(e,h)||function(e,t,n){var i,r,o,a,l,c,s,u=e.tag,p=e.anchor,f={},d=Object.create(null),h=null,g=null,m=null,y=!1,b=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=f),s=e.input.charCodeAt(e.position);0!==s;){if(y||-1===e.firstTabInLine||(e.position=e.firstTabInLine,ce(e,"tab characters must not be used in indentation")),i=e.input.charCodeAt(e.position+1),o=e.line,63!==s&&58!==s||!z(i)){if(a=e.line,l=e.lineStart,c=e.position,!we(e,n,2,!1,!0))break;if(e.line===o){for(s=e.input.charCodeAt(e.position);Q(s);)s=e.input.charCodeAt(++e.position);if(58===s)z(s=e.input.charCodeAt(++e.position))||ce(e,"a whitespace character is expected after the key-value separator within a block mapping"),y&&(de(e,f,d,h,g,null,a,l,c),h=g=m=null),b=!0,y=!1,r=!1,h=e.tag,g=e.result;else{if(!b)return e.tag=u,e.anchor=p,!0;ce(e,"can not read an implicit mapping pair; a colon is missed")}}else{if(!b)return e.tag=u,e.anchor=p,!0;ce(e,"can not read a block mapping entry; a multiline key may not be an implicit key")}}else 63===s?(y&&(de(e,f,d,h,g,null,a,l,c),h=g=m=null),b=!0,y=!0,r=!0):y?(y=!1,r=!0):ce(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,s=i;if((e.line===o||e.lineIndent>t)&&(y&&(a=e.line,l=e.lineStart,c=e.position),we(e,t,4,!0,r)&&(y?g=e.result:m=e.result),y||(de(e,f,d,h,g,m,a,l,c),h=g=m=null),ge(e,!0,-1),s=e.input.charCodeAt(e.position)),(e.line===o||e.lineIndent>t)&&0!==s)ce(e,"bad indentation of a mapping entry");else if(e.lineIndent<t)break}return y&&de(e,f,d,h,g,null,a,l,c),b&&(e.tag=u,e.anchor=p,e.kind="mapping",e.result=f),b}(e,h,d))||function(e,t){var n,i,r,o,a,l,c,s,u,p,f,d,h=!0,g=e.tag,m=e.anchor,y=Object.create(null);if(91===(d=e.input.charCodeAt(e.position)))a=93,s=!1,o=[];else{if(123!==d)return!1;a=125,s=!0,o={}}for(null!==e.anchor&&(e.anchorMap[e.anchor]=o),d=e.input.charCodeAt(++e.position);0!==d;){if(ge(e,!0,t),(d=e.input.charCodeAt(e.position))===a)return e.position++,e.tag=g,e.anchor=m,e.kind=s?"mapping":"sequence",e.result=o,!0;h?44===d&&ce(e,"expected the node content, but found ','"):ce(e,"missed comma between flow collection entries"),f=null,l=c=!1,63===d&&z(e.input.charCodeAt(e.position+1))&&(l=c=!0,e.position++,ge(e,!0,t)),n=e.line,i=e.lineStart,r=e.position,we(e,t,1,!1,!0),p=e.tag,u=e.result,ge(e,!0,t),d=e.input.charCodeAt(e.position),!c&&e.line!==n||58!==d||(l=!0,d=e.input.charCodeAt(++e.position),ge(e,!0,t),we(e,t,1,!1,!0),f=e.result),s?de(e,o,y,p,u,f,n,i,r):l?o.push(de(e,null,y,p,u,f,n,i,r)):o.push(u),ge(e,!0,t),44===(d=e.input.charCodeAt(e.position))?(h=!0,d=e.input.charCodeAt(++e.position)):h=!1}ce(e,"unexpected end of the stream within a flow collection")}(e,d)?y=!0:(l&&function(e,t){var i,r,o,a,l,c=1,s=!1,u=!1,p=t,f=0,d=!1;if(124===(a=e.input.charCodeAt(e.position)))r=!1;else{if(62!==a)return!1;r=!0}for(e.kind="scalar",e.result="";0!==a;)if(43===(a=e.input.charCodeAt(++e.position))||45===a)1===c?c=43===a?3:2:ce(e,"repeat of a chomping mode identifier");else{if(!((o=48<=(l=a)&&l<=57?l-48:-1)>=0))break;0===o?ce(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):u?ce(e,"repeat of an indentation width identifier"):(p=t+o-1,u=!0)}if(Q(a)){do{a=e.input.charCodeAt(++e.position)}while(Q(a));if(35===a)do{a=e.input.charCodeAt(++e.position)}while(!J(a)&&0!==a)}for(;0!==a;){for(he(e),e.lineIndent=0,a=e.input.charCodeAt(e.position);(!u||e.lineIndent<p)&&32===a;)e.lineIndent++,a=e.input.charCodeAt(++e.position);if(!u&&e.lineIndent>p&&(p=e.lineIndent),J(a))f++;else{if(e.lineIndent<p){3===c?e.result+=n.repeat("\n",s?1+f:f):1===c&&s&&(e.result+="\n");break}for(r?Q(a)?(d=!0,e.result+=n.repeat("\n",s?1+f:f)):d?(d=!1,e.result+=n.repeat("\n",f+1)):0===f?s&&(e.result+=" "):e.result+=n.repeat("\n",f):e.result+=n.repeat("\n",s?1+f:f),s=!0,u=!0,f=0,i=e.position;!J(a)&&0!==a;)a=e.input.charCodeAt(++e.position);pe(e,i,e.position,!1)}}return!0}(e,d)||function(e,t){var n,i,r;if(39!==(n=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,i=r=e.position;0!==(n=e.input.charCodeAt(e.position));)if(39===n){if(pe(e,i,e.position,!0),39!==(n=e.input.charCodeAt(++e.position)))return!0;i=e.position,e.position++,r=e.position}else J(n)?(pe(e,i,r,!0),ye(e,ge(e,!1,t)),i=r=e.position):e.position===e.lineStart&&me(e)?ce(e,"unexpected end of the document within a single quoted scalar"):(e.position++,r=e.position);ce(e,"unexpected end of the stream within a single quoted scalar")}(e,d)||function(e,t){var n,i,r,o,a,l,c;if(34!==(l=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,n=i=e.position;0!==(l=e.input.charCodeAt(e.position));){if(34===l)return pe(e,n,e.position,!0),e.position++,!0;if(92===l){if(pe(e,n,e.position,!0),J(l=e.input.charCodeAt(++e.position)))ge(e,!1,t);else if(l<256&&ie[l])e.result+=re[l],e.position++;else if((a=120===(c=l)?2:117===c?4:85===c?8:0)>0){for(r=a,o=0;r>0;r--)(a=ee(l=e.input.charCodeAt(++e.position)))>=0?o=(o<<4)+a:ce(e,"expected hexadecimal character");e.result+=ne(o),e.position++}else ce(e,"unknown escape sequence");n=i=e.position}else J(l)?(pe(e,n,i,!0),ye(e,ge(e,!1,t)),n=i=e.position):e.position===e.lineStart&&me(e)?ce(e,"unexpected end of the document within a double quoted scalar"):(e.position++,i=e.position)}ce(e,"unexpected end of the stream within a double quoted scalar")}(e,d)?y=!0:!function(e){var t,n,i;if(42!==(i=e.input.charCodeAt(e.position)))return!1;for(i=e.input.charCodeAt(++e.position),t=e.position;0!==i&&!z(i)&&!X(i);)i=e.input.charCodeAt(++e.position);return e.position===t&&ce(e,"name of an alias node must contain at least one character"),n=e.input.slice(t,e.position),P.call(e.anchorMap,n)||ce(e,'unidentified alias "'+n+'"'),e.result=e.anchorMap[n],ge(e,!0,-1),!0}(e)?function(e,t,n){var i,r,o,a,l,c,s,u,p=e.kind,f=e.result;if(z(u=e.input.charCodeAt(e.position))||X(u)||35===u||38===u||42===u||33===u||124===u||62===u||39===u||34===u||37===u||64===u||96===u)return!1;if((63===u||45===u)&&(z(i=e.input.charCodeAt(e.position+1))||n&&X(i)))return!1;for(e.kind="scalar",e.result="",r=o=e.position,a=!1;0!==u;){if(58===u){if(z(i=e.input.charCodeAt(e.position+1))||n&&X(i))break}else if(35===u){if(z(e.input.charCodeAt(e.position-1)))break}else{if(e.position===e.lineStart&&me(e)||n&&X(u))break;if(J(u)){if(l=e.line,c=e.lineStart,s=e.lineIndent,ge(e,!1,-1),e.lineIndent>=t){a=!0,u=e.input.charCodeAt(e.position);continue}e.position=o,e.line=l,e.lineStart=c,e.lineIndent=s;break}}a&&(pe(e,r,o,!1),ye(e,e.line-l),r=o=e.position,a=!1),Q(u)||(o=e.position+1),u=e.input.charCodeAt(++e.position)}return pe(e,r,o,!1),!!e.result||(e.kind=p,e.result=f,!1)}(e,d,1===i)&&(y=!0,null===e.tag&&(e.tag="?")):(y=!0,null===e.tag&&null===e.anchor||ce(e,"alias node should not have any properties")),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):0===g&&(y=c&&be(e,h))),null===e.tag)null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);else if("?"===e.tag){for(null!==e.result&&"scalar"!==e.kind&&ce(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),s=0,u=e.implicitTypes.length;s<u;s+=1)if((f=e.implicitTypes[s]).resolve(e.result)){e.result=f.construct(e.result),e.tag=f.tag,null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);break}}else if("!"!==e.tag){if(P.call(e.typeMap[e.kind||"fallback"],e.tag))f=e.typeMap[e.kind||"fallback"][e.tag];else for(f=null,s=0,u=(p=e.typeMap.multi[e.kind||"fallback"]).length;s<u;s+=1)if(e.tag.slice(0,p[s].tag.length)===p[s].tag){f=p[s];break}f||ce(e,"unknown tag !<"+e.tag+">"),null!==e.result&&f.kind!==e.kind&&ce(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+f.kind+'", not "'+e.kind+'"'),f.resolve(e.result,e.tag)?(e.result=f.construct(e.result,e.tag),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):ce(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return null!==e.listener&&e.listener("close",e),null!==e.tag||null!==e.anchor||y}function ke(e){var t,n,i,r,o=e.position,a=!1;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);0!==(r=e.input.charCodeAt(e.position))&&(ge(e,!0,-1),r=e.input.charCodeAt(e.position),!(e.lineIndent>0||37!==r));){for(a=!0,r=e.input.charCodeAt(++e.position),t=e.position;0!==r&&!z(r);)r=e.input.charCodeAt(++e.position);for(i=[],(n=e.input.slice(t,e.position)).length<1&&ce(e,"directive name must not be less than one character in length");0!==r;){for(;Q(r);)r=e.input.charCodeAt(++e.position);if(35===r){do{r=e.input.charCodeAt(++e.position)}while(0!==r&&!J(r));break}if(J(r))break;for(t=e.position;0!==r&&!z(r);)r=e.input.charCodeAt(++e.position);i.push(e.input.slice(t,e.position))}0!==r&&he(e),P.call(ue,n)?ue[n](e,n,i):se(e,'unknown document directive "'+n+'"')}ge(e,!0,-1),0===e.lineIndent&&45===e.input.charCodeAt(e.position)&&45===e.input.charCodeAt(e.position+1)&&45===e.input.charCodeAt(e.position+2)?(e.position+=3,ge(e,!0,-1)):a&&ce(e,"directives end mark is expected"),we(e,e.lineIndent-1,4,!1,!0),ge(e,!0,-1),e.checkLineBreaks&&H.test(e.input.slice(o,e.position))&&se(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&me(e)?46===e.input.charCodeAt(e.position)&&(e.position+=3,ge(e,!0,-1)):e.position<e.length-1&&ce(e,"end of the stream or a document separator is expected")}function Ce(e,t){t=t||{},0!==(e=String(e)).length&&(10!==e.charCodeAt(e.length-1)&&13!==e.charCodeAt(e.length-1)&&(e+="\n"),65279===e.charCodeAt(0)&&(e=e.slice(1)));var n=new ae(e,t),i=e.indexOf("\0");for(-1!==i&&(n.position=i,ce(n,"null byte is not allowed in input")),n.input+="\0";32===n.input.charCodeAt(n.position);)n.lineIndent+=1,n.position+=1;for(;n.position<n.length-1;)ke(n);return n.documents}var xe={loadAll:function(e,t,n){null!==t&&"object"==typeof t&&void 0===n&&(n=t,t=null);var i=Ce(e,n);if("function"!=typeof t)return i;for(var r=0,o=i.length;r<o;r+=1)t(i[r])},load:function(e,t){var n=Ce(e,t);if(0!==n.length){if(1===n.length)return n[0];throw new o("expected a single document in the stream, but found more")}}},Ie=Object.prototype.toString,Se=Object.prototype.hasOwnProperty,Oe=65279,je={0:"\\0",7:"\\a",8:"\\b",9:"\\t",10:"\\n",11:"\\v",12:"\\f",13:"\\r",27:"\\e",34:'\\"',92:"\\\\",133:"\\N",160:"\\_",8232:"\\L",8233:"\\P"},Te=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Ne=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Fe(e){var t,i,r;if(t=e.toString(16).toUpperCase(),e<=255)i="x",r=2;else if(e<=65535)i="u",r=4;else{if(!(e<=4294967295))throw new o("code point within a string may not be greater than 0xFFFFFFFF");i="U",r=8}return"\\"+i+n.repeat("0",r-t.length)+t}function Ee(e){this.schema=e.schema||K,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=n.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=function(e,t){var n,i,r,o,a,l,c;if(null===t)return{};for(n={},r=0,o=(i=Object.keys(t)).length;r<o;r+=1)a=i[r],l=String(t[a]),"!!"===a.slice(0,2)&&(a="tag:yaml.org,2002:"+a.slice(2)),(c=e.compiledTypeMap.fallback[a])&&Se.call(c.styleAliases,l)&&(l=c.styleAliases[l]),n[a]=l;return n}(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType='"'===e.quotingType?2:1,this.forceQuotes=e.forceQuotes||!1,this.replacer="function"==typeof e.replacer?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Me(e,t){for(var i,r=n.repeat(" ",t),o=0,a=-1,l="",c=e.length;o<c;)-1===(a=e.indexOf("\n",o))?(i=e.slice(o),o=c):(i=e.slice(o,a+1),o=a+1),i.length&&"\n"!==i&&(l+=r),l+=i;return l}function Le(e,t){return"\n"+n.repeat(" ",e.indent*t)}function _e(e){return 32===e||9===e}function De(e){return 32<=e&&e<=126||161<=e&&e<=55295&&8232!==e&&8233!==e||57344<=e&&e<=65533&&e!==Oe||65536<=e&&e<=1114111}function Ue(e){return De(e)&&e!==Oe&&13!==e&&10!==e}function qe(e,t,n){var i=Ue(e),r=i&&!_e(e);return(n?i:i&&44!==e&&91!==e&&93!==e&&123!==e&&125!==e)&&35!==e&&!(58===t&&!r)||Ue(t)&&!_e(t)&&35===e||58===t&&r}function Ye(e,t){var n,i=e.charCodeAt(t);return i>=55296&&i<=56319&&t+1<e.length&&(n=e.charCodeAt(t+1))>=56320&&n<=57343?1024*(i-55296)+n-56320+65536:i}function Re(e){return/^\n* /.test(e)}function Be(e,t,n,i,r,o,a,l){var c,s,u=0,p=null,f=!1,d=!1,h=-1!==i,g=-1,m=De(s=Ye(e,0))&&s!==Oe&&!_e(s)&&45!==s&&63!==s&&58!==s&&44!==s&&91!==s&&93!==s&&123!==s&&125!==s&&35!==s&&38!==s&&42!==s&&33!==s&&124!==s&&61!==s&&62!==s&&39!==s&&34!==s&&37!==s&&64!==s&&96!==s&&function(e){return!_e(e)&&58!==e}(Ye(e,e.length-1));if(t||a)for(c=0;c<e.length;u>=65536?c+=2:c++){if(!De(u=Ye(e,c)))return 5;m=m&&qe(u,p,l),p=u}else{for(c=0;c<e.length;u>=65536?c+=2:c++){if(10===(u=Ye(e,c)))f=!0,h&&(d=d||c-g-1>i&&" "!==e[g+1],g=c);else if(!De(u))return 5;m=m&&qe(u,p,l),p=u}d=d||h&&c-g-1>i&&" "!==e[g+1]}return f||d?n>9&&Re(e)?5:a?2===o?5:2:d?4:3:!m||a||r(e)?2===o?5:2:1}function Ke(e,t,n,i,r){e.dump=function(){if(0===t.length)return 2===e.quotingType?'""':"''";if(!e.noCompatMode&&(-1!==Te.indexOf(t)||Ne.test(t)))return 2===e.quotingType?'"'+t+'"':"'"+t+"'";var a=e.indent*Math.max(1,n),l=-1===e.lineWidth?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-a),c=i||e.flowLevel>-1&&n>=e.flowLevel;switch(Be(t,c,e.indent,l,(function(t){return function(e,t){var n,i;for(n=0,i=e.implicitTypes.length;n<i;n+=1)if(e.implicitTypes[n].resolve(t))return!0;return!1}(e,t)}),e.quotingType,e.forceQuotes&&!i,r)){case 1:return t;case 2:return"'"+t.replace(/'/g,"''")+"'";case 3:return"|"+Pe(t,e.indent)+We(Me(t,a));case 4:return">"+Pe(t,e.indent)+We(Me(function(e,t){var n,i,r=/(\n+)([^\n]*)/g,o=(l=e.indexOf("\n"),l=-1!==l?l:e.length,r.lastIndex=l,He(e.slice(0,l),t)),a="\n"===e[0]||" "===e[0];var l;for(;i=r.exec(e);){var c=i[1],s=i[2];n=" "===s[0],o+=c+(a||n||""===s?"":"\n")+He(s,t),a=n}return o}(t,l),a));case 5:return'"'+function(e){for(var t,n="",i=0,r=0;r<e.length;i>=65536?r+=2:r++)i=Ye(e,r),!(t=je[i])&&De(i)?(n+=e[r],i>=65536&&(n+=e[r+1])):n+=t||Fe(i);return n}(t)+'"';default:throw new o("impossible error: invalid scalar style")}}()}function Pe(e,t){var n=Re(e)?String(t):"",i="\n"===e[e.length-1];return n+(i&&("\n"===e[e.length-2]||"\n"===e)?"+":i?"":"-")+"\n"}function We(e){return"\n"===e[e.length-1]?e.slice(0,-1):e}function He(e,t){if(""===e||" "===e[0])return e;for(var n,i,r=/ [^ ]/g,o=0,a=0,l=0,c="";n=r.exec(e);)(l=n.index)-o>t&&(i=a>o?a:l,c+="\n"+e.slice(o,i),o=i+1),a=l;return c+="\n",e.length-o>t&&a>o?c+=e.slice(o,a)+"\n"+e.slice(a+1):c+=e.slice(o),c.slice(1)}function $e(e,t,n,i){var r,o,a,l="",c=e.tag;for(r=0,o=n.length;r<o;r+=1)a=n[r],e.replacer&&(a=e.replacer.call(n,String(r),a)),(Ve(e,t+1,a,!0,!0,!1,!0)||void 0===a&&Ve(e,t+1,null,!0,!0,!1,!0))&&(i&&""===l||(l+=Le(e,t)),e.dump&&10===e.dump.charCodeAt(0)?l+="-":l+="- ",l+=e.dump);e.tag=c,e.dump=l||"[]"}function Ge(e,t,n){var i,r,a,l,c,s;for(a=0,l=(r=n?e.explicitTypes:e.implicitTypes).length;a<l;a+=1)if(((c=r[a]).instanceOf||c.predicate)&&(!c.instanceOf||"object"==typeof t&&t instanceof c.instanceOf)&&(!c.predicate||c.predicate(t))){if(n?c.multi&&c.representName?e.tag=c.representName(t):e.tag=c.tag:e.tag="?",c.represent){if(s=e.styleMap[c.tag]||c.defaultStyle,"[object Function]"===Ie.call(c.represent))i=c.represent(t,s);else{if(!Se.call(c.represent,s))throw new o("!<"+c.tag+'> tag resolver accepts not "'+s+'" style');i=c.represent[s](t,s)}e.dump=i}return!0}return!1}function Ve(e,t,n,i,r,a,l){e.tag=null,e.dump=n,Ge(e,n,!1)||Ge(e,n,!0);var c,s=Ie.call(e.dump),u=i;i&&(i=e.flowLevel<0||e.flowLevel>t);var p,f,d="[object Object]"===s||"[object Array]"===s;if(d&&(f=-1!==(p=e.duplicates.indexOf(n))),(null!==e.tag&&"?"!==e.tag||f||2!==e.indent&&t>0)&&(r=!1),f&&e.usedDuplicates[p])e.dump="*ref_"+p;else{if(d&&f&&!e.usedDuplicates[p]&&(e.usedDuplicates[p]=!0),"[object Object]"===s)i&&0!==Object.keys(e.dump).length?(!function(e,t,n,i){var r,a,l,c,s,u,p="",f=e.tag,d=Object.keys(n);if(!0===e.sortKeys)d.sort();else if("function"==typeof e.sortKeys)d.sort(e.sortKeys);else if(e.sortKeys)throw new o("sortKeys must be a boolean or a function");for(r=0,a=d.length;r<a;r+=1)u="",i&&""===p||(u+=Le(e,t)),c=n[l=d[r]],e.replacer&&(c=e.replacer.call(n,l,c)),Ve(e,t+1,l,!0,!0,!0)&&((s=null!==e.tag&&"?"!==e.tag||e.dump&&e.dump.length>1024)&&(e.dump&&10===e.dump.charCodeAt(0)?u+="?":u+="? "),u+=e.dump,s&&(u+=Le(e,t)),Ve(e,t+1,c,!0,s)&&(e.dump&&10===e.dump.charCodeAt(0)?u+=":":u+=": ",p+=u+=e.dump));e.tag=f,e.dump=p||"{}"}(e,t,e.dump,r),f&&(e.dump="&ref_"+p+e.dump)):(!function(e,t,n){var i,r,o,a,l,c="",s=e.tag,u=Object.keys(n);for(i=0,r=u.length;i<r;i+=1)l="",""!==c&&(l+=", "),e.condenseFlow&&(l+='"'),a=n[o=u[i]],e.replacer&&(a=e.replacer.call(n,o,a)),Ve(e,t,o,!1,!1)&&(e.dump.length>1024&&(l+="? "),l+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),Ve(e,t,a,!1,!1)&&(c+=l+=e.dump));e.tag=s,e.dump="{"+c+"}"}(e,t,e.dump),f&&(e.dump="&ref_"+p+" "+e.dump));else if("[object Array]"===s)i&&0!==e.dump.length?(e.noArrayIndent&&!l&&t>0?$e(e,t-1,e.dump,r):$e(e,t,e.dump,r),f&&(e.dump="&ref_"+p+e.dump)):(!function(e,t,n){var i,r,o,a="",l=e.tag;for(i=0,r=n.length;i<r;i+=1)o=n[i],e.replacer&&(o=e.replacer.call(n,String(i),o)),(Ve(e,t,o,!1,!1)||void 0===o&&Ve(e,t,null,!1,!1))&&(""!==a&&(a+=","+(e.condenseFlow?"":" ")),a+=e.dump);e.tag=l,e.dump="["+a+"]"}(e,t,e.dump),f&&(e.dump="&ref_"+p+" "+e.dump));else{if("[object String]"!==s){if("[object Undefined]"===s)return!1;if(e.skipInvalid)return!1;throw new o("unacceptable kind of an object to dump "+s)}"?"!==e.tag&&Ke(e,e.dump,t,a,u)}null!==e.tag&&"?"!==e.tag&&(c=encodeURI("!"===e.tag[0]?e.tag.slice(1):e.tag).replace(/!/g,"%21"),c="!"===e.tag[0]?"!"+c:"tag:yaml.org,2002:"===c.slice(0,18)?"!!"+c.slice(18):"!<"+c+">",e.dump=c+" "+e.dump)}return!0}function Ze(e,t){var n,i,r=[],o=[];for(Je(e,r,o),n=0,i=o.length;n<i;n+=1)t.duplicates.push(r[o[n]]);t.usedDuplicates=new Array(i)}function Je(e,t,n){var i,r,o;if(null!==e&&"object"==typeof e)if(-1!==(r=t.indexOf(e)))-1===n.indexOf(r)&&n.push(r);else if(t.push(e),Array.isArray(e))for(r=0,o=e.length;r<o;r+=1)Je(e[r],t,n);else for(r=0,o=(i=Object.keys(e)).length;r<o;r+=1)Je(e[i[r]],t,n)}function Qe(e,t){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+t+" instead, which is now safe by default.")}}var ze=p,Xe=h,et=b,tt=O,nt=j,it=K,rt=xe.load,ot=xe.loadAll,at={dump:function(e,t){var n=new Ee(t=t||{});n.noRefs||Ze(e,n);var i=e;return n.replacer&&(i=n.replacer.call({"":i},"",i)),Ve(n,0,i,!0,!0)?n.dump+"\n":""}}.dump,lt=o,ct={binary:L,float:S,map:y,null:A,pairs:Y,set:B,timestamp:F,bool:v,int:C,merge:E,omap:U,seq:m,str:g},st=Qe("safeLoad","load"),ut=Qe("safeLoadAll","loadAll"),pt=Qe("safeDump","dump"),ft={Type:ze,Schema:Xe,FAILSAFE_SCHEMA:et,JSON_SCHEMA:tt,CORE_SCHEMA:nt,DEFAULT_SCHEMA:it,load:rt,loadAll:ot,dump:at,YAMLException:lt,types:ct,safeLoad:st,safeLoadAll:ut,safeDump:pt};e.CORE_SCHEMA=nt,e.DEFAULT_SCHEMA=it,e.FAILSAFE_SCHEMA=et,e.JSON_SCHEMA=tt,e.Schema=Xe,e.Type=ze,e.YAMLException=lt,e.default=ft,e.dump=at,e.load=rt,e.loadAll=ot,e.safeDump=pt,e.safeLoad=st,e.safeLoadAll=ut,e.types=ct,Object.defineProperty(e,"__esModule",{value:!0})}));
    return exports.jsyaml;
  })();

  /**@type {any}*/
  let jsSugarCube;

  class Logger {
    /** @type {Object<string, {level: number, tag: string, style: string}>} */
    static LogConfig = {
      DEBUG: { level: 0, tag: '[调试]', style: 'color: #9E9E9E; font-weight: bold;' },
      INFO:  { level: 1, tag: '[信息]', style: 'color: #2E7D32; font-weight: bold;' },
      WARN:  { level: 2, tag: '[警告]', style: 'color: #FF8F00; font-weight: bold;' },
      ERROR: { level: 3, tag: '[错误]', style: 'color: #C62828; font-weight: bold;' }
    };

    /** @type {Object<string|number, string|number>} */
    static LogLevel = (() => {
      /** @type {Object<string|number, string|number>} */
      const map = {};
      Object.entries(Logger.LogConfig).forEach(([name, cfg]) => {
        map[name] = cfg.level;
        map[cfg.level] = name;
      });
      return map;
    })();

    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.level = Logger.LogLevel.INFO;
      this.#fromIDB();
    }

    async #fromIDB() {
      try {
        const DEBUG = await this.core.idb.withTransaction(['config'], 'readonly', async (/**@type {any}*/tx) =>  await tx.objectStore('config').get('debugMode'));
        if (DEBUG?.value) this.level = Logger.LogLevel.DEBUG;
      } catch (err) {}
    }

    /**
     * 记录日志
     * @param {string} message 日志消息
     * @param {string|number} [levelName] 日志级别(字符串或数字)
     * @param {...any} objects 额外对象
     */
    log(message, levelName = 'INFO', ...objects) {
      try {
        const lname = ('' + (levelName || 'INFO')).toUpperCase();
        const config = Logger.LogConfig[lname] || Logger.LogConfig.INFO;
        if (config.level < this.level) return;
        console.log(`%c[maplebirch]${config.tag} ${message}`, config.style);
        if (objects && objects.length > 0) objects.forEach(o => console.dir(o));
        if (this.core.modUtils?.getLogger) {
          const modLogger = this.core.modUtils.getLogger();
          if (modLogger) {
            if (lname === 'WARN' && modLogger.warn) {
              modLogger.warn(message);
            } else if (lname === 'ERROR' && modLogger.error) {
              modLogger.error(message);
            }
          }
        }
      } catch (e) {
        try { console.error('[Logger] 写日志失败:', e); } catch (_) { }
      }
    }
    
    /** @param {string|number} levelName 日志级别 */
    set LevelName(levelName) {
      if (!levelName) return;
      const u = ('' + levelName).toUpperCase();
      if (!(u in Logger.LogConfig)) { this.log(`无效日志级别: ${levelName}`, 'WARN'); return; }
      this.level = Logger.LogConfig[u].level;
      this.log(`日志级别变更为: ${u}`, u);
    }

    get LevelName() {
      return Logger.LogLevel[this.level] || 'INFO';
    }
  }

  class EventEmitter {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      /** @type {Map<string, Array<{callback: Function, description: string, internalId: string}>>} 事件监听器集合 */
      this.events = new Map([
        [':IndexedDB'      , []], // IDB数据库
        [':import'         , []], // 数据导入
        [':allModule'      , []], // 所有模块注册完成时机
        [':dataInit'       , []], // 框架提供的模组V变量注册接口
        [':onSave'         , []], // 存档
        [':loadSaveData'   , []], // 加载存档数据
        [':onLoad'         , []], // 读档
        [':language'       , []], // 语言切换
        [':storyready'     , []], // 游戏准备完成(即重载页面末尾)
        [':passageinit'    , []], // 段落初始化
        [':passagestart'   , []], // 段落开始
        [':passagerender'  , []], // 段落渲染
        [':passagedisplay' , []], // 段落显示
        [':passageend'     , []], // 段落结束
        [':defineSugarcube', []], // 框架获取SugarCube时机
        [':finally'        , []], // 最后时机
      ]);
    }

    /**
     * 注册事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     * @param {string} [description] 监听器描述
     * @returns {boolean} 是否注册成功
     */
    on(eventName, callback, description = '') {
      let listeners = this.events.get(eventName);
      if (!listeners) {
        listeners = [];
        this.events.set(eventName, listeners);
        this.core.logger.log(`创建新事件类型: ${eventName}`, 'DEBUG');
      }
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].callback === callback) {
          this.core.logger.log(`回调函数已注册: ${eventName} (跳过重复)`, 'DEBUG');
          return false;
        }
      }
      const internalId = description || `evt_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
      listeners.push({ callback, description, internalId });
      this.core.logger.log(`注册事件监听器: ${eventName}${description ? ` (描述: ${description})` : ''} (当前: ${listeners.length})`, 'DEBUG');
      return true;
    }

    /**
     * 移除事件监听器
     * @param {string} eventName 事件名称
     * @param {Function|string} identifier 监听器标识符
     * @returns {boolean}
     */
    off(eventName, identifier) {
      const listeners = this.events.get(eventName);
      if (!listeners) {
        this.core.logger.log(`无效事件名: ${eventName}`, 'WARN');
        return false;
      }
      const isFunc = identifier instanceof Function;
      let removed = false;
      for (let i = listeners.length - 1; i >= 0; i--) {
        const listener = listeners[i];
        if (isFunc ? listener.callback === identifier : (listener.description === identifier || listener.internalId === identifier)) {
          listeners.splice(i, 1);
          removed = true;
        }
      }
      if (removed) {
        this.core.logger.log(`移除事件监听器: ${eventName}${isFunc ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG');
        return true;
      }
      this.core.logger.log(`未找到匹配的监听器: ${eventName} (标识符: ${isFunc ? '函数引用' : identifier})`, 'DEBUG');
      return false;
    }

    /**
     * 注册一次性事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     * @param {string} [description] 监听器描述
     * @returns {boolean} 是否注册成功
     */
    once(eventName, callback, description = '') {
      const onceWrapper = (/**@type {any[]}*/...args) => {
        try { callback(...args); } 
        finally { this.off(eventName, onceWrapper); }
      };
      return this.on(eventName, onceWrapper, description);
    }

    /** 
     * 触发事件 
     * @param {string} eventName 事件名称 
     * @param {...any} args 事件参数 
     */
    async trigger(eventName, ...args) {
      const listeners = this.events.get(eventName);
      if (!listeners || listeners.length === 0) return;
      const snapshot = listeners.slice();
      for (let i = 0; i < snapshot.length; i++) {
        const listener = snapshot[i];
        try {
          const result = listener.callback(...args);
          if (result instanceof Promise) await result;
        } catch (/**@type {any}*/error) {
          this.core.logger.log(`${eventName}事件处理错误: ${error.message}`, 'ERROR');
        }
      }
    }
  }

  class IndexedDBService {
    static DATABASE_NAME = 'maplebirch';
    static DATABASE_VERSION = parseInt(frameworkVersion.split('.')[0], 10);

    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;           // 核心引用
      this.db = null;             // 数据库实例
      this.ready = false;         // 就绪状态
      this.stores = new Map();    // 已注册的存储: 名称 -> 定义
    }

    /**
     * @param {string} name - 存储名称
     * @param {IDBObjectStoreParameters} [options] - 存储选项
     * @param {Array<{name: string, keyPath: string|string[], options?: IDBIndexParameters}>} [indexes] - 索引定义
     */
    register(name, options = { keyPath: 'id' }, indexes = []) {
      if (typeof name !== 'string') this.core.logger.log(`无效的存储名称: ${name}`, 'ERROR');
      if (this.stores.has(name)) this.core.logger.log(`存储 ${name} 已注册`, 'WARN');
      this.stores.set(name, { name, options, indexes });
      this.core.logger.log(`注册存储: ${name}`, 'DEBUG');
    }

    /** @returns {Promise<void>} */
    async init() {
      if (this.ready) return;
      try {
        const idbRef = this.core.modUtils.getIdbRef();
        this.db = await idbRef.idb_openDB(
          IndexedDBService.DATABASE_NAME,
          IndexedDBService.DATABASE_VERSION,
          { upgrade: (/**@type {IDBDatabase}*/db,/**@type {string|number}*/oldVersion,/**@type {string|number}*/newVersion,/**@type {IDBTransaction}*/transaction) => this.#createStores(db, transaction) }
        );
        this.ready = true;
        this.core.logger.log('IDB数据库初始化完成', 'INFO');
      } catch (/**@type {any}*/error) {
        await this.resetDatabase();
      }
    }

    /** @param {IDBDatabase} db - 数据库实例 @param {IDBTransaction} transaction - 事务 */
    #createStores(db, transaction) {
      for (const storeDef of this.stores.values()) {
        if (!db.objectStoreNames.contains(storeDef.name)) {
          const store = db.createObjectStore(storeDef.name, storeDef.options);
          for (const indexDef of storeDef.indexes) try { store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options || {}); } catch (err) {}
        }
      }
    }

    /**
     * @param {string|string[]} storeNames - 存储名称
     * @param {IDBTransactionMode} mode - 事务模式
     * @param {Function} callback - 回调函数
     * @returns {Promise<any>} 回调结果
     */
    async withTransaction(storeNames, mode, callback) {
      if (!this.ready) await this.init();
      if (typeof storeNames === 'string') storeNames = [storeNames];
      const tx = this.db.transaction(storeNames, mode);
      try {
        const result = await callback(tx);
        await tx.done;
        return result;
      } catch (/**@type {any}*/error) {
        this.core.logger.log(`事务执行失败: ${error?.message || error}`, 'ERROR');
        throw error;
      }
    }

    /** 清空存储 @param {string} storeName - 存储名称 @returns {Promise<void>} */
    async clearStore(storeName) {
      return this.withTransaction([storeName], 'readwrite', async (/**@type {any}*/tx) => {
        const store = tx.objectStore(storeName);
        await store.clear();
      });
    }

    /** @returns {Promise<boolean>} */
    async deleteDatabase() {
      try {
        if (this.db) { this.db.close(); this.db = null; }
        const idbRef = this.core.modUtils.getIdbRef();
        await idbRef.idb_deleteDB(IndexedDBService.DATABASE_NAME);
        this.ready = false;
        return true;
      } catch (/**@type {any}*/error) {
        this.core.logger.log(`删除数据库失败: ${error?.message || error}`, 'ERROR');
        return false;
      }
    }

    /** @returns {Promise<boolean>} */
    async resetDatabase() {
      try {
        const deleted = await this.deleteDatabase();
        if (!deleted) throw new Error('删除数据库失败');
        await this.init();
        location.reload();
        return true;
      } catch (/**@type {any}*/error) {
        this.core.logger.log(`数据库重置失败: ${error?.message || error}`, 'ERROR');
        return false;
      }
    }
  }

  class LanguageManager {
    static DEFAULT_LANGS = ['EN', 'CN'];
    static BATCH_SIZE = 500;          // 默认批处理大小

    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.language = this.detectLang();       // 自动检测语言
      this.translations = new Map();           // 内存翻译缓存
      this.cache = new Map();                  // 文本->键名缓存
      this.preloaded = false;                  // 预加载状态标志
      this.fileHashes = new Map();             // 文件哈希缓存
    }

    detectLang() {
      const lang = navigator.language || 'en';
      return lang.includes('zh') ? 'CN' : 'EN';
    }
    
    initDB() {
      this.core.idb.register('metadata', { keyPath: 'key' }, [
        { name: 'timestamp', keyPath: 'timestamp' }
      ]);
      this.core.idb.register('translations', { keyPath: 'key' }, [
        { name: 'mod', keyPath: 'mod' },
        { name: 'language', keyPath: 'language', options: { unique: false } }
      ]);
      this.core.idb.register('text_index', { keyPath: ['key', 'language', 'text_value'] }, [
        { name: 'text_value', keyPath: 'text_value' },
        { name: 'key', keyPath: 'key' }
      ]);
    }

    /** 设置语言 @param {string} lang 语言代码 */
    setLanguage(lang) {
      if (!lang) return;
      this.language = ('' + lang).toUpperCase();
      this.cache.clear();
      this.core.logger.log(`语言设置为: ${this.language}`, 'DEBUG');
    }

    /** @param {string} modName 模块名称 @param {string[]} [langs] 语言列表 */
    async *importAll(modName, langs = LanguageManager.DEFAULT_LANGS) {
      if (!this.core.modLoader) { this.core.logger.log('Mod 加载器未设置', 'ERROR'); return; }
      for (const lang of langs) {
        const formats = ['json', 'yml', 'yaml'];
        let processedCount = 0;
        let error = null;
        let foundAny = false;
        for (const format of formats) {
          const path = `translations/${lang.toLowerCase()}.${format}`;
          const modZip = this.core.modLoader.getModZip(modName);
          if (!modZip || !modZip.zip.file(path)) continue;
          this.core.logger.log(`处理 ${lang} 翻译: ${path}`, 'DEBUG');
          foundAny = true;
          try {
            const file = modZip.zip.file(path);
            const content = await file.async('text');
            let data = this.#parseFile(content, path);
            
            for await (const progress of this.#processStream(modName, lang, data)) yield { ...progress, lang, type: 'process' };
            processedCount = Object.keys(data).length;
          } catch (/**@type {any}*/err) {
            error = err;
            this.core.logger.log(`处理失败: ${path} - ${err.message}`, 'ERROR');
            yield { lang, count: 0, error, type: 'error' };
          }
        }
        if (!foundAny) {
          this.core.logger.log(`找不到 ${lang} 翻译文件`, 'WARN');
          yield { lang, count: 0, error: new Error('未找到翻译文件'), type: 'not_found' };
        } else if (!error) {
          yield { lang, count: processedCount, error: null, type: 'complete' };
        }
      }
    }

    /** @param {string} modName 模块名称 @param {string} lang 语言代码 @param {string} path 文件路径 */
    async *load(modName, lang, path) {
      if (!this.core.modLoader) { this.core.logger.log('Mod 加载器未设置', 'ERROR'); return; }
      const modZip = this.core.modLoader.getModZip(modName);
      if (!modZip) { this.core.logger.log(`找不到 Mod: ${modName}`, 'ERROR'); return; }
      const file = modZip.zip.file(path);
      if (!file) { this.core.logger.log(`文件未找到: ${path}`, 'ERROR'); return; }
      try {
        const content = await file.async('text');
        let data = this.#parseFile(content, path);
        
        for await (const progress of this.#processStream(modName, lang, data)) yield { ...progress, lang, type: 'process' };
        yield { lang, count: Object.keys(data).length, error: null, type: 'complete' };
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`加载失败: ${modName}/${path} - ${err.message}`, 'ERROR');
        yield { lang, count: 0, error: err, type: 'error' };
      }
    }

    /**
     * 流式处理翻译
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @param {Object<string, string>} translations 翻译数据
     */
    async *#processStream(modName, lang, translations) {
      const keys = Object.keys(translations);
      const total = keys.length;
      if (total === 0) {
        yield { progress: 100, current: 0, total: 0 };
        return;
      }
      const fileHash = await this.#computeHash(translations);
      const lastHash = await this.#getFileHash(modName, lang);
      if (fileHash === lastHash) {
        this.core.logger.log(`翻译未变更: ${modName}/${lang}`, 'DEBUG');
        yield { progress: 100, current: 0, total: 0 };
        return;
      }
      const existingKeys = await this.#getKeysForMod(modName);
      const newKeys = new Set(keys);
      const oldKeys = new Set([...existingKeys].filter(k => !newKeys.has(k)));
      if (oldKeys.size > 0) await this.#cleanOldKeys(oldKeys, lang);
      for (let i = 0; i < keys.length; i += 100) {
        const batchKeys = keys.slice(i, i + 100);
        /**@type {any}*/const batch = {};
        for (const key of batchKeys) {
          batch[key] = translations[key];
          if (!this.translations.has(key)) this.translations.set(key, {});
          this.translations.get(key)[lang] = translations[key];
        }
        const entries = Object.entries(batch).map(([key, value]) => ({ key, translations: { [lang]: value }, mod: modName }));
        await this.#storeBatch(entries);
        yield {
          progress: Math.min(100, Math.floor((i + batchKeys.length) / total * 100)),
          current: i + batchKeys.length, total
        };
      }
      await this.#saveFileHash(modName, lang, fileHash);
      this.core.logger.log(`加载翻译: ${lang} (${keys.length} 项)`, 'DEBUG');
    }

    /** 获取翻译 @param {string} key 翻译键名 @param {boolean} [space=false] 英文后加空格 @returns {string} */
    t(key, space=false) {
      const rec = this.translations.get(key);
      if (!rec) {
        this.#loadFromDB(key);
        return `[${key}]`;
      }
      let result = rec[this.language] || rec.EN || Object.values(rec)[0] || `[${key}]`;
      if (this.language === 'EN' && space === true) return result + ' ';
      return result;
    }

    /** 自动翻译 @param {string} text 源文本 @returns {string} */
    auto(text) {
      if (!text) return text;
      if (this.#isCurrentLang(text)) return text;
      if (this.cache.has(text)) return this.t(this.cache.get(text));
      for (const [key, trans] of this.translations) {
        for (const lang in trans) {
          if (trans[lang] === text) {
            this.cache.set(text, key);
            return this.t(key);
          }
        }
      }
      this.#findKeyAsync(text);
      return text;
    }

    async preload() {
      if (this.preloaded) return;
      try {
        await this.core.idb.withTransaction(['translations'], 'readonly', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('translations');
          const all = await store.getAll();
          let count = 0;
          for (const rec of all) {
            this.translations.set(rec.key, rec.translations || {});
            count++;
          }
          this.preloaded = true;
          this.core.logger.log(`预加载完成: ${count} 条`, 'INFO');
        });
      } catch (/**@type {any}*/err) { 
        this.core.logger.log(`预加载失败: ${err.message}`, 'ERROR'); 
      }
    }

    async clearDB() {
      try {
        await this.core.idb.clearStore('metadata');
        await this.core.idb.clearStore('translations');
        await this.core.idb.clearStore('text_index');
        this.preloaded = false;
        this.translations.clear();
        this.cache.clear();
        this.fileHashes.clear();
        this.core.logger.log('数据库已清空', 'DEBUG');
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`清空失败: ${err.message}`, 'ERROR');
      }
    }

    async cleanOld() {
      try {
        await this.core.idb.withTransaction(['metadata'], 'readwrite', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('metadata');
          const all = await store.getAll();
          const latest = new Map();
          for (const rec of all) {
            const base = rec.key.split('_')[0];
            if (!latest.has(base) || latest.get(base).timestamp < rec.timestamp) latest.set(base, rec);
          }
          for (const rec of all) {
            const base = rec.key.split('_')[0];
            if (latest.get(base).key !== rec.key) await store.delete(rec.key);
          }
          this.core.logger.log('清理旧版本完成', 'DEBUG');
        });
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`清理失败: ${err.message}`, 'ERROR');
      }
    }

    /** @param {string} content @param {string} path */
    #parseFile(content, path) {
      if (path.endsWith('.json')) {
        return JSON.parse(content);
      } else if (path.endsWith('.yml') || path.endsWith('.yaml')) {
        return jsyaml.load(content);
      } else {
        throw new Error(`不支持的文件格式: ${path}`);
      }
    }

    /** @param {any} data */
    async #computeHash(data) {
      const contentStr = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuf = encoder.encode(contentStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuf);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 获取文件哈希
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @returns {Promise<string|null>}
     */
    async #getFileHash(modName, lang) {
      try {
        return await this.core.idb.withTransaction(['metadata'], 'readonly', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('metadata');
          return (await store.get(`${modName}_${lang}`))?.hash || null;
        });
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`获取哈希失败: ${modName}_${lang} - ${err.message}`, 'DEBUG');
        return null;
      }
    }

    /**
     * 保存文件哈希
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @param {string} hash 文件哈希
     * @returns {Promise<void>}
     */
    async #saveFileHash(modName, lang, hash) {
      try {
        await this.core.idb.withTransaction(['metadata'], 'readwrite', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('metadata');
          await store.put({ key: `${modName}_${lang}`, hash, timestamp: Date.now() });
          this.fileHashes.set(`${modName}_${lang}`, hash);
        });
      } catch (/**@type {any}*/err) { 
        this.core.logger.log(`保存哈希失败: ${err.message}`, 'ERROR'); 
      }
    }

    /**
     * 批量存储
     * @param {Array<{key: string, translations: Object<string, string>, mod: string}>} entries
     * @returns {Promise<void>}
     */
    async #storeBatch(entries) {
      if (!entries || entries.length === 0) return;
      try {
        const map = new Map();
        for (const { key, translations, mod } of entries) {
          if (!map.has(key)) map.set(key, { translations: {}, mod });
          const bucket = map.get(key);
          bucket.translations = { ...bucket.translations, ...translations };
          if (mod) bucket.mod = mod;
        }
        const keys = Array.from(map.keys());
        await this.core.idb.withTransaction(['translations', 'text_index'], 'readwrite', async (/**@type {any}*/tx) => {
          const tStore = tx.objectStore('translations');
          const textStore = tx.objectStore('text_index');
          const keyIndex = textStore.index('key');
          const existingArr = await Promise.all(keys.map(k => tStore.get(k)));
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const existing = existingArr[i];
            const newBucket = map.get(key);
            const merged = existing ? { ...existing.translations, ...newBucket.translations } : newBucket.translations;
            await tStore.put({ key, translations: merged, mod: newBucket.mod || existing?.mod, timestamp: Date.now() });
          }
          for (const key of keys) {
            let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
            while (cursor) {
              await cursor.delete();
              cursor = await cursor.continue();
            }
          }
          for (const key of keys) {
            const translations = map.get(key).translations;
            for (const lang in translations) await textStore.add({ text_value: translations[lang], key, language: lang });
          }
        });
        this.core.logger.log(`批量存储: ${keys.length} 条`, 'DEBUG');
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`批量存储失败: ${err.message}`, 'ERROR');
        try {
          await this.#retrySmall(entries);
        } catch (/**@type {any}*/e) {
          this.core.logger.log(`重试失败: ${e.message}`, 'ERROR');
        }
      }
    }

    /**
     * 重试小块存储
     * @param {Array<{key: string, translations: Object<string, string>, mod: string}>} entries
     * @returns {Promise<void>}
     */
    async #retrySmall(entries) {
      const small = Math.max(50, Math.floor(LanguageManager.BATCH_SIZE / 10));
      for (let i = 0; i < entries.length; i += small) {
        const chunk = entries.slice(i, i + small);
        await this.core.idb.withTransaction(['translations', 'text_index'], 'readwrite', async (/**@type {any}*/tx) => {
          const tStore = tx.objectStore('translations');
          const textStore = tx.objectStore('text_index');
          const keyIndex = textStore.index('key');
          for (const { key, translations, mod } of chunk) {
            const existing = await tStore.get(key);
            const merged = existing ? { ...existing.translations, ...translations } : translations;
            await tStore.put({ key, translations: merged, mod: mod || existing?.mod, timestamp: Date.now() });
            let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
            while (cursor) {
              await cursor.delete();
              cursor = await cursor.continue();
            }
            for (const lang in translations) {
              await textStore.add({ text_value: translations[lang], key, language: lang }); 
            }
          }
        });
      }
      this.core.logger.log(`重试完成`, 'DEBUG');
    }

    /** 获取模块的现有键 @param {string} modName 模块名称 @returns {Promise<Set<string>>} */
    async #getKeysForMod(modName) {
      try {
        return await this.core.idb.withTransaction(['translations'], 'readonly', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('translations');
          const index = store.index('mod');
          const records = await index.getAll(modName);
          return new Set(records.map((/**@type {{ key: any; }}*/r) => r.key));
        });
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`获取键失败: ${modName} - ${err.message}`, 'DEBUG');
        return new Set();
      }
    }

    /** 清理旧键 @param {Set<string>} oldKeys 旧键集合 @param {string} lang 语言代码 @returns {Promise<void>} */
    async #cleanOldKeys(oldKeys, lang) {
      if (oldKeys.size === 0) return;
      try {
        await this.core.idb.withTransaction(['translations', 'text_index'], 'readwrite', async (/**@type {any}*/tx) => {
          const tStore = tx.objectStore('translations');
          const textStore = tx.objectStore('text_index');
          const keyIndex = textStore.index('key');
          for (const key of Array.from(oldKeys)) {
            const record = await tStore.get(key);
            if (!record) continue;
            if (record.translations && record.translations[lang]) {
              delete record.translations[lang];
              if (Object.keys(record.translations).length > 0) {
                await tStore.put(record);
              } else {
                await tStore.delete(key);
              }
            }
            let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
            while (cursor) {
              if (cursor.value.language === lang) await cursor.delete();
              cursor = await cursor.continue();
            }
          }
        });
        this.core.logger.log(`清理旧键: ${oldKeys.size} 个`, 'DEBUG');
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`清理失败: ${err.message}`, 'ERROR');
      }
    }

    /** 从数据库加载翻译 @param {string} key 翻译键名 @returns {Promise<boolean>} */
    async #loadFromDB(key) {
      try {
        return await this.core.idb.withTransaction(['translations'], 'readonly', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('translations');
          const record = await store.get(key);
          if (record) { this.translations.set(key, record.translations || {}); return true; }
          return false;
        });
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`加载失败: ${key} - ${err.message}`, 'DEBUG');
        return false;
      }
    }

    /** 异步查找键 @param {string} text 文本内容 @returns {Promise<string|null>} */
    async #findKeyAsync(text) {
      try {
        return await this.core.idb.withTransaction(['text_index'], 'readonly', async (/**@type {any}*/tx) => {
          const store = tx.objectStore('text_index');
          const index = store.index('text_value');
          const records = await index.getAll(text);
          if (records.length > 0) {
            const key = records[0].key;
            this.cache.set(text, key);
            return key;
          }
          return null;
        });
      } catch (/**@type {any}*/err) {
        this.core.logger.log(`查找失败: ${text} - ${err.message}`, 'DEBUG');
        return null;
      }
    }

    /** 检查是否为当前语言 @param {string} text 文本内容 @returns {boolean} */
    #isCurrentLang(text) {
      if (this.cache.has(text)) {
        const key = this.cache.get(text);
        const translations = this.translations.get(key);
        if (translations && translations[this.language] === text) return true;
      }
      for (const translations of this.translations.values()) if (translations[this.language] === text) return true;
      return false;
    }
  }

  class ModuleSystem {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.registry = {
        modules: new Map(),        // 模块名称->模块对象
        states: new Map(),         // 模块名称->状态
        dependencies: new Map(),   // 模块名称->直接依赖
        dependents: new Map(),     // 模块名称->依赖者
        allDependencies: new Map(),// 模块名称->所有依赖(传递闭包)
        waitingQueue: new Map(),   // 等待队列
      };

      this.initPhase = {
        preInitCompleted: false,      // 预初始化完成
        mainInitCompleted: false,     // 主初始化完成
        loadInitExecuted: false,      // 读存档初始化
        postInitExecuted: false,      // 后初始化完成
        expectedCount: 0,             // 预期模块数量
        registeredCount: 0,           // 已注册模块数
        allRegisteredTriggered: false // 所有模块注册事件触发标志
      };

      this.preInitialized = new Set();      // 预初始化模块集合
      this.#waitingResolvers = new Map();   // 等待解析器
      this.#depthMemo = new Map();          // 深度计算缓存
    }

    /**
     * 注册模块
     * @param {string} name 模块名称
     * @param {any} module 模块对象
     * @param {string[]} [dependencies] 依赖列表
     * @param {boolean} [isExtension=false] 是否为扩展模块
     * @returns {Promise<boolean>} 是否注册成功
     */
    async register(name, module, dependencies = [], isExtension = false) {
      const reg = this.registry;
      if (isExtension) {
        // @ts-ignore
        if (this.core[name] != null) { this.core.logger.log(`扩展模块 ${name} 挂载失败: 名称冲突`, 'WARN'); return false; }
        this.core.logger.log(`挂载扩展模块: ${name}`, 'DEBUG');
        /**@type {any}*/(this.core)[name] = module;
        reg.modules.set(name, module);
        reg.states.set(name, ModuleState.EXTENSION);
        return true;
      }
      if (reg.modules.has(name)) {
        this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
        return false;
      }
      const moduleDependencies = [...(module.dependencies || []), ...dependencies];
      if (this.core.meta.earlyMount?.includes(name)) {
        const earlyMountSet = new Set(this.core.meta.earlyMount);
        const unmetEarlyDeps = moduleDependencies.filter(dep => earlyMountSet.has(dep) && !(/**@type {any}*/(this.core)[dep]));
        if (unmetEarlyDeps.length > 0) {
          this.core.logger.log(`[${name}] 模块等待依赖挂载: [${unmetEarlyDeps.join(', ')}]`, 'DEBUG');
          const checkDeps = () => {
            const stillUnmet = unmetEarlyDeps.filter(dep => !(/**@type {any}*/(this.core)[dep]));
            stillUnmet.length === 0 ? (/**@type {any}*/(this.core)[name] = module, this.core.logger.log(`[${name}] 模块已在依赖满足后挂载 (earlyMount)`, 'DEBUG')) : setTimeout(checkDeps, 10);
          };
          setTimeout(checkDeps, 0);
        } else {
          /**@type {any}*/(this.core)[name] = module;
          this.core.logger.log(`[${name}] 模块已在注册时挂载 (earlyMount)`, 'DEBUG');
        }
      }
      const allDependencies = new Set();
      /** 递归收集依赖 @param {string} depName 依赖名称 */
      const collectDependencies = (depName) => {
        if (allDependencies.has(depName)) return;
        allDependencies.add(depName);
        if (reg.modules.has(depName)) [...(reg.dependencies.get(depName) || [])].forEach(collectDependencies);
      };
      moduleDependencies.forEach(collectDependencies);

      if (this.#detectCircularDependency(name, [...allDependencies])) {
        this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
        return false;
      }

      reg.modules.set(name, module);
      reg.states.set(name, ModuleState.PENDING);
      reg.dependencies.set(name, new Set(moduleDependencies));
      reg.allDependencies.set(name, allDependencies);

      if (!reg.dependents.has(name)) reg.dependents.set(name, new Set());
      moduleDependencies.forEach(dep => {
        if (!reg.dependents.has(dep)) reg.dependents.set(dep, new Set());
        reg.dependents.get(dep).add(name);
      });

      this.core.logger.log(`注册模块: ${name}, 依赖: [${moduleDependencies.join(', ')}]`, 'DEBUG');
      this.core.logger.log(`传递依赖: [${[...allDependencies].join(', ')}]`, 'DEBUG');

      this.initPhase.registeredCount++;
      this.#checkModuleRegistration();

      if (reg.waitingQueue.has(name)) {
        [...reg.waitingQueue.get(name)].forEach(moduleName => {
          if (reg.states.get(moduleName) === ModuleState.PENDING) setTimeout(() => this.#initModule(moduleName), 0);
        });
        reg.waitingQueue.delete(name);
      }

      return true;
    }

    /** 设置预期模块数量 @param {number} count 预期模块数量 */
    setExpectedModuleCount(count) {
      this.initPhase.expectedCount = count;
      this.#checkModuleRegistration();
    }
    
    getDependencyGraph() {
      const reg = this.registry;
      /** @type {Object<string, {dependencies: string[], dependents: string[], state: string, allDependencies: string[]}>} */
      const graph = {};
      reg.modules.forEach((_, name) => {
        graph[name] = {
          dependencies: Array.from(reg.dependencies.get(name) || []),
          dependents: Array.from(reg.dependents.get(name) || []),
          state: this.#getStateName(reg.states.get(name)),
          allDependencies: Array.from(reg.allDependencies.get(name) || [])
        };
      });
      return graph;
    }

    async preInit() {
      if (this.initPhase.preInitCompleted) return;
      await this.#initAllModules(true);
      this.initPhase.preInitCompleted = true;
      this.core.logger.log(`预初始化完成`, 'INFO');
    }

    async init() {
      if (this.initPhase.mainInitCompleted) return;
      if (!this.initPhase.preInitCompleted) await this.preInit();
      await this.#initAllModules(false);
      this.initPhase.mainInitCompleted = true;
      this.core.logger.log(`主初始化完成`, 'INFO');
    }

    async loadInit() {
      if (this.initPhase.loadInitExecuted || !this.initPhase.mainInitCompleted) return;
      await this.#executePhaseInit('loadInit', '存档初始化');
      this.initPhase.loadInitExecuted = true;
    }

    async postInit() {
      if (this.initPhase.postInitExecuted || !this.initPhase.mainInitCompleted) return;
      await this.#executePhaseInit('postInit', '后初始化');
      this.initPhase.postInitExecuted = true;
    }

    #waitingResolvers = new Map();
    #depthMemo = new Map();

    #checkModuleRegistration() {
      if (this.initPhase.allRegisteredTriggered) return;
      const { expectedCount, registeredCount } = this.initPhase;
      if (registeredCount >= expectedCount) {
        this.core.logger.log(`模块注册完成 (${registeredCount}/${expectedCount})`, 'DEBUG');
        this.initPhase.allRegisteredTriggered = true;
      }
    }

    /** 获取状态名称 @param {number} stateValue 状态值 @returns {string} 状态名称 */
    #getStateName(stateValue) {
      const states = { [ModuleState.PENDING]: 'PENDING', [ModuleState.MOUNTED]: 'MOUNTED', [ModuleState.ERROR]: 'ERROR', [ModuleState.EXTENSION]: 'EXTENSION' };
      return states[stateValue] || `UNKNOWN(${stateValue})`;
    }

    /** 等待模块初始化完成 @param {string} moduleName 模块名称 @returns {Promise<void>} */
    #waitForModule(moduleName) {
      const state = this.registry.states.get(moduleName);
      if (state === ModuleState.EXTENSION || this.preInitialized.has(moduleName) || [ModuleState.MOUNTED, ModuleState.ERROR].includes(state)) return Promise.resolve();
      return new Promise(resolve => {
        if (!this.#waitingResolvers.has(moduleName)) this.#waitingResolvers.set(moduleName, []);
        this.#waitingResolvers.get(moduleName).push(resolve);
      });
    }

    /** 解析等待器 @param {string} moduleName 模块名称 */
    #resolveWaiters(moduleName) {
      const list = this.#waitingResolvers.get(moduleName);
      if (!list) return;
      for (const res of list) try { res(); } catch (e) {}
      this.#waitingResolvers.delete(moduleName);
    }

    /**
     * 检查模块依赖
     * @param {string} moduleName 模块名称
     * @param {boolean} [isPreInit] 是否为预初始化
     * @returns {Promise<boolean>} 依赖是否就绪
     */
    async #checkDependencies(moduleName, isPreInit = false) {
      const reg = this.registry;
      for (const dep of (reg.allDependencies.get(moduleName) || [])) {
        if (!reg.modules.has(dep)) {
          if (!reg.waitingQueue.has(dep)) reg.waitingQueue.set(dep, new Set());
          reg.waitingQueue.get(dep).add(moduleName);
          return false;
        }
        const depState = reg.states.get(dep);
        if (depState === ModuleState.EXTENSION) continue;
        if (isPreInit) {
          if (!this.preInitialized.has(dep)) await this.#waitForModule(dep);
        } else {
          if (depState === ModuleState.ERROR) return false;
          if (![ModuleState.MOUNTED, ModuleState.ERROR].includes(depState)) {
            await this.#waitForModule(dep);
            if (reg.states.get(dep) === ModuleState.ERROR) return false;
          }
        }
      }
      return true;
    }

    async #initAllModules(isPreInit = false) {
      const initOrder = this.#getTopologicalOrder();
      for (const name of initOrder) await this.#initModule(name, isPreInit);
    }

    /**
     * 初始化单个模块
     * @param {string} moduleName 模块名称
     * @param {boolean} isPreInit 是否为预初始化
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async #initModule(moduleName, isPreInit = false) {
      const reg = this.registry;
      const module = reg.modules.get(moduleName);
      if (!module) return false;
      const state = reg.states.get(moduleName);
      if (state === ModuleState.EXTENSION) return true;
      if ([ModuleState.MOUNTED, ModuleState.ERROR].includes(state)) return false;
      reg.states.set(moduleName, ModuleState.PENDING);
      if (!(await this.#checkDependencies(moduleName, isPreInit))) return false;
      try {
        const initType = isPreInit ? 'preInit' : 'Init';
        if (typeof module[initType] === 'function') {
          try {
            const result = module[initType]();
            if (result instanceof Promise) await result;
          } catch (/**@type {any}*/error) {
            this.core.logger.log(`[${moduleName}] ${initType} 执行失败: ${error.message}`, 'ERROR');
          }
        }
        if (isPreInit) {
          if (this.core.meta.coreModules?.includes(moduleName) && !this.core.meta.earlyMount?.includes(moduleName)) /**@type {any}*/(this.core)[moduleName] = module;
          this.preInitialized.add(moduleName);
        } else {
          reg.states.set(moduleName, ModuleState.MOUNTED);
        }
        this.#resolveWaiters(moduleName);
        return true;
      } catch (err) {
        reg.states.set(moduleName, ModuleState.ERROR);
        this.#resolveWaiters(moduleName);
        return false;
      }
    }

    /** 执行阶段初始化 @param {string} phase 阶段名称 @param {string} logName 日志名称 */
    async #executePhaseInit(phase, logName) {
      const reg = this.registry;
      const initOrder = this.#getTopologicalOrder();
      for (const name of initOrder) {
        const module = reg.modules.get(name);
        if (reg.states.get(name) !== ModuleState.MOUNTED || typeof module[phase] !== 'function') continue;
        try {
          const result = module[phase]();
          if (result instanceof Promise) await result;
        } catch (/**@type {any}*/error) {
          this.core.logger.log(`[${name}] ${logName}失败: ${error.message}`, 'ERROR');
        }
      }
      this.core.logger.log(`${logName}完成`, 'INFO');
    }

    /** 获取拓扑排序顺序 @returns {string[]} 拓扑排序后的模块名称数组 */
    #getTopologicalOrder() {
      const reg = this.registry;
      const inDegree = new Map();
      /** @type {any[]} */const queue = [], result = [];
      reg.modules.forEach((_, name) => {
        const deg = [...(reg.dependencies.get(name) || [])].filter(dep => reg.states.get(dep) !== ModuleState.EXTENSION).length;
        inDegree.set(name, deg);
        if (deg === 0) queue.push(name);
      });
      let head = 0;
      while (head < queue.length) {
        const name = queue[head++];
        result.push(name);
        (reg.dependents.get(name) || []).forEach((/** @type {string} */dep) => {
          const deg = inDegree.get(dep) - 1;
          inDegree.set(dep, deg);
          if (deg === 0) queue.push(dep);
        });
      }
      return result;
    }

    /**
     * 检测循环依赖
     * @param {string} startName 起始模块名称
     * @param {string[]} dependencies 依赖列表
     * @returns {boolean} 是否存在循环依赖
     */
    #detectCircularDependency(startName, dependencies) {
      const reg = this.registry;
      const visited = new Set(), onStack = new Set(), graph = new Map();
      reg.modules.forEach((_, nm) => graph.set(nm, [...(reg.dependencies.get(nm) || [])]));
      if (!graph.has(startName)) graph.set(startName, dependencies || []);
      /** 深度优先搜索函数 @param {string} node 当前节点 @returns {boolean} 是否检测到循环依赖 */
      const dfs = node => {
        if (onStack.has(node)) return true;
        if (visited.has(node)) return false;
        visited.add(node);
        onStack.add(node);
        for (const n of (graph.get(node) || [])) if (dfs(n)) return true;
        onStack.delete(node);
        return false;
      };
      if (dfs(startName)) {
        this.core.logger.log(`循环依赖检测到: ${startName}`, 'ERROR');
        return true;
      }
      return false;
    }

    /** 获取模块深度 @param {string} moduleName 模块名称 @returns {number} 模块深度 */
    #getModuleDepth(moduleName) {
      if (this.#depthMemo.has(moduleName)) return this.#depthMemo.get(moduleName);
      const filteredDeps = [...(this.registry.dependencies.get(moduleName) || [])].filter(dep => this.registry.states.get(dep) !== ModuleState.EXTENSION);
      const depth = filteredDeps.length === 0 ? 0 : Math.max(...filteredDeps.map(d => this.#getModuleDepth(d) + 1));
      this.#depthMemo.set(moduleName, depth);
      return depth;
    }
  }

  class MaplebirchCore {
    static meta = {
      version: frameworkVersion,
      name: 'maplebirch Core',
      author: '楓樺葉',
      modifiedby: lastModifiedBy,
      UpdateDate: lastUpdate,
      availableLanguages: LanguageManager.DEFAULT_LANGS,
      coreModules: ['addon', 'state', 'tool', 'audio', 'var', 'char', 'npc', 'combat', 'shop'],
      earlyMount: ['addon', 'state', 'tool'],
    }

    constructor() {
      this.meta = MaplebirchCore.meta;
      /** @type {string[]} */
      this.modList = [];
      this.logger = new Logger(this);
      this.tracer = new EventEmitter(this);
      this.idb = new IndexedDBService(this);
      this.lang = new LanguageManager(this);
      this.modules = new ModuleSystem(this);
      this.onLoad = false;

      this.log(`核心系统创建完成 (v${MaplebirchCore.meta.version})\n开始设置初始化流程`, 'INFO');
      this.log('初始化内置监听', 'DEBUG');
      const events = [':passageinit',':passagestart',':passagerender',':passagedisplay',':passageend',':storyready'];
      events.forEach(event => $(document).on(event, (ev) => this.trigger(event, ev)));

      this.once(':IndexedDB', async() => {
        this.lang.initDB();
      });

      this.once(':import', async() => {
        await this.lang.preload();
        for await (const p of this.lang.importAll('maplebirch')) if (p.error) this.log(`导入失败: ${p.lang}`, 'ERROR');
      })

      this.once(':allModule', async () => {
        this.log('所有模块注册完成，开始预初始化', 'INFO');
        try { await this.trigger(':IndexedDB'); } catch { this.log(':IndexedDB注册错误', 'ERROR'); };
        try { await this.idb.init(); } catch { this.log('IndexedDB初始化错误', 'ERROR'); };
        await this.pre();
      });

      this.on(':passageinit', async (/**@type {{ passage: any; }}*/ev) => {
        const passage = ev.passage;
        if (!passage || passage.tags.includes('widget')) return;
        if (passage.title == 'Start' || passage.title == 'Downgrade Waiting Room') return;
        this.modules.initPhase.postInitExecuted = false;
        await this.init();
      });

      this.on(':passagestart', async () => {
        if (this.onLoad) {
          let retryCount = 0;
          const stateShow = !this.modules.initPhase.mainInitCompleted;
          const tryLoadInit = async () => {
            if (this.modules.initPhase.mainInitCompleted) {
              this.trigger(':loadSaveData', State);
              await this.load();
              if (stateShow) this.SugarCube.Engine.show();
              this.onLoad = false;
            } else if (retryCount < 10) {
              retryCount++;
              setTimeout(tryLoadInit, 5);
            }
          };
          tryLoadInit();
        }
      });

      this.on(':passagerender', async () => {
        let retryCount = 0;
        const tryPostInit = async () => {
          if (this.modules.initPhase.loadInitExecuted) {
            await this.post();
          } else if (this.modules.initPhase.mainInitCompleted) {
            if (this.onLoad) return;
            await this.post();
          } else if (retryCount < 10) {
            retryCount++;
            setTimeout(tryPostInit, 5);
          }
        };
        tryPostInit();
      });

      this.on(':passageend' , async () => setTimeout(() => this.trigger(':finally'), 500));

      this.once(':storyready' , async () => {
        this.SugarCube.Save.onSave.add(async() => this.trigger(':onSave', State));
        this.SugarCube.Save.onLoad.add(async() => {
          this.trigger(':onLoad');
          this.onLoad = true;
          this.modules.initPhase.loadInitExecuted = false;
        });
      });
      
      this.ExModCount = 10;
      this.log('初始化流程设置结束', 'INFO');
    }

    /** @param {string} msg @param {any[]} objs */
    log(msg, level = 'INFO', ...objs) {
      this.logger.log(msg, level, ...objs);
    }  

    /** @param {string} evt @param {Function} handler */
    on(evt, handler, desc = '') {
      return this.tracer.on(evt, handler, desc);
    }

    /** @param {string} evt @param {string|Function} identifier */
    off(evt, identifier) {
      return this.tracer.off(evt, identifier);
    }

    /** @param {string} evt @param {Function} handler */
    once(evt, handler, desc = '') {
      return this.tracer.once(evt, handler, desc);
    }   

    /** @param {string} evt @param {...any} args */
    async trigger(evt, ...args) {
      await this.tracer.trigger(evt, ...args);
    }

    /** @param {string} name @param {any} module @param {string[]} [dependencies] @param {boolean|undefined} [isExtension] */
    async register(name, module, dependencies = [], isExtension) {
      return this.modules.register(name, module, dependencies, isExtension);
    }

    async pre() {
      return await this.modules.preInit();
    }

    async init() {
      return await this.modules.init();
    }

    async load() {
      return await this.modules.loadInit();
    }

    async post() {
      return await this.modules.postInit();
    }

    /** @param {string} key @param {boolean} [space=false] */
    t(key, space = false) {
      return this.lang.t(key, space);
    }

    /** @param {string} text */
    auto(text) {
      return this.lang.auto(text);
    }

    /** @param {any} parts */
    set SugarCube(parts) {
      jsSugarCube = parts;
    }

    set Language(lang) {
      this.lang.setLanguage(lang);
      this.tracer.trigger(':language');
    }

    set LogLevel(level) {
      this.logger.LevelName = level;
    }

    /** @param {number} count */
    set ExModCount(count) {
      this.logger.log(`设置预期模块数量: ${count}`, 'DEBUG');
      this.modules.setExpectedModuleCount(count);
    }

    /** @param {any} name */
    getModule(name) {
      return this.modules.registry.modules.get(name);
    }

    get SugarCube() {
      return jsSugarCube;
    }

    get Language() {
      return this.lang.language;
    }

    get LogLevel() {
      return this.logger.LevelName;
    }

    get expected() {
      return this.modules.initPhase.expectedCount;
    }
    
    get registered() {
      return this.modules.initPhase.registeredCount;
    }
    
    get dependencyGraph() {
      return this.modules.getDependencyGraph();
    }

    get yaml() {
      return jsyaml;
    }

    get modLoader() {
      return modSC2DataManager.getModLoader()
    }

    get modUtils() {
      return modSC2DataManager.getModUtils()
    }

    get gameVersion() {
      return StartConfig.version;
    }
  }

  return new MaplebirchCore();
})();