import { reaction } from "mobx";
import { createModel } from "../business/model";
import {
  World,
  IModel,
  Patch,
  Proposal,
  SerializedWorld
} from "../business/types";
import { createStateComputation } from "../state";
import { IRepresentation } from "../state/types";
import { createTimeTravel } from "../timeTravel";
import { ITimeTravel } from "../timeTravel/types";

type Input = {
  clientId: string;
  clientStep: number;
  proposal: Proposal;
};

export interface IServer<T, S> {
  readonly step: Promise<number>;
  readonly data: Promise<T>;
  readonly patch: Promise<Patch>;
  readonly snapshot: Promise<S>;
  present: (proposal: Input) => Promise<void>;
}

function isOutDated(step: number) {
  return false;
}

class Server implements IServer<World, SerializedWorld> {
  constructor() {
    this.timeTravel = createTimeTravel([
      { snapshot: this.model.snapshot, step: this._step }
    ]);

    this._state = createStateComputation(this.model, 0);

    reaction(
      () => this.model.patch,
      (patch) => {
        if (patch.length) {
          this.timeTravel.push(this.model.patch);
          console.log(
            `New client step ${this.timeTravel.getCurrentStep()}`,
            JSON.stringify(this.timeTravel.at(this.timeTravel.getCurrentStep()))
          );
        }
      }
    );
  }

  get data(): Promise<World> {
    return new Promise((r) => r(this.model.data));
  }

  get patch(): Promise<Patch> {
    return new Promise((r) => r(this.model.patch.slice()));
  }

  get snapshot(): Promise<SerializedWorld> {
    return new Promise((r) => r(this.model.snapshot));
  }

  get step(): Promise<number> {
    return new Promise((r) => r(this._step));
  }

  private _state: IRepresentation;
  get state(): IRepresentation {
    return this._state;
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
  private model: IModel<World, SerializedWorld> = createModel("server");
  private _step = 0;
  private timeTravel: ITimeTravel<SerializedWorld>;
}

export function createServer() {
  return new Server();
}
