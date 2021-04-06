import { Patch } from "../business/types";

export type OpLog<T> = [{ snapshot: T; step: number }, ...Patch[]];

export interface ITimeTravel<T> {
  /**
   * Switch to another timeline branch
   */
  checkoutBranch(newBranch: any): void;
  /**
   * Create a branch from the given client step
   * @param clientStep
   */
  createBranch(name: string, clientStep: number): Patch[];
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
   * Clear the timeline and keep the first element
   */
  reset(initialState?: {step: number, snapshot: T}): void;
  /**
   * Rebase the root to the given step.
   * All the previous step will be lost.
   */
  rebaseRoot(to: number): void;
}
