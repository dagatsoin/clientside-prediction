import { Intent } from '../actions';
import { JSONCommand } from '../business/lib/types';
import { Step, Position, SerializedWorld } from "../business/types";
import { ITimeTravel } from "../timeTravel/types";

export interface IRepresentation {
  readonly stepId: number;
  readonly playerId: string;
  readonly player: IPlayer;
  readonly players: IPlayer[];
  readonly timeTravel: ITimeTravel<Intent, SerializedWorld>;
  getStartedAnimationPathAtStep: (stepId: number) => string[];
}

export interface IServerRepresentation {
  readonly stepId: number;
  readonly snapshot: SerializedWorld;
  readonly players: IPlayer[];
  readonly patch: ReadonlyArray<JSONCommand>;
  readonly timeTravel: ITimeTravel<Intent & {triggeredAtStepId: number}, SerializedWorld>;
  getStartedAnimationPathAtStep: (stepId: number) => string[];
}

export interface IPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  ammo: number;
  position: Position;
}