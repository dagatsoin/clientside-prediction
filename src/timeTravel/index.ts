import { applyJSONCommand } from "../business/lib/acceptors";
import { stringify } from '../business/lib/JSON';
import { JSONCommand, JSONOperation } from "../business/lib/types";
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
  }, private timeline: Timeline<I>){
    this.stepTimer = this.initialState.timestamp
  }

  getTimeline() {
    return [...this.timeline]
  }
  startStep(intent: I): number {
    const timestamp = this.getLocalDeltaTime()
    this.pendingTransaction = {intent, timestamp }
    return timestamp
  }
  abortStep(): void {
    this.pendingTransaction = undefined
  }
  commitStep(patch: readonly JSONCommand[]): void {
    if (!this.pendingTransaction) {
      return
    }
    this.push({intent: {...this.pendingTransaction.intent}, timestamp: this.pendingTransaction.timestamp, patch})
    this.pendingTransaction = undefined
  }
  
  private pendingTransaction: {intent: I, timestamp: number } | undefined
  private stepTimer: number;
  
  forkPast(fromStep: number, transaction: (oldBranch: Readonly<Timeline<I>>, newBranch: Timeline<I>) => void) {
    let oldBranch: Timeline<I> | undefined
    
    // The timeline is not a 0 based index.
    // Need to find the index of the given step.
    // This index will be the start of the modified past segment.
    // IMPORTANT: it will be one step after the given fromStep
    // because the user will land one step before.
    const oldBranchStartIndex = fromStep - this.initialState.stepId
    
    if (oldBranchStartIndex > this.timeline.length) {
      console.warn("Can't fork. The given step is in an unknown future.", fromStep)
      return []
    } else if (fromStep < this.initialState.stepId) {
      console.warn("Can't fork. The given step is in an immutable past.", fromStep)
      return []
    }
    // The old branch starts at the next step after the given step in the past
    // until the end of the current timeline.
    oldBranch = this.timeline.splice(oldBranchStartIndex)
 
    // Don't mess with the old timeline branch
    Object.freeze(oldBranch)
    
    // The user is now in the past and is modifying it
    transaction(oldBranch, this.timeline)

    // Assuming that the current step is restarting. We need to reset the timer.
    this.resetTimer()

    // Return the new timeline segment from the given landing step.
    return this.timeline.slice(oldBranchStartIndex)
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
    const patch = getPatchTo(this.timeline, this.initialState.stepId, _step - this.initialState.stepId)
    patch.forEach((command) =>
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

  slice(
    start: number,
    end: number = this.getCurrentStepId() + 1
  ) {
    const ret: Array<Step<I> | {
      timestamp: number;
      patch: ReadonlyArray<JSONCommand>;
    }> = start === this.initialState.stepId 
      ? [{
          timestamp: 0,
          patch: [{
            op: JSONOperation.replace,
            path: "/",
            value: this.getInitalSnapshot()
          } as JSONCommand]
        }]
      : []
    return ret.concat(
      this.timeline.slice(
        start - this.initialState.stepId - 1, // index of the step in the timeline
        end - this.initialState.stepId - 1 // index of the ending step in the timeline
      )
    );
  }

  get(stepId: number): 
   | Step<I>
   | {
      timestamp: number;
      patch: JSONCommand[];
    } {
    if (stepId === this.initialState.stepId) {
      return {
        timestamp: 0,
        patch: [{
          op: JSONOperation.replace,
          path: "/",
          value: this.getInitalSnapshot()
        }]
      }
    }
    const index = Math.max(stepId - this.initialState.stepId - 1, 0);
    return this.timeline[index];
  }

  reset(initialState?: { stepId: number, snapshot: S }) {
    if (initialState) {
      this.initialState = { ...initialState, timestamp: 0 }
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

  reduce(to: number) {
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
