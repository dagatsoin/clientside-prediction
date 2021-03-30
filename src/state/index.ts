import { autorun, computed, makeObservable, reaction } from "mobx";
import { createTransformer } from "mobx-utils";
import { Mutation, Mutations, MutationType } from "../business/acceptors";
import {
  ApplyCommand,
  BasicMutationType,
  JSONOperation
} from "../business/lib/types";
import { IEntity, IModel, SerializedWorld, World } from "../business/types";
import { createTimeTravel } from "../timeTravel";
import { ITimeTravel } from "../timeTravel/types";
import {
  getAnimationProgress,
  getDeltaPosition,
  getBezier,
  didStartAnimation
} from "./lib";
import { IPlayer, IRepresentation } from "./types";

export type State = { pos: { x: number; y: number } };

class Player implements IPlayer {
  get id() {
    return this.entity.id;
  }
  get name() {
    return this.entity.name;
  }
  get position() {
    const now = Date.now();
    const { animation, initial } = this.entity.transform.position;
    const progress = getAnimationProgress(now, animation);
    return {
      x:
        initial.x +
        (this.animationTransforms.posX?.(progress.x) ?? 0) *
          getDeltaPosition(animation, initial).x,
      y:
        initial.y +
        (this.animationTransforms.posX?.(progress.y) ?? 0) *
          getDeltaPosition(animation, initial).y
    };
  }
  private get animationTransforms() {
    return {
      posX: getBezier(this.entity.transform.position.animation?.x),
      posY: getBezier(this.entity.transform.position.animation?.y)
    };
  }
  constructor(private entity: IEntity) {
    makeObservable<this, "animationTransforms">(this, {
      animationTransforms: computed,
      name: computed,
      position: computed
    });
  }
}

class Representation implements IRepresentation {
  private createPlayer = createTransformer((entity: IEntity) => {
    console.log("recompute", entity.name);
    return new Player(entity);
  });

  get playerId() {
    return this.model.id;
  }

  private _players: IPlayer[] = [];
  get players() {
    console.log("recompute players collection");
    this._players.splice(0, this._players.length);
    this.model.data.entities.forEach((entity) =>
      this._players.push(this.createPlayer(entity))
    );
    return this._players;
  }

  get player() {
    return this.players.find(({ id }) => id === this.playerId)!;
  }

  private _timeTravel: ITimeTravel<SerializedWorld>;
  get timeTravel() {
    return this._timeTravel;
  }

  get step() {
    return this.timeTravel.getCurrentStep();
  }

  constructor(
    private model: IModel<World, SerializedWorld>,
    initialStep: number
  ) {
    this._timeTravel = createTimeTravel([
      { snapshot: model.snapshot, step: initialStep }
    ]);
    makeObservable(this, {
      player: computed,
      players: computed
    });

    // NAP

    autorun(() => {
      if (model.patch.length) {
        this.timeTravel.push(model.patch);
      }
    });

    // Clean animation
    autorun(() => {
      this.model.patch.filter(didStartAnimation).forEach((mutation) => {
        setTimeout(
          () =>
            model.present([
              {
                type: BasicMutationType.jsonCommand,
                payload: {
                  op: JSONOperation.remove,
                  path: mutation.path
                }
              },
              mutation.value.to
                ? {
                    type: BasicMutationType.jsonCommand,
                    payload: {
                      op: JSONOperation.replace,
                      path: mutation.path.replace("animation", "initial"),
                      value: mutation.value.to
                    }
                  }
                : {
                    type: BasicMutationType.incBy,
                    payload: {
                      path: mutation.path.replace("animation", "initial"),
                      amount: mutation.value.delta!
                    }
                  }
            ]),
          mutation.value.duration
        );
      });
    });
  }
}

export function createStateComputation(
  model: IModel<World, SerializedWorld>,
  initialStep: number
) {
  return new Representation(model, initialStep);
}
