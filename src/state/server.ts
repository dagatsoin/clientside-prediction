import { makeObservable, computed } from 'mobx';
import { Intent } from '../actions';
import { JSONCommand, JSONOperation } from '../business/lib/types';
import { IModel, Step, SerializedWorld, World } from '../business/types';
import { createTimeTravel } from '../timeTravel';
import { ITimeTravel } from '../timeTravel/types';
import { updatePlayersRepresentation, useNap } from './lib';
import { IPlayer, IServerRepresentation } from './types';

class Representation implements IServerRepresentation {
  public timeTravel: ITimeTravel<Intent, SerializedWorld>;
  
  constructor(
    private model: IModel<World, SerializedWorld>
  ) {
    this.timeTravel = createTimeTravel({snapshot: model.snapshot, stepId: 0}, []);
    makeObservable<this, "players">(this, {
      players: computed,
      stepId: computed
    });
    useNap(this.model, this.timeTravel)
  }
  
  get stepId() {
    return this.timeTravel.getCurrentStepId();
  }
  
  get snapshot(): SerializedWorld {
    return this.timeTravel.at(this.timeTravel.getCurrentStepId())
  };

  private _players: IPlayer[] = [];
  get players() {
    return updatePlayersRepresentation(this._players, this.model)
  }
  
  get patch(): ReadonlyArray<JSONCommand> {
    return this.timeTravel.get(this.timeTravel.getCurrentStepId()).patch
  };
}

function isTimelineRoot(data: Step<Intent> | {
  snapshot: SerializedWorld;
  stepId: number;
}): data is {
  snapshot: SerializedWorld;
  stepId: number;
} {
  return "snapshot" in data
}

export function createServerRepresentation(model: IModel<World, SerializedWorld>): IServerRepresentation {
  return new Representation(model)
}
