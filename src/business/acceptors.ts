import { ApplyCommand, Decrement, Increment } from "./lib/types";
import { Position, Vector2D } from './types';

export enum MutationType {
  increment = "increment",
  decrement = "decrement",
  restore = "reset",
  setTimelineLength = "setTimelineLength",
  hitScan = "hitScan"
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

export type Mutation =
  | SetTimelineLength
  | Restore
  | ApplyCommand
  | Increment
  | Decrement
  | HitScan

export type Mutations = Mutation[];
