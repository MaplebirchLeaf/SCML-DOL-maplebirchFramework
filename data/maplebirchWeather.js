(() => {
  'use strict';
  const maplebirch = window.maplebirch;

  class modifyWeather {
    constructor(modSC2DataManager, addonReplacePatcher) {
      this.modSC2DataManager = modSC2DataManager;
      this.addonReplacePatcher = addonReplacePatcher;
      this.#bannerSkyFunction;
      this.#bannerSunGlowFunction;
      this.#skyFunction;
      this.#sunFunction;
      this.#sunGlowFunction;
      maplebirch.once(':definewidget', () => this.initWeather());
    }

    initWeather() {
      const descriptions = {
        clear: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = maplebirch.Language;
            if (lang === 'CN') {
              if (phase < 0.3) return '天色开始诡异地变暗，仿佛黄昏提前降临。';
              else if (phase > 0.7) return '黑暗逐渐退去，白昼的光线重新洒向大地。';
              else return '日蚀让世界陷入昏暗，仿佛时间停滞了一般。';
            } else {
              if (phase < 0.3) return 'The sky begins to darken eerily, as if dusk has arrived early.';
              else if (phase > 0.7) return 'The darkness recedes, and daylight returns to the earth.';
              else return 'The solar eclipse plunges the world into gloom, as if time has stood still.';
            }
          }
        },
        lightClouds: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = window.maplebirch.Language;
            if (lang === 'CN') {
              if (phase < 0.3) return '透过云层的光线开始减弱，天色变得诡异。';
              else if (phase > 0.7) return '光线透过云层逐渐增强，日食即将结束。';
              else return '在日蚀的黑暗中，云朵边缘泛着奇异的光晕。';
            } else {
              if (phase < 0.3) return 'The light filtering through the clouds begins to weaken, the sky turning eerie.';
              else if (phase > 0.7) return 'Light gradually strengthens through the clouds as the eclipse nears its end.';
              else return 'In the darkness of the eclipse, the edges of clouds glow with a strange halo.';
            }
          }
        },
        heavyClouds: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = window.maplebirch.Language;
            if (lang === 'CN') {
              if (phase < 0.3) return '厚重的云层下，日食让世界陷入更深的昏暗。';
              else if (phase > 0.7) return '日食即将结束，但阴云依旧笼罩着昏暗的天空。';
              else return '日蚀的黑暗中，阴沉的天空几乎如同深夜。';
            } else {
              if (phase < 0.3) return 'Beneath the thick clouds, the eclipse plunges the world into deeper gloom.';
              else if (phase > 0.7) return 'The eclipse is ending, but gloomy clouds still shroud the dark sky.';
              else return 'In the darkness of the eclipse, the overcast sky is almost like deep night.';
            }
          }
        },
        lightPrecipitation: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = window.maplebirch.Language;
            if (Weather.precipitation === 'rain') {
              if (lang === 'CN') {
                if (phase < 0.3) return '天色渐暗，细雨在异常的光线下闪烁着银光。';
                else if (phase > 0.7) return '日食将尽，雨滴开始映出逐渐恢复的光亮。';
                else return '日蚀的黑暗中，雨声显得格外清晰而神秘。';
              } else {
                if (phase < 0.3) return 'The sky darkens, and the drizzle shimmers silver in the abnormal light.';
                else if (phase > 0.7) return 'The eclipse is ending, and raindrops begin to reflect the returning light.';
                else return 'In the darkness of the eclipse, the sound of rain is particularly clear and mysterious.';
              }
            } else {
              if (lang === 'CN') {
                if (phase < 0.3) return '天色渐暗，雪花在异常的光线下如同飘落的萤火。';
                else if (phase > 0.7) return '日食将尽，雪地开始反射出微弱的光亮。';
                else return '日蚀的黑暗中，飘雪为世界披上了一层银白的寂静。';
              } else {
                if (phase < 0.3) return 'The sky darkens, and snowflakes fall like fireflies in the strange light.';
                else if (phase > 0.7) return 'The eclipse is ending, and the snow begins to reflect a faint light.';
                else return 'In the darkness of the eclipse, the falling snow drapes the world in a silent white veil.';
              }
            }
          }
        },
        heavyPrecipitation: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = window.maplebirch.Language;
            if (Weather.precipitation === 'rain') {
              if (lang === 'CN') {
                if (phase < 0.3) return '暴雨在日食的昏暗天空中更显狂暴。';
                else if (phase > 0.7) return '日食渐退，但暴雨依旧倾盆而下。';
                else return '日蚀的黑暗中，暴雨声如同天地的怒吼。';
              } else {
                if (phase < 0.3) return 'The storm seems even more violent under the dim sky of the eclipse.';
                else if (phase > 0.7) return 'The eclipse is fading, but the heavy rain still pours down.';
                else return 'In the darkness of the eclipse, the sound of the storm is like the roar of heaven and earth.';
              }
            } else {
              if (lang === 'CN') {
                if (phase < 0.3) return '暴雪在日食的昏暗天空中更显猛烈。';
                else if (phase > 0.7) return '日食渐退，但暴风雪依旧肆虐。';
                else return '日蚀的黑暗中，暴风雪将世界笼罩在白色的混沌中。';
              } else {
                if (phase < 0.3) return 'The blizzard seems even more fierce under the dim sky of the eclipse.';
                else if (phase > 0.7) return 'The eclipse is fading, but the snowstorm still rages.';
                else return 'In the darkness of the eclipse, the blizzard envelops the world in white chaos.';
              }
            }
          }
        },
        thunderStorm: {
          solarEclipse: () => {
            const phase = Weather.solarEclipsePhase;
            const lang = window.maplebirch.Language;
            if (lang === 'CN') {
              if (phase < 0.3) return '日食开始，雷暴在逐渐暗淡的天空中显得更加骇人。';
              else if (phase > 0.7) return '日食即将结束，但雷电依旧在昏暗的天空中闪烁。';
              else return '日蚀的黑暗中，闪电的光芒格外刺眼。';
            } else {
              if (phase < 0.3) return 'The eclipse begins, and the thunderstorm appears even more terrifying in the fading sky.';
              else if (phase > 0.7) return 'The eclipse is ending, but lightning still flashes in the dim sky.';
              else return 'In the darkness of the eclipse, the flash of lightning is particularly dazzling.';
            }
          }
        }
      };
      Object.keys(descriptions).forEach(weatherType => { if (setup.WeatherDescriptions.type[weatherType]) Object.assign(setup.WeatherDescriptions.type[weatherType], descriptions[weatherType]); });
      Object.defineProperty(Weather, 'skyState', {
        get: function () {
          if (Weather.solarEclipse) return "solarEclipse";
          if (Weather.bloodMoon) return "bloodMoon";
          return this.dayState;; 
        }, 
      });
      Object.defineProperty(Weather, 'solarEclipse', { get: function () { maplebirch.var.constructor.check(); return maplebirch.state.solarEclipse.solarEclipse; }, });
      Object.defineProperty(Weather, 'solarEclipsePhase', { get: function () { maplebirch.var.constructor.check(); return maplebirch.state.solarEclipse.solarEclipsePhase; }, });
      Object.defineProperty(Weather, 'solarEclipseStage', { get: function () { maplebirch.var.constructor.check(); return maplebirch.state.solarEclipse.solarEclipseStage; }, });
    }

    #bannerSkyFunction = 
`Weather.Renderer.Layers.add({
  name: "bannerSky",
  zIndex: 0,
  effects: [
    {
      /* Night sky */
      effect: "skyGradiant",
      drawCondition() {
        return !Weather.bloodMoon && !this.renderInstance.skyDisabled;
      },
      params: {
        radius: 256,
      },
      bindings: {
        color() {
          // Make it brighter when moon is lit
          const colorCloseMin = ColourUtils.interpolateColor("#00001c00", "#1c1c6100", this.renderInstance.moonBrightnessFactor);
          const colorClose = ColourUtils.interpolateColor("#00001c", "#1c1c61", this.renderInstance.moonBrightnessFactor);
          return {
            colorMin: { close: colorCloseMin, far: "#00001c00" },
            colorMed: { close: colorClose, far: "#00001c" },
            colorMax: { close: colorClose, far: "#00001c" },
          };
        },
        position() {
          return this.renderInstance.orbitals.moon.position;
        },
        factor() {
          return this.renderInstance.orbitals.moon.factor;
        },
      },
    },
    {
      /* Blood sky */
      effect: "skyGradiant",
      drawCondition() {
        return Weather.bloodMoon && !this.renderInstance.skyDisabled;
      },
      params: {
        color: {
          colorMin: { close: "#4d000000", far: "#21070700" },
          colorMed: { close: "#4d0000", far: "#210707" },
          colorMax: { close: "#4d0000", far: "#210707" },
        },
        radius: 256,
      },
      bindings: {
        position() {
          return this.renderInstance.orbitals.bloodMoon.position;
        },
        factor() {
          return this.renderInstance.orbitals.bloodMoon.factor;
        },
      },
    },
    {
      /* Day sky */
      effect: "skyGradiant",
      drawCondition() {
        return !Weather.solarEclipse && !this.renderInstance.skyDisabled;
      },
      params: {
        color: {
          colorMin: { close: "#14145200", far: "#00001c00" },
          colorMed: { close: "#d47d12", far: "#6c6d94" },
          colorMax: { close: "#d4d7ff", far: "#4692d4" },
        },
        radius: 384,
      },
      bindings: {
        position() {
          return this.renderInstance.orbitals.sun.position;
        },
        factor() {
          return this.renderInstance.orbitals.sun.factor;
        },
      },
    },
    {
      /* Eclipse sky */
      effect: "skyGradiant",
      drawCondition() {
        return Weather.solarEclipse && !this.renderInstance.skyDisabled;
      },
      params: {
        radius: 384,
      },
      bindings: {
        color() {
          const phase = Weather.solarEclipsePhase;
          const dayColors = {
            colorMin: { close: "#14145200", far: "#00001c00" },
            colorMed: { close: "#d47d12", far: "#6c6d94" },
            colorMax: { close: "#d4d7ff", far: "#4692d4" },
          };
          const eclipseColors = {
            colorMin: { close: "#2d1f0000", far: "#1a120000" },
            colorMed: { close: "#2d1f00", far: "#1a1200" },
            colorMax: { close: "#2d1f00", far: "#1a1200" },
          };
          let transitionFactor;
          if (phase < 0.3) {
            transitionFactor = phase / 0.3;
          } else if (phase > 0.7) {
            transitionFactor = (1 - phase) / 0.3;
          } else {
            transitionFactor = 1;
          }
          return {
            colorMin: {
              close: ColourUtils.interpolateColor(dayColors.colorMin.close, eclipseColors.colorMin.close, transitionFactor),
              far: ColourUtils.interpolateColor(dayColors.colorMin.far, eclipseColors.colorMin.far, transitionFactor)
            },
            colorMed: {
              close: ColourUtils.interpolateColor(dayColors.colorMed.close, eclipseColors.colorMed.close, transitionFactor),
              far: ColourUtils.interpolateColor(dayColors.colorMed.far, eclipseColors.colorMed.far, transitionFactor)
            },
            colorMax: {
              close: ColourUtils.interpolateColor(dayColors.colorMax.close, eclipseColors.colorMax.close, transitionFactor),
              far: ColourUtils.interpolateColor(dayColors.colorMax.far, eclipseColors.colorMax.far, transitionFactor)
            }
          };
        },
        position() {
          return this.renderInstance.orbitals.sun.position;
        },
        factor() {
          return this.renderInstance.orbitals.sun.factor;
        },
      },
    },
  ],
});`;

    #bannerSunGlowFunction = 
`Weather.Renderer.Layers.add({
	name: "bannerSunGlow",
	zIndex: 12,
	effects: [
		{
			effect: "outerRadialGlow",
			drawCondition() {
				return !Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.7 && !Weather.isOvercast && !this.renderInstance.skyDisabled;
			},
			params: {
				outerRadius: 82, // The radius of the outer glow
				colorInside: { dark: "#fd634d00", med: "#faff8710", bright: "#fbffdb70" },
				colorOutside: { dark: "#fd634d00", med: "#faff8700", bright: "#fbffdb00" },
				cutCenter: false,
				diameter: 32,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
			},
		},
		{
			effect: "outerRadialGlow",
			drawCondition() {
				return Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.7 && !Weather.isOvercast && !this.renderInstance.skyDisabled;
			},
			params: {
				outerRadius: 100,
				colorInside: {
					dark: "#f0e5d944",
					med: "#f0e5d944",
					bright: "#f0e5d944"
				},
				colorOutside: {
					dark: "#2d1f0000",
					med: "#2d1f0000",
					bright: "#2d1f0000"
				},
				cutCenter: false,
				diameter: 28,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
			},
		},
	],
});`;
    #skyFunction = 
`Weather.Renderer.Layers.add({
	name: "sky",
	zIndex: 0,
	effects: [
		{
			/* Night sky */
			effect: "skyGradiant",
			drawCondition() {
				return !Weather.bloodMoon && !this.renderInstance.skyDisabled;
			},
			params: {
				radius: 82,
			},
			bindings: {
				color() {
					// Make it brighter when moon is lit
					const colorCloseMin = ColourUtils.interpolateColor("#00001c00", "#1c1c6100", this.renderInstance.moonBrightnessFactor);
					const colorClose = ColourUtils.interpolateColor("#00001c", "#1c1c61", this.renderInstance.moonBrightnessFactor);
					return {
						colorMin: { close: colorCloseMin, far: "#00001c00" },
						colorMed: { close: colorClose, far: "#00001c" },
						colorMax: { close: colorClose, far: "#00001c" },
					};
				},
				position() {
					return this.renderInstance.orbitals.moon.position;
				},
				factor() {
					return this.renderInstance.orbitals.moon.factor;
				},
			},
		},
		{
			/* Blood sky */
			effect: "skyGradiant",
			drawCondition() {
				return Weather.bloodMoon && !this.renderInstance.skyDisabled;
			},
			params: {
				color: {
					colorMin: { close: "#4d000000", far: "#21070700" },
					colorMed: { close: "#4d0000", far: "#210707" },
					colorMax: { close: "#4d0000", far: "#210707" },
				},
				radius: 82,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.bloodMoon.position;
				},
				factor() {
					return this.renderInstance.orbitals.bloodMoon.factor;
				},
			},
		},
		{
			/* Day sky */
			effect: "skyGradiant",
			drawCondition() {
				return !Weather.solarEclipse && !this.renderInstance.skyDisabled;
			},
			params: {
				color: {
					colorMin: { close: "#14145200", far: "#00001c00" },
					colorMed: { close: "#d47d12", far: "#6c6d94" },
					colorMax: { close: "#d4d7ff", far: "#4692d4" },
				},
				radius: 384,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
			},
		},
		{
			/* Eclipse sky */
			effect: "skyGradiant",
			drawCondition() {
				return Weather.solarEclipse && !this.renderInstance.skyDisabled;
			},
			params: {
				radius: 384,
			},
			bindings: {
				color() {
					const phase = Weather.solarEclipsePhase;
					const dayColors = {
						colorMin: { close: "#14145200", far: "#00001c00" },
						colorMed: { close: "#d47d12", far: "#6c6d94" },
						colorMax: { close: "#d4d7ff", far: "#4692d4" },
					};
					const eclipseColors = {
						colorMin: { close: "#2d1f0000", far: "#1a120000" },
						colorMed: { close: "#2d1f00", far: "#1a1200" },
						colorMax: { close: "#2d1f00", far: "#1a1200" },
					};
					let transitionFactor;
					if (phase < 0.3) {
						transitionFactor = phase / 0.3;
					} else if (phase > 0.7) {
						transitionFactor = (1 - phase) / 0.3;
					} else {
						transitionFactor = 1;
					}
					return {
						colorMin: {
							close: ColourUtils.interpolateColor(dayColors.colorMin.close, eclipseColors.colorMin.close, transitionFactor),
							far: ColourUtils.interpolateColor(dayColors.colorMin.far, eclipseColors.colorMin.far, transitionFactor)
						},
						colorMed: {
							close: ColourUtils.interpolateColor(dayColors.colorMed.close, eclipseColors.colorMed.close, transitionFactor),
							far: ColourUtils.interpolateColor(dayColors.colorMed.far, eclipseColors.colorMed.far, transitionFactor)
						},
						colorMax: {
							close: ColourUtils.interpolateColor(dayColors.colorMax.close, eclipseColors.colorMax.close, transitionFactor),
							far: ColourUtils.interpolateColor(dayColors.colorMax.far, eclipseColors.colorMax.far, transitionFactor)
						}
					};
				},
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
			},
		},
		{
			/* Tentacle sky */
			effect: "gradiantGlow",
			drawCondition() {
				return V.location === "tentworld";
			},
			params: {
				fadeStartY: 192,
				color: {
					glow: "#300c36",
					dark: "#631582",
				},
			},
		},
	],
});`;

    #sunFunction = 
`Weather.Renderer.Layers.add({
	name: "sun",
	zIndex: 2,
	blur: {
		max: 5,
		factor: () => normalise(Weather.overcast, 1, 0.1),
	},
	effects: [
		{
			effect: "skyOrbital",
			drawCondition() {
				return !Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.5 && !this.renderInstance.skyDisabled;
			},
			params: {
				images: { orbital: "img/misc/sky/sun.png" },
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
			},
		},
    ...(function() {
			const baseCondition = function() {
				return Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.5 && !this.renderInstance.skyDisabled;
			};
			return [
				{
					effect: "skyOrbital",
					drawCondition() {
						return baseCondition.call(this) && Weather.solarEclipseStage === 'pre';
					},
					params: { images: { orbital: 'img/misc/sky/solar-eclipse-0.png' } },
					bindings: {
						position() { return this.renderInstance.orbitals.sun.position; }
					},
				},
				{
					effect: "skyOrbital", 
					drawCondition() {
						return baseCondition.call(this) && Weather.solarEclipseStage === 'total';
					},
					params: { images: { orbital: 'img/misc/sky/solar-eclipse-1.png' } },
					bindings: {
						position() { return this.renderInstance.orbitals.sun.position; }
					},
				},
				{
					effect: "skyOrbital",
					drawCondition() {
						return baseCondition.call(this) && Weather.solarEclipseStage === 'post';
					},
					params: { images: { orbital: 'img/misc/sky/solar-eclipse-2.png' } },
					bindings: {
						position() { return this.renderInstance.orbitals.sun.position; }
					},
				}
			];
		})(),
		{
			effect: "outerRadialGlow",
			drawCondition() {
				return this.renderInstance.orbitals.sun.factor > -0.5 && !this.renderInstance.skyDisabled;
			},
			params: {
				outerRadius: 24, // The radius of the outer glow
				colorInside: { dark: "#f07218ee", med: "#f07218ee", bright: "#f2fad766" },
				colorOutside: { dark: "#f0721800", med: "#f0721800", bright: "#f2fad700" },
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
				diameter() {
					// Reference this layer and above effect image
					return this.renderInstance.layers.get("sun").effects[0].images.orbital.width;
				},
			},
		},
	],
});`;

    #sunGlowFunction = 
`Weather.Renderer.Layers.add({
	name: "sunGlow",
	zIndex: 12,
	effects: [
		{
			effect: "outerRadialGlow",
			drawCondition() {
				return !Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.7 && !Weather.isOvercast && !this.renderInstance.skyDisabled;
			},
			params: {
				outerRadius: 64, // The radius of the outer glow
				colorInside: { dark: "#fd634d00", med: "#faff8710", bright: "#fbffdb55" },
				colorOutside: { dark: "#fd634d00", med: "#faff8700", bright: "#fbffdb00" },
				cutCenter: false,
				diameter: 28,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return this.renderInstance.orbitals.sun.factor;
				},
			},
		},
		{
			effect: "outerRadialGlow",
			drawCondition() {
				return Weather.solarEclipse && this.renderInstance.orbitals.sun.factor > -0.7 && !Weather.isOvercast && !this.renderInstance.skyDisabled;
			},
			params: {
				outerRadius: 82,
				colorInside: {
					dark: "#f0e5d944",
					med: "#f0e5d944",
					bright: "#f0e5d944"
				},
				colorOutside: {
					dark: "#2d1f0000",
					med: "#2d1f0000",
					bright: "#2d1f0000"
				},
				cutCenter: false,
				diameter: 24,
			},
			bindings: {
				position() {
					return this.renderInstance.orbitals.sun.position;
				},
				factor() {
					return Math.max(0.3, (1 - Math.abs(Weather.solarEclipsePhase - 0.5) * 2));
				},
			},
		},
	],
});`;

    async modifyWeatherJavaScript() {
      const oldSCdata = this.modSC2DataManager.getSC2DataInfoAfterPatch();
      const SCdata = oldSCdata.cloneSC2DataInfo();
      const filePaths = [
        'effects-generic.js',
        'effects-location.js', 
        'banner-canvas-layers.js',
        'layer-clouds.js',
        'layer-fog.js',
        'layer-precipitation.js',
        'layer-sky.js',
        'layer-starfield.js',
        'layer-sun.js'
      ];
      const getFile = (path) => {
        const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath(path);
        if (!file) { maplebirch.log(`找不到文件: ${path}`, 'ERROR'); return null; }
        return file;
      };
      const files = {};
      for (const path of filePaths) { files[path] = getFile(path); if (!files[path]) return; }
      const regex_a = /return Weather\.bloodMoon;\s*\},/g;
      const result_a = 'return Weather.bloodMoon;\n\t\t\t\t},\n\t\t\t\tsolarEclipse() {\n\t\t\t\t\treturn Weather.solarEclipse;\n\t\t\t\t},';
      const regex_b = /bloodMoon:\s*"#380101e5",/g;
      const result_b = 'bloodMoon: "#380101e5",\n\t\t\t\t\tsolarEclipse: "#5d4f20aa",';
      const regex_c = /bloodMoon:\s*"#c70000cc",/g;
      const result_c = 'bloodMoon: "#c70000cc",\n\t\t\t\t\tsolarEclipse: "#2a1a4aaa",';

      const regex1 = /const\s+color\s*=\s*ColourUtils\.interpolateTripleColor\(([^)]*)\);/;
      const regex2_1 = /bloodMoon: "#380101bf",/g;
      const regex3_1 = /Weather\.Renderer\.Layers\.add\(\{\s*name: "bannerSky",\s*zIndex: 0,\s*effects: \[([\s\S]*?)\]\s*,\s*\}\);/;
      const regex3_2 = /this\.renderInstance\.orbitals\.sun\.factor\s*<\s*0\.75/;
      const regex3_3 = /Weather\.Renderer\.Layers\.add\(\{\s*name:\s*"bannerSunGlow",[\s\S]*?\}\);/;
      const regex5 = /bloodMoon:\s*"#4a0505ee",/g;
      const regex7 = /Weather\.Renderer\.Layers\.add\(\{\s*name: "sky",\s*zIndex: 0,\s*effects: \[([\s\S]*?)\]\s*,\s*\}\);/;
      const regex8 = /this\.renderInstance\.orbitals\.sun\.factor\s*<\s*0\.75/;
      const regex9_1 = /Weather\.Renderer\.Layers\.add\(\{\s*name:\s*"sun",[\s\S]*?\}\);/;
      const regex9_2 = /Weather\.Renderer\.Layers\.add\(\{\s*name:\s*"sunGlow",[\s\S]*?\}\);/;

      try {
        // effects-generic.js
        const file1 = files['effects-generic.js'];
        if (regex1.test(file1.content)) file1.content = file1.content.replace(regex1, 'let mixFactor = this.sunFactor;\n\t\tif (this.solarEclipse && this.sunFactor > 0) mixFactor = Math.min(this.sunFactor * 0.05, 0.05);\n\t\tconst color = ColourUtils.interpolateTripleColor(nightColor, this.color.dawnDusk, this.color.day, mixFactor);');

        // effects-location.js
        const file2 = files['effects-location.js'];
        if (regex2_1.test(file2.content)) file2.content = file2.content.replace(regex2_1,'bloodMoon: "#380101bf",\n\t\t\t\t\tsolarEclipse: "#1a1508d9",');
        if (regex_a.test(file2.content)) file2.content = file2.content.replace(regex_a, result_a);

        // banner-canvas-layers.js
        const file3 = files['banner-canvas-layers.js'];
        if (regex3_1.test(file3.content)) file3.content = file3.content.replace(regex3_1, this.#bannerSkyFunction);
        if (regex3_2.test(file3.content)) file3.content = file3.content.replace(regex3_2, '(Weather.solarEclipse || this.renderInstance.orbitals.sun.factor < 0.75)');
        if (regex3_3.test(file3.content)) file3.content = file3.content.replace(regex3_3, this.#bannerSunGlowFunction);
        if (regex_a.test(file3.content)) file3.content = file3.content.replace(regex_a, result_a);
        if (regex_b.test(file3.content)) file3.content = file3.content.replace(regex_b, result_b);
        if (regex_c.test(file3.content)) file3.content = file3.content.replace(regex_c, result_c);

        // layer-clouds.js
        const file4 = files['layer-clouds.js'];
        if (regex_a.test(file4.content)) file4.content = file4.content.replace(regex_a, result_a);
        if (regex_b.test(file4.content)) file4.content = file4.content.replace(regex_b, result_b);

        // layer-fog.js
        const file5 = files['layer-fog.js'];
        if (regex5.test(file5.content)) file5.content = file5.content.replace(regex5,'bloodMoon: "#4a0505ee",\n\t\t\t\t\tsolarEclipse: "#3d2e10cc",');
        if (regex_a.test(file5.content)) file5.content = file5.content.replace(regex_a, result_a);

        // layer-precipitation.js
        const file6 = files['layer-precipitation.js'];
        if (regex_a.test(file6.content)) file6.content = file6.content.replace(regex_a, result_a);
        if (regex_c.test(file6.content)) file6.content = file6.content.replace(regex_c, result_c);

        // layer-sky.js
        const file7 = files['layer-sky.js'];
        if (regex7.test(file7.content)) file7.content = file7.content.replace(regex7, this.#skyFunction);

        // layer-starfield.js
        const file8 = files['layer-starfield.js'];
        if (regex8.test(file8.content)) file8.content = file8.content.replace(regex8, '(Weather.solarEclipse || this.renderInstance.orbitals.sun.factor < 0.75)');

        // layer-sun.js
        const file9 = files['layer-sun.js'];
        if (regex9_1.test(file9.content)) file9.content = file9.content.replace(regex9_1, this.#sunFunction);
        if (regex9_2.test(file9.content)) file9.content = file9.content.replace(regex9_2, this.#sunGlowFunction);

        this.addonReplacePatcher.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata); 
      } catch (error) {
        maplebirch.log(`处理天气JavaScript时发生错误: ${error.message}`, 'ERROR');
      }
    }
  }

  class EclipseSystem {
    constructor(state, manger) {
      this.random = new manger.constructor.proto.rand(manger.createLog('eclipse'));
      this.log = manger.createLog('eclipse') || console.log;
      this.Config = {
        months: [3, 6, 9, 12],
        day: 15,
      };
      this.time = 10;
      this.stored = [];
      this.cache = {
        eclipse: null,
        dateKey: null,
        storedList: null
      };
      state.regTimeEvent('onDay', ':solar-eclipse', {
        action: () => this.#updateStored(4),
        cond: () => V.options?.maplebirch?.solarEclipse,
        exact: true,
      });
      maplebirch.on(':dataInit', () => this.#updateStored(4));
    }

    #updateStored(count = 4) {
      const now = new DateTime(Time.date);
      const nowSeconds = now.hour * 3600 + now.minute * 60 + now.second;
      this.stored = this.stored.filter(eclipse => {
        const eclipseDate = new DateTime(eclipse.year, eclipse.month, eclipse.day);
        const eclipseEnd = eclipse.endHour * 3600 + eclipse.endMinute * 60;
        return eclipseDate > now || (eclipseDate.year === now.year && eclipseDate.month === now.month && eclipseDate.day === now.day && nowSeconds < eclipseEnd);
      });
      if (this.stored.length < count) {
        const newEclipses = this.#futureEclipses(count - this.stored.length);
        this.stored = [...this.stored, ...newEclipses].sort((a, b) => new DateTime(a.year, a.month, a.day) - new DateTime(b.year, b.month, b.day)).slice(0, count);
      }
      this.cache.eclipse = null;
      this.cache.dateKey = null;
      this.cache.storedList = null;
    }

    #futureEclipses(count = 4) {
      const now = new DateTime(Time.date);
      const eclipses = [];
      const originalSeed = this.random.Seed !== null && this.random.Seed !== undefined ? this.random.Seed : Date.now();
      for (let i = 1; i <= 12 && eclipses.length < count; i++) {
        const month = (now.month + i - 1) % 12 + 1;
        const year = now.year + Math.floor((now.month + i - 1) / 12);
        if (this.Config.months.includes(month)) {
          const dateSeed = year * 10000 + month * 100 + this.Config.day;
          this.random.Seed = dateSeed;
          const startHour = this.random.get(33) === 0 ? 8 : 7;
          const startMinute = this.random.get(60);
          eclipses.push({
            year, month, day: this.Config.day,
            startHour, startMinute,
            endHour: startHour + this.time,
            endMinute: startMinute,
            duration: this.time
          });
        }
      }
      if (originalSeed !== null && originalSeed !== undefined) this.random.Seed = originalSeed;
      return eclipses;
    }

    #startTime(date) {
      const dateSeed = date.year * 10000 + date.month * 100 + date.day;
      if (dateSeed !== null && dateSeed !== undefined) this.random.Seed = dateSeed;
      const minute = this.random.get(60);
      const hour = this.random.get(33) === 0 ? 8 : 7;
      return {
        hour, minute,
        totalSeconds: hour * 3600 + minute * 60
      };
    }

    #calculate(date = new DateTime(Time.date)) {
      const dateKey = `${date.year}-${date.month}-${date.day}-${date.hour}-${date.minute}`;
      if (this.cache.eclipse && this.cache.dateKey === dateKey) return this.cache.eclipse;
      this.cache.dateKey = dateKey;
      if (!this.Config.months.includes(date.month) || date.day !== this.Config.day) {
        this.cache.eclipse = { isEclipse: false };
        return this.cache.eclipse;
      }
      const startTime = this.#startTime(date);
      const currentSeconds = date.hour * 3600 + date.minute * 60 + date.second;
      const endSeconds = startTime.totalSeconds + this.time * 3600;
      if (currentSeconds >= startTime.totalSeconds && currentSeconds <= endSeconds) {
        const phase = (currentSeconds - startTime.totalSeconds) / (this.time * 3600);
        let stage = 'total';
        if (phase < 0.3) stage = 'pre';
        else if (phase > 0.7) stage = 'post';
        this.cache.eclipse = {
          isEclipse: true,
          phase, stage, startTime
        };
      } else {
        this.cache.eclipse = { isEclipse: false };
      }
      return this.cache.eclipse;
    }

    isEclipse(date = new DateTime(Time.date)) {
      const info = this.#calculate(date);
      if (!info.isEclipse) return false;
      return {
        phase: info.phase,
        stage: info.stage,
        startTime: info.startTime,
        duration: this.time,
        currentStage: `${info.stage} phase (${(info.phase * 100).toFixed(1)}%)`
      };
    }

    get Stored() {
      if (!this.cache.storedList) this.cache.storedList = this.stored.slice();
      return this.cache.storedList;
    }

    get solarEclipse() {
      return V.options?.maplebirch?.solarEclipse ? !!this.isEclipse() : false;
    }

    get solarEclipsePhase() {
      return this.solarEclipse ? this.isEclipse().phase : false;
    }

    get solarEclipseStage() {
      return this.solarEclipse ? this.isEclipse().stage : false;
    }
  }

  maplebirch.once(':beforePatch', (data) => {
    Object.assign(data, {
      modifyWeather: new modifyWeather(data.gSC2DataManager, data.addonReplacePatcher)
    });
  });
  maplebirch.once(':state-init', (data) => Object.assign(data.constructor, { solarEclipse: Object.freeze(EclipseSystem) }));
})();