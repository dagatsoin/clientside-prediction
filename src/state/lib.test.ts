import { getEntityIdFromCommandPath } from "./lib"

test("getEntityIdFromCommandPath", function() {
    expect(getEntityIdFromCommandPath("/entities/0/foo/bar")).toBe("0")
})