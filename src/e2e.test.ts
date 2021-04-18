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
          player.state.removeStepListener(listener)
          r(undefined)
        }
      }
      player.state.addStepListener(listener)
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

function getPing(players: IClient[]) {
  return Math.max(
    ...players.map(({state: {playerId}}) => getLatenceOf(playerId)!)
    )// Max players latence
    * 2 // Back and forth
    + 200 // arbitrary server computation time
}

/* describe("API", function() {
  let players: IClient[] = [];
  let server: IServer<any>
  
  beforeAll(async () => {
    const nbPlayers = 3
    const infra = (await startInfra(nbPlayers));
    players = infra.players
    server = infra.server
    return isGameReady(players, nbPlayers)
  });

  afterAll(function() {
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
  test.todo("rollback")
}) */
/*
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
  })

  test("Players are sync with the server", function() {
    expect(players[0].state.stepId).toBe(3)
    expect(players[1].state.stepId).toBe(3)
    expect(players[2].state.stepId).toBe(3)
    expect(server.state.stepId).toBe(3)
  })
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
          players[0].state.removeStepListener(clientStartedAnimationListener)
        } catch(e) {
          done(e)
        }
      }
    }
    players[0].state.addStepListener(clientStartedAnimationListener)
    
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
          players[0].state.removeStepListener(clientFinishedAnimationListener)
        } catch(e) {
          done(e)
        }
      }
    }
    players[0].state.addStepListener(clientFinishedAnimationListener)

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
        delta: 10
      }
    });
  })
}); */

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

describe("Han moved first", function () {
  let players: IClient[] = [];
  let server: IServer<any>
  let ping: number = 0
  
  beforeAll(async () => {
    const nbPlayers = 2
    const infra = (await startInfra(nbPlayers));
    setLatence("Player0", 300)
    setLatence("Player1", 30)
    server = infra.server
    players = infra.players
    ping = getPing(players)
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

  test("Check process", function(done) {
    const listener = function(stepId: number) {
      console.log(stepId)
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
          players[0].state.removeStepListener(listener)
        }
      }
    }
    players[0].state.addStepListener(listener)

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
  let ping: number = 0

  beforeAll(async () => {
    const infra = (await startInfra(2));
    setLatence("Player0", 300)
    setLatence("Player1", 30)
    server = infra.server
    players = infra.players
    ping = getPing(players)
  });

  afterAll(function() {
    server.close()
  })
  test("Initial state", function() {
    expect(players[0].state.player.position.x).toBe(0)
    expect(players[1].state.player.position.x).toBe(0)
  })
  test("Check process", function(done) {
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
      
    setTimeout(function() {
      expect(players[0].state.stepId).toBe(6)
      expect(players[1].state.stepId).toBe(6)
      expect(players[0].state.player.isAlive).toBeFalsy()
      expect(players[1].state.player.ammo).toBe(0)
      done()
    }, ping + 140)
  })
}); */