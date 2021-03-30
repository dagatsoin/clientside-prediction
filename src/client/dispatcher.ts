import { actions, Intent } from "../actions";
import { IModel } from "../business/types";
import { Dispatcher } from "./types";
import { IRepresentation } from "../state/types";
import { IServerAPI, StepPatch } from "../server/IServerAPI";
import { stringify } from '../business/lib/JSON';

/**
 * Send the same intent to the server
 * and to the local model.
 * The current step will be added as a tag
 * on the payload.
 */
export function createDispatcher(
  clientId: string,
  model: IModel<any, any>,
  state: IRepresentation,
  send: IServerAPI<any, any, any>["send"]
): {
  onMessage(stepPatch: StepPatch): void;
  dispatch: Dispatcher;
} {
  return {
    onMessage(stepPatch: StepPatch) {
      const { timeTravel } = state;
      /**
       * When the client receives a response to the server,
       * it will load the given step number and compare if
       * it had the same result.
       * If false, the client will rollback to the given point
       * and
       * Finally, the time line will be sliced to the received
       * step. This step is now the common point
       * of synchronisation for all nodes.
       */

      console.log(
        `New server step ${stepPatch.step}`,
        stringify(stepPatch.patch)
      );
      // State diverges. Rollback to the server state.
      if (
        stringify(stepPatch.patch) !==
        stringify(timeTravel.get(stepPatch.step))
      ) {
        console.warn(
          `Invalid client state at step ${stepPatch.step}. Reset to step ${
            timeTravel.getInitialStep() as any
          }`,
          stringify(timeTravel.getInitalSnapshot())
        );
        timeTravel.reset();
        actions.hydrate({
          snapshot: (timeTravel.getInitalSnapshot() as any).snapshot,
          shouldRegisterStep: false
        });
      }
      // Client and server states are the same. Rebase the client root
      // to the server step.
      else {
        timeTravel.rebaseRoot(stepPatch.step);
        console.log(
          `Rebase client state on server step #${timeTravel.getInitialStep()}`
        );
      }
    },
    dispatch(intent: Intent) {
      const { step: cStep } = state;
      const step = cStep;
    //  send({ clientId, step, ...intent });
      model.present(actions[intent.type](intent.payload as any));
    }
  };
}
