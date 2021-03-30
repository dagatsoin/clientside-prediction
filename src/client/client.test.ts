import { BasicMutationType, JSONOperation } from "../business/lib/types";
import { createModel } from "../business/model";
import { SerializedWorld } from "../business/types";
import { createStateComputation } from "../state";
import { actions } from "../actions";

const playerId = "fraktar";
const snapshot: SerializedWorld = {
  entities: {
    dataType: "Map",
    value: [[
      "fraktar",
      {
        name: "Fraktar",
        id: "fraktar",
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
const state = createStateComputation(model, 0);
const { player } = state;
it("should instantaly move to left", function () {
  model.present([
    {
      type: BasicMutationType.jsonCommand,
      payload: {
        op: JSONOperation.replace,
        path: "entities/fraktar/transform/position/initial/x",
        value: 10
      }
    }
  ]);
  expect(player.position.x).toBe(10);
  expect(state.step).toBe(1);
});
it("should translate on left in 100ms", function (done) {
  model.present(actions.translateRight({ playerId, delta: 10 }));
  setTimeout(function () {
    try {
      expect(state.step).toBe(3);
      expect(player.position.x).toBe(20);

      done();
    } catch (e) {
      done(e);
    }
  }, 100);
});

