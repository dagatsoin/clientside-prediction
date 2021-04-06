import { createModel } from "../business/model";
import { createDispatcher } from "./dispatcher";
import { createClientRepresentation } from "../state/client";
import { Dispatcher, IClient } from "./types";
import { IRepresentation } from "../state/types";
import { createSocket, ISocket } from '../mockedSocket';
import { stringify } from '../business/lib/JSON';

class Client implements IClient {
  get state(): IRepresentation {
    return this._state;
  }
  get dispatch(): Dispatcher {
    return this._dispatch;
  }

  private getState = () => this._state
  private _state: IRepresentation;
  private _dispatch: Dispatcher;
  private socket: ISocket

  constructor(
    private readonly playerId: string,
  ) {
    const model = createModel(playerId);
    this.socket = createSocket(this.playerId)
    
    
    const { dispatch, onMessage } = createDispatcher(
      playerId,
      model,
      this.getState,
      this.socket.send
      );
      
    this._state = createClientRepresentation(model, dispatch, this.socket);

    this.socket.onopen= () => this.socket.send(stringify({type: "sync", data: { clientId: this.playerId }}))
    this.socket.onmessage = onMessage
    // Sync to the server state
    this._dispatch = dispatch;
  }
}

export async function init(
  playerID: string
): Promise<IClient> {
  return new Client(playerID)
}
