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
        },
        ArrowRight: function() {
          dispatch({
            type: "moveRight",
            payload: { playerId: id }
          })
        },
        ArrowDown: function() {
          dispatch({
            type: "moveDown",
            payload: { playerId: id }
          })
        },
        ArrowLeft: function() {
          dispatch({
            type: "moveLeft",
            payload: { playerId: id }
          })
        }
      }
    : {
        z: function() {
          dispatch({
            type: "moveUp",
            payload: { playerId: id }
          })
        },
        d: function() {
          dispatch({
            type: "moveRight",
            payload: { playerId: id }
          })
        },
        s: function() {
          dispatch({
            type: "moveDown",
            payload: { playerId: id }
          })
        },
        q: function() {
          dispatch({
            type: "moveLeft",
            payload: { playerId: id }
          })
        }
      }
  )
  return <>{children}</>
}