import { autorun, computed, makeObservable } from "mobx";
import { actions, Intent } from '../actions';
import { IModel, SerializedWorld, World } from "../business/types";
import { Dispatch } from '../client/types';
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

  public getStartedAnimationPathAtStep: (stepId: number) => string[];

  private isReady = false

  constructor(
    public model: IModel<World, SerializedWorld>,
    private startStep: Dispatch,
    onInit: ()=>void
  ) {
    this._timeTravel = createTimeTravel({ snapshot: model.snapshot, stepId: 0 }, []);
    makeObservable(this, {
      player: computed,
      players: computed
    });

    this.getStartedAnimationPathAtStep = useNap({
      model: this.model,
      timeTravel: this.timeTravel,
      startStep
    })

    autorun(() => {
      if (model.patch.length) {
        // A snapshot has been used
        if (
          model.patch.some(command => command.path === "/") &&
          !this.isReady
        ) {
          // The player has received the initial snapshot
          this.isReady = true
          onInit()
        }
      }
    });
  }
}

export function createClientRepresentation(
  model: IModel<World, SerializedWorld>,
  startStep: Dispatch,
  onInit: () => void
) {
  return new Representation(model, startStep, onInit);
}
