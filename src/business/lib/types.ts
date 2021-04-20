import { SerializedEntity } from "../types";

export enum BasicMutationType {
  incBy = "incBy",
  decBy = "decBy",
  jsonCommand = "jsonCommand"
}

export type Increment = {
  type: BasicMutationType.incBy;
  payload: { path: string; amount: number };
};

export type Decrement = {
  type: BasicMutationType.decBy;
  payload: { path: string; amount: number };
};

export type ApplyCommand = {
  type: BasicMutationType.jsonCommand;
  payload: JSONCommand;
};

export enum JSONOperation {
  add = "add",
  push = "push",
  replace = "replace",
  remove = "remove"
}

export type Replace<T = any> = {
  op: JSONOperation.replace;
  path: string;
  value: T;
};

type Add = {
  op: JSONOperation.add;
  path: string;
  value: any;
};

export type Remove = {
  op: JSONOperation.remove;
  path: string;
};

export type Push = {
  op: JSONOperation.push;
  path: string;
  value: any;
};

export type AddEntity = {
  op: JSONOperation.push;
  path: string;
  value: SerializedEntity;
};

export type JSONCommand = Add | Replace | Push | AddEntity | Remove;
