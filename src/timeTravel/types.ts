import { Patch } from "../business/types";

export type OpLog = Patch[];
export type Branch = {
  base: number
  opLog: OpLog
}

export interface ITimeTravel<T> {
  /**
   * Switch to another timeline branch
   */
  checkoutBranch(newBranch: any): void;
  /**
   * Create a branch from the given client step
   * @param clientStep
   */
  createBranch(name: string, clientStep: number): Branch;
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
  push(patch: Readonly<Patch>): void;
  /**
   * Return the patch at the given timeline step
   */
  get(step: number): Patch | { snapshot: T; step: number };
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
}
