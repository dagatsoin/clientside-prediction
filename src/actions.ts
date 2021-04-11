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
  snapshot,
  shouldRegisterStep = true
}: {
  snapshot: SerializedWorld;
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

const moveUp = ({ playerId }: { playerId: string }): Proposal => ({
  mutations: [
    {
      type: BasicMutationType.incBy,
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
  moveUp,
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
      type: "moveLeft";
      payload: Readonly<{ playerId: string }>;
    }
  | {
      type: "translateRight";
      payload: Readonly<{ playerId: string; delta: number }>;
    }
  | {
      type: "shot";
      payload: Readonly<{
        shoter: string,
        from: Position,
        direction: Vector2D
      }>;
    };
