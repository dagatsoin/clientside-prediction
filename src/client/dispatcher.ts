import { actions, Intent } from "../actions";
import { IModel } from "../business/types";
import { Dispatcher } from "./types";
import { IRepresentation } from "../state/types";
import { stringify } from '../business/lib/JSON';
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
  socket: WebSocket
): {
  onMessage(message: MessageEvent<string>): void;
  dispatch: Dispatcher;
} {
  return {
    onMessage(messageEvent: MessageEvent<string>) {
      // Use native parser to keep the serialized map
      const message: ServerMessage = JSON.parse(messageEvent.data)
      const { timeTravel } = getState();
      /**
       * The server sent a sync command.
       * We reduce the timeline to the server stepId.
       * Then we will apply actions on it.
       */ 
      if (message.type === "sync") {
        const intentsToResubmit: Intent[] = []
        for (let i = message.data.stepId; i <= timeTravel.getCurrentStepId(); i++) {
          const step = timeTravel.get(i)
          if ("intent" in step) {
            intentsToResubmit.push(step.intent)
          }
        }
        timeTravel.reset({
          stepId: message.data.stepId,
          snapshot: message.data.snapshot
        })
        model.present(actions["hydrate"]({snapshot: message.data.snapshot}))
        intentsToResubmit.forEach(function(intent) {
          timeTravel.startStep(intent)
          model.present(actions[intent.type](intent.payload as any))
        })
      }
      /**
       * The server is ahead of one step.
       * Sync the client by perfoming the given action.
       */ 
      else if (message.type === "intent") {
        timeTravel.startStep(message.data)
        model.present(actions[message.data.type](message.data.payload as any))
      }
      /**
       * The past changed. Sync the client to the server state
       * by doing a travel in the past and the apply of a new timeline.
       */
      else if (message.type === "rollback") {
        // Merge the server timeline in the local timeline.
        timeTravel.forkPast(message.data.to, function (oldBranch, newBranch) {
          newBranch.push(...message.data.timeline, ...oldBranch.slice(message.data.timeline.length))
        })
        // Rollback the model to the step before the rollback target.
        // If the rollback targets step 2, rollback to 1.
        model.present(actions.hydrate({snapshot: timeTravel.at(message.data.to), shouldRegisterStep: false }))
        // Replay the new section of the timeline by applying patch
        const patch = timeTravel.getPatchFromTo(message.data.to, timeTravel.getCurrentStepId())
        model.present(actions.applyPatch({commands: patch}))
      }
      /**
       * All the nodes have consencus on the past. Reduce the common step
       * as a snapshot.
       * That means there won't be ever any past modification before this step.
       */
      else if (message.type === "reduce") {
        timeTravel.reduce(message.data.to)
      }
    },
    dispatch(intent: Intent) {
      const { stepId: cStep, timeTravel } = getState();
      // Backup intent to write the next step
      timeTravel.startStep(intent)
      const stepId = cStep;
      const data = stringify({type: "intent", data: {
        timestamp: timeTravel.getLocalDeltaTime(),
        clientId,
        stepId,
        ...intent
      }})
      socket.send(data);
      model.present(actions[intent.type](intent.payload as any));
    }
  };
}