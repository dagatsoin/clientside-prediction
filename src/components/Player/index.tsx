import { observer } from 'mobx-react-lite'
import  React from "react"
import { Dispatcher } from '../../client/types'
import { IPlayer } from '../../state/types'
import "./style"

function useKeyboard(handlers: {[key: string]: () => void}) {
  const handler: (e: KeyboardEvent) => void = function(e) {
    handlers[e.key]?.()
  }
  React.useEffect(function(){
    document.addEventListener("keydown", handler)
    return function() {
      document.removeEventListener("keydown", handler)
    }
  },[])
}

type Props = {
  data: IPlayer
  dispatch: Dispatcher
}

export const Player = observer(function({data, dispatch}: Props) {
  useKeyboard({
    ArrowUp: function() {
      dispatch({
        type: "moveUp",
        payload: { playerId: data.id }
      })
    }
  })
  return (
    <div className="player" style={{left: data.position.x, bottom: data.position.y}} />
  )
})