import { JSONCommand } from '../business/lib/types';
import { Step } from "../business/types";

export type OpLog<I> = Step<I>[]

export interface ITimeTravel<I, T> {
  /**
   * Retrieve base branch
   */
  getBaseBranchStep(step: number): Readonly<Step<I> | {
    timestamp: number;
    patch: JSONCommand[];
  }>;
  /**
   * Start a transaction to modify the past at the given step
   */
  modifyPast(step: number, transaction: (oldBranch: Readonly<OpLog<I>>, newTimeline: OpLog<I>) => void): void
  /**
   * Return the current step number
   */
  getCurrentStep(): number;
  /**
   * Return the step number of the initial snapshot
   */
  getInitialStep(): number;
  /**
   * Return the initial snapshot
   */
  getInitalSnapshot(): T;
  /**
   * Return the snapshot at the given step
   */
  at(
    step: number
  ): T
  /**
   * Add a new step
   */
  push(...steps: Step<I>[]): void;
  /**
   * Return the patch at the given timeline step
   */
  get(step: number): Step<I> | {
    timestamp: number;
    patch: JSONCommand[];
  }
  /**
   * Clear the timeline and keep the first element.
   * Replace the initial snapshot and step if given.
   */
  reset(initialState?: {step: number, snapshot: T}): void;
  /**
   * Rebase the root to the given step.
   * All the previous step will be lost.
   */
  rebaseRoot(to: number): void;
  /**
   * Return a branch for a given name
   */
  getBaseBranch(): OpLog<I>
}
