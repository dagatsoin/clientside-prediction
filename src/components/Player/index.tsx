import { observer } from 'mobx-react-lite'
import  React from "react"
import { IPlayer } from '../../state/types'
import "./style"


type Props = {
  data: IPlayer
}

export const Player = observer(function({data}: Props) {

  return (
    <div className="player" style={{left: data.position.x*2, bottom: data.position.y*2}} />
  )
})