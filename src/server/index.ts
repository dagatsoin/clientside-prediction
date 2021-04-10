import { actions, Intent } from '../actions';
import { parse, stringify } from '../business/lib/JSON';
import { createModel } from "../business/model";
import {
  World,
  IModel,
  SerializedWorld
} from "../business/types";
import { createSocket, ISocket, nodes } from '../mockedSocket';
import { createServerRepresentation } from "../state/server";
import { IServerRepresentation } from "../state/types";
import { Timeline } from '../timeTravel/types';
import { ClientMessage, ServerMessage } from '../type';

export interface IServer<T> {
  state: IServerRepresentation
  dispatch: (intent: Intent) => Promise<void>;
}

function isOutDated(step: number) {
  return false;
}

class Server implements IServer<World> {
  constructor(
    private model: IModel<World, SerializedWorld> = createModel("server"),
    private socket: ISocket = createSocket("server")
  ) {
    this.socket.onmessage = this.onMessage
    this.state = createServerRepresentation(this.model);
  }
  
  state: IServerRepresentation;

  onSync = (ev: MessageEvent<any>) => {
    const node = nodes.get(parse(ev.data).playerId)
    if (node) {
      node.cb(new MessageEvent(stringify({snapshot: this.model.snapshot, stepId: this.state.stepId})))
    }
  }

  onMessage = (ev: MessageEvent<string>) => {
    // Use native parser to keep the serialized map
    const message: ClientMessage = JSON.parse(ev.data)
    /**
     * The client want to sync with the server.
     */
    if (message.type === "sync") {
      const node = nodes.get(message.data.clientId)
      if (node) {
        node.cb(new MessageEvent<string>("message", {
          data: stringify({
            type: "sync",
            data: {
              stepId: this.state.stepId,
              snapshot: this.model.snapshot,
              timeline: []
            }
          })
        }))
      }
    }
    else if (message.type === "intent") {
      const input = message.data
      /**
       * The incoming intent is for a previous step.
       * The server need to modify the past.
       */
      if (message.data.stepId < this.state.stepId) {
        if (isAllowedAction(message.data.type, message.data.stepId)) {
          // We need to modify the past
          // Roll back the model to the input step id
          this.dispatch({
            type: "hydrate",
            payload: {
              snapshot: this.state.timeTravel.at(message.data.stepId),
              shouldRegisterStep: false
            }
          })
          let newSegment: Timeline<Intent>
          // Case 1: Client A has more latency but triggered the action before Client B
          if (message.data.timestamp < this.state.timeTravel.get(message.data.stepId).timestamp) {
            newSegment = this.state.timeTravel.modifyPast(message.data.stepId, (oldTimeline, newTimeline) => {
              // Insert the input action in the new timeline
              this.dispatch(input)
              
              // Then replay all the old timeline actions
              for (let i = message.data.stepId; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.dispatch(intent)
              }
            })
          }
          // Case 2: Client A triggered the action after Client B
          else {
            newSegment = this.state.timeTravel.modifyPast(message.data.stepId, (oldTimeline) => {
              // Cherry pick the old step
              this.state.timeTravel.push(oldTimeline[0])
              
              // Trigger the new intent
              this.dispatch(input);

              // Then replay all the old timeline actions
              for (let i = message.data.stepId + 2; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.dispatch(intent);
              }
            })
          }
          console.info("Server modified past", parse(stringify(newSegment)))
          // The server has now a new "present"
          // We need to replay the new timeline on the clients.
          nodes.forEach(({cb}, id) => {
            if (id !== "server") {
              const data = stringify({
                type: "rollback",
                data: {
                  to: message.data.stepId,
                  timeline: newSegment
                }
              } as ServerMessage)
              cb(new MessageEvent<string>("message", {
                data
              }))
            }
          })
        }    
      } 
      /**
       * The client is ahead by a step.
       * This intent will create a new step on the server.
       */
      else {
        // Trigger the client action
        this.dispatch(input)
        if (this.model.patch.length) {
          console.info(`New server step ${this.state.timeTravel.getCurrentStepId()}`);
          nodes.forEach(({cb}, id) => {   
            if (id !== "server") {
              if (id !== input.clientId) {
                cb(new MessageEvent<string>("message", {
                  data: stringify({
                    type: "intent",
                    data: input
                  })
                }))
              } else {
                cb(new MessageEvent<string>("message", {
                  data: stringify({
                    type: "patch",
                    data: {
                      stepId: this.state.stepId,
                      patch: this.state.patch
                    }
                  })
                }))
              }
            }
          })
        }
      }
    }
  }

  dispatch = async (intent: Intent) => {
    this.state.timeTravel.startStep(intent)
    this.model.present(actions[intent.type](intent.payload as any));
  };
}

export function createServer() {
  return new Server();
}
function isAllowedAction(type: Intent["type"], stepId: number) {
  return type === "addPlayer"
}