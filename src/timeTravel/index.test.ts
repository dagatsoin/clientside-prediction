import { createTimeTravel, getPatchTo } from '.';
import { Intent } from '../actions';
import { JSONOperation } from '../business/lib/types';
import { OpLog } from './types';

type Snapshot = {
  entities: string[]
}

const snapshot: Snapshot = {
  entities: []
}

const initialOplog: OpLog<Intent> = [{
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
  {snapshot, step: 0},
  [...initialOplog]
)

beforeEach(function() {
  timeTraveler.reset({step: 0, snapshot})
  timeTraveler.push(...initialOplog)
})

test("Clear the timeline and keep the first element", function() {
  timeTraveler.reset({step: 1, snapshot: { entities: ["Player0"] }})
  expect(timeTraveler.getCurrentStep()).toBe(1)
  expect(timeTraveler.getInitalSnapshot()).toEqual({ entities: ["Player0"] })
})

test("Return the current step number", function() {
  expect(timeTraveler.getCurrentStep()).toBe(1)
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
  expect(timeTraveler.at(2)).toEqual({entities: ["Player0"]})
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
  expect(timeTraveler.getCurrentStep()).toBe(2)
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
  expect(getPatchTo(timeTraveler.getBaseBranch(), 2)).toEqual([
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
  expect(timeTraveler.getCurrentStep()).toBe(2)
  expect(timeTraveler.getInitalSnapshot()).toEqual({
    entities: ["Player0"]
  })
})