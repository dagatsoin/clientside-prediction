import {
  action as transaction,
  computed,
  makeObservable,
  observable
} from "mobx";
import {
  Animation,
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
  JSONOperation,
  Remove,
  Replace
} from "./lib/types";
import { applyJSONCommand, at, getParentAndChildKey, increment } from "./lib/acceptors";
import { MutationType } from './acceptors';
import { getAnimationProgress, getCurrentPosition } from './animation';
import { didRemoveAnimation } from "../state/lib";

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
    this._snapshot = snapshot
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

  /**
   * The model did change
   */ 
  private isMutating: boolean = false;
  private isStale: boolean = false;
  private get hasStaleSnapshot() {
    return this._patch.length && !this.isMutating && this.isStale
  }

  private computeSnapshot() {
    this._snapshot = { entities: {dataType: "Map", value: Array.from(this.data.entities.entries()) }};
    this.isStale = false;
  }

  private _snapshot: SerializedWorld
  public get snapshot(): SerializedWorld {
    if (this.hasStaleSnapshot) {
      this.computeSnapshot()
    }
    return this._snapshot
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

  public present = ({ mutations }: Proposal) => {
    this._patch = [];
    this.isMutating = true;
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
          if (value !== undefined) {
            this._patch.push(
              // Don't mess with patch
              Object.freeze({
                op: JSONOperation.replace,
                path: mutation.payload.path,
                value
              })
            );
          }
          break;

        case MutationType.hitScan:
          // If angle is 0, the target is on the ray
          const hitScanVector: Vector2D = mutation.payload.direction
          const localOrigin = mutation.payload.from
          this.data.entities.forEach((entity) => {
            const entityPosition = getCurrentPosition(
              entity.transform.position.initial,
              entity.transform.position.animation,
              Date.now()
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

        // Remove animation data and copy the current value to the initial value
        case MutationType.stopAnimation:
          const animation: Animation = at(this.data, mutation.payload.path)
          // Path does not exists.
          if (!animation) {
            break;
          }
          const initialValuePath = mutation.payload.path.replace("animation", "initial")
          const initialValue: number = at(this.data, mutation.payload.path.replace("animation", "initial"))

          // If the animation is finished, simply copy the final value
          if (mutation.payload.isFinished) {
            const operation: Replace = {
              op: JSONOperation.replace,
              path: initialValuePath,
              value: animation.to ?? initialValue + animation.delta!
            }
            applyJSONCommand(this.data, operation)
            this._patch.push(operation)
          }
          // Else compute the current value and store it into the new initial value
          else {
            const position = getAnimationProgress(initialValue, animation, new Date().getTime()).current
            // Replace the initial value by the current value.
            const replaceOp: Replace = {
              op: JSONOperation.replace,
              path: mutation.payload.path.replace("animation", "initial"),
              value: position
            }
            applyJSONCommand(this.data, replaceOp);
            this._patch.push(replaceOp)
          }
          const removeOp: Remove = {
            op: JSONOperation.remove,
            path: mutation.payload.path
          }
          applyJSONCommand(this.data, removeOp);
          this._patch.push(removeOp)

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
          this._patch.push(mutation.payload);
          break;
      }
     // this.runInternalReactions()
    }
    this.isMutating = false;
    this.isStale = true;
  };

  /* // This index is used when reviewing each mutation during reaction.
  // It will be increment each time the present function is retrigerred
  // to avoir infinite loop (not react infinitly to the same command)
  private reviewIndex = 0
  private runInternalReactions() {
    const reviewedNb = 0
    for (let i = this.reviewIndex; i < this.patch.length; i++) {
      const command = this.patch[i]
      // Animation was stopped.
      // Set the current value as the new step value.
      if (didRemoveAnimation(command)) {
        const value = at(this.snapshot, command.path)
        
      }
    }
  } */
}

export function createModel(
  playerId: string,
  snapshot?: SerializedWorld
): IModel<World, SerializedWorld> {
  return new Model(playerId, snapshot);
}
