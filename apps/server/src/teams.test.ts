import { test } from "node:test";
import assert from "node:assert/strict";

import { hunterCountFor } from "./teams.ts";

test("random teams keep roughly one hunter per three runners", () => {
  const cases: Array<[number, number]> = [
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 2],
    [8, 2],
    [9, 3],
    [12, 3],
    [13, 4],
    [16, 4],
    [17, 5],
    [20, 5],
    [50, 13],
  ];

  for (const [total, hunters] of cases) {
    assert.equal(hunterCountFor(total), hunters, `${total} players`);
  }
});

test("random teams always leave at least one runner", () => {
  for (let total = 2; total <= 50; total += 1) {
    const hunters = hunterCountFor(total);
    assert.ok(hunters >= 1, `${total} players needs a hunter`);
    assert.ok(hunters <= total - 1, `${total} players needs a runner`);
    if (total >= 3) assert.ok(hunters >= 2, `${total} players needs two hunters`);
  }
});
