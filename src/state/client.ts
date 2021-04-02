import { computed, makeObservable } from "mobx";
import { IModel, SerializedWorld, World } from "../business/types";
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

  private _timeTravel: ITimeTravel<SerializedWorld>;
  get timeTravel() {
    return this._timeTravel;
  }

  get step() {
    return this.timeTravel.getCurrentStep();
  }

  constructor(
    private model: IModel<World, SerializedWorld>
  ) {
    this._timeTravel = createTimeTravel([
      { snapshot: model.snapshot, step: 0 }
    ]);
    makeObservable(this, {
      player: computed,
      players: computed
    });

    useNap(this.model, this.timeTravel)
  }
}

export function createClientRepresentation(
  model: IModel<World, SerializedWorld>
) {
  return new Representation(model);
}
