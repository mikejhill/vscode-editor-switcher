import * as assert from "assert";

/**
 * Extension Module Tests
 * Tests main extension activation and deactivation
 */
suite("Extension Module", () => {
  test("should export activate function", () => {
    // Module-level validation
    assert.ok(typeof require("../extension").activate === "function");
  });

  test("should export deactivate function", () => {
    // Module-level validation
    assert.ok(typeof require("../extension").deactivate === "function");
  });
});
