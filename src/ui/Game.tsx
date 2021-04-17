import { observer } from 'mobx-react-lite';
import * as React from "react";
import { IClient } from "../client/types";
import { Dragon } from './components/Dragon';
import { HitScan } from './components/Hitscan';
import { Level } from './components/Level';
import { Player } from './components/Player';
import { Skeleton } from './components/Skeleton';
import { CharacterControler } from './containers/CharacterControler';

export const Game = observer(function({ state, dispatch }: IClient) {
  
  return (
    <Level>
      <Skeleton position={{x: 114, y:143}} />
      <Dragon position={{x: 64, y:223}} />
      {state.players.map(player => player.id === state.playerId
        ? <CharacterControler key={player.id} player={player} dispatch={dispatch}>
            <HitScan player={player} shortcut=" " direction="bottom"/>
            <Player gender="male" data={player}/>
          </CharacterControler>
        : <CharacterControler key={player.id} player={player} dispatch={dispatch} arrow>
            <Player gender="female" data={player}/>
            <HitScan player={player} shortcut="Shift" direction="right"/>
          </CharacterControler>
      )}
    </Level>
  )
})
