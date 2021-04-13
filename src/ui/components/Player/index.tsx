import { observer } from 'mobx-react-lite'
import  React from "react"
import { IPlayer } from '../../../state/types'
import "./style.less"


type Props = React.PropsWithChildren<{
  data: IPlayer
  gender: "male" | "female"
}>

export const Player = observer(function({children, gender, data}: Props): JSX.Element {
  return <div className={`player ${gender}`} style={{left: data.position.x*4, top: -data.position.y*4}}>{children}</div>
})