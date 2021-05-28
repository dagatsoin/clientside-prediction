import { cubicBezier } from 'popmotion';
import { Animation, Position } from './types';

export function getBezier(animation?: Animation) {
  if (animation) {
    return cubicBezier(...animation.bezier);
  }
}

export function getAnimationProgress(
  initial: number,
  animation: Animation,
  now: number
): {
  current: number
  delta: number,
  percent: number,
} {
  const timePercent = 100 * Math.min(
    Math.max(now - animation.startedAt, 0),
    animation.duration
  ) / (animation.duration)

  const delta = cubicBezier(...animation.bezier)(timePercent/100) // Get the progression on the bezier curve
     * (animation.to !== undefined  // Two cases : 
      ? animation.to - initial      // - eitheir animation is set with a target value
      : animation.delta!)           // - or a delta value

  return {
    current: initial + delta,
    percent: timePercent,
    delta
  }
}

function getPositionAnimationProgress(
  positionAnimation: Partial<{ x: Animation; y: Animation }>,
  now: number,
) {
  return {
    x:
      Math.min(
        Math.max(now - (positionAnimation?.x?.startedAt ?? 0), 0),
        positionAnimation?.x?.duration ?? 0
      ) / (positionAnimation?.x?.duration ?? 0),
    y:
      Math.min(
        Math.max(now - (positionAnimation?.y?.startedAt ?? 0), 0),
        positionAnimation?.y?.duration ?? 0
      ) / (positionAnimation?.y?.duration ?? 0)
  };
}
function getDeltaPosition(
  initial: Position,
  animation: Partial<{ x: Animation; y: Animation }>
) {
  return {
    x:
      animation?.x?.to !== undefined
        ? animation.x.to - initial.x
        : animation.x?.delta ?? 0,
    y:
      animation?.y?.to !== undefined
        ? animation.y.to - initial.y
        : animation.y?.delta ?? 0
  };
}

export function getCurrentPosition(initial: Position, animation: Partial<{ x: Animation; y: Animation; }>, now: number) {
  const progress = getPositionAnimationProgress(animation, now);
  const transforms = {
    posX: getBezier(animation?.x),
    posY: getBezier(animation?.y)
  }
  return {
    x: initial.x +
      (transforms.posX?.(progress.x) ?? 0) *
      getDeltaPosition(initial, animation).x,
    y: initial.y +
      (transforms.posX?.(progress.y) ?? 0) *
      getDeltaPosition(initial, animation).y
  };
}