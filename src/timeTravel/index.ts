import { applyJSONCommand } from "../business/lib/acceptors";
import { JSONCommand } from "../business/lib/types";
import { Patch, SerializedWorld } from "../business/types";
import { OpLog, ITimeTravel } from "./types";

function getPatchTo(opLog: OpLog<any>, to: number): Patch {
  const index = to - opLog[0].step;
  const patch: JSONCommand[] = [];
  for (let i = 1; i <= index; i++) {
    patch.push(...(opLog[i] as Patch));
  }
  return patch;
}

class TimeTravel<S> implements ITimeTravel<S> {
  constructor(private timeline: OpLog<S>) {}
  checkoutBranch(newBranch: any): void {
    throw new Error("Method not implemented.");
  }
  createBranch(name: string, clientStep: number): Patch[] {
    throw new Error("Method not implemented.");
  }

  getCurrentStep() {
    return this.timeline[0].step + this.timeline.length - 1;
  }

  getInitialStep() {
    return this.timeline[0].step;
  }

  getInitalSnapshot() {
    return this.timeline[0].snapshot;
  }

  at(step: number) {
    // Cap the step to the current step to prevent overflow
    const _step = Math.min(step, this.getCurrentStep())
    const snapshot = { ...this.timeline[0].snapshot };
    getPatchTo(this.timeline, _step).map((command) =>
      applyJSONCommand(snapshot, command)
    );
    return snapshot
  }

  get(step: number): Patch | { snapshot: S; step: number } {
    const index = step - this.timeline[0].step;
    return this.timeline[index] as any;
  }

  reset(initialState?: { step: number, snapshot: S }) {
    if (initialState) {
      this.timeline.splice(0, this.timeline.length, initialState);
    } else {
      this.timeline.splice(1);
    }
  }

  push(patch: Readonly<Patch>) {
    this.timeline.push(patch as any);
  }

  rebaseRoot(to: number) {
    const snapshot = this.at(to);
    const deleteCount = to - this.timeline[0].step + 1;
    this.timeline.splice(0, deleteCount, {
      snapshot,
      step: to
    });
  }
}

export function createTimeTravel<S>(timeline: OpLog<S>): ITimeTravel<S> {
  return new TimeTravel(timeline);
}
