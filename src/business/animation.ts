import { cubicBezier } from 'popmotion';
import { Animation, Position } from './types';

export function getBezier(animation?: Animation) {
  if (animation) {
    return cubicBezier(...animation.bezier);
  }
}
export function getAnimationProgress(
  now: number,
  animation: Partial<{ x: Animation; y: Animation }>
) {
  return {
    x:
      Math.min(
        Math.max(now - (animation?.x?.startedAt ?? 0), 0),
        animation?.x?.duration ?? 0
      ) / (animation?.x?.duration ?? 0),
    y:
      Math.min(
        Math.max(now - (animation?.y?.startedAt ?? 0), 0),
        animation?.y?.duration ?? 0
      ) / (animation?.y?.duration ?? 0)
  };
}
export function getDeltaPosition(
  animation: Partial<{ x: Animation; y: Animation }>,
  initial: Position
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

export function getCurrentPosition(now: number, initial: Position, animation: Partial<{ x: Animation; y: Animation; }>) {
  const progress = getAnimationProgress(now, animation);
  const transforms = {
    posX: getBezier(animation?.x),
    posY: getBezier(animation?.y)
  }
  return {
    x: initial.x +
      (transforms.posX?.(progress.x) ?? 0) *
      getDeltaPosition(animation, initial).x,
    y: initial.y +
      (transforms.posX?.(progress.y) ?? 0) *
      getDeltaPosition(animation, initial).y
  };
}