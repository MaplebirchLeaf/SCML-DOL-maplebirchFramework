# Module System

`ModuleSystem` manages framework module registration, dependency order, and lifecycle hooks. Most content mods do not need to create framework modules; use this only when your mod intentionally extends the framework itself.

## Registering A Module

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
      console.log('runs after var and tool');
    }
  },
  ['var', 'tool']
);
```

An extension module can also provide a source name:

```javascript
maplebirch.register(
  'myExtension',
  {
    sayHello() {
      return 'Hello';
    }
  },
  [],
  'my-mod-name'
);
```

## Reading Modules

```javascript
const addon = maplebirch.getModule('addon');
const graph = maplebirch.dependencyGraph;
```

`dependencyGraph` contains each module's dependencies, dependents, state, transitive dependencies, and source.

## Lifecycle Hooks

All hooks are optional.

| Hook | Timing | Typical use |
| :--- | :--- | :--- |
| `preInit()` | Early load stage | Prepare caches or static resources |
| `Init()` | After `:passageinit` | Main setup when `setup` and `V` exist |
| `loadInit()` | When a save is loaded | Restore save-dependent state |
| `postInit()` | Each passage start | Refresh passage-scoped behavior |

Example:

```javascript
class MyModule {
  dependencies = ['addon', 'dynamic'];

  async preInit() {
    this.cache = new Map();
  }

  async Init() {
    this.setup();
  }

  async loadInit() {
    this.data = V.myModuleData;
  }

  async postInit() {
    this.cleanup();
  }

  setup() {}
  cleanup() {}
}

maplebirch.register('myModule', new MyModule());
```

## Dependency Rules

- A module initializes after its dependencies.
- Transitive dependencies are resolved automatically.
- Circular dependencies are detected and blocked.
- A failed module does not stop unrelated modules from initializing.

Use names that are unlikely to collide with framework internals, such as a mod-prefixed module name.
