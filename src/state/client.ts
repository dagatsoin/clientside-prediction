import { computed, makeObservable } from "mobx";
import { Intent } from '../actions';
import { IModel, SerializedWorld, World } from "../business/types";
import { Dispatcher } from '../client/types';
import { createTimeTravel } from "../timeTravel";
import { ITimeTravel } from "../timeTravel/types";
import {
  updatePlayersRepresentation,
  useNap
} from "./lib";
import { IPlayer, IRepresentation } from "./types";

export type State = { pos: { x: number; y: number } };

class Representation implements IRepresentation {
  get playerId() {
    return this.model.id;
  }

  private _players: IPlayer[] = [];
  get players() {
    return updatePlayersRepresentation(this._players, this.model)
  }

  get player() {
    return this.players.find(({ id }) => id === this.playerId)!;
  }

  private _timeTravel: ITimeTravel<Intent, SerializedWorld>;
  get timeTravel() {
    return this._timeTravel;
  }

  get stepId() {
    return this.timeTravel.getCurrentStepId();
  }

  private stepListeners: Array<(stepId: number) => void> = []
  public addStepListener(listener: (stepId: number) => void) {
    this.stepListeners.push(listener)
  }

  public removeStepListener(listener: (stepId: number) => void) {
    const index = this.stepListeners.indexOf(listener)
    if (index > -1) {
      this.stepListeners.splice(index, 1)
    }
  }

  constructor(
    private model: IModel<World, SerializedWorld>,
    private dispatch: Dispatcher,
  ) {
    this._timeTravel = createTimeTravel({ snapshot: model.snapshot, stepId: 0 }, []);
    makeObservable(this, {
      player: computed,
      players: computed
    });

    useNap(this.model, this.timeTravel, this.stepListeners)
  }
}

export function createClientRepresentation(
  model: IModel<World, SerializedWorld>,
  dispatch: Dispatcher
) {
  return new Representation(model, dispatch);
}
