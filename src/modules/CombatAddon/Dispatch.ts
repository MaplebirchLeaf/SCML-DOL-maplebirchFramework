import type { MaplebirchCore } from '../../core';
import dol from '../../host/DoL';
import type { MacroContext } from 'twine-sugarcube';

export default class Dispatch {
  private constructor() {}

  public static install({ tool }: MaplebirchCore): void {
    for (const [macro, prefix, flag, argument] of [
      ['namedNpcComments', 'speech', '_noNameComment'],
      ['namedNpcEjaculation', 'ejaculation', '_noNamedNpcEjaculation', '_args[1]']
    ] as const) {
      tool.wrap(
        macro,
        {
          when: Dispatch.name,
          default: `<<set ${flag} to true>>`,
          fallback() {
            const [name, mode] = this.args;
            const call = Dispatch.widget(tool, prefix, name, '', mode === undefined ? undefined : argument);
            if (call) return `<<unset ${flag}>>${call}`;
          }
        },
        'storyinit'
      );
    }

    tool.wrap(
      'namedNpcReaction',
      {
        when: Dispatch.reaction,
        fallback() {
          const [slot, event, detail] = this.args;
          if ((typeof slot !== 'number' && typeof slot !== 'string') || typeof event !== 'string' || !/^[\w-]+$/.test(event)) return;
          const name = dol.variables.NPCList?.[Number(slot)]?.fullDescription;
          return Dispatch.widget(tool, 'reaction', name, `-${event}`, detail === undefined ? undefined : '_args[2]');
        }
      },
      'storyinit'
    );
  }

  private static name({ name, args }: MacroContext): boolean {
    return name === 'switch' && args.raw.trim() === '_args[0]';
  }

  private static reaction({ name, args, parent }: MacroContext): boolean {
    const npc = '$NPCList[_args[0]].fullDescription';
    const expression = args.raw.trim();
    if (name === 'switch' && expression === npc) return true;

    const outer = parent as MacroContext | null;
    if (outer?.name !== 'switch' || outer.args.raw.trim() !== npc) return false;
    if (name === 'switch') return expression === '_args[1]';
    return name === 'if' && /^_args\[1\]\s+(?:is|eq|===?)\s+["'][\w-]+["']$/.test(expression);
  }

  private static widget(tool: MaplebirchCore['tool'], prefix: string, name: unknown, suffix = '', argument?: string): string | undefined {
    if (typeof name !== 'string' || !dol.setup.NPCNameList?.includes(name)) return;
    const slug = name.trim().replace(/\s+/g, '-').toLowerCase();
    if (!/^[\w-]+$/.test(slug)) return;
    const widget = `${prefix}-${slug}${suffix}`;
    if (!tool.macro.Macro.has(widget)) return;
    return argument ? `<<${widget} ${argument}>>` : `<<${widget}>>`;
  }
}
