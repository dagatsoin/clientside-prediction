import { Patch } from "../business/types";

export type OpLog<T> = [{ snapshot: T; step: number }, ...Patch];

export interface ITimeTravel<T> {
  /**
   * Switch to another timeline branch
   */
  checkoutBranch(newBranch: any): void;
  /**
   * Return a deep copy of the current branch from clienStep to end
   * @param clientStep
   */
  copyBranchFrom(clientStep: number): Patch[];
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
   * Fast forward to the gieven step and return the result
   */
  at(
    step: number
  ): {
    snapshot: T;
    step: number;
  };
  /**
   * Add a new step
   */
  push(patch: Readonly<Patch>): void;
  /**
   * Return the patch at the given timeline step
   */
  get(step: number): Patch | { snapshot: T; step: number };
  /**
   * Reset the timeline and keep the first element
   */
  reset(): void;
  /**
   * Rebase the root to the given step.
   * All the previous step will be lost.
   */
  rebaseRoot(to: number): void;
}
