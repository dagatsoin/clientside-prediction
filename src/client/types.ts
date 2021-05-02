import { Intent } from "../actions";
import { IRepresentation } from "../state/types";

export type Dispatcher = (intent: Intent) => void;

export interface IClient {
  state: IRepresentation;
  dispatch: Dispatcher;
  addServerCallback(listener: (stepId: number) => void): void
  removeServerCallback(listener: (stepId: number) => void): void
}
