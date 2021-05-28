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
  Remove,
  Replace
} from "../business/lib/types";
import { Animation, IEntity, IModel, Position, SerializedWorld, World } from "../business/types";
import { Dispatcher } from '../client/types';
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

export function didRemoveAnimation(
  command: JSONCommand
): command is Remove {
  return (
    command.op === JSONOperation.remove &&
    /\/transform\/(position|rotation|scale)\/animation\/(x|y|z)$/.test(
      command.path
    )
  );
}

export function isDead(
  command: JSONCommand
): boolean {
  return command.op === JSONOperation.replace && command.path.endsWith("isAlive")
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
    return getCurrentPosition(initial, animation, now);
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

export function useNap({
  model, timeTravel, stepListeners, dispatch
}: {
  model: IModel<World, SerializedWorld>,
  timeTravel: ITimeTravel<Intent, SerializedWorld>,
  stepListeners: Array<(stepId: number) => void>,
  dispatch: Dispatcher
}): (stepId: number) => string[] {
  /**
   * A list of running animations property paths maintened by
   * the animation cleaner NAP.
   * The animation ID is the step which it started at.
   * Therefore, there can be multiple animation with same id.
   */
  const animations: Map<string, { stepId: number, timer: any }> = new Map()

  // NAP

  // Add a new step in the timetraveler.
  // Trigger this NAP first to make sure that subsequent NAP
  // get the right new step number
  autorun(() => {
    if (model.patch.length) {
      timeTravel.commitStep(model.patch);
      for (let listener of stepListeners) {
        listener(timeTravel.getCurrentStepId())
      }
    }
  });

  // Animation
  autorun(() => {
    model.patch.filter(didStartAnimation).forEach((mutation) => {
      // An animations started
      // Store the animated path

      animations.set(
        mutation.path,
        {
          stepId: timeTravel.getCurrentStepId(),
          timer: setTimeout(
            function() {
              dispatch({
                type: "stopAnimations",
                payload: {
                  paths: [mutation.path]
                }
              })
            },
            mutation.value.duration
          )
        }
      )
    });

    model.patch.filter(didRemoveAnimation).forEach((mutation) => {
      clearTimeout(animations.get(mutation.path)?.timer)
      animations.delete(mutation.path)
    })
  });

  // Player was killed, stop animations
  autorun(() => {
    model.patch.filter(isDead)
      .forEach(function(command) {
        const playerId = getEntityIdFromCommandPath(command.path)
        const playerAnimationPaths: any[] = []
        for (let animatedPath of animations.keys()) {
          const animatedEntityId = getEntityIdFromCommandPath(command.path)
          if (animatedEntityId === playerId) {
            playerAnimationPaths.push(animatedPath)
          }
        }
        dispatch({type: "stopAnimations", payload: {paths: playerAnimationPaths}})
      })
    
  })
  
  return function getPathsFromStep(id: number): string[] {
    return Array.from(animations).filter(([_, {stepId}]) => stepId === id).map(([path]) => path)
  }
}

export function getEntityIdFromCommandPath(path: string) {
  return path.split('/')[2]
}