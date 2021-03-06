import { Intent } from './actions';
import { SerializedWorld } from './business/types';
import { Timeline } from './timeTravel/types';

export enum ControlState {
  off = "off",
  on = "on",
  ready = "ready"
}

export type State = {
  pos: { x: number; y: number };
};

export type ServerMessage =
 | { type: "rollback", data: { to: number, timeline: Timeline<Intent> } }
 | { type: "intent", data: ({ clientId: string, stepId: number } & Intent) }
 | { type: "reduce", data: { to: number } }
 | { type: "sync", data: { stepId: number, snapshot: SerializedWorld } }

 export type ClientMessage =
 | { type: "intent", data: ({ clientId: string, stepId: number, timestamp: number } & Intent) }
 | { type: "sync", data: { clientId: string } }