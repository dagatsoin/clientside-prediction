import { Intent } from './actions';
import { JSONCommand, JSONOperation } from './business/lib/types';
import { init } from "./client";
import { IClient } from "./client/types";
import { getLatenceOf, setLatence } from './server/clientList';
import { createServer, IServer } from './server/Server';

function isGameReady(players: IClient[], nbPlayers: number) {
  return Promise.all(players.map(function(player) {
    return new Promise(function(r) {
      const listener = () => {
        const isReady = player.state.players.length === nbPlayers 
        if (isReady) {
          player.removeServerCallback(listener)
          r(undefined)
        }
      }
      player.addServerCallback(listener)
    })
  }))
}

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
/*
describe("API", function() {
  let players: IClient[] = [];
  let server: IServer<any>
  
  beforeEach(async () => {
    const nbPlayers = 3
    const infra = (await startInfra(nbPlayers));
    players = infra.players
    server = infra.server
    return isGameReady(players, nbPlayers)
  });

  afterEach(function() {
    server.close()
  })

  test("sync", function() {
    // The sync command is sent at player creation.
    // It contains all the server timeline
    expect(players[0].state.players.length).toBe(3)
    expect(server.state.timeTravel.getTimeline()).toEqual(players[0].state.timeTravel.getTimeline())
  }, 1000000)

  test.todo("intent")
  test.todo("reduce")
  test.todo("splice")
}) 

describe("Create a room", function() {
  let players: IClient[] = [];
  let server: IServer<any>

  beforeAll(async () => {
    const nbPlayers = 3
    const infra = (await startInfra(nbPlayers));
    server = infra.server
    players = infra.players
    return isGameReady(players, nbPlayers)
  });

  afterAll(function() {
    server.close()
  })

  test("All players know each others", function() {
    expect(players[0].state.players.length).toBe(3)
    expect(players[1].state.players.length).toBe(3)
    expect(players[2].state.players.length).toBe(3)
  }, 1000000)

  test("Players are sync with the server", function() {
    expect(players[0].state.stepId).toBe(3)
    expect(players[1].state.stepId).toBe(3)
    expect(players[2].state.stepId).toBe(3)
    expect(server.state.stepId).toBe(3)
  }, 1000000)
})

describe("Move animation", function () {
  let players: IClient[] = [];
  let server: IServer<any>

  beforeAll(async () => {
    const nbPlayers = 1
    const infra = (await startInfra(nbPlayers));
    server = infra.server
    players = infra.players
    return isGameReady(players, nbPlayers)
  });

  afterAll(function() {
    server.close()
  })
  
  test("Initial state", function () {
    expect(players[0].state.player.position.x).toBe(0)
  });
  test("Check process", function (done) {
    
    // Local player should start animation
    const clientStartedAnimationListener = function(stepId: number){
      if (stepId === 2) {
        try {
          expect(        
            players[0]
              .state
              .timeTravel.at(2)
              .entities.value[0][1]
              .transform
              .position
              .animation.x
          ).toBeDefined();
          players[0].state.removeClientStepListener(clientStartedAnimationListener)
        } catch(e) {
          done(e)
        }
      }
    }
    players[0].state.addClientStepListener(clientStartedAnimationListener)
    
     // Server received the start animation intent
    const serverStartedAnimationListener = function(stepId: number){
        if (stepId === 2) {
          try {
            expect(
              server
              .state
              .timeTravel.at(2)
              .entities.value[0][1]
              .transform
              .position
              .animation.x
            ).toBeDefined();
            server.state.removeStepListener(serverStartedAnimationListener)
          } catch(e) {
            done(e)
          }
      }
    }
    server.state.addStepListener(serverStartedAnimationListener)

    // Local player has finished animation
    const clientFinishedAnimationListener = function(stepId: number) {
      if (stepId === 3) {
        try {
          expect(
            players[0]
              .state
              .timeTravel.at(3)
              .entities.value[0][1]
              .transform
              .position
              .animation.x
          ).toBeUndefined();
          expect(
            players[0]
              .state
              .timeTravel.at(3)
              .entities.value[0][1]
              .transform
              .position
              .initial.x
          ).toBe(10)
          players[0].state.removeClientStepListener(clientFinishedAnimationListener)
        } catch(e) {
          done(e)
        }
      }
    }
    players[0].state.addClientStepListener(clientFinishedAnimationListener)

    // Server has finished animation
    const serverFinishedAnimationListener = function(stepId: number) {
      if (stepId === 3) {
        try {
          expect(
            server
              .state
              .timeTravel.at(3)
              .entities.value[0][1]
              .transform
              .position
              .animation.x
          ).toBeUndefined();
          expect(
            server
              .state
              .timeTravel.at(3)
              .entities.value[0][1]
              .transform
              .position
              .initial.x
          ).toBe(10)
          server.state.removeStepListener(serverFinishedAnimationListener)
          done()
        } catch (e) {
          done(e)
        }
      }
    }
    server.state.addStepListener(serverFinishedAnimationListener)
 
    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10,
      }
    });
  })
});

describe("Imperatively stop a move animation", function () {
  let players: IClient[] = [];
  let server: IServer<any>

  beforeAll(async () => {
    const nbPlayers = 1
    const infra = (await startInfra(nbPlayers));
    server = infra.server
    players = infra.players
    return isGameReady(players, nbPlayers)
  });

  afterAll(function() {
    server.close()
  })
  
  test("Initial state", function () {
    expect(players[0].state.player.position.x).toBe(0)
  });
  test("Check process", function (done) {
    
     // Server received the start animation intent
     const serverCanceledAnimationListener = function(stepId: number){
      if (stepId === 3) {
        try {
          expect(
            server
            .state
            .timeTravel.at(3)
            .entities.value[0][1]
            .transform
            .position
            .animation.x
          ).toBeUndefined();
          server.state.removeStepListener(serverCanceledAnimationListener)
          done()
        } catch(e) {
          done(e)
        }
      }
    }
    server.state.addStepListener(serverCanceledAnimationListener)

    const animationStep = players[0].state.stepId + 1

    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10,
        duration: 5000
      }
    });
    setTimeout(function() {
      players[0].dispatch({
        type: "cancelAnimations",
        payload: { paths: players[0].state.getStartedAnimationPathAtStep(animationStep) }
      })
      setTimeout(function() {
        expect(players[0].state.player.position.x).toBe(0) 
      })
    }, 20);
  }, 100000)
});

describe("Automatically stop a move animation for a dead player", function () {
  let players: IClient[] = [];
  let server: IServer<any>

  beforeAll(async () => {
    const nbPlayers = 1
    const infra = (await startInfra(nbPlayers));
    server = infra.server
    players = infra.players
    return isGameReady(players, nbPlayers)
  });

  afterAll(function() {
    server.close()
  })
  
  test("Initial state", function () {
    expect(players[0].state.player.position.x).toBe(0)
  });
  test("Check process", function (done) {
    
     // Server received the start animation intent
     const serverCanceledAnimationListener = function(stepId: number){
      if (stepId === 4) {
        try {
          expect(
            server
            .state
            .timeTravel.at(4)
            .entities.value[0][1]
            .transform
            .position
            .animation.x
          ).toBeUndefined();
          server.state.removeStepListener(serverCanceledAnimationListener)
          // Test a range as we depend on timeout
          expect(players[0].state.player.position.x).toBeGreaterThanOrEqual(0)
          expect(players[0].state.player.position.x).toBeLessThanOrEqual(5)
          done()
        } catch(e) {
          done(e)
        }
      }
    }
    server.state.addStepListener(serverCanceledAnimationListener)

    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10
      }
    });
    // Kill the player
    setTimeout(function() {
      players[0].dispatch({
        type: "applyPatch",
        payload: {
          commands: [{
            path: `/entities/${players[0].state.playerId}/isAlive`,
            op: JSONOperation.replace,
            value: false
          }]
        }
      })
    }, 20);
  }, 100000)
});
*/

describe("lifecycle", function() {
  let players: IClient[] = [];
  let server: IServer<any>
  
  beforeAll(async () => {
    const nbPlayers = 2
    const infra = (await startInfra(nbPlayers));
    setLatence("Player0", 300)
    setLatence("Player1", 30)
    server = infra.server
    players = infra.players
    // Wait for the game to be populated
    return isGameReady(players, nbPlayers)
  }, 1000000);

  afterAll(function() {
    server.close()
  })
  test("", function(done) {
    const r: any[] = []
    const listener = function(stepId: number) {
      r.push((players[0] as any)
        ._state
        .timeTravel
        .timeline
        .map(({intent}: any)=> intent.type))
        console.log(stepId, r)
      if (stepId === 5) {
        try {
          expect(r).toEqual([
            [ 'addPlayer', 'addPlayer', 'moveUp' ],
            [ 'addPlayer', 'addPlayer', 'moveUp', 'translateRight' ],
            [ 'addPlayer', 'addPlayer', 'moveUp', 'translateRight', "endAnimations" ]
          ])
          done()
        } catch (e) {
          done(e)
        }
      }
    }
    players[0].state.timeTravel.addStepListener(listener)

    // Setup the scene, place players 
    players[0].dispatch({
      type: "moveUp",
      payload: {
        playerId: players[0].state.playerId,
      }
    });
    // Player 0 moves first
    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10
      }
    });
  })
})

/**
 * This test a basic problem of lag compensation when mixing
 * players with hight ping difference.
 * Player 0 has a higher ping than Player 1
 * At a global time reference, Player 0 moves and Player 1 shot Player 0 a few
 * ms later. Player 1 misses Player 0.
 * The puropose of our algorithm is to reach this result by composing with
 * the players latence.
 * Our rule to reach a concensus is called "Han shot first". Its main principle is to declare
 * winner the one who was the fastest to respond to the new step.
 * The system measure the time between a new step and the moment when the player performs
 * an action. As such, we handle relative time, not absolute time.
 * Example: Han and Greedo has a different ping. They received a new step (where they need
 * to shot each other). Han reveived the step 500ms after Greedo. 
 * Han shot Greedo 30ms after receiving the step.
 * Greedo shot Han 100ms after receiving the step.
 * The server will simply compare who was the fatest to respond to the new step.
 */

 /*
describe("Han moved first", function () {
  test.todo("FIX ME. When debuging and pausing before the translateright action, the shot action is enserted at step 2 then replaced by a third addPlayer.")
  let players: IClient[] = [];
  let server: IServer<any>
  
  beforeAll(async () => {
    const nbPlayers = 2
    const infra = (await startInfra(nbPlayers));
    setLatence("Player0", 300)
    setLatence("Player1", 30)
    server = infra.server
    players = infra.players
    // Wait for the game to be populated
    return isGameReady(players, nbPlayers)
  }, 1000000);

  afterAll(function() {
    server.close()
  })
  test("Initial state", function(done) {
    expect(players[0].state.player.position.x).toBe(0)
    expect(players[1].state.player.position.x).toBe(0)
    done()
  })

  test("Check timeline", function(done) {
    const P0Timeline: Array<Array<Intent["type"]>> = [
      ["addPlayer"], 
      ["addPlayer", "addPlayer"],
      ["addPlayer", "addPlayer", "moveUp"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight", "endAnimations"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight", "shot", "endAnimations"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight", "shot", "endAnimations"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight", "shot", "endAnimations"],
      ["addPlayer", "addPlayer", "moveUp", "translateRight", "shot", "endAnimations"]
    ]
    const r: any[] = []
    const listener = function(stepId: number) {
      // timeline should be: add, add, moveup, translate, stoptranslate, shot
      //console.log("PLAYER0", stepId, (players[0] as any)._state.timeTravel.timeline.map(({intent, timestamp}: any)=>({intent: intent.type, timestamp, playerId: intent.payload?.playerId})))
      //console.log("PLAYER1", stepId, (players[0] as any)._state.timeTravel.timeline.map(({intent, timestamp}: any)=>({intent: intent.type, timestamp, playerId: intent.payload?.playerId})))
      r.push((players[0] as any)
        ._state
        .timeTravel
        .timeline
        .map(({intent}: any)=> intent.type))
      console.log(stepId,r)
      if (stepId === 6) {
        try {
          expect(players[0].state.stepId).toBe(6)
          expect(players[1].state.stepId).toBe(6)
          expect(players[0].state.player.isAlive).toBeTruthy()
          expect(players[1].state.player.ammo).toBe(0)
          done()
        } catch(e) {
          done(e)
        } finally {
          players[0].removeServerCallback(listener)
        }
      }
    }
    players[0].addServerCallback(listener)

    // Setup the scene, place players 
    players[0].dispatch({
      type: "moveUp",
      payload: {
        playerId: players[0].state.playerId,
      }
    });
    // Player 0 moves first
    players[0].dispatch({
      type: "translateRight",
      payload: {
        playerId: players[0].state.playerId,
        delta: 10
      }
    });
    // Player 1 shot a bit late
    setTimeout(function() {
      players[1].dispatch({
        type: "shot",
        payload: {
          shoter: players[1].state.playerId,
          from: players[1].state.players.find(({id})=> id === players[1].state.playerId)!.position,
          direction: [0, 1]
        }
      });
    }, 40)
  }, 1000000)
});
/*
describe("Han shot first", function () {
  let players: IClient[] = [];
  let server: IServer<any>

  beforeAll(async () => {
    const infra = (await startInfra(2));
    setLatence("Player0", 300)
    setLatence("Player1", 30)
    server = infra.server
    players = infra.players
  });

  afterAll(function() {
    server.close()
  })
  test("Initial state", function() {
    expect(players[0].state.player.position.x).toBe(0)
    expect(players[1].state.player.position.x).toBe(0)
  })
  test("Check process", function(done) {
    const listener = function(stepId: number) {
      if (stepId === 8) {
        try {
          expect(players[0].state.stepId).toBe(6)
          expect(players[1].state.stepId).toBe(6)
          expect(players[0].state.player.isAlive).toBeFalsy()
          expect(players[1].state.player.ammo).toBe(0)
          done()
        } catch(e) {
          done(e)
        }
      }
    }
    // Setup the scene, place players 
    players[0].dispatch({
      type: "moveUp",
      payload: {
        playerId: players[0].state.playerId,
      }
    });
    // Han shot first
    players[1].dispatch({
      type: "shot",
      payload: {
        shoter: players[1].state.playerId,
        from: players[1].state.players.find(({id})=> id === players[1].state.playerId)!.position,
        direction: [0, 1]
      }
    });
    
    // Too slow Greedo.
    setTimeout(function() {
      players[0].dispatch({
        type: "translateRight",
        payload: {
          playerId: players[0].state.playerId,
          delta: 10
        }
      });
    }, 40)
  })
}); */