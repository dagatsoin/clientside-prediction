import { applyJSONCommand } from "../business/lib/acceptors";
import { JSONCommand } from "../business/lib/types";
import { Step } from "../business/types";
import { ITimeTravel, OpLog } from "./types";

export function getPatchTo(timeline: OpLog<any>, opLogIndex: number): JSONCommand[] {
  const commands: JSONCommand[] = [];
  for (let i = 0; i < opLogIndex; i++) {
    commands.push(...(timeline[i].patch));
  }
  return commands
}

class TimeTravel<I, S> implements ITimeTravel<I, S> {
  constructor(private initialState: {
    snapshot: S
    step: number
  }, private timeline: OpLog<I>){}
  
  private nextBranch: OpLog<I> | undefined

  swap(): void {
    if (this.nextBranch) {
      this.timeline = this.nextBranch
      this.nextBranch = undefined
    }
  }

  fork(step: number) {
    // Don't mess with the base timeline
    Object.freeze(this.timeline)
    this.nextBranch = this.timeline.slice(step - this.initialState.step) as OpLog<I>
  }
  
  getBaseBranch(): OpLog<I> {
    return this.timeline
  }

  getBaseBranchStep(step: number): Readonly<Step<I> | {
    timestamp: number;
    patch: JSONCommand[];
  }> {
    return this.timeline[step - this.initialState.step]
  }

  getCurrentStep() {
    return this.initialState.step + this.timeline.length;
  }

  getInitialStep() {
    return this.initialState.step;
  }

  getInitalSnapshot() {
    return this.initialState.snapshot;
  }

  at(step: number) {
    // Cap the step to the current step to prevent overflow
    const _step = Math.min(step, this.getCurrentStep())
    const snapshot = { ...this.initialState.snapshot };
    getPatchTo(this.timeline, _step - this.initialState.step).map((command) =>
      applyJSONCommand(snapshot, command)
    );
    return snapshot
  }

  get(step: number): 
   | Step<I>
   | {
      timestamp: number;
      patch: JSONCommand[];
    } {
    const index = step - this.initialState.step;
    return this.timeline[index];
  }

  reset(initialState?: { step: number, snapshot: S }) {
    if (initialState) {
      this.initialState = { ...initialState }
    }
    this.timeline.splice(0);
  }

  push(...steps: Step<I>[]) {
    this.timeline.push(...steps);
  }

  rebaseRoot(to: number) {
    const deleteCount = to - this.initialState.step;
    this.initialState = {
      snapshot: this.at(to),
      step: to
    }
    this.timeline.splice(0, deleteCount);
  }
}

export function createTimeTravel<I, S>(
  initialState: {
    snapshot: S,
    step: number
  },
  initialOpLog: OpLog<I>
): ITimeTravel<I, S> {
  return new TimeTravel(initialState, initialOpLog);
}
