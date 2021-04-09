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
import { IServerRepresentation, StepPatch } from "../state/types";
import { Branch } from '../timeTravel/types';
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
      setTimeout(() => node.cb(new MessageEvent(stringify({snapshot: this.model.snapshot, step: this.state.step}))), node.latence)
    }
  }

  onMessage = (ev: MessageEvent<string>) => {
    // Use native parser to keep the serialized map
    const message: ClientMessage = JSON.parse(ev.data)
    if (message.type === "sync") {
      const node = nodes.get(message.data.clientId)
      if (node) {
        setTimeout(() => {
          node.cb(new MessageEvent<string>("message", {
            data: stringify({
              type: "sync",
              data: {
                step: this.state.step,
                snapshot: this.model.snapshot
              }
            })
          }))
        }, node.latence)
      }
    }
    else if (message.type === "intent") {
      const input = message.data
      // the incoming intent is for a previous step
      if (message.data.step < this.state.step) {
        if (isAllowedAction(message.data.type, message.data.step)) {
          // Fork the timeline at this point
          this.state.timeTravel.fork(message.data.step)
          // Rollback to this branch root
          this.present(
            actions.hydrate({snapshot: this.state.timeTravel.at(message.data.step)}),
            false
          )
          // New intent was triggered before the actual 
          const baseBranch = this.state.timeTravel.getBaseBranch()

          if (message.data.timestamp < this.state.timeTravel.get(message.data.step).timestamp) {
            this.present(actions[input.type](input.payload as any));
            for (let i = message.data.step + 1; i < baseBranch.length; i++) {
              const { intent } = baseBranch[i]
              this.present(actions[intent.type](intent.payload as any));
            }
          } 
          // The current intent was triggered before the new instance
          else {
            // Cherry pick the corresponding step from the main branch
            this.state.timeTravel.push(this.state.timeTravel.getBaseBranchStep(message.data.step))
            // Trigger the new intent
            this.present(actions[input.type](input.payload as any));
            for (let i = message.data.step + 2; i < baseBranch.length; i++) {
              const { intent } = baseBranch[i]
              this.present(actions[intent.type](intent.payload as any));
            }
          }

          // Rebase the servers state on the new fork
          this.state.timeTravel.swap()

          if (this.model.commands.length) {
            console.info(`Server step ${message.data.step} was updated, apply delta`);
            nodes.forEach(({cb, latence}, id) => {
              if (id !== "server") {
                if (id !== input.clientId) {
                  const data = stringify({
                    type: "intent",
                    data: input
                  })
                  setTimeout(() => {
                    cb(new MessageEvent<string>("message", {
                      data
                    }))
                  }, latence)
                } else {
                  setTimeout(() => {
                    const data = stringify({
                      type: "patch",
                      data: {
                        step: this.state.step,
                        patch: this.state.patch
                      }
                    })
                    cb(new MessageEvent<string>("message", {
                      data
                    }))
                  }, latence)
                }
              }
            })
          }        
        }
      } 
      // The client is in sync
      else {
        // Trigger the client action
        this.present(actions[input.type](input.payload as any));
        if (this.model.commands.length) {
          console.info(`New server step ${this.state.timeTravel.getCurrentStep()}`);
          nodes.forEach(({cb, latence}, id) => {
            setTimeout(() => {
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
                        step: this.state.step,
                        patch: this.state.patch
                      }
                    })
                  }))
                }
              }
            }, latence)
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
function isAllowedAction(type: Intent["type"], step: number) {
  return type === "addPlayer"
}