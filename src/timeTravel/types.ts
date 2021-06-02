import { JSONCommand } from '../business/lib/types';
import { Step } from "../business/types";

export type Timeline<I> = Step<I>[]
export type ReadonlyTimeline<I> = ReadonlyArray<Readonly<Step<I>>>

export interface ITimeTravel<I, T> {
  /** 
   * Return a statically readonly reference to the timeline
   */
  getTimeline(): ReadonlyTimeline<I>
  /**
   * Start a step which can be still aborted.
   * This will prepare a new object with the triggered intent.
   * The second parameter is filled only on the server.
   * @returns the time elapsed since the start of the current step.
   */
  startStep(intent: I, timestamp?: number): number;
  /**
   * Use this function to cancel a step.
   * It will clean the temporary new step
   */
  abortStep(): void
  /**
   * Commit a new step to the timeline.
   * The timestamp and the intent is already known since the start of the step.
   * This function take the resulting patch of the operation.
   */
  commitStep(patch: ReadonlyArray<JSONCommand>): void
  /**
   * Start a transaction to modify the past just after the given stepId.
   * Beware, the given step id won't be included in the writtable segment.
   * It is the root of the new fork.
   * @returns the modified segment.
   */
  forkPast(
    /**
     * The landing step to return in the past
     */
    fromStep: number,
    /**
     * The operation to applied to the past.
     */
    transaction: (
      /**
       * The immutable old branch begins after the given stepId
       */
      oldBranch: Readonly<Timeline<I>>,
      /**
       * The new timeline to operate the changes
       */
      newTimeline: Timeline<I>
    ) => void
  ): Timeline<I>
  /**
   * Return the current stepId number
   */
  getCurrentStepId(): number;
  /**
   * Return the stepId of the initial snapshot
   */
  getInitialStep(): number;
  /**
   * Return the initial snapshot
   */
  getInitalSnapshot(): T;
  /**
   * Return the time elapsed since the start of the current step
   */
   getLocalDeltaTime(): number
  /**
   * Return the snapshot at the given stepId
   */
  at(
    stepId: number
  ): T
  /**
   * Add a new step
   */
  push(...steps: Step<I>[]): void;
  /**
   * Return a portion of the timeline
   * The start index will be included.
   * The end index will be excluded. Default will include the rest of the timeline.
   */
  slice(start: number, end?: number): Array<Step<I> | {
    timestamp: number;
    patch: ReadonlyArray<JSONCommand>;
  }>

  /**
   * Return a portion of the timeline
   * The start index will be included.
   * The end index will be included. Default to current step id.
   */
  get(stepId: number): Step<I> | {
    timestamp: number;
    patch: ReadonlyArray<JSONCommand>;
  }
  /**
   * Return all the commands to go from a step to another step.
   */
  getPatchFromTo(from: number, to: number): ReadonlyArray<JSONCommand>;
  /**
   * Clear the timeline and keep the first element.
   * Replace the initial snapshot and step if given.
   */
  reset(initialState?: {stepId: number, snapshot: T}): void;
  /**
   * Reduce all previous steps to the given stepId as a snapshot.
   * All the previous step will be lost.
   */
  reduce(to: number): void;
  /**
   * Return a branch for a given name
   */
  getBaseBranch(): Timeline<I>
  /**
   * Add a step listener. The listener will be called after the commit.
   */
   addStepListener(listener: (stepId: number, step: Step<I>) => void): void
   removeStepListener(listener: (stepId: number, step: Step<I>) => void): void
}
