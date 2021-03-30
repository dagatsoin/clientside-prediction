import { cubicBezier } from "popmotion";
import { Mutation } from "../business/acceptors";
import {
  ApplyCommand,
  BasicMutationType,
  JSONCommand,
  JSONOperation,
  Replace
} from "../business/lib/types";
import { Animation, Position } from "../business/types";

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

export function isJSONCommand(mutation: Mutation): mutation is ApplyCommand {
  return mutation.type === BasicMutationType.jsonCommand;
}

export function didStartAnimation(
  command: JSONCommand
): command is Replace<Animation> {
  return (
    command.op === JSONOperation.replace &&
    /\/transform\/(position|rotation|scale)\/animation\/(x|y|z)$/.test(
      command.path
    )
  );
}
