import { actions, Intent } from "../actions";
import { BasicMutationType, JSONOperation } from "../business/lib/types";
import { SerializedEntity, SerializedWorld, World } from "../business/types";
import { IServerAPI, StepPatch } from "./IServerAPI";
import { createServer, IServer } from "./server";

/**
 * Simulate an different response from the server
 * at step 2
 */
function mockResponse(step: number) {
  switch (step) {
    case 1:
      return [{ op: "replace", path: "/entities/0/x", value: 1 }];
    case 2:
      return [{ op: "replace", path: "/entities/0/x", value: 0 }];
    case 3:
      return [{ op: "replace", path: "/entities/0/x", value: -1 }];
  }
}

export class OfflineServerConnector
  implements IServerAPI<World, SerializedWorld, Intent> {
  private queue: Array<
    {
      clientId: string;
      clientStep: number;
    } & Intent
  > = [];
  private server: IServer<World, SerializedWorld>;
  private listeners: Array<(stepPatch: StepPatch) => void> = [];

  constructor() {
    this.server = createServer();
  }

  /**
   * This will add a new player to the model.
   * Return the initial snapshot which is the current state
   * of the server.
   */
  async connect(
    playerID: string
  ): Promise<{ step: number; snapshot: SerializedWorld }> {
    this.server.present({
      clientStep: 0,
      clientId: playerID,
      proposal: [
        {
          type: BasicMutationType.jsonCommand,
          payload: {
            op: JSONOperation.add,
            path: `/entities/${playerID}`,
            value: {
              id: playerID,
              name: playerID,
              transform: {
                position: { animation: {}, initial: { x: 0, y: 0 } }
              }
            } as SerializedEntity
          }
        }
      ]
    });
    console.info(`${playerID} is connected to mocked server.`);
    return {
      step: await this.server.step,
      snapshot: await this.server.snapshot
    };
  }

  /**
   * Send the intent to the server for server side
   * checking.
   */
  send = (
    input: {
      clientId: string;
      clientStep: number;
    } & Intent
  ) => {
    this.queue.push(input);
    return new Promise((r) => {
      const nextStep = this.queue.shift()!;
      for (const listener of this.listeners) {
        setTimeout(async () => {
          this.server.present({
            clientId: input.clientId,
            clientStep: input.clientStep,
            proposal: actions[nextStep.type](nextStep.payload as any)
          });
          listener({
            step: await this.server.step,
            patch: await this.server.patch
          });
        }, 100);
      }
    });
  };

  /**
   * Add the callback to handle server message.
   * Use for factory purpose only, if you want
   * to add a user, use IServerAPI.connect
   */
  public addListener(onMessage: (stepPatch: StepPatch) => void): void {
    this.listeners.push(onMessage);
  }
}
