import { createModel } from "../business/model";
import { createDispatcher } from "./dispatcher";
import { createClientRepresentation } from "../state/client";
import { Dispatcher, IClient } from "./types";
import { IRepresentation } from "../state/types";
import { stringify } from '../business/lib/JSON';
import { getLatenceOf } from '../server/clientList';

class Client implements IClient {
  get state(): IRepresentation {
    return this._state;
  }
  get dispatch(): Dispatcher {
    return this._dispatch;
  }

  public onConnected = () => {}

  private getState = () => this._state
  private _state: IRepresentation;
  private _dispatch: Dispatcher;
  private socket: WebSocket

  constructor(
    private readonly playerId: string,
  ) {
    const model = createModel(playerId);
    
    this.socket = new WebSocket(`ws://0.0.0.0:3000/?clientId=${playerId}`)
        
    const { dispatch, onMessage } = createDispatcher(
      playerId,
      model,
      this.getState,
      this.socket
    );
      
    this._state = createClientRepresentation(model, dispatch);

    
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
      this.onConnected()
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
    const client = new Client(playerID)
    client.onConnected = function() {
      r(client)
    }
  })
}
