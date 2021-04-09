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
      // The server is ahead, resync client
      if (message.type === "sync") {
        // TODO reset on server initial snapshot and replay actions in a different timeline. Apply changes only if diff.
        timeTravel.reset({
          stepId: message.data.stepId,
          snapshot: message.data.snapshot
        })
        model.present(actions.hydrate({ snapshot: message.data.snapshot }), false)
      } else if (message.type === "intent") {
        model.present(actions[message.data.type](message.data.payload as any))
      } else if (message.type === "patch") {
        console.log(`${clientId} received data from server step ${message.data.stepId}`);
        // Fast forward: resync client to the server step
        if (message.data.stepId > timeTravel.getCurrentStepId()) {
          console.info(`${clientId} is behind, fast forward`)
          model.present(actions.applyPatch({
              commands: message.data.patch
          }))
        }
        // State diverges. Rollback to the server state.
        else if (
          stringify(message.data.patch) !==
          stringify(timeTravel.get(message.data.stepId).patch)
        ) {
          console.info(
            stringify(message.data.patch),
            stringify(timeTravel.get(message.data.stepId)),
            `Invalid client state at step ${message.data.stepId}. Reset to step ${
              timeTravel.getInitialStep()
            }`,
            stringify(timeTravel.getInitalSnapshot())
          );
          timeTravel.reset();
          model.present(actions.hydrate({
            snapshot: timeTravel.getInitalSnapshot(),
            shouldRegisterStep: false
          }));
        }
        // Client and server states are the same. Rebase the client root
        // to the server step.
        else {
          timeTravel.rebaseRoot(message.data.stepId);
          console.log(
            `Rebase ${clientId} state on server step ${timeTravel.getInitialStep()}`
          );
        }
      }
    },
    dispatch(intent: Intent) {
      const { stepId: cStep, timeTravel } = getState();
      // Backup intent to write the next step
      timeTravel.lastIntent = {...intent}
      const step = cStep;
      send(stringify({type: "intent", data: { clientId, step, ...intent }}));
      model.present(actions[intent.type](intent.payload as any));
    }
  };
}