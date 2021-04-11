import { stringify } from './business/lib/JSON';
import { init } from "./client";
import { IClient } from "./client/types";
import { disconnectAll, getLatenceOf, nodes } from './mockedSocket';
import { createServer, IServer } from './server';


async function startInfra(clientNb: number) {
  const players: IClient[] = [];

  // Create server
  const server = createServer()
  
  // Create players
  for (let i = 0; i < clientNb; i++) {
    players.push((await init(`Player${i}`)));
  }

  // Connect clients
  players.forEach(player => {
    player.dispatch({type: "addPlayer", payload: { playerId: player.state.playerId }})
  })

  return { server, players };
}

function getPing(players: IClient[]) {
  return Math.max(
    ...players.map(({state: {playerId}}) => getLatenceOf(playerId)!)
    )// Max players latence
    * 2 // Back and forth
    + 50 // arbitrary server computation time
}

describe("Server sends a sync command", function() {
  let players: IClient[] = [];

  beforeAll(async (done) => {
    players = (await startInfra(1)).players;
    done();
  });

  afterAll(function() {
    disconnectAll()
  })

  test("Player is hydrated after connexion", function(done) {
    setTimeout(function(){
      expect(players[0].state.players.length).toBe(1)
      expect(players[0].state.stepId).toBe(1)
      done()
    }, getLatenceOf(players[0].state.playerId))
  })
})

/* describe("Basic cases", function() {
  test.todo("Server confirms client step")
  test.todo("Server fixes client step")
  test.todo("Server modifies past")
  test.todo("Server send new step")
}) */
 
describe("Create a room", function() {
  let players: IClient[] = [];
  let server: IServer<any>
  let ping: number = 0

  beforeAll(async (done) => {
    const infra = (await startInfra(3));
    server = infra.server
    players = infra.players
    done();
    ping = getPing(players)
  });

  afterAll(function() {
    disconnectAll()
  })

  test("All players know each others", function(done) {
    setTimeout(function(){
      expect(players[0].state.players.length).toBe(3)
      expect(players[1].state.players.length).toBe(3)
      expect(players[2].state.players.length).toBe(3)
      done()
    }, ping)
  })

  test("Players are sync with the server", function() {
    setTimeout(function(){
      expect(players[0].state.stepId).toBe(3)
      expect(players[1].state.stepId).toBe(3)
      expect(players[2].state.stepId).toBe(3)
      expect(server.state.stepId).toBe(3)
    }, ping)
  })
})

describe("Move animation without interruption", function () {
  let players: IClient[] = [];
  let server: IServer<any>
  let ping: number = 0

  beforeAll(async () => {
    const infra = (await startInfra(3));
    server = infra.server
    players = infra.players
    ping = getPing(players)
  });

  afterAll(function() {
    disconnectAll()
  })
  
  test("P0 - Step 3: Player0 should be at 0", function () {
    expect(players[0].state.player.position.x).toBe(0)
  });
  test("P0 - Step 4: should start translating to left", function (done) {
    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10
      }
    });
    // Local player should start animation
    expect(
      players[0].state.timeTravel.at(4).entities.value[0][1].transform
        .position.animation.x
    ).toBeDefined();
    
    // Server received the start animation intent
    setTimeout(function () {
      expect(
        server.state.timeTravel.at(4).entities.value[0][1].transform
          .position.animation.x
      ).toBeDefined();
    }, ping/2)
    // Local player has finished animation
    setTimeout(function () {
      try {
        expect(players[0].state.stepId).toBe(5);
        expect(
          players[0].state.timeTravel.at(5).entities.value[0][1].transform
            .position.animation.x
        ).toBeUndefined();
      } catch (e) {
        done(e);
      }
    }, 100); // May break, this is hardcoded animation timing
    // Server has finished animation
    setTimeout(function () {
      expect(
        server.state.timeTravel.at(5).entities.value[0][1].transform
          .position.animation.x
      ).toBeUndefined();
    }, ping/2 + 100)
    // Client and server are in sync
    setTimeout(function () {
      expect(players[0].state.stepId).toBe(5)
      expect(
        players[0].state.timeTravel.at(5).entities.value[0][1].transform
          .position.animation.x
      ).toBeUndefined();
      done()
    }, ping + 100)
  });
});
/* 
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
}); */