# Module System

`ModuleSystem` manages framework module registration, dependency order, and lifecycle hooks. Most content mods do not need to register framework modules directly; use this only when a mod intentionally extends framework behavior.

## Registering A Module

```javascript
maplebirch.register(name, module, dependencies);
```

| Argument       | Description                                      |
| :------------- | :----------------------------------------------- |
| `name`         | Module name                                      |
| `module`       | Module object, optionally with lifecycle methods |
| `dependencies` | Optional dependency names                        |

Example:

```javascript
maplebirch.register('myModule', {
  Init() {
    console.log('module initialized');
  }
});
```

With dependencies:

```javascript
maplebirch.register(
  'myModule',
  {
    Init() {
      console.log('runs after tool and npc');
    }
  },
  ['tool', 'npc']
);
```

The module object can also declare `dependencies`; they are merged with dependencies passed to `register`.

```javascript
maplebirch.register(
  'myModule',
  {
    dependencies: ['tool'],
    Init() {}
  },
  ['npc']
);
```

## Exposed Modules

If a module object has `exposed: true`, it is registered as `EXPOSED` and mounted directly onto `maplebirch[name]`.

```javascript
maplebirch.register('myApi', {
  exposed: true,
  hello() {
    return 'Hello';
  }
});

maplebirch.myApi.hello();
```

Pure exposed modules without lifecycle methods are mounted as API modules and are not shown as disableable modules in the GUI. If an exposed module also defines lifecycle methods such as `Init`, it still mounts to `maplebirch[name]`, runs through the normal initialization flow, and can be disabled unless it is protected. Registration fails if the target name is already occupied.

## Reading Modules

```javascript
const npcModule = maplebirch.get('npc');
const graph = maplebirch.dependencyGraph;
```

`dependencyGraph` contains dependency and status information for each registered module.

Common fields:

| Field             | Description                                           |
| :---------------- | :---------------------------------------------------- |
| `protected`       | Whether this is a protected module                    |
| `mounted`         | Whether this belongs to the framework core mount list |
| `early`           | Whether it is mounted early after `preInit`           |
| `dependencies`    | Direct dependencies                                   |
| `dependents`      | Modules that depend on this module                    |
| `allDependencies` | Transitive dependencies                               |
| `state`           | Current module state                                  |
| `source`          | Source mod name when recorded by the loader           |

## Module States

Current `ModuleState` values:

| State        | Value | Meaning                                                 |
| :----------- | :---- | :------------------------------------------------------ |
| `REGISTERED` | `0`   | Registered and waiting for initialization               |
| `MOUNTED`    | `1`   | Main initialization completed                           |
| `ERROR`      | `2`   | Initialization failed                                   |
| `EXPOSED`    | `3`   | Exposed module mounted directly on the framework object |
| `DISABLED`   | `4`   | Disabled and skipped                                    |

Completing `preInit` does not change the public module state. The module enters `MOUNTED` only after main initialization succeeds.

## Lifecycle Hooks

All hooks are optional.

| Hook         | Timing                                                             | Typical use                               |
| :----------- | :----------------------------------------------------------------- | :---------------------------------------- |
| `preInit()`  | After `afterInjectEarlyLoad`, once IndexedDB and logging are ready | Prepare resources, config, or caches      |
| `Init()`     | During `:passagestart` when normal gameplay begins                 | Main setup with `setup` and `V` available |
| `loadInit()` | After loading a save                                               | Restore save-dependent state              |
| `postInit()` | Each passage start after main/load init                            | Refresh passage-scoped behavior           |

Example:

```javascript
class MyModule {
  dependencies = ['tool'];

  async preInit() {
    this.cache = new Map();
  }

  async Init() {
    this.setup();
  }

  async loadInit() {
    this.restoreFromSave();
  }

  async postInit() {
    this.refreshPassageState();
  }

  setup() {}
  restoreFromSave() {}
  refreshPassageState() {}
}

maplebirch.register('myModule', new MyModule(), ['npc']);
```

## Dependency Rules

- A module initializes after all dependencies are satisfied.
- Transitive dependencies are collected automatically.
- Pure `EXPOSED` dependencies are treated as satisfied. Exposed modules with lifecycle methods follow the normal dependency flow.
- If a dependency becomes `ERROR` or `DISABLED`, dependent modules will not continue initialization.
- Circular dependencies are detected during registration.

Use mod-prefixed names to avoid collisions with framework modules or other mods.
