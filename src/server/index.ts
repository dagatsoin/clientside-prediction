import { actions, Intent } from '../actions';
import { parse, stringify } from '../business/lib/JSON';
import { createModel } from "../business/model";
import {
  World,
  IModel,
  Proposal,
  SerializedWorld
} from "../business/types";
import { createSocket, ISocket, nodes } from '../mockedSocket';
import { createServerRepresentation } from "../state/server";
import { IServerRepresentation } from "../state/types";
import { ClientMessage, ServerMessage } from '../type';

type Input = {
  clientId: string;
  clientStep: number;
  proposal: Proposal;
};

export interface IServer<T> {
  state: IServerRepresentation
  present: (proposal: Proposal) => Promise<void>;
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
      // The incoming intent is for a previous step
      if (message.data.stepId < this.state.stepId) {
        if (isAllowedAction(message.data.type, message.data.stepId)) {
          // We need to modify the past
          // by creating a new timeline, forked from the input step id.
          const oldTimelineAge = this.state.timeTravel.getCurrentStepId()
          const newTimeline = this.state.timeTravel.modifyPast(message.data.stepId, (oldTimeline) => {
            // Roll back the model to the input step id
            this.present(
              actions.hydrate({snapshot: this.state.timeTravel.at(message.data.stepId)}),
              false
            )
            
            // Case 1: new intent was triggered before the old one.
            if (message.data.timestamp < this.state.timeTravel.get(message.data.stepId).timestamp) {
              // Insert the input action in the new timeline
              this.present(actions[input.type](input.payload as any));
              
              // Then replay all the old timeline actions
              for (let i = message.data.stepId + 1; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.present(actions[intent.type](intent.payload as any));
              }
            } 
            // Case 2: the old intent was triggered before the new instance.
            else {
              // Cherry pick the old step
              this.state.timeTravel.push(oldTimeline[0])
              
              // Trigger the new intent
              this.present(actions[input.type](input.payload as any));

              // Then replay all the old timeline actions
              for (let i = message.data.stepId + 2; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.present(actions[intent.type](intent.payload as any));
              }
            }
          })
          console.info("Server modified past", parse(stringify(oldTimelineAge)), parse(stringify(newTimeline)))
          // The server has now a new "present"
          // We need to replay the new timeline on the clients.
          nodes.forEach(({cb, latence}, id) => {
            if (id !== "server") {
              if (id !== input.clientId) {
                const data = stringify({
                  type: "sync",
                  data: {
                    stepId: this.state.timeTravel.getCurrentStepId(),
                    snapshot: this.state.timeTravel.at(this.state.timeTravel.getCurrentStepId())
                  }
                } as ServerMessage)
                cb(new MessageEvent<string>("message", {
                  data
                }))
              }
            }
          })
        }    
      } 
      // The client is in sync
      else {
        // Trigger the client action
        this.present(actions[input.type](input.payload as any));
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

  present = async (proposal: Proposal, shouldRegisterStep: boolean = true) => {
    this.model.present(proposal, shouldRegisterStep);
  };
}

export function createServer() {
  return new Server();
}
function isAllowedAction(type: Intent["type"], stepId: number) {
  return type === "addPlayer"
}