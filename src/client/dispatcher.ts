import { actions, Intent } from "../actions";
import { IModel } from "../business/types";
import { Dispatcher } from "./types";
import { IRepresentation } from "../state/types";
import { parse, stringify } from '../business/lib/JSON';
import { ISocket } from '../mockedSocket';
import { ServerMessage } from '../type';

/**
 * Send the same intent to the server
 * and to the local model.
 * The current step will be added as a tag
 * on the payload.
 */
export function createDispatcher(
  clientId: string,
  model: IModel<any, any>,
  // State is not created at when call this function
  getState: () => IRepresentation,
  send: ISocket["send"],
): {
  onMessage(message: MessageEvent<string>): void;
  dispatch: Dispatcher;
} {
  return {
    onMessage(messageEvent: MessageEvent<string>) {
      // Use native parser to keep the serialized map
      const message: ServerMessage = JSON.parse(messageEvent.data)
      const { timeTravel } = getState();
      if (message.type === "sync") {
        timeTravel.reset(message.data)
        model.present(actions.hydrate({ snapshot: message.data.snapshot }), false)
      } else if (message.type === "intent") {
        model.present(actions[message.data.type](message.data.payload as any))
      } else if (message.type === "patch") {
        console.log(`${clientId} received data from server step ${message.data.step}`);
        // Fast forward: resync client to the server step
        if (message.data.step > timeTravel.getCurrentStep()) {
          console.info(`${clientId} is behind, fast forward`)
          model.present(actions.applyPatch({
              patch: message.data.patch
          }))
        }
        // State diverges. Rollback to the server state.
        else if (
          stringify(message.data.patch) !==
          stringify(timeTravel.get(message.data.step))
        ) {
          console.info(
            stringify(message.data.patch),
            stringify(timeTravel.get(message.data.step)),
            `Invalid client state at step ${message.data.step}. Reset to step ${
              timeTravel.getInitialStep() as any
            }`,
            stringify(timeTravel.getInitalSnapshot())
          );
          timeTravel.reset();
          model.present(actions.hydrate({
            snapshot: (timeTravel.getInitalSnapshot() as any).snapshot,
            shouldRegisterStep: false
          }));
        }
        // Client and server states are the same. Rebase the client root
        // to the server step.
        else {
          timeTravel.rebaseRoot(message.data.step);
          console.log(
            `Rebase ${clientId} state on server step ${timeTravel.getInitialStep()}`
          );
        }
      }
    },
    dispatch(intent: Intent) {
      const { step: cStep } = getState();
      const step = cStep;
      send(stringify({type: "intent", data: { clientId, step, ...intent }}));
      model.present(actions[intent.type](intent.payload as any));
    }
  };
}