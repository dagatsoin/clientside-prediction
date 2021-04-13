import React, { useContext, useState } from "react"
import { IPlayer } from '../../../state/types'
import { useKeyboard } from '../../business/useKeyboard'
import { CSSTransition } from "react-transition-group"
import "./style.less"
import { Direction } from './types'
import { CharacterControlerContext } from '../../containers/CharacterControler'

type Props = {
  player: IPlayer
  shortcut: string
  direction: Direction
}

export function HitScan({direction, shortcut, player}: Props) {
  console.log("render")
  const [shouldDisplay, setDisplay] = useState<boolean>(false)
  useKeyboard({
    [shortcut]: function() {
      setDisplay(true)
      setTimeout(()=>setDisplay(false), 400)
    } 
  })
  const { current } = useContext(CharacterControlerContext)
  
  return (
    <CSSTransition
      in={shouldDisplay}
      timeout={200}
      unmountOnExit
      classNames="hitScan"
    >
      <Ray player={player} direction={current.direction}/>
    </CSSTransition>
  )
}

function Ray({player, direction, className}: {className?: string, player: IPlayer, direction?: Direction}) {
  console.log(direction, player.position)
  switch(direction) {
    case "top":
      return (
        <div className="hitScan hitScan-top" style={{
          bottom: `calc(100vh + ${player.position.y*4}px)`,
          left: player.position.x*4+16
        }}/>
      )
    case "right":
      return (
        <div className="hitScan hitScan-right" style={{
          top: -player.position.y*4+16,
          left: `calc(${player.position.x*4}px + 32px)`,
        }}/>
      )
    case "bottom":
      return (
        <div className={`hitScan hitScan-bottom ${className}`} style={{
          top: `calc(${-player.position.y*4}px + 32px)`,
          left: `calc(${player.position.x*4}px + 16px)`,
        }}/>
      )
    case "left":
      return (
        <div className="hitScan hitScan-left" style={{
          top: -player.position.y*4+16,
          right: `calc(100vw - ${player.position.x*4}px)`,
        }}/>
      )
    default:
      return <></>
  }
}