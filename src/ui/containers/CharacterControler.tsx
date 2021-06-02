import React, { useEffect, useRef, useState } from "react"
import { Position } from '../../business/types'
import { Dispatch } from '../../client/types'
import { IPlayer } from '../../state/types'
import { useKeyboard } from '../business/useKeyboard'

type Props = React.PropsWithChildren<{
  player: IPlayer
  arrow?: boolean
  dispatch: Dispatch
}>

type Direction = "top" | "right" | "bottom" | "left";

export const CharacterControlerContext = React.createContext<React.MutableRefObject<State>>({} as any)

function getDirection(prevPos: Position, pos: Position): undefined | Direction {
  const angle = Math.atan2((pos.y - prevPos.y), (pos.x - prevPos.x)) * 180 / Math.PI
  return angle > -45 && angle <= 45
    ? "right"
    : angle > 45 && angle <= 135
    ? "top"
    : angle > 135 && angle <= 270
    ? "left"
    : "bottom"
}


type State = {
  direction?: Direction,
  setValue: (direction?: Direction ) => void
}



export function CharacterControler({arrow, children, dispatch, player}: Props) {
  const valueRef: React.MutableRefObject<State> = useRef<State>({
    setValue(direction) {
      this.direction = direction
    }
  })

  const prevPos = useRef<Position>();

  useKeyboard(arrow
    ? {
      ArrowUp: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveUp",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      ArrowRight: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveRight",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      ArrowDown: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveDown",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      ArrowLeft: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveLeft",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      }
    }
  : {
      z: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveUp",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      d: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveRight",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      s: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveDown",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      q: function() {
        prevPos.current = {...player.position}
        dispatch({
          type: "moveLeft",
          payload: { playerId: player.id }
        })
        valueRef.current.setValue(getDirection(prevPos.current ?? player.position, player.position))
      },
      " ": function() {
        dispatch({
          type: "shot",
          payload: { direction: [1, 0], from: player.position, shoter: player.id }
        })
      }
    }
  )

  return <CharacterControlerContext.Provider value={valueRef}>{children}</CharacterControlerContext.Provider>
}