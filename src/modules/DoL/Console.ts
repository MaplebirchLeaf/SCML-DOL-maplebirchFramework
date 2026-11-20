import type ToolCollection from '../ToolCollection';
import Console from '../Frameworks/ConsoleCheat';
import TimeTravel from './TimeTravel';

class DoLConsole extends Console {
  public readonly timeTravel: TimeTravel;

  public constructor(manager: ToolCollection) {
    super(manager);
    this.timeTravel = new TimeTravel(manager.core);
  }
}

export default DoLConsole;
