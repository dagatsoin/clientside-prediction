import { createModel } from "../business/model";
import { createDispatcher } from "./dispatcher";
import { createStateComputation } from "../state";
import { createServer, Mode } from "../server";
import { Dispatcher, IClient } from "./types";
import { IRepresentation } from "../state/types";
import { IServerAPI } from "../server/IServerAPI";
import { SerializedWorld, World } from "../business/types";

class Client implements IClient {
  get state(): IRepresentation {
    return this._state;
  }
  get dispatch(): Dispatcher {
    return this._dispatch;
  }

  private _state: IRepresentation;
  private _dispatch: Dispatcher;

  constructor(
    snapshot: SerializedWorld,
    playerId: string,
    initialStep: number,
    serverSlot: IServerAPI<World, SerializedWorld>
  ) {
    const model = createModel(playerId, snapshot);
    this._state = createStateComputation(model, initialStep);

    const { dispatch, onMessage } = createDispatcher(
      playerId,
      model,
      this.state,
      serverSlot.send
    );
    this._dispatch = dispatch;
    serverSlot.addListener(onMessage);
  }
}

export async function init(
  playerID: string,
  serverSlot?: IServerAPI<World, SerializedWorld>,
  mode: Mode = "offline"
): Promise<{
  client: IClient;
  serverSlot: IServerAPI<World, SerializedWorld>;
}> {
  const _serverSlot = serverSlot || createServer(mode);
  const { snapshot, step } = await _serverSlot.connect(playerID);

  return {
    client: new Client(snapshot, playerID, step, _serverSlot),
    serverSlot: _serverSlot
  }
}
