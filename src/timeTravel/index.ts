import { applyJSONCommand } from "../business/lib/acceptors";
import { parse, stringify } from '../business/lib/JSON';
import { JSONCommand } from "../business/lib/types";
import { Step } from "../business/types";
import { ITimeTravel, Timeline } from "./types";

function getPatchTo(timeline: Timeline<any>, from: number, to: number): JSONCommand[] {
  const commands: JSONCommand[] = [];
  for (let i = 0; i < to; i++) {
    commands.push(...(timeline[i].patch));
  }
  return commands
}

class TimeTravel<I, S> implements ITimeTravel<I, S> {
  constructor(private initialState: {
    snapshot: S
    timestamp: number
    stepId: number
  }, private timeline: Timeline<I>){}
  startStep(intent: I): void {
    this.newIntent = intent
  }
  abortStep(): void {
    this.newIntent = undefined
  }
  commitStep(data: { timestamp: number; patch: readonly JSONCommand[]; }): void {
    if (!this.newIntent) {
      return
    }
    this.push({intent: this.newIntent, ...data})
    this.newIntent = undefined
  }
  
  private newIntent: I | undefined
  private stepTimer: number = Date.now();
  private baseBranch: Timeline<I> | undefined

  modifyPast(stepId: number, transaction: (baseBranch: Readonly<Timeline<I>>, newBranch: Timeline<I>) => void) {
    if (stepId - this.initialState.stepId >= this.timeline.length) {
      console.warn("can't fork at step", stepId)
    }
    // Don't mess with the base timeline
    this.baseBranch = this.timeline.splice(stepId - this.initialState.stepId)
    Object.freeze(this.baseBranch)
    transaction(this.baseBranch, this.timeline)
    this.baseBranch = undefined
    this.resetTimer()
    return this.timeline.slice(stepId - this.initialState.stepId)
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
    // Keep the Map serialized by using JSON.parse
    const snapshot = JSON.parse(stringify(this.initialState.snapshot));
    getPatchTo(this.timeline, this.initialState.stepId, _step - this.initialState.stepId).map((command) =>
      applyJSONCommand(snapshot, command)
    );
    return snapshot
  }

  getPatchFromTo(from: number, to: number): ReadonlyArray<JSONCommand> {
    return getPatchTo(this.timeline, from, to)
  }

  getLocalDeltaTime(): number {
    return Date.now() - this.stepTimer
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
      this.initialState = { ...initialState, timestamp: Date.now() }
    }
    this.timeline.splice(0);
    this.resetTimer()
  }
  private resetTimer() {
    this.stepTimer = Date.now()
  }

  push(...steps: Step<I>[]) {
    if (Array.isArray(steps)) {
      steps.forEach(Object.freeze)
    }
    this.timeline.push(...steps);
    this.resetTimer()
  }

  rebaseRoot(to: number) {
    const deleteCount = to - this.initialState.stepId;
    this.initialState = {
      timestamp: Date.now(),
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
  return new TimeTravel({...initialState, timestamp: Date.now()}, initialOpLog);
}
