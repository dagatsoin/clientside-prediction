import React from "react"
import { Dispatcher } from '../client/types'

type Props = React.PropsWithChildren<{
  id: string
  arrow?: boolean
  dispatch: Dispatcher
}>

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

export function CharacterControler({arrow, children, dispatch, id}: Props) {
  useKeyboard(arrow
    ? {
        ArrowUp: function() {
          dispatch({
            type: "moveUp",
            payload: { playerId: id }
          })
        }
      }
    : {
        a: function() {
          dispatch({
            type: "moveUp",
            payload: { playerId: id }
          })
        }
      }
  )
  return <>{children}</>
}