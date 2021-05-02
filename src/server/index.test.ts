import { Step } from '../business/types'
import { createServer } from './Server'

describe("Assigning intent to step", function() {
  let server: ReturnType<typeof createServer>

  beforeEach(function() {
    server?.close()
    server = createServer()
  })

  test("Incoming messages are later.", function() {
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 7,
        clientId: "Player2",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player2"
        }
      }
    })} as any)
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 174,
        clientId: "Player1",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player1"
        }
      }
    })} as any)
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 436,
        clientId: "Player0",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player0"
        }
      }
    })} as any)
    const log = (server.state.timeTravel.slice(1) as Step<any>[]).map(({intent, timestamp})=>({intent: intent.type, timestamp, playerId: intent.payload.playerId}))
    expect(log).toEqual([
      { intent: 'addPlayer', timestamp: 7, playerId: 'Player2' },
      { intent: 'addPlayer', timestamp: 174, playerId: 'Player1' },
      { intent: 'addPlayer', timestamp: 436, playerId: 'Player0' },
    ])
  })
  test("Incoming messages are sooner.", function() {
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 500,
        clientId: "Player2",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player2"
        }
      }
    })} as any)
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 200,
        clientId: "Player1",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player1"
        }
      }
    })} as any)
    server.onMessage({data: JSON.stringify({
      type: "intent", 
      data: {
        timestamp: 100,
        clientId: "Player0",
        stepId: 0,
        type: "addPlayer",
        payload: {
          playerId: "Player0"
        }
      }
    })} as any)
    const log = (server.state.timeTravel.slice(1) as Step<any>[]).map(({intent, timestamp})=>({intent: intent.type, timestamp, playerId: intent.payload.playerId}))
    expect(log).toEqual([
      { intent: 'addPlayer', timestamp: 100, playerId: 'Player0' },
      { intent: 'addPlayer', timestamp: 200, playerId: 'Player1' },
      { intent: 'addPlayer', timestamp: 500, playerId: 'Player2' },
    ])
  })
})