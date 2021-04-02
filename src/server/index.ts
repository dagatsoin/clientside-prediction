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

type Input = {
  clientId: string;
  clientStep: number;
  proposal: Proposal;
};

export interface IServer<T> {
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
  
  private state: IServerRepresentation;

  onMessage = (ev: MessageEvent<any>) => {
    const input = parse<{clientId: string, step: number } & Intent>(ev.data)

    this.present({
      clientId: input.clientId,
      clientStep: input.step,
      proposal: actions[input.type](input.payload as any)
    });
    if (this.model.patch.length) {
      console.log(
        `New client step ${this.state.timeTravel.getCurrentStep()}`,
        JSON.stringify(this.state.timeTravel.at(this.state.timeTravel.getCurrentStep()))
      );
      nodes.forEach(({cb}, id) => {
        if (id !== "server") {
          if (id !== input.clientId) {
            cb(new MessageEvent<string>("message", {data: stringify(input)}))
          } else {
            cb(new MessageEvent<string>("message", {data: stringify({
              step: this.state.step,
              patch: this.state.patch
            } as StepPatch)}))
          }
        }
      })
    }
  }

  present = async (input: Input) => {
    // If the step is too old (older than the higest client lag, or higher than 200ms)
    if (isOutDated(input.clientStep)) return;
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
    this.model.present(input.proposal);
  };
}

export function createServer() {
  return new Server();
}
