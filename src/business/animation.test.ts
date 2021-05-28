import { getAnimationProgress } from "./animation"
import { Animation } from "./types"

describe("Animation", function () {
    test("getAnimationProgresss", function() {
    const animation: Animation = {
      id: 0,
      bezier: [0.0, 0.0, 1.0, 1.0],
      startedAt: 0,
      delta: 10,
      duration: 100
    }
    expect(getAnimationProgress(0, animation, 50)).toEqual({
      current: 5,
      delta: 5,
      percent: 50
    })
  })
})