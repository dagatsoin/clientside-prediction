import { init } from "./client";
import { IClient } from "./client/types";

let client0!: IClient;
let client1!: IClient;

async function startInfra(clientNb: number) {
  const players: IClient[] = [];
  const { serverSlot, client } = await init("Player0", undefined, "offline");
  client0 = client;
  players.push(client0);

  // Create other players
  for (let i = 0; i < clientNb; i++) {
    const player = (await init(`Player${i}`, serverSlot)).client;
    if (i === 1) {
      client1 = player;
    }
    players.push(player);
  }
}

beforeAll(async (done) => {
  await startInfra(0);
  done();
});

describe("Move animation without interruption", function () {
  test("P0 - Step 0: Player0 should be at 0", function () {
    expect(client0.state.player.position.x).toBe(0)
  });
  test("P0 - Step 1: should start translating to left", function (done) {
    client0.dispatch({
      type: "translateRight",
      payload: {
        playerId: client0.state.playerId,
        delta: 10
      }
    });
    setTimeout(function () {
      try {
        expect(client0.state.step).toBe(2);
        expect(
          client0.state.timeTravel.at(2).snapshot.entities.value[0][1].transform
            .position.animation.x
        ).toBeUndefined();
        done();
      } catch (e) {
        done(e);
      }
    }, 300);
  });
  test.todo("Server - Step 1: should start translating P0 to left");
  test.todo("P0 - Step 1: should receive same result for Step 1 state");
  test.todo("P1 - Step 1: should start translating P0 to left");
  test.todo("P0 - Step 2: should end translating to left");
  test.todo("P1 - Step 1: should start translating P0 to left");
  test.todo("P0 - Step 1: timeline root should be now set at Step 1");
  test.todo("Server - Step 2: should end translating to left");
  test.todo("P0 - Step 2: timeline root should be now set at Step 2");
  test.todo("P1 - Step 1: timeline root should be now set at Step 1");
  test.todo("P1 - Step 2: should end translating P0 to left");
  test.todo("P1 - Step 1: timeline root should be now set at Step 2");
});

describe("Move animation with interruption from another player", function () {
  test.todo("P1 - Step 1: hit P0");
  test.todo("P0 - Step 1: should start to translate to left");
  test.todo("Server - Step 1: should start to translate P0 to left");
  test.todo("Server - should receive HIT P0 action from P1 at Step 1");
  test.todo("Server - actions for Step1 has been reordered (HIT comes first)");
  test.todo("Server - P1 should stop translating P0");
  test.todo("Server - P1 left pos should be at 0");
  test.todo("P0 - Step 1: should receive same result for Step 1 state");
  test.todo("P0 - Step 2: should cancel translate animation");
  test.todo("P0 - Step 2: should be dead");
  test.todo("P0 - Step 2: timeline root should be now set at Step 2");
  test.todo("P1 - Step 2: P0 should start translate");
  test.todo("P1 - Step 2: P0 should stop translate");
  test.todo("P1 - Step 2: P0 should be dead");
  test.todo("P1 - Step 2: timeline root should be now set at Step 2");
});
