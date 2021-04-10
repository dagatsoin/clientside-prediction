import { JSONCommand } from '../business/lib/types';
import { Step } from "../business/types";

export type Timeline<I> = Step<I>[]

export interface ITimeTravel<I, T> {
  /**
   * Start a step which can be still aborted.
   * This will prepare a new object with the triggered intent.
   */
  startStep(intent: I): void;
  /**
   * Use this function to cancel a step.
   * It will clean the temporary new step
   */
  abortStep(): void
  /**
   * Add a step to the timeline.
   * The step is composed by the temporary object
   * containing the intent, the timestamp and the patch
   */
  commitStep(data:{
    timestamp: number
    patch: ReadonlyArray<JSONCommand>
  }): void
  /**
   * Start a transaction to modify the past at the given stepId.
   * Return the modified segment.
   */
  modifyPast(stepId: number, transaction: (oldBranch: Readonly<Timeline<I>>, newTimeline: Timeline<I>) => void): Timeline<I>
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
   * Return the patch at the given timeline step
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
   * Rebase the root to the given stepId.
   * All the previous step will be lost.
   */
  rebaseRoot(to: number): void;
  /**
   * Return a branch for a given name
   */
  getBaseBranch(): Timeline<I>
}
