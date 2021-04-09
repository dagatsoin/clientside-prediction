import { applyJSONCommand } from "../business/lib/acceptors";
import { parse, stringify } from '../business/lib/JSON';
import { JSONCommand } from "../business/lib/types";
import { Step } from "../business/types";
import { ITimeTravel, Timeline } from "./types";

export function getPatchTo(timeline: Timeline<any>, opLogIndex: number): JSONCommand[] {
  const commands: JSONCommand[] = [];
  for (let i = 0; i < opLogIndex; i++) {
    commands.push(...(timeline[i].patch));
  }
  return commands
}

class TimeTravel<I, S> implements ITimeTravel<I, S> {
  constructor(private initialState: {
    snapshot: S
    stepId: number
  }, private timeline: Timeline<I>){}
  
  private baseBranch: Timeline<I> | undefined

  lastIntent!: I

  modifyPast(stepId: number, transaction: (baseBranch: Readonly<Timeline<I>>, newBranch: Timeline<I>) => void) {
    if (stepId - this.initialState.stepId >= this.timeline.length) {
      console.warn("can't fork at step", stepId)
    }
    // Don't mess with the base timeline
    this.baseBranch = this.timeline.splice(stepId - this.initialState.stepId)
    Object.freeze(this.baseBranch)
    transaction(this.baseBranch, this.timeline)
    this.baseBranch = undefined
    return this.timeline.slice(0)
  }
  
  getBaseBranch(): Timeline<I> {
    return this.timeline
  }

  getCurrentStepId() {
    return this.initialState.stepId + this.timeline.length;
  }

  getInitialStep() {
    return this.initialState.stepId;
  }

  getInitalSnapshot() {
    return this.initialState.snapshot;
  }

  at(stepId: number) {
    // Cap the step to the current step to prevent overflow
    const _step = Math.min(stepId, this.getCurrentStepId())
    const snapshot = parse(stringify(this.initialState.snapshot));
    getPatchTo(this.timeline, _step - this.initialState.stepId).map((command) =>
      applyJSONCommand(snapshot, command)
    );
    return snapshot
  }

  get(stepId: number): 
   | Step<I>
   | {
      timestamp: number;
      patch: JSONCommand[];
    } {
    const index = Math.max(stepId - this.initialState.stepId - 1, 0);
    return this.timeline[index];
  }

  reset(initialState?: { stepId: number, snapshot: S }) {
    if (initialState) {
      this.initialState = { ...initialState }
    }
    this.timeline.splice(0);
  }

  push(...steps: Step<I>[]) {
    if (Array.isArray(steps)) {
      steps.forEach(Object.freeze)
    }
    this.timeline.push(...steps);
  }

  rebaseRoot(to: number) {
    const deleteCount = to - this.initialState.stepId;
    this.initialState = {
      snapshot: this.at(to),
      stepId: to
    }
    this.timeline.splice(0, deleteCount);
  }
}

export function createTimeTravel<I, S>(
  initialState: {
    snapshot: S,
    stepId: number
  },
  initialOpLog: Timeline<I>
): ITimeTravel<I, S> {
  return new TimeTravel(initialState, initialOpLog);
}
