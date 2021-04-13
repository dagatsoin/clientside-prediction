import { observer } from "mobx-react-lite";
import * as React from "react";
import { render } from "react-dom";
import { JSONOperation } from './business/lib/types';
import { init } from "./client";
import { IClient } from "./client/types";
import { Game } from "./ui/Game";
import { nodes } from './mockedSocket';
import { createServer } from './server';

async function deployAndRun(names: string[]): Promise<IClient[]> {
  const players: IClient[] = [];
  
  // Create server
  createServer()
  
  // Create players
  for (let i = 0; i < names.length; i++) {
    players.push((await init(names[i])));
  }

  // Connect clients
  players.forEach((player, i) => {
    console.log(i)
    player.dispatch({type: "addPlayer", payload: { playerId: player.state.playerId }})
    player.dispatch({type: "applyPatch", payload: {
      commands: [{
        op: JSONOperation.replace,
        path: `/entities/${player.state.playerId}/transform/position/initial/x`,
        value: i * 8
      }]
    }})
  })

  nodes.get(names[0])!.latence = 300
  nodes.get(names[1])!.latence = 30

  return players;
}

const App = observer(function () {
  const [clients, setClients] = React.useState<IClient[]>([]);
  const [names, setName] = React.useState<string[]>([
    "Player1",
    "Player2"
  ]);

  // TODO make possible to create game with one player then
  // that the other players joins the game
  return clients.length ? (
    <Game state={clients[0].state} dispatch={clients[0].dispatch} />
  ) : (
    <div
      style={{
        margin: "0 auto",
        alignItems: "center",
        width: 280,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <input
          style={{ marginRight: "10px" }}
          onChange={(e) => setName([e.target.value, names[1]])}
          placeholder="Player 1"
        />
        <input
          onChange={(e) => setName([names[0], e.target.value])}
          placeholder="Player 2"
        />
      </div>
      <button
        onClick={function () {
          deployAndRun(names).then(setClients);
        }}
      >
        Create game
      </button>
    </div>
  );
});

render(<App />, document.getElementById("app"));