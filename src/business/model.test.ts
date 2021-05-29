import { cancelAnimations, endAnimations, moveUp, translateRight } from "../actions";
import { MutationType } from "./acceptors";
import { createModel } from "./model";
import { IModel, SerializedWorld, World } from "./types";
import { configure } from "mobx"

configure({
    useProxies: "never"
})
let model!: IModel<World, SerializedWorld>

beforeEach(function() {  
  model = createModel("server", {
    entities: {
      dataType: "Map",
      value: [[
        "fraktar",
        {
          name: "Fraktar",
          id: "fraktar",
          isAlive: true,
          ammo: 1,
          transform: {
            position: {
              animation: {},
              initial: {
                x: 0,
                y: 0
              }
            }
          }
        }
      ]]
    }
  });
})

describe("World", function () {
  it("should be hydrated", function () {
    expect(model.data.entities.size).toBe(1);
  });
});

describe("Entity", function () {
  it("should be at position 0", function () {
    const Fraktar = model.data.entities.get("fraktar");
    expect(Fraktar?.transform.position.initial.x).toBe(0);
  });
});

describe("Mutations", function() {
  test("stopAnimation", function(done) {
    // Start an animation
    model.present(translateRight({
      playerId: "fraktar",
      delta: 10,
      duration: 100,
    }))
    // Stop it at 50%
    setTimeout(function() {
      model.present({
        mutations: [{
          type: MutationType.stopAnimation,
          payload: {
            isFinished: false,
            path: `/entities/fraktar/transform/position/animation/x`
          }
        }]
      })
      expect(model.data.entities.get("fraktar")?.transform.position.animation.x).toBeUndefined()
      expect(model.data.entities.get("fraktar")?.transform.position.initial.x).toBeGreaterThanOrEqual(5)
      expect(model.data.entities.get("fraktar")?.transform.position.initial.x).toBeLessThanOrEqual(9)
      done()
    }, 50)
  })

  test("endAnimation", function() {
    // Start an animation
    model.present(translateRight({
      playerId: "fraktar",
      delta: 10,
      duration: 100,
    }))
    // Stop it at 50%
    model.present(endAnimations({
      paths: [`/entities/fraktar/transform/position/animation/x`]
    }))

    expect(model.data.entities.get("fraktar")?.transform.position.animation.x).toBeUndefined()
    expect(model.data.entities.get("fraktar")?.transform.position.initial.x).toBe(10)
  })

  test("cancelAnimation", function() {
    // Start an animation
    model.present(translateRight({
      playerId: "fraktar",
      delta: 10,
      duration: 100,
    }))
    // Stop it at 50%
    model.present(cancelAnimations({
      paths: [`/entities/fraktar/transform/position/animation/x`]
    }))

    expect(model.data.entities.get("fraktar")?.transform.position.animation.x).toBeUndefined()
    expect(model.data.entities.get("fraktar")?.transform.position.initial.x).toBe(0)
  })
})

test("snapshot computation", function() {
  model.present(moveUp({playerId: "fraktar"}))
  expect(model.snapshot.entities.value[0][1].transform.position.initial.y).toBe(1)
})