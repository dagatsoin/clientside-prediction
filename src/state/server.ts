import { makeObservable, computed } from 'mobx';
import { JSONOperation } from '../business/lib/types';
import { IModel, Step, SerializedWorld, World } from '../business/types';
import { createTimeTravel } from '../timeTravel';
import { ITimeTravel } from '../timeTravel/types';
import { updatePlayersRepresentation, useNap } from './lib';
import { IPlayer, IServerRepresentation } from './types';

class Representation implements IServerRepresentation {
  public timeTravel: ITimeTravel<SerializedWorld>;
  
  constructor(
    private model: IModel<World, SerializedWorld>
  ) {
    this.timeTravel = createTimeTravel(model.snapshot, {name: "server", rootStep: 0, opLog: [] });
    makeObservable<this, "players">(this, {
      players: computed,
      step: computed
    });
    useNap(this.model, this.timeTravel)
  }
  
  get step() {
    return this.timeTravel.getCurrentStep();
  }
  
  get snapshot(): SerializedWorld {
    return this.timeTravel.at(this.timeTravel.getCurrentStep())
  };

  private _players: IPlayer[] = [];
  get players() {
    return updatePlayersRepresentation(this._players, this.model)
  }
  
  get patch(): Step {
    const data = this.timeTravel.get(this.timeTravel.getCurrentStep())
    return isTimelineRoot(data)
      ? [{ op: JSONOperation.replace, path: "/", value: data }]
      : data
  };
}

function isTimelineRoot(data: Step | {
  snapshot: SerializedWorld;
  step: number;
}): data is {
  snapshot: SerializedWorld;
  step: number;
} {
  return "snapshot" in data
}

export function createServerRepresentation(model: IModel<World, SerializedWorld>): IServerRepresentation {
  return new Representation(model)
}
