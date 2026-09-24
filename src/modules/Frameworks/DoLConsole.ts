import type ToolCollection from '../ToolCollection';
import Console from './ConsoleCheat';
import TimeTravelCheat from './TimeTravelCheat';

class DoLConsole extends Console {
  public readonly timeTravel: TimeTravelCheat;

  public constructor(manager: ToolCollection) {
    super(manager);
    this.timeTravel = new TimeTravelCheat(manager.core);
  }
}

export default DoLConsole;
