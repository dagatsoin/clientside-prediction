import { JSONOperation } from "../business/lib/types";
import { createModel } from "../business/model";
import { SerializedWorld } from "../business/types";
import { createClientRepresentation } from "../state/client";
import { createDispatcher } from './dispatcher';

const playerId = "fraktar";
const snapshot: SerializedWorld = {
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
            initial: { x: 0, y: 0 },
            animation: {}
          }
        }
      }
    ]]
  }
};
const model = createModel(playerId, snapshot);
const state = createClientRepresentation(model, () => {});
const {dispatch} = createDispatcher("fraktar", model, () => state, {send: ()=>{}} as any)
const { player } = state;
it("should instantaly move to left", function () {
  dispatch({
    type: "applyPatch",
    payload: {
      commands: [{
        op: JSONOperation.replace,
        path: "entities/fraktar/transform/position/initial/x",
        value: 10
      }]
    }
  })
  expect(player.position.x).toBe(10);
  expect(state.stepId).toBe(1);
});
it("should translate on left in 100ms", function (done) {
  dispatch({
    type: "translateRight",
    payload: { playerId, delta: 10 }
  })
  setTimeout(function () {
    try {
      expect(state.stepId).toBe(3);
      expect(player.position.x).toBe(20);

      done();
    } catch (e) {
      done(e);
    }
  }, 100);
});

