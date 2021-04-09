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

/* 
describe("Server sends a patch", function() {
  
})
 

describe("Create a room", function() {
  let players: IClient[] = [];
  let server: IServer<any>
  let latence: number = 0

  beforeAll(async (done) => {
    const infra = (await startInfra(3));
    server = infra.server
    players = infra.players
    done();
    latence = Math.max(
      ...players.map(({state: {playerId}}) => getLatenceOf(playerId)!)
    )
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
    }, latence)
  })

  test("Players are sync with the server", function() {
    expect(server.state.step).toBe(3)
    expect(players[0].state.players.length).toBe(3)
    expect(players[1].state.players.length).toBe(3)
    expect(players[2].state.players.length).toBe(3)
  })
})

describe("Move animation without interruption", function () {
  let players: IClient[] = [];
  let server: IServer<any>
  let latence: number = 0

  beforeAll(async (done) => {
    const infra = (await startInfra(3));
    server = infra.server
    players = infra.players
    done();
    latence = Math.max(
      ...players.map(({state: {playerId}}) => getLatenceOf(playerId)!)
    )
  });

  afterAll(function() {
    disconnectAll()
  })
  
  test("P0 - Step 0: Player0 should be at 0", function () {
    expect(players[0].state.player.position.x).toBe(0)
  });
  test("P0 - Step 1: should start translating to left", function (done) {
    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10
      }
    });
    setTimeout(function () {
      try {
        expect(players[0].state.step).toBe(2);
        expect(
          players[0].state.timeTravel.at(2).snapshot.entities.value[0][1].transform
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
}); */