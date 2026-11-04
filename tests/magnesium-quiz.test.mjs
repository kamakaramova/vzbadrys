import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMagnesiumReasons,
  needsMagnesiumTieBreaker,
  resolveMagnesiumForm,
  scoreMagnesiumQuiz,
} from "../src/lib/magnesiumQuiz.ts";

test("recommends citrate when regularity is the clear priority", () => {
  const answers = {
    goal: "goal_constipation",
    stool: "stool_hard",
    frequency: "frequency_rare",
    laxative: "lax_helpful",
    sleep: "sleep_no",
  };

  assert.deepEqual(scoreMagnesiumQuiz(answers, false), { bisglycinate: 0, citrate: 9 });
  assert.equal(needsMagnesiumTieBreaker(answers), false);
  assert.equal(resolveMagnesiumForm(answers), "citrate");
});

test("recommends bisglycinate for relaxation with an unwanted laxative effect", () => {
  const answers = {
    goal: "goal_calm",
    stool: "stool_loose",
    frequency: "frequency_often",
    laxative: "lax_unwanted",
    sleep: "sleep_often",
  };

  assert.deepEqual(scoreMagnesiumQuiz(answers, false), { bisglycinate: 9, citrate: 0 });
  assert.equal(needsMagnesiumTieBreaker(answers), false);
  assert.equal(resolveMagnesiumForm(answers), "bisglycinate");
});

test("asks a tie-breaker only when the main scores are close", () => {
  const answers = {
    goal: "goal_muscles",
    stool: "stool_normal",
    frequency: "frequency_regular",
    laxative: "lax_neutral",
    sleep: "sleep_no",
  };

  assert.equal(needsMagnesiumTieBreaker(answers), true);
  assert.equal(resolveMagnesiumForm({ ...answers, priority: "priority_regular" }), "citrate");
  assert.equal(resolveMagnesiumForm({ ...answers, priority: "priority_calm" }), "bisglycinate");
});

test("builds an explanation from the user's own answers", () => {
  const answers = {
    goal: "goal_calm",
    stool: "stool_normal",
    frequency: "frequency_regular",
    laxative: "lax_unwanted",
    sleep: "sleep_often",
  };

  const reasons = buildMagnesiumReasons(answers, "bisglycinate");
  assert.equal(reasons.length, 3);
  assert.match(reasons.join(" "), /расслабляться|засыпать/);
  assert.match(reasons.join(" "), /послабляющий эффект/);
});
