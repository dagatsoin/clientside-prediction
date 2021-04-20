import { Mutations } from "./acceptors";
import { JSONCommand } from "./lib/types";

export type IModel<T, S> = {
  readonly id: string;
  readonly data: T;
  readonly patch: ReadonlyArray<JSONCommand>;
  readonly snapshot: S;
  present: Present;
};

export type SerializedEntity = {
  id: string;
  isAlive: boolean;
  ammo: number;
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
  isAlive: boolean;
  ammo: number;
  transform: Transform;
};

export type AnimatedPosition = Partial<{
  x: Animation;
  y: Animation;
}>;

export type Animation = {
  id: number;
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
  proposal: Proposal
) => void;

export type Proposal = {
  shouldReact?: boolean
  mutations: Mutations
};

export type Vector2D = [number, number]

export type Step<I> = {
  /**
   * The time elapsed from the current step
   */
  intent: I
  timestamp: number
  patch: ReadonlyArray<JSONCommand>
};
