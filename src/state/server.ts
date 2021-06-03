import { makeObservable, computed } from 'mobx';
import { Intent } from '../actions';
import { JSONCommand } from '../business/lib/types';
import { IModel, SerializedWorld, World } from '../business/types';
import { Dispatch } from '../client/types';
import { createTimeTravel } from '../timeTravel';
import { ITimeTravel } from '../timeTravel/types';
import { updatePlayersRepresentation, useNap } from './lib';
import { IPlayer, IServerRepresentation } from './types';

class Representation implements IServerRepresentation {
  public timeTravel: ITimeTravel<Intent & { triggeredAtStepId: number}, SerializedWorld>;
  public getStartedAnimationPathAtStep: (stepId: number) => string[];

  constructor(
    public model: IModel<World, SerializedWorld>,
    private startStep: Dispatch
  ) {
    this.timeTravel = createTimeTravel({snapshot: model.snapshot, stepId: 0}, []);
    makeObservable<this, "players">(this, {
      players: computed,
      stepId: computed
    });
    this.getStartedAnimationPathAtStep = useNap({
      model,
      timeTravel: this.timeTravel,
      startStep
    })
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

export function createServerRepresentation(
  model: IModel<World, SerializedWorld>,
  startStep: Dispatch
): IServerRepresentation {
  return new Representation(model, startStep)
}
