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
import { ClientMessage, ServerMessage } from '../type';

type Input = {
  clientId: string;
  clientStep: number;
  proposal: Proposal;
};

export interface IServer<T> {
  state: IServerRepresentation
  present: (proposal: Input) => Promise<void>;
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
      if (message.data.step < this.state.step) {
        if (isAllowedAction(message.data.type)) {
          if (isComposableAction(message.data.type)) {
            // Fork the timeline at this point
            this.state.timeTravel.createBranch(message.data.clientId, message.data.step)
            // Checkout the new branch
            this.state.timeTravel.checkoutBranch(message.data.clientId)
            // Rollback to this branch root
            this.present({
              clientId: message.data.clientId,
              clientStep: message.data.step,
              proposal: actions.hydrate({snapshot: this.state.timeTravel.at(message.data.step)})
            }, false)
            // Trigger the client action
            this.present({
              clientId: input.clientId,
              clientStep: input.step,
              proposal: actions[input.type](input.payload as any)
            });

            if (this.model.patch.length) {
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
            // Rebase the servers state on the new fork
            //this.state.timeTravel.rebaseRoot()
            // Send timeline patch 
          }
        }
      } 
      // The client is in sync
      else {
        // Trigger the client action
        this.present({
          clientId: input.clientId,
          clientStep: input.step,
          proposal: actions[input.type](input.payload as any)
        });
        if (this.model.patch.length) {
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

  present = async (input: Input, shouldRegisterStep: boolean = true) => {
    // If the step is too old (older than the higest client lag, or higher than 200ms)
   // if (isOutDated(input.clientStep)) return;
    // If the step is in the past, hydrate the model to the wanted step
    /* if (this._step > input.clientStep) {
      const oldState = this.timeTravel.at(input.clientStep);
      this.model.present(
        [
          {
            type: BasicMutationType.jsonCommand,
            payload: {
              op: JSONOperation.replace,
              path: "/",
              value: oldState.snapshot
            }
          }
        ],
        false // Don't keep history of the rollback
      );
      // Copy a branch from this old step
      const newBranch = this.timeTravel.copyBranchFrom(input.clientStep);
      this.timeTravel.checkoutBranch(newBranch);
    } */
    this.model.present(input.proposal, shouldRegisterStep);
  };
}

export function createServer() {
  return new Server();
}
function isAllowedAction(type: Intent["type"]) {
  return type === "addPlayer"
}

function isComposableAction(type: Intent["type"]) {
  return type === "addPlayer"
}


