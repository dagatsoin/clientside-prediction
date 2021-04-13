import React from 'react';
import { Position } from '../../../business/types';
import "./style.less"

type Props = {
  position: Position
}

export function Dragon(props: Props) {
  return <div className="dragon" style={{top: `${props.position.y}px`, left: `${props.position.x}px`}}/>
}