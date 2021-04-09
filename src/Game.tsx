import * as React from "react";
import { Dispatcher, IClient } from "./client/types";

export function doSomething(dispatch: Dispatcher) {
  /* client.actions.right();
client.actions.left();
client.actions.applyPatch([
  { op: JSONOperation.replace, path: "/x", value: 2 }
]);
client.actions.reset(1); */

  // Simulate some user inputs
  dispatch({
    type: "moveRight",
    payload: { playerId: "fraktar" }
  });
  dispatch({
    type: "moveLeft",
    payload: { playerId: "fraktar" }
  });
  dispatch({
    type: "moveLeft",
    payload: { playerId: "fraktar" }
  });
}

export function Game({ state, dispatch }: IClient) {
  return (
    <>
      {state.players.map(function (player) {
        return (
          <div key={player.id}>
            <button onClick={() => doSomething(dispatch)}>Play</button>
            <p>x{player.position.x}</p>
            <p>step{state.stepId}</p>
          </div>
        );
      })}
    </>
  );
}
