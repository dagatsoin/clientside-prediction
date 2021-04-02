import { actions, Intent } from "../actions";
import { IModel } from "../business/types";
import { Dispatcher } from "./types";
import { IRepresentation, StepPatch } from "../state/types";
import { parse, stringify } from '../business/lib/JSON';
import { ISocket } from '../mockedSocket';

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
  send: ISocket["send"]
): {
  onMessage(message: MessageEvent<string>): void;
  dispatch: Dispatcher;
} {
  return {
    onMessage(message: MessageEvent<string>) {
      const data = parse<StepPatch | { clientId: string, step: number } & Intent>(message.data)
      const { timeTravel } = state;
      
      if (isServerInput(data)) {
        model.present(actions[data.type](data.payload as any))
      } else {
        console.log(
          `New server step ${data.step}`,
          stringify(data)
        );
        // Fast forward: resync client to the server step
        if (data.step > timeTravel.getCurrentStep()) {
          actions.applyPatch({
              patch: data.patch
          })
        }
        // State diverges. Rollback to the server state.
        else if (
          stringify(data.patch) !==
          stringify(timeTravel.get(data.step))
        ) {
          console.warn(
            stringify(data.patch),
            stringify(timeTravel.get(data.step)),
            `Invalid client state at step ${data.step}. Reset to step ${
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
          timeTravel.rebaseRoot(data.step);
          console.log(
            `Rebase client state on server step #${timeTravel.getInitialStep()}`
          );
        }
      }
    },
    dispatch(intent: Intent) {
      const { step: cStep } = state;
      const step = cStep;
      send(stringify({ clientId, step, ...intent }));
      model.present(actions[intent.type](intent.payload as any));
    }
  };
}

function isServerInput(data: any): data is { clientId: string, step: number } & Intent {
  return "clientId" in data
}