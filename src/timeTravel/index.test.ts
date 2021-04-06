import { createTimeTravel } from '.';
import { JSONOperation } from '../business/lib/types';

type Snapshot = {
  entities: string[]
}

const timeTraveler = createTimeTravel<Snapshot>([{
  step:0,
  snapshot: {
    entities: []
  }
}, [
  {
    op: JSONOperation.add,
    path: "/entities/0",
    value: "Player0"
  }, {
    op: JSONOperation.add,
    path: "/entities/1",
    value: "Player1"
  }
]])

test.todo("Switch to another timeline branch")
test.todo("Create a branch from the given client step")
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
test.todo("Add a new step")
test.todo("Return the patch at the given timeline step")
test.todo("Clear the timeline and keep the first element")
test.todo("Rebase the root to the given step. All the previous step will be lost.")