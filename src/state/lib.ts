import { makeObservable, computed, autorun } from 'mobx';
import { createTransformer } from 'mobx-utils';
import { cubicBezier } from "popmotion";
import { Intent } from '../actions';
import { Mutation } from "../business/acceptors";
import {
  ApplyCommand,
  BasicMutationType,
  JSONCommand,
  JSONOperation,
  Replace
} from "../business/lib/types";
import { Animation, IEntity, IModel, Position, SerializedWorld, World } from "../business/types";
import { ITimeTravel } from '../timeTravel/types';
import { IPlayer } from './types';

export function getBezier(animation?: Animation) {
  if (animation) {
    return cubicBezier(...animation.bezier);
  }
}
export function getAnimationProgress(
  now: number,
  animation: Partial<{ x: Animation; y: Animation }>
) {
  return {
    x:
      Math.min(
        Math.max(now - (animation?.x?.startedAt ?? 0), 0),
        animation?.x?.duration ?? 0
      ) / (animation?.x?.duration ?? 0),
    y:
      Math.min(
        Math.max(now - (animation?.y?.startedAt ?? 0), 0),
        animation?.y?.duration ?? 0
      ) / (animation?.y?.duration ?? 0)
  };
}
export function getDeltaPosition(
  animation: Partial<{ x: Animation; y: Animation }>,
  initial: Position
) {
  return {
    x:
      animation?.x?.to !== undefined
        ? animation.x.to - initial.x
        : animation.x?.delta ?? 0,
    y:
      animation?.y?.to !== undefined
        ? animation.y.to - initial.y
        : animation.y?.delta ?? 0
  };
}

export function isJSONCommand(mutation: Mutation): mutation is ApplyCommand {
  return mutation.type === BasicMutationType.jsonCommand;
}

export function didStartAnimation(
  command: JSONCommand
): command is Replace<Animation> {
  return (
    command.op === JSONOperation.replace &&
    /\/transform\/(position|rotation|scale)\/animation\/(x|y|z)$/.test(
      command.path
    )
  );
}


class Player implements IPlayer {
  get id() {
    return this.entity.id;
  }
  get name() {
    return this.entity.name;
  }
  get isAlive() {
    return this.entity.isAlive;
  }
  get ammo() {
    return this.entity.ammo;
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
      ammo: computed,
      isAlive: computed,
      position: computed
    });
  }
}


const createPlayer = createTransformer((entity: IEntity) => {
  console.log("recompute", entity.name);
  return new Player(entity);
});

export function updatePlayersRepresentation(
  currentPlayers: IPlayer[],
  model: IModel<World, SerializedWorld>
): IPlayer[] {
  currentPlayers.splice(0, currentPlayers.length);
  model.data.entities.forEach((entity) =>
    currentPlayers.push(createPlayer(entity))
  );
  return currentPlayers;
}

export function useNap(
  model: IModel<World, SerializedWorld>,
  timeTravel: ITimeTravel<Intent, SerializedWorld>
) {
      // NAP
      autorun(() => {
        if (model.patch.length) {
          timeTravel.commitStep({
            timestamp: timeTravel.getLocalDeltaTime(),
            patch: model.patch
          });
        }
      });
  
      // Clean animation
      autorun(() => {
        model.patch.filter(didStartAnimation).forEach((mutation) => {
          setTimeout(
            () => {
              timeTravel.startStep({}as any)
              model.present({
                mutations: [
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
                ]
              }),
            mutation.value.duration
          });
        });
      });
}