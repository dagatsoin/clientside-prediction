import { JSONCommand } from '../business/lib/types';
import { Step } from "../business/types";

export type Timeline<I> = Step<I>[]

export interface ITimeTravel<I, T> {
  lastIntent: I
  /**
   * Start a transaction to modify the past at the given stepId
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
