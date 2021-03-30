import {
  BasicMutationType,
  JSONCommand,
  JSONOperation
} from "./business/lib/types";
import { World, Proposal, SerializedEntity } from "./business/types";

const applyPatch = (patch: JSONCommand[]): Proposal =>
  patch.map((command) => ({
    type: BasicMutationType.jsonCommand,
    payload: command
  }));

const addPlayer = (snapshot: SerializedEntity): Proposal => [
  {
    type: BasicMutationType.jsonCommand,
    payload: {
      op: JSONOperation.push,
      path: "/entities",
      value: snapshot
    }
  }
];

const hydrate = ({
  snapshot,
  shouldRegisterStep = true
}: {
  snapshot: World;
  shouldRegisterStep?: boolean;
}): Proposal => [
  {
    type: BasicMutationType.jsonCommand,
    payload: { op: JSONOperation.replace, value: snapshot, path: "/" }
  }
];

const moveRight = ({ playerId }: { playerId: string }): Proposal => [
  {
    type: BasicMutationType.incBy,
    payload: { path: `/entities/${playerId}/x`, amount: 1 }
  }
];

const moveLeft = ({ playerId }: { playerId: string }): Proposal => [
  {
    type: BasicMutationType.decBy,
    payload: { path: `/entities/${playerId}/x`, amount: 1 }
  }
];

const translateRight = ({
  playerId,
  delta
}: {
  playerId: string;
  delta: number;
}): Proposal => [
  {
    type: BasicMutationType.jsonCommand,
    payload: {
      op: JSONOperation.replace,
      path: `entities/${playerId}/transform/position/animation/x`,
      value: {
        startedAt: Date.now(),
        bezier: [0, 0, 1, 1],
        duration: 100,
        delta
      }
    }
  }
];

export const actions = {
  applyPatch,
  addPlayer,
  hydrate,
  moveRight,
  moveLeft,
  translateRight
};

export type Intent =
  | {
      type: "applyPatch";
      payload: JSONCommand[];
    }
  | {
      type: "hydrate";
      payload: {
        snapshot: World;
        shouldRegisterStep?: boolean;
      };
    }
  | {
      type: "addPlayer";
      payload: { playerId: string };
    }
  | {
      type: "moveRight";
      payload: { playerId: string };
    }
  | {
      type: "moveLeft";
      payload: { playerId: string };
    }
  | {
      type: "translateRight";
      payload: { playerId: string; delta: number };
    };
