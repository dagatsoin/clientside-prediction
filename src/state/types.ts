import { Position, SerializedWorld } from "../business/types";
import { ITimeTravel } from "../timeTravel/types";

export interface IRepresentation {
  readonly step: number;
  readonly playerId: string;
  readonly player: IPlayer;
  readonly players: IPlayer[];
  readonly timeTravel: ITimeTravel<SerializedWorld>;
}

export interface IPlayer {
  id: string;
  name: string;
  position: Position;
}
