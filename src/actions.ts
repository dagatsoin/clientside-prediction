import {
  BasicMutationType,
  JSONCommand,
  JSONOperation
} from "./business/lib/types";
import { World, Proposal, SerializedEntity, Patch } from "./business/types";

const applyPatch = ({patch}: {patch: JSONCommand[]}): Proposal => ({
  mutations: patch.map((command) => ({
    type: BasicMutationType.jsonCommand,
    payload: command
  }))
})

const addPlayer = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.jsonCommand,
      payload: {
        op: JSONOperation.add,
        path: `/entities/${playerId}`,
        value: {
          id: playerId,
          name: playerId,
          transform: {
            position: { animation: {}, initial: { x: 0, y: 0 } }
          }
        } as SerializedEntity
      }
    }
  ]
})

const hydrate = ({
  snapshot,
  shouldRegisterStep = true
}: {
  snapshot: World;
  shouldRegisterStep?: boolean;
}): Proposal => ({
  shouldRegisterStep,
  mutations: [
    {
      type: BasicMutationType.jsonCommand,
      payload: { op: JSONOperation.replace, value: snapshot, path: "/" }
    }
  ]
});

const moveRight = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.incBy,
      payload: { path: `/entities/${playerId}/x`, amount: 1 }
    }
  ]
});

const moveLeft = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.decBy,
      payload: { path: `/entities/${playerId}/x`, amount: 1 }
    }
  ]
});

const translateRight = ({
  playerId,
  delta
}: {
  playerId: string;
  delta: number;
}): Proposal => ({
  mutations: [
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
  ]
});

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
      type: "applyPatch"
      payload: {
        patch: Patch
      }
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
