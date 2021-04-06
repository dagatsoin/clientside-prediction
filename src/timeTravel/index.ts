import { applyJSONCommand } from "../business/lib/acceptors";
import { JSONCommand } from "../business/lib/types";
import { Patch } from "../business/types";
import { ITimeTravel, Branch } from "./types";

function getPatchTo(timeline: Branch, to: number): Patch {
  const index = to - timeline.base;
  const patch: JSONCommand[] = [];
  for (let i = 0; i < index; i++) {
    patch.push(...(timeline.opLog[i] as Patch));
  }
  return patch;
}

class TimeTravel<S> implements ITimeTravel<S> {
  constructor(private snapshot: S, private timeline: Branch){}  
  checkoutBranch(newBranch: any): void {
    throw new Error("Method not implemented.");
  }
  createBranch(name: string, clientStep: number): Branch {
    throw new Error("Method not implemented.");
  }

  getCurrentStep() {
    return this.timeline.base + this.timeline.opLog.length;
  }

  getInitialStep() {
    return this.timeline.base;
  }

  getInitalSnapshot() {
    return this.snapshot;
  }

  at(step: number) {
    // Cap the step to the current step to prevent overflow
    const _step = Math.min(step, this.getCurrentStep())
    const snapshot = { ...this.snapshot };
    getPatchTo(this.timeline, _step).map((command) =>
      applyJSONCommand(snapshot, command)
    );
    return snapshot
  }

  get(step: number): Patch | { snapshot: S; step: number } {
    const index = step - this.timeline.base;
    return this.timeline.opLog[index];
  }

  reset(initialState?: { step: number, snapshot: S }) {
    if (initialState) {
      this.snapshot = initialState.snapshot
      this.timeline.base = initialState.step
    }
    this.timeline.opLog.splice(0);
  }

  push(patch: Readonly<Patch>) {
    this.timeline.opLog.push(patch as any);
  }

  rebaseRoot(to: number) {
    this.snapshot = this.at(to),
    this.timeline.base = to
    const deleteCount = to - this.timeline.base + 1;
    this.timeline.opLog.splice(0, deleteCount);
  }
}

export function createTimeTravel<S>(
  initialSnapshot: S,
  mainBranch: Branch
): ITimeTravel<S> {
  return new TimeTravel(initialSnapshot, mainBranch);
}
