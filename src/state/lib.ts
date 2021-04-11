import { makeObservable, computed, autorun } from 'mobx';
import { createTransformer } from 'mobx-utils';
import { Intent } from '../actions';
import { Mutation } from "../business/acceptors";
import { getCurrentPosition } from '../business/animation';
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
    return getCurrentPosition(now, initial, animation);
  }

  constructor(private entity: IEntity) {
    makeObservable(this, {
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