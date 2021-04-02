import { createModel } from "../business/model";
import { createDispatcher } from "./dispatcher";
import { createClientRepresentation } from "../state/client";
import { Dispatcher, IClient } from "./types";
import { IRepresentation } from "../state/types";
import { createSocket, ISocket } from '../mockedSocket';

class Client implements IClient {
  get state(): IRepresentation {
    return this._state;
  }
  get dispatch(): Dispatcher {
    return this._dispatch;
  }

  async connect() {
    this._dispatch({
      type: "addPlayer",
      payload: { playerId: this.playerId }
    })
  }
  private _state: IRepresentation;
  private _dispatch: Dispatcher;
  private socket: ISocket

  constructor(
    private readonly playerId: string,
    
  ) {
    const model = createModel(playerId);
    this._state = createClientRepresentation(model);
    this.socket = createSocket(this.playerId)

    const { dispatch, onMessage } = createDispatcher(
      playerId,
      model,
      this.state,
      this.socket.send
    );
    this.socket.onmessage = onMessage
    this._dispatch = dispatch;
  }
}

export async function init(
  playerID: string
): Promise<IClient> {
  return new Client(playerID)
}
