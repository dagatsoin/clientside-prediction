import React from "react"
import './style'

export function Level(props: React.PropsWithChildren<{}>) {
  return <div className="level">
    {props.children}
  </div>
}