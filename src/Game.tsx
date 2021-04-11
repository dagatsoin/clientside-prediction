import { observer } from 'mobx-react-lite';
import * as React from "react";
import { IClient } from "./client/types";
import { Level } from './components/Level';
import { Player } from './components/Player';

export const Game = observer(function({ state, dispatch }: IClient) {
  
  return (
    <Level>
      {state.players.map(function (data) {
        return <Player key={data.id} data={data} dispatch={dispatch}/>;
      })}
    </Level>
  );
})
