import { createTimeTravel } from '.';
import { Intent } from '../actions';
import { JSONOperation } from '../business/lib/types';
import { Timeline } from './types';

type Snapshot = {
  entities: string[]
}

const snapshot: Snapshot = {
  entities: []
}

const initialOplog: Timeline<Intent> = [{
  timestamp: 0,
  intent: {
    type: "addPlayer",
    payload: {playerId: "Player0"}
  },
  patch: [{
    op: JSONOperation.add,
    path: "/entities/0",
    value: "Player0"
  }],
}]

const timeTraveler = createTimeTravel<Intent, Snapshot>(
  {snapshot, stepId: 0},
  [...initialOplog]
)

beforeEach(function() {
  timeTraveler.reset({stepId: 0, snapshot})
  timeTraveler.push(...initialOplog)
})

test("Clear the timeline and keep the first element", function() {
  timeTraveler.reset({stepId: 1, snapshot: { entities: ["Player0"] }})
  expect(timeTraveler.getCurrentStepId()).toBe(1)
  expect(timeTraveler.getInitalSnapshot()).toEqual({ entities: ["Player0"] })
})

describe("Time between step", function() {
  test.todo("There is 100ms between initial snapshot and first step")
  test.todo("There is 100ms between step 1 and pushed step")
  test.todo("Reseting timeline reset the timer")
  test.todo("Modify the past reset the timer")
})

test("Return the current step number", function() {
  expect(timeTraveler.getCurrentStepId()).toBe(1)
})
test("Return the step number of the initial snapshot", function() {
  expect(timeTraveler.getInitialStep()).toBe(0)
})
test("Return the initial snapshot", function() {
  expect(timeTraveler.getInitalSnapshot()).toEqual({
    entities: []
  })
})
test("Return the snapshot at the given step", function() {
  expect(timeTraveler.at(1)).toEqual({entities: ["Player0"]})
})
test("Add a new step", function() {
  timeTraveler.push({
    timestamp: 0,
    intent: {
      type: "addPlayer",
      payload: {playerId: "Player1"}
    },
    patch: [{
      op: JSONOperation.add,
      path: "/entities/1",
      value: "Player1"
    }],
  })
  expect(timeTraveler.getCurrentStepId()).toBe(2)
})
test("Return the patch at the given timeline step", function() {
  timeTraveler.push({
    timestamp: 0,
    intent: {
      type: "addPlayer",
      payload: {playerId: "Player1"}
    },
    patch: [{
      op: JSONOperation.add,
      path: "/entities/1",
      value: "Player1"
    }],
  })
  expect(timeTraveler.getPatchFromTo(timeTraveler.getInitialStep(), 2)).toEqual([
    {
      op: JSONOperation.add,
      path: "/entities/0",
      value: "Player0"
    },
    {
      op: JSONOperation.add,
      path: "/entities/1",
      value: "Player1"
    }
  ])
})

test("Rebase the root to the given step. All the previous step will be lost.", function() {
  timeTraveler.push({
    timestamp: 0,
    intent: {
      type: "addPlayer",
      payload: {playerId: "Player1"}
    },
    patch: [{
      op: JSONOperation.add,
      path: "/entities/1",
      value: "Player1"
    }],
  })
  timeTraveler.rebaseRoot(1)
  expect(timeTraveler.getInitialStep()).toBe(1)
  expect(timeTraveler.getCurrentStepId()).toBe(2)
  expect(timeTraveler.getInitalSnapshot()).toEqual({
    entities: ["Player0"]
  })
})

/**
 * Test the main purpose of the time travel, modify the past steps by inserting a new step
 */
test("Modify the past", function() {
  // Add some steps
  timeTraveler.push({
    timestamp: 0,
    intent: {
      type: "addPlayer",
      payload: {playerId: "Player1"}
    },
    patch: [{
      op: JSONOperation.add,
      path: "/entities/1",
      value: "Player1"
    }],
  },
  {
    timestamp: 0,
    intent: {
      type: "addPlayer",
      payload: {playerId: "Player2"}
    },
    patch: [{
      op: JSONOperation.add,
      path: "/entities/2",
      value: "Player2"
    }],
  })
  timeTraveler.modifyPast(2, function(oldBranch, newTimeline) {
    expect(oldBranch.length).toBe(1)
    expect(newTimeline.length).toBe(2)

    newTimeline.push({
      timestamp: 0,
      intent: {
        type: "addPlayer",
        payload: {playerId: "HPBPlayer"}
      },
      patch: [{
        op: JSONOperation.add,
        path: "/entities/2",
        value: "HPBPlayer"
      }],
    }, {
      timestamp: 0,
      intent: {
        type: "addPlayer",
        payload: {playerId: "Player2"}
      },
      patch: [{
        op: JSONOperation.add,
        path: "/entities/3",
        value: "Player2"
      }]
    })
  })
  
  expect(timeTraveler.getCurrentStepId()).toBe(4)
  expect(timeTraveler.at(4)).toEqual({
    entities: ["Player0", "Player1", "HPBPlayer", "Player2"]
  })
})