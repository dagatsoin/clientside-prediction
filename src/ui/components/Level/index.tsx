import React from "react"
import './style'

export function Level(props: React.PropsWithChildren<{}>) {
  return <div className="level">
    <div className="water" style={{top: "0px", left: "200px"}}></div>
    <div className="water" style={{top: "0px", left: "248px"}}></div>
    <div className="water" style={{top: "0px", left: "296px"}}></div>
    <div className="water" style={{top: "0px", left: "344px"}}></div>
    <div className="water" style={{top: "48px", left: "200px"}}></div>
    <div className="water" style={{top: "48px", left: "248px"}}></div>
    <div className="water" style={{top: "48px", left: "296px"}}></div>
    {props.children}
    <div className="forest" style={{top: "64px", left: "232px"}}></div>
    <div className="forest" style={{top: "86px", left: "200px"}}></div>
    <div className="forest" style={{top: "100px", left: "128px"}}></div>
    <div className="forest" style={{top: "128px"}}></div>
  </div>
}