import { Patch, Position, SerializedWorld } from "../business/types";
import { ITimeTravel } from "../timeTravel/types";

export interface IRepresentation {
  readonly step: number;
  readonly playerId: string;
  readonly player: IPlayer;
  readonly players: IPlayer[];
  readonly timeTravel: ITimeTravel<SerializedWorld>;
}

export interface IServerRepresentation {
  readonly step: number;
  readonly snapshot: SerializedWorld;
  readonly players: IPlayer[];
  readonly patch: Patch;
  readonly timeTravel: ITimeTravel<SerializedWorld>;
}

export interface IPlayer {
  id: string;
  name: string;
  position: Position;
}

export type StepPatch = {
  step: number
  patch: Patch
}