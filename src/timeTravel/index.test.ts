import { createTimeTravel } from '.';
import { JSONOperation } from '../business/lib/types';
import { Patch } from '../business/types';

type Snapshot = {
  entities: string[]
}

const snapshot: Snapshot = {
  entities: []
}

const initialStep: Patch = [
  {
    op: JSONOperation.add,
    path: "/entities/0",
    value: "Player0"
  }, {
    op: JSONOperation.add,
    path: "/entities/1",
    value: "Player1"
  }
]

const timeTraveler = createTimeTravel<Snapshot>(
  snapshot,
  {
    base: 0,
    opLog: [initialStep]
  }
)

beforeEach(function() {
  timeTraveler.reset({step: 0, snapshot})
  timeTraveler.push(initialStep)
})

test("Clear the timeline and keep the first element", function() {
  timeTraveler.reset({step: 1, snapshot: { entities: ["Player0"] }})
  expect(timeTraveler.getCurrentStep()).toBe(1)
  expect(timeTraveler.getInitalSnapshot()).toEqual({ entities: ["Player0"] })
})

test.todo("Switch to another timeline branch")
/* test.todo("Create a branch from the given client step", function() {
  // Add some steps on the main branch
  timeTraveler.push([{
    op: JSONOperation.add,
    value: "Player3",
    path:"/entities/3"
  }])
  timeTraveler.push([{
    op: JSONOperation.add,
    value: "Player4",
    path:"/entities/4"
  }])

  timeTraveler.createBranch("new", 2)
  expect(timeTraveler.getBranchsFrom(2)).toEqual(["new", "master"])
}) */
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
  expect(timeTraveler.at(2)).toEqual({entities: ["Player0", "Player1"]})
})
test("Add a new step", function() {
  timeTraveler.push([{
    op: JSONOperation.add,
    path: "/entities/2",
    value: "Player2"
  }])
  expect(timeTraveler.getCurrentStep()).toBe(2)
})
test.todo("Return the patch at the given timeline step")

test.todo("Rebase the root to the given step. All the previous step will be lost.")