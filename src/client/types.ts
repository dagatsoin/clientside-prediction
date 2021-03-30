import { Intent } from "../actions";
import { IRepresentation } from "../state/types";

export type Dispatcher = (intent: Intent) => void;

export interface IClient {
  state: IRepresentation;
  dispatch: Dispatcher;
}
