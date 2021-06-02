import { MutationType } from './business/acceptors';
import {
  BasicMutationType,
  JSONCommand,
  JSONOperation
} from "./business/lib/types";
import { Position, Proposal, SerializedEntity, SerializedWorld, Vector2D } from "./business/types";

const applyPatch = ({commands}: {commands: ReadonlyArray<JSONCommand>}): Proposal => ({
  mutations: commands.map((command) => ({
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
          isAlive: true,
          ammo: 1,
          transform: {
            position: { animation: {}, initial: { x: 0, y: 0 } }
          }
        } as SerializedEntity
      }
    }
  ]
})

const hydrate = ({
  snapshot
}: {
  snapshot: SerializedWorld;
}): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.jsonCommand,
      payload: { op: JSONOperation.replace, value: snapshot, path: "/" }
    }
  ]
});

export const moveUp = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.incBy,
      payload: { path: `/entities/${playerId}/transform/position/initial/y`, amount: 1 }
    }
  ]
});

const moveRight = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.incBy,
      payload: { path: `/entities/${playerId}/transform/position/initial/x`, amount: 1 }
    }
  ]
});

const moveDown = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.decBy,
      payload: { path: `/entities/${playerId}/transform/position/initial/y`, amount: 1 }
    }
  ]
});

const moveLeft = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.decBy,
      payload: { path: `/entities/${playerId}/transform/position/initial/x`, amount: 1 }
    }
  ]
});

export const translateRight = ({
  playerId,
  delta,
  duration = 200
}: {
  playerId: string;
  delta: number;
  duration?: number
}): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.jsonCommand,
      payload: {
        op: JSONOperation.replace,
        path: `/entities/${playerId}/transform/position/animation/x`,
        value: {
          startedAt: Date.now(),
          bezier: [0, 0, 1, 1],
          duration: duration,
          delta
        }
      }
    }
  ]
});

export const endAnimations = ({paths}: {paths: string[]}): Proposal => ({
  mutations: paths.map(path => ({
    type: MutationType.stopAnimation,
    payload: {
      isFinished: true,
      path
    }
  }))
})

export const cancelAnimations = ({paths}: {paths: string[]}): Proposal => ({
  mutations: paths.map(path => ({
    type: BasicMutationType.jsonCommand,
    payload: {
      op: JSONOperation.remove,
      path
    }
  }))
})

const stopAnimations = ({paths}: {paths: string[]}): Proposal => ({
  mutations: paths.map(path => ({
    type: MutationType.stopAnimation,
    payload: {
      isFinished: false,
      path
    }
  }))
})

const shot = ({
  shoter,
  from,
  direction
}: {
  shoter: string,
  from: Position,
  direction: Vector2D
}): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.decBy,
      payload: {
        path: `/entities/${shoter}/ammo`,
        amount: 1
      }
    },
    {
      type: MutationType.hitScan,
      payload: {
        from,
        direction
      }
    }
  ]
})

export const actions = {
  applyPatch,
  addPlayer,
  hydrate,
  stopAnimations,
  cancelAnimations,
  endAnimations,
  moveUp,
  moveRight,
  moveDown,
  moveLeft,
  translateRight,
  shot
};

export type Intent =
  | {
      type: "applyPatch"
      payload: Readonly<{
        commands: ReadonlyArray<JSONCommand>
      }>
    }
  | {
      type: "hydrate";
      payload: Readonly<{
        snapshot: SerializedWorld;
        shouldRegisterStep?: boolean;
      }>;
    }
  | {
      type: "addPlayer";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "moveUp";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "moveRight";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "moveDown";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "moveLeft";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "translateRight";
      payload: Readonly<{ playerId: string; delta: number; duration?: number }>;
    }
  | {
      type: "stopAnimations";
      payload: Readonly<{ paths: ReadonlyArray<string> }>
    }
  | {
      type: "cancelAnimations";
      payload: Readonly<{ paths: ReadonlyArray<string> }>
    }
  | {
      type: "endAnimations";
      payload: Readonly<{ paths: ReadonlyArray<string> }>
    }
  | {
      type: "shot";
      payload: Readonly<{
        shoter: string,
        from: Position,
        direction: Vector2D
      }>;
    };
