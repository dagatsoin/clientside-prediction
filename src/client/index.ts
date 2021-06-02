import { createModel } from "../business/model";
import { createDispatcher } from "./dispatcher";
import { createClientRepresentation } from "../state/client";
import { Dispatch, IClient } from "./types";
import { IRepresentation } from "../state/types";
import { stringify } from '../business/lib/JSON';
import { getLatenceOf } from '../server/clientList';
import { actions, Intent } from "../actions";

class Client implements IClient {
  get state(): IRepresentation {
    return this._state;
  }
  get dispatch(): Dispatch {
    return this._dispatch;
  }

  private getState = () => this._state
  private _state: IRepresentation;
  private _dispatch: Dispatch;
  private socket: WebSocket
  
  public addServerCallback: (listener: (stepId: number) => void) => void
  public removeServerCallback: (listener: (stepId: number) => void) => void

  constructor(
    private readonly playerId: string,
    private onConnected = (instance: Client) => {}
  ) {
    const model = createModel(playerId);
    
    this.socket = new WebSocket(`ws://0.0.0.0:3000/?clientId=${playerId}`)
        
    const { dispatch, onMessage, addServerCallback, removeServerCallback } = createDispatcher(
      playerId,
      model,
      this.getState,
      this.socket
    );

    /**
     * We also need a function to start a step only on the client.
     * For example, when triggering a NAP
     */
    const startStep = (intent: Intent) => {
      const { timeTravel } = this.getState()
      timeTravel.startStep(intent)
      model.present(actions[intent.type](intent.payload as any));
    }

    this.addServerCallback = addServerCallback
    this.removeServerCallback = removeServerCallback
    this._state = createClientRepresentation(model, startStep, () => this.onConnected(this));

    this.socket.onopen = () => {
      const socket = this.socket
      const send = socket.send;
      this.socket.send = function(...args: any[]) {
        setTimeout(
          () => send.apply(socket, args as any),
          getLatenceOf(playerId)
        )
      }
      this.socket.send(stringify({type: "sync", data: { clientId: this.playerId }}))
    }
    this.socket.onerror = console.error
    this.socket.onmessage = onMessage
    // Sync to the server state
    this._dispatch = dispatch;
  }
}

export async function init(
  playerID: string
): Promise<IClient> {
  return new Promise(function(r) {
    const client = new Client(playerID, function(instance) {
      r(instance)
    })
  })
}
