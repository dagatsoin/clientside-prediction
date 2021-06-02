import { Intent } from "../actions";
import { IRepresentation } from "../state/types";

export type Dispatch = (intent: Intent) => void;

export interface IClient {
  state: IRepresentation;
  dispatch: Dispatch;
  addServerCallback(listener: (stepId: number) => void): void
  removeServerCallback(listener: (stepId: number) => void): void
}
