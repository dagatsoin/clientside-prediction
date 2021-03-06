import {
  action as transaction,
  computed,
  makeObservable,
  observable
} from "mobx";
import {
  IModel,
  World,
  Proposal,
  IEntity,
  Transform,
  SerializedEntity,
  SerializedWorld,
  Vector2D
} from "./types";
import {
  AddEntity,
  BasicMutationType,
  JSONCommand,
  JSONOperation
} from "./lib/types";
import { applyJSONCommand, increment } from "./lib/acceptors";
import { MutationType } from './acceptors';
import { getCurrentPosition } from './animation';

type ISerializable<T> = { hydrate(snapshot: T): void };

class Entity implements IEntity, ISerializable<SerializedEntity> {
  constructor(snapshot: SerializedEntity) {
    this.id = snapshot.id;
    this.name = snapshot.name;
    this.ammo = snapshot.ammo
    this.isAlive = snapshot.isAlive
    this.transform.position.animation = snapshot.transform.position.animation;
    this.transform.position.initial = snapshot.transform.position.initial;
    makeObservable(this, {
      name: observable,
      isAlive: observable,
      transform: observable
    });
  }

  public name: string;
  public id: string;
  public isAlive: boolean;
  public ammo: number;
  public readonly transform: Transform = ((self: this) => {
    return {
      position: {
        initial: {
          x: 0,
          y: 0
        },
        animation: {}
      }
    } as Transform;
  })(this);

  public hydrate(snapshot: SerializedEntity) {
    this.id = snapshot.id;
    this.name = snapshot.name;
    this.transform.position.animation = snapshot.transform.position.animation;
    this.transform.position.initial = snapshot.transform.position.initial;
  }
}

export function isAddEntityCmd(command: JSONCommand): command is AddEntity {
  return (
    command.op === JSONOperation.add &&
    /^\/entities\/[A-Za-z0-9]+$/.test(command.path)
  );
}

export class Model implements IModel<World, SerializedWorld> {
  constructor(
    public readonly id: string,
    snapshot: SerializedWorld = { entities: {dataType: "Map", value: []} }
  ) {
    this.hydrate(snapshot);
    makeObservable<Model, "_patch">(this, {
      data: observable,
      patch: computed,
      _patch: observable.shallow,
      present: transaction
    });
  }
  public data: World = { entities: new Map() };
  public get patch(): ReadonlyArray<JSONCommand> {
    return this._patch.slice();
  }
  public get snapshot(): SerializedWorld {
    return { entities: {dataType: "Map", value: Array.from(this.data.entities.entries()) }};
  }

  private _patch: JSONCommand[] = [];

  /**
   * Populate the world.
   * It uses a reconciliation mechanisms to not over
   * triggers listeners.
   * Observers of unchanged entities won't be triggers.
   * TODO lower reconciliation complexity
   */
  public hydrate(snapshot: SerializedWorld) {
    const snapshotIDs = snapshot.entities.value.map(([id]) => id);
    // Remove deleted entities
    this.data.entities.forEach((_, id) => {
      if (!snapshotIDs.includes(id)) {
        this.data.entities.delete(id);
      }
    });
    // Add/update new entities
    snapshot.entities.value.forEach(([id, serializedEntity]) => {
      if (this.data.entities.has(id)) {
        (this.data.entities.get(id) as Entity).hydrate(serializedEntity);
      } else {
        this.data.entities.set(id, new Entity(serializedEntity));
      }
    });
  }

  public present = ({ mutations, shouldRegisterStep = true }: Proposal) => {
    this._patch = [];
    for (let mutation of mutations) {
      switch (mutation.type) {
        case BasicMutationType.incBy:
        case BasicMutationType.decBy:
          const value = increment(
            this.data,
            mutation.payload.path,
            mutation.payload.amount * (
              mutation.type === BasicMutationType.incBy
                ? 1
                : -1
            )
          );
          this._patch.push(
            // Don't mess with patch
            Object.freeze({
              op: JSONOperation.replace,
              path: mutation.payload.path,
              value
            })
          );
          break;

        case MutationType.hitScan:
          // If angle is 0, the target is on the ray
          const hitScanVector: Vector2D = mutation.payload.direction
          const localOrigin = mutation.payload.from
          this.data.entities.forEach((entity) => {
            const entityPosition = getCurrentPosition(
              Date.now(),
              entity.transform.position.initial,
              entity.transform.position.animation
            )
            const targetVector: Vector2D = [
              entityPosition.x - localOrigin.x,
              entityPosition.y - localOrigin.y
            ]
            const angle = Math.atan2(hitScanVector[1] - targetVector[1], hitScanVector[0] - targetVector[0]) * 180 / Math.PI;
            if (angle === 0) {
              // Hit a target
              // Kill it
              entity.isAlive = false
              this._patch.push(
                // Don't mess with patch
                Object.freeze({
                  op: JSONOperation.replace,
                  path: `/entities/${entity.id}/isAlive`,
                  value: false
                })
              );
            }
          })
          break;

        case BasicMutationType.jsonCommand:
          // Replace the whole data
          if (mutation.payload.path === "/") {
            this.hydrate((mutation.payload as any).value);
          }
          // Add a player
          else if (isAddEntityCmd(mutation.payload)) {
            const cmd = mutation.payload;
            this.data.entities.set(
              cmd.value.id,
              new Entity(mutation.payload.value)
            );
          }
          // Replace a specific path
          else {
            applyJSONCommand(this.data, mutation.payload);
          }
          if (shouldRegisterStep) {
            this._patch.push(mutation.payload);
          }
          break;
      }
    }
  };
}

export function createModel(
  playerId: string,
  snapshot?: SerializedWorld
): IModel<World, SerializedWorld> {
  return new Model(playerId, snapshot);
}
