import { Intent } from './actions';
import { SerializedWorld } from './business/types';
import { StepPatch } from './state/types';

export enum ControlState {
  off = "off",
  on = "on",
  ready = "ready"
}

export type State = {
  pos: { x: number; y: number };
};

export type ServerMessage =
 | { type: "patch", data: StepPatch }
 | { type: "intent", data: ({ clientId: string, step: number } & Intent) }
 | { type: "sync", data: { step: number, snapshot: SerializedWorld } }

 export type ClientMessage =
 | { type: "intent", data: ({ clientId: string, step: number, timestamp: number } & Intent) }
 | { type: "sync", data: { clientId: string } }