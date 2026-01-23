// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(() => {
	'use strict';

	class Entry {
    /** @param {string} type @param {Array<{name:string;tfRequired:number;[x:string]:any}>} parts @param {Array<{name:string;tfRequired:number;[x:string]:any}>} [traits] @param {any} [options] */
    constructor(type, parts, traits, options) {
      this.type = type;
      this.parts = parts;
      this.traits = traits;
			this.build = options.build ?? 100;
			this.level = options.level ?? 6;
			this.update = options.update;
			this.icon = options.icon;
			this.message = options.message;
    }
  }

	class Transformation {
		/** @param {CharacterManager} manager */
		constructor(manager) {
			this.manager = manager;
			this.log = manager.log;
			/**@type {Map<string, Entry>}*/
			this.config = new Map();
			/** @type {Object<string,Array<Function>>} */
			this.decayConditions = {
				wolf: [() => V.wolfbuild >= 1,() => V.worn.neck.name !== 'spiked collar',() => V.worn.neck.name !== 'spiked collar with leash',() => playerNormalPregnancyType() !== 'wolf'],
				cat: [() => V.catbuild >= 1,() => V.worn.neck.name !== 'cat bell collar',() => playerNormalPregnancyType() !== 'cat'],
				cow: [() => V.cowbuild >= 1,() => V.worn.neck.name !== 'cow bell',() => playerNormalPregnancyType() !== 'cow'],
				// 0.5.6：新增羽毛项链
				bird: [() => V.birdbuild >= 1,() => V.worn.head.name !== 'feathered hair clip',() => V.worn.neck.name !== 'feather necklace',() => playerNormalPregnancyType() !== 'hawk'],
				// 0.5.6：新增碧玉吊坠
				fox: [() => V.foxbuild >= 1,() => V.worn.head.name !== 'spirit mask',() => V.worn.neck.name !== 'jasper pendant',() => playerNormalPregnancyType() !== 'fox']
			};
			/** @type {Object<string,Array<Function>>} */
			this.suppressConditions = {
				wolf: [(/**@type {string}*/sourceName) => sourceName !== 'wolf',() => V.worn.neck.name !== 'spiked collar',() => V.worn.neck.name !== 'spiked collar with leash'],
				cat: [(/**@type {string}*/sourceName) => sourceName !== 'cat',() => V.worn.neck.name !== 'cat bell collar'],
				cow: [(/**@type {string}*/sourceName) => sourceName !== 'cow',() => V.worn.neck.name !== 'cow bell'],
				// 0.5.6：新增羽毛项链
				bird: [(/**@type {string}*/sourceName) => sourceName !== 'bird',() => V.worn.head.name !== 'feathered hair clip',() => V.worn.neck.name !== 'feather necklace'],
				// 0.5.6：新增碧玉吊坠
				fox: [(/**@type {string}*/sourceName) => sourceName !== 'fox',() => V.worn.head.name !== 'spirit mask',() => V.worn.neck.name !== 'jasper pendant']
			};
			manager.core.once(':finally', () => {
				manager.core.tool.widget.defineMacro('transform', (/**@type {String}*/name, /**@type {Number}*/change) => this._transform(name, change));
				manager.core.tool.widget.defineMacro('transformationAlteration', () => this._transformationAlteration());
				manager.core.tool.widget.defineMacro('transformationStateUpdate', () => this._transformationStateUpdate());
			});
		}

		/** @param {string} widget @param {any[]} args */
		#wikifier(widget, ...args) {
			return maplebirch.SugarCube.Wikifier.wikifyEval('<<' + widget + (args.length ? ' ' + args.join(' ') : '') + '>>');
		}

		/** @param {FrameworkAddon} manager */
		async modifyEffect(manager) {
			const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
			const SCdata = oldSCdata.cloneSC2DataInfo();
			const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('effect.js');
			const regex = /errors.pushUnique\(messageKey\);/;
			if (regex.test(file.content)) {
				file.content = file.content.replace(
					regex,
					'if (maplebirch.char.transformation.message(messageKey, { element: element, sWikifier: sWikifier, fragment: fragment, wikifier: wikifier })) break;\n\t\t\t\t\terrors.pushUnique\(messageKey\);'
				);
			}
			manager.addonReplacePatcher.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
		}


		/**
		 * @param {string} name
		 * @param {string} type
		 * @param {{ parts: { [x: string]: any; name: string; tfRequired: number; }[]; traits: { [x: string]: any; name: string; tfRequired: number; }[] | undefined; decay: boolean; decayConditions: (() => boolean)[]; suppress: boolean; suppressConditions: ((sourceName: string) => boolean)[]; pre: any; post: any; layers: any; translations: { [x: string]: string; }; }} options
		 */
		add(name, type, options) {
			const entry = new Entry(type, options.parts, options.traits, options);
			this.config.set(name, entry);
			if (type === 'physical' && options.decay !== false && !this.decayConditions[name]) this.decayConditions[name] = options.decayConditions ?? [() => V.maplebirch.transformation[name].build >= 1];
			if (type === 'physical' && options.suppress !== false && !this.suppressConditions[name]) this.suppressConditions[name] = options.suppressConditions ?? [(/**@type {string}*/sourceName) => sourceName !== name];
			if (options.pre && typeof options.pre === 'function') this.manager.use('pre', options.pre);
			if (options.post && typeof options.post === 'function') this.manager.use('post', options.post);
			if (options.layers && typeof options.layers === 'object') this.manager.use(options.layers);
			if (typeof options.translations === 'object') {
				for (const key in options.translations) {
					if (options.translations.hasOwnProperty(key)) {
						try { this.manager.core.lang.translations.set(key, options.translations[key]); }
						catch (/**@type {any}*/error) { this.log(`设置翻译键失败: ${key} - ${error.message}`, 'ERROR'); }
					}
				}
			}
			return this;
		}

		inject() {
			this._update();
			this._clear();
		}

		_update() {
			const base = setup.transformations;
			/**@type {Array<{name:string;[x: string]:any}>}*/
			const injected = [];
			const baseNames = new Set();
			for (const tf of base) if (tf?.name) baseNames.add(tf.name === 'fallenangel' ? 'fallenAngel' : tf.name);
			for (const [name, entry] of this.config) {
				if (!entry?.type) continue;
				injected.push({
					name,
					get level() { return V.maplebirch?.transformation?.[name]?.level ?? 0; },
					get build() { return V.maplebirch?.transformation?.[name]?.build ?? 0; },
					type: entry.type + 'Transform',
					parts: entry.parts || [],
					traits: entry.traits || []
				});
			}
			setup.transformations = [...base,...injected.filter(t => !baseNames.has(t.name))];
			V.maplebirch.transformation ??= {};
			if (!V.transformationParts) V.transformationParts = {};
			if (!V.transformationParts.traits) V.transformationParts.traits = {};
			const collectNames = (/**@type {any[]}*/list) => {
				if (!Array.isArray(list)) return [];
				return list.map(p => p?.name).filter(Boolean);
			};
			for (const [name, entry] of this.config) {
				if (!V.maplebirch.transformation[name]) V.maplebirch.transformation[name] = { level: 0, build: 0 };
				if (entry.parts?.length) {
					if (!V.transformationParts[name]) V.transformationParts[name] = {};
					const original = V.transformationParts[name];
					for (const partName of collectNames(entry.parts)) if (!(partName in original)) V.transformationParts[name][partName] = 'disabled';
				}
				if (entry.traits?.length) {
					if (!V.transformationParts.traits) V.transformationParts.traits = {};
					const original = V.transformationParts.traits;
					for (const traitName of collectNames(entry.traits)) if (!(traitName in original)) V.transformationParts.traits[traitName] = 'disabled';
				}
			}
		}

		_clear() {
			const valid = { names: new Set(), traits: new Set() };
			if (Array.isArray(setup.transformations)) {
				setup.transformations.forEach((/**@type {{ name: any; traits: { name: any; }[]; }}*/t) => {
					if (t?.name) valid.names.add(t.name === 'fallenangel' ? 'fallenAngel' : t.name);
					t?.traits?.forEach((/**@type {{ name: any; }}*/trait) => trait?.name && valid.traits.add(trait.name));
				});
			}
			if (V.maplebirch?.transformation) Object.keys(V.maplebirch.transformation).forEach(name => { if (!valid.names.has(name)) delete V.maplebirch.transformation[name]; });
			if (V.transformationParts) {
				Object.keys(V.transformationParts).forEach(name => {
					if (name === 'traits') return;
					if (!valid.names.has(name)) delete V.transformationParts[name];
				});
				if (V.transformationParts.traits) Object.keys(V.transformationParts.traits).forEach(trait => { if (!valid.traits.has(trait)) delete V.transformationParts.traits[trait]; });
			}
		}

		/** @param {string} name @param {number} change */
		#suppress(name, change) {
			const absChange = Math.abs(change);
			for (const [target, conditions] of Object.entries(this.suppressConditions)) {
				if (target === name) continue;
				if (conditions.every(condition => condition(name))) this._transform(target, -absChange);
			}
		}

		/** @param {string} name @param {number} change */
		_transform(name, change) {
			if (!change) return;
			/**@type {string}*/let type = '';
			if (Array.isArray(setup.transformations)) {
				const transformation = setup.transformations.find((/**@type {{ name: string; }}*/t) => t.name === name);
				if (transformation) type = transformation.type;
			}
			switch (name) {
				case 'wolf': V.wolfbuild = Math.clamp(V.wolfbuild + change, 0, 100); break;
				case 'cat': V.catbuild = Math.clamp(V.catbuild + change, 0, 100); break;
				case 'cow': V.cowbuild = Math.clamp(V.cowbuild + change, 0, 100); break;
				case 'bird': V.birdbuild = Math.clamp(V.birdbuild + change, 0, 100); break;
				case 'fox': V.foxbuild = Math.clamp(V.foxbuild + change, 0, 100); break;
				case 'angel': V.angelbuild = Math.clamp(V.angelbuild + change, 0, 100); break;
				case 'fallen': V.fallenbuild = Math.clamp(V.fallenbuild + change, 0, 100); break;
				case 'demon': V.demonbuild = Math.clamp(V.demonbuild + change, 0, 100); break;
				default: 
					const config = this.config.get(name);
					if (config) V.maplebirch.transformation[name].build = Math.clamp(V.maplebirch.transformation[name].build + change, 0, config.build); 
					break;
				}
			if (this.suppressConditions.hasOwnProperty(name) && change > 0 && !(V.worn.neck.name === 'familiar collar' && V.worn.neck.cursed === 1))  this.#suppress(name, change);
		}

		/** @param {string} name */
		updateTransform(name) {
			const entry = this.config.get(name);
			if (!entry) return;
			const Build = V.maplebirch?.transformation?.[name]?.build ?? 0;
			const Level = V.maplebirch?.transformation?.[name]?.level ?? 0;
			const maxLevel = entry.level ?? 6;
			if (Array.isArray(entry.update)) {
				const thresholds = entry.update;
				if (Level < maxLevel && Build >= thresholds[Level]) {
					V.maplebirch.transformation[name].level = Level + 1;
					this._updateParts(name, Level, Level + 1);
					if (V.timeMessages && !V.timeMessages.includes(`${name}Up${Level + 1}`)) V.timeMessages.push(`${name}Up${Level + 1}`);
				} else if (Level > 0 && Build < thresholds[Level - 1]) {
					V.maplebirch.transformation[name].level = Level + 1;
					this._updateParts(name, Level, Level + 1);
					if (V.timeMessages && !V.timeMessages.includes(`${name}Down${Level + 1}`)) V.timeMessages.push(`${name}Down${Level + 1}`);
				}
			}
		}
		
		/** @param {string} name @param {number} oldLevel @param {number} newLevel */
		_updateParts(name, oldLevel, newLevel) {
			const entry = this.config.get(name);
			if (!entry || !entry.parts) return;
			V.transformationParts[name] ??= {};
			for (const part of entry.parts) {
				if (!part.name || part.tfRequired === undefined) continue;
				if (newLevel >= part.tfRequired) { V.transformationParts[name][part.name] = part.default || 'default'; }
				else if (oldLevel >= part.tfRequired) { V.transformationParts[name][part.name] = 'disabled'; }
			}
			if (entry.traits) {
				V.transformationParts.traits ??= {};
				for (const trait of entry.traits) {
					if (!trait.name || trait.tfRequired === undefined) continue;
					if (newLevel >= trait.tfRequired) { V.transformationParts.traits[trait.name] = 'default'; }
					else if (oldLevel >= trait.tfRequired) { V.transformationParts.traits[trait.name] = 'disabled'; }
				}
			}
		}

		_transformationAlteration() {
			// 神圣转化
			if (V.settings.transformDivineEnabled) {
				if ((V.demonbuild >= 5 && V.specialTransform !== 1) || (V.demon >= 1 && V.specialTransform === 1)) {
					this.#wikifier('demonTransform', V.demon);
				} else if ((V.angelbuild >= 5 && V.specialTransform !== 1) || (V.angel >= 1 && V.specialTransform === 1)) {
					this.#wikifier('angelTransform', V.angel);
				} else if (V.fallenangel >= 2) {
					this.#wikifier('fallenButNotOut', V.fallenangel);
				}
			}
			// 动物转化
			if (V.settings.transformAnimalEnabled) {
				const transforms = [
					{ name: 'wolf', level: V.wolfgirl, build: V.wolfbuild },
					{ name: 'cat', level: V.cat, build: V.catbuild },
					{ name: 'cow', level: V.cow, build: V.cowbuild },
					{ name: 'bird', level: V.harpy, build: V.birdbuild },
					{ name: 'fox', level: V.fox, build: V.foxbuild }
				];
				for (const [name, entry] of this.config) if (entry.type === 'physical') transforms.push({ name, level: V.maplebirch?.transformation?.[name]?.level ?? 0, build: V.maplebirch?.transformation?.[name]?.build ?? 0 });
				const maxLevel = Math.max(...transforms.map(t => t.level));
				let selected = null;
				if (maxLevel > 0) {
					const highest = transforms.filter(t => t.level === maxLevel);
					selected = highest[0];
				} else {
					const maxBuild = Math.max(...transforms.map(t => t.build));
					if (maxBuild >= 5) {
						const highest = transforms.filter(t => t.build === maxBuild);
						if (highest.length === 1) selected = highest[0];
					}
				}
				if (selected) {
					/**@type {{[x:string]:any[]}}*/const vanilla = {
						'wolf': ['wolfTransform', V.wolfgirl],
						'cat': ['catTransform', V.cat],
						'cow': ['cowTransform', V.cow],
						'bird': ['harpyTransform', V.harpy],
						'fox': ['foxTransform', V.fox]
					};
					if (vanilla[selected.name]) {
						const [macro, level] = vanilla[selected.name];
						this.#wikifier(macro, level);
					} else {
						this.updateTransform(selected.name);
					}
				}
			}
			// 其它类型
			for (const [name, entry] of this.config) {
				if (entry.type === 'physical') continue;
				this.updateTransform(name);
			}
		}

		_transformationStateUpdate() {
			// 0.5.6：眷属项圈检查
			if (!(V.worn.neck.name === 'familiar collar' && V.worn.neck.cursed === 1)) Object.entries(this.decayConditions).forEach(([animal, conditions]) => { if (conditions.every((condition) => condition())) this._transform(animal, -1); });
			if (V.wolfgirl >= 6) this.#wikifier('def', 5);
			this._transformationAlteration();
			V.physicalTransform = (V.cat > 0 || V.wolfgirl > 0 || V.cow > 0 || V.harpy > 0 || V.fox > 0 || Array.from(this.config.entries()).some(([name, entry]) => entry.type === 'physical' && (V.maplebirch?.transformation?.[name]?.level ?? 0) > 0)) ? 1 : 0;
			if ((V.physicalTransform === 1 || V.specialTransform === 1) && !(V.hypnosis_traits?.peace && V.settings.hypnosisEnabled)) this.#handleHiddenTransformParts();
			// 0.5.6 转化历史
			for (const tf of ['angel', 'fallenangel', 'demon', 'dryad', 'wolfgirl', 'cat', 'cow', 'harpy', 'fox']) {
				const level = V[tf];
				const max = tf === 'fallenangel' ? 2 : 6;
				if (level >= max) {
					if (!V.transformationHistory) V.transformationHistory = [];
					if (!V.transformationHistory.includes(tf)) V.transformationHistory.push(tf);
				}
			}
			for (const [name, entry] of this.config) {
				const level = V.maplebirch?.transformation?.[name]?.level ?? 0;
				const max = entry.level ?? 6;
				if (level >= max) {
					if (!V.transformationHistory) V.transformationHistory = [];
					if (!V.transformationHistory.includes(name)) V.transformationHistory.push(name);
				}
			}
		}

		#handleHiddenTransformParts() {
			let excludeWings = false;
			if (V.harpy >= 6 && V.transformationParts.bird?.wings !== 'hidden') {
				if (V.angel >= 6 && V.transformationParts.angel?.wings !== 'hidden') excludeWings = true;
				if (V.fallenangel >= 2 && V.transformationParts.fallenAngel?.wings !== 'hidden') excludeWings = true;
				if (V.demon >= 6 && V.transformationParts.demon?.wings !== 'hidden') excludeWings = true;
				if (!excludeWings) {
					for (const [name, entry] of this.config) {
						const wingsPart = entry.parts?.find(p => p.name === 'wings');
						if (!wingsPart) continue;
						const level = V.maplebirch?.transformation?.[name]?.level ?? 0;
						if (level < wingsPart.tfRequired) continue;
						if (V.transformationParts[name]?.wings !== 'hidden')  {excludeWings = true; break;}
					}
				}
			}
			for (const key in V.transformationParts) {
				if (key === 'traits') continue;
				const parts = V.transformationParts[key];
				if (!parts) continue;
				for (const [label, value] of Object.entries(parts)) {
					if (value !== 'hidden' || ['pubes', 'pits'].includes(label)) continue;
					if (label === 'wings' && excludeWings) continue;
					if (V.panicattacks >= 2) {
						V.transformationParts[key][label] = 'default';
						V.effectsmessage = 1;
						V.hiddenTransformMessage = 1;
					} else {
						this.#wikifier('trauma', 15);
						V.effectsmessage = 1;
						V.hiddenTransformMessage = 2;
					}
				}
			}
		}
		
		/** @param {string} key @param {{ element: (arg0: string, arg1: any, arg2: string) => void; wikifier: (arg0: string, arg1: string) => void; }} tools */
		message(key, tools) {
			const match = key.match(/^([a-z]+)(Up|Down)(\d+)$/i);
			if (!match) return false;
			const [, name, direction, levelStr] = match;
			const level = parseInt(levelStr);
			const entry = this.config.get(name);
			if (!entry || !entry.message) return false;
			const lang = maplebirch.Language;
			if (!entry.message[lang]) return false;
			const messageArray = entry.message[lang][direction.toLowerCase()];
			if (!messageArray) return false;
			const index = direction === 'Up' ? level - 1 : level;
			if (index < 0 || index >= messageArray.length) return false;
			const messageText = messageArray[index];
			if (!messageText) return false;
			tools.element('span', messageText, 'gold');
			if (direction === 'Up' && level === entry.level) {
				const featName = name.charAt(0).toUpperCase() + name.slice(1);
				tools.wikifier('earnFeat', `'${featName}'`);
			}
			return true;
		}

		get icon() {
			const activeTfs = setup.transformations.filter((/**@type {{ parts: any[]; level: number; }}*/tf) => tf.parts?.some(part => tf.level >= part.tfRequired));
			if (activeTfs.length === 0) return '<<tficon "angel">>';
			let highestTf = activeTfs[0];
			for (let i = 1; i < activeTfs.length; i++) if (activeTfs[i].level > highestTf.level) highestTf = activeTfs[i];
			const tfName = highestTf.name;
			for (const [name, entry] of this.config) if (name === tfName && entry?.icon) return `<<icon '${entry.icon}'>>`;
			return `<<tficon '${tfName}'>>`;
		}

		/** @param {string} name @param {number|null} level */
		setTransform(name, level) {
			const entry = this.config.get(name);
			if (!entry) return;
			const data = V.maplebirch?.transformation?.[name];
			if (!data) return;
			const maxLevel = entry.level ?? 6;
			const oldLevel = data.level ?? 0;
			let newLevel, newBuild;
			if (level == null) { newLevel = maxLevel; }
			else if (level <= 0) { newLevel = 0; }
			else { newLevel = Math.min(level, maxLevel); }
			if (newLevel === 0) { newBuild = 0; }
			else if (Array.isArray(entry.update) && newLevel > 0) { newBuild = entry.update[newLevel - 1]; }
			else { newBuild = Math.round((newLevel / maxLevel) * (entry.build ?? 100)); }
			data.level = newLevel;
			data.build = newBuild;
			this._updateParts(name, oldLevel, newLevel);
		}
	}

	maplebirch.once(':char-init', (/**@type {CharacterManager}*/data) => Object.assign(data, { transformation: new Transformation(data) }));
})();