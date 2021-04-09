import { Mutations } from "./acceptors";
import { JSONCommand } from "./lib/types";

export type IModel<T, S> = {
  readonly id: string;
  readonly data: T;
  readonly commands: ReadonlyArray<JSONCommand>;
  readonly snapshot: S;
  present: Present;
};

export type Timeline<T = any> = Array<{
  data: T;
  stepId: number;
}>;

export type SerializedEntity = {
  id: string;
  name: string;
  transform: {
    position: {
      initial: Position;
      animation: AnimatedPosition;
    };
  };
};

export type IEntity = {
  id: string;
  name: string;
  transform: Transform;
};

export type AnimatedPosition = Partial<{
  x: Animation;
  y: Animation;
}>;

export type Animation = {
  bezier: [number, number, number, number];
  startedAt: number;
  duration: number;
  to?: number;
  delta?: number;
};

export type Position = {
  x: number;
  y: number;
};

/**
 * The transform object stores the position/rotation/scale of
 * an entity.
 * Each property store three values:
 * - the initial position at the current step.
 * - the current animation parameters.
 * - a computed current position at physicaltime,
 * given by the two previous props
 */
export type Transform = {
  position: {
    initial: Position;
    animation: AnimatedPosition;
  };
};

export type SerializedWorld = {
  entities: {dataType: "Map", value: Array<[string, SerializedEntity]>};
};

export type World = {
  entities: Map<string, IEntity>;
};

export type Present = (
  proposal: Proposal,
  shouldRegisterStep?: boolean
) => void;

export type Proposal = {
  shouldRegisterStep?: boolean
  mutations: Mutations
};

export type Step<I> = {
  /**
   * The time elapsed from the current step
   */
  intent: I
  timestamp: number
  patch: JSONCommand[]
};
