import { observer } from "mobx-react-lite";
import * as React from "react";
import { render } from "react-dom";
import { init } from "./client";
import { IClient } from "./client/types";
import { Game } from "./Game";
import { createServerConnector, Mode } from "./server";

async function deployAndRun(names: string[], mode: Mode): Promise<IClient[]> {
  if (!names.length) return [];
  // Create server
  const serverSlot = createServerConnector()

  // Create players
  const players: IClient[] = [];
  for (const name of names) {
    players.push((await init(name, serverSlot)).client);
  }
  
  // Connect clients
  players.forEach(player => player.dispatch({type: "addPlayer", payload: { playerId: player.state.playerId }}))

  return players;
}

const App = observer(function () {
  const [serverMode, setServerMode] = React.useState<Mode>("offline");
  const [clients, setClients] = React.useState<IClient[]>([]);
  const [names, setName] = React.useState<[string, string]>([
    "Player1",
    "Player2"
  ]);

  // TODO make possible to create game with one player then
  // that the other players joins the game
  return clients.length ? (
    <Game {...clients[0]} />
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
      <div>
        <label htmlFor="serverMode">Play online</label>
        <input
          id="serverMode"
          type="checkbox"
          onChange={function (event) {
            setServerMode(event.target.checked ? "online" : "offline");
          }}
        />
        {serverMode === "online" && (
          <p>
            The server is hosted on codesandbox and may hybernate. If nothing
            happens, go to <a href="https://unydm.sse.codesandbox.io/">here</a>{" "}
            to wake it up, wait 30s, and retry.
          </p>
        )}
      </div>

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
          deployAndRun(names, serverMode).then(setClients);
        }}
      >
        Create game
      </button>
    </div>
  );
});

render(<App />, document.getElementById("app"));
