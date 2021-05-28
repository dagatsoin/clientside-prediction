import { applyJSONCommand } from './lib/acceptors';
import { ApplyCommand, Decrement, Increment } from "./lib/types";
import { Position, Vector2D } from './types';

export enum MutationType {
  increment = "increment",
  decrement = "decrement",
  restore = "reset",
  setTimelineLength = "setTimelineLength",
  hitScan = "hitScan",
  stopAnimation = "stopAnimation"
}

type HitScan = {
  type: MutationType.hitScan
  payload: {
    from: Position
    direction: Vector2D
  }
}

type Restore = {
  type: MutationType.restore;
  payload: {
    stepId: number;
  };
};

type SetTimelineLength = {
  type: MutationType.setTimelineLength;
  payload: {
    length: number;
  };
};

type StopAnimation = {
  type: MutationType.stopAnimation;
  payload: {
    isFinished: boolean
    path: string
  }
}

export type Mutation =
  | SetTimelineLength
  | Restore
  | ApplyCommand
  | Increment
  | Decrement
  | HitScan
  | StopAnimation

export type Mutations = Mutation[];
