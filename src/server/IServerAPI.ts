import { Patch } from "../business/types";

export type StepPatch = { patch: Patch; step: number };

export interface IServerAPI<T, S, I = any> {
  addListener(onMessage?: (stepPatch: StepPatch) => void): void;
  connect(playerID: string): Promise<{ step: number; snapshot: S }>;
  send(
    input: I & {
      clientId: string;
      clientStep: number;
    }
  ): void;
}
