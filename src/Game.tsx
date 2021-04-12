import { observer } from 'mobx-react-lite';
import * as React from "react";
import { IClient } from "./client/types";
import { Level } from './components/Level';
import { Player } from './components/Player';
import { CharacterControler } from './containers/CharacterControler';

export const Game = observer(function({ state, dispatch }: IClient) {
  
  return (
    <Level>
      {state.players.map(player => player.id === state.playerId
        ? (
          <CharacterControler id={state.playerId} dispatch={dispatch}>
            <Player key={player.id} data={player}/>
          </CharacterControler>
        ) : (
          <CharacterControler id={player.id} dispatch={dispatch} arrow>
            <Player key={player.id} data={player}/>
          </CharacterControler>
        )
      )}
    </Level>
  )
})
