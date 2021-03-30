import { createModel } from "./model";

const model = createModel("server", {
  entities: {
    dataType: "Map",
    value: [[
      "fraktar",
      {
        name: "Fraktar",
        id: "fraktar",
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

describe("World", function () {
  it("should be hydrated", function () {
    expect(model.data.entities.size).toBe(1);
  });
});

describe("Entity", function () {
  const Fraktar = model.data.entities.get("fraktar");
  it("should be at position 0", function () {
    expect(Fraktar?.transform.position.initial.x).toBe(0);
  });
});
