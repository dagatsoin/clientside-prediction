import { JSONCommand } from '../business/lib/types';
import { Step } from "../business/types";

export type OpLog<I> = Step<I>[]

export interface ITimeTravel<I, T> {
  /**
   * Replace the base branch by the draft branch
   */
  swap(): void;
  /**
   * Retrieve base branch
   */
  getBaseBranchStep(step: number): Readonly<Step<I> | {
    timestamp: number;
    patch: JSONCommand[];
  }>;
  /**
   * Copy a section of the timeline from the given step
   * and reset the base timeline to the given step.
   */
  fork(step: number): void;
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
