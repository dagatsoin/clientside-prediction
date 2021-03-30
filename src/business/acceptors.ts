import { ApplyCommand, Decrement, Increment } from "./lib/types";

export enum MutationType {
  increment = "increment",
  decrement = "decrement",
  restore = "reset",
  setTimelineLength = "setTimelineLength"
}

type Restore = {
  type: MutationType.restore;
  payload: {
    step: number;
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
  | Decrement;

export type Mutations = Mutation[];
