import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Actor, Roadmap } from "../src/model";
import {
  classifyNpcSpeechAct,
  npcAddressedListener,
  npcReplyChance,
  pickNpcResponders,
} from "../src/npc-reply-chance";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const scenario = emptyScenario();
  scenario.entities = [
    { id: "human", kind: "player", x: 9, y: 15 },
    { id: "speaker", kind: "npc", x: 10, y: 15 },
    { id: "listener", kind: "npc", x: 14, y: 15 },
    { id: "other", kind: "npc", x: 15, y: 15 },
    { id: "third", kind: "npc", x: 15, y: 15 },
  ];
  const g = new TestRunner(scenario, roadmap).game;
  const source = g.survivors.find((a) => a.id === "speaker")!;
  const listeners = ["listener", "other", "third"].map((id) =>
    g.survivors.find((a) => a.id === id)!,
  );
  for (const a of listeners)
    Object.assign(a, { social: 0.5, hp: 100, activity: "exploring" });
  listeners[0].name = "Theo Li";
  listeners[1].name = "Alex Stone";
  listeners[2].name = "Jo Green";
  return { g, source, listener: listeners[0], other: listeners[1], listeners };
}
const options = { participants: new Set<string>(), addressed: "none" as const };
const statement = { text: "That corridor is quiet." };
function near(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-12,
    `expected ${expected}, got ${actual}`,
  );
}

test("urgent request cues warn, while a negated bare need is a statement", () => {
  for (const text of [
    "Watch out, behind you",
    "Help, they're through the door",
    "Can you cover the corridor!",
  ])
    assert.equal(classifyNpcSpeechAct(text, "urgent"), "warning", text);
  assert.equal(classifyNpcSpeechAct("We don't need it."), "statement");
  assert.equal(classifyNpcSpeechAct("We need the corridor."), "statement");
  assert.equal(classifyNpcSpeechAct("  Need the corridor!"), "request");
  for (const object of [
    "a ladder",
    "an exit",
    "some water",
    "help",
    "you",
    "someone",
    "me",
    "to leave",
  ])
    assert.equal(classifyNpcSpeechAct(`We need ${object}.`), "request", object);
});

test("first-name addressing uses Unicode-aware boundaries and escapes punctuation", () => {
  const { listener, other } = fixture();
  for (const first of ["Zoë", "Ángel", "«Zoë»", "Zoë+"]) {
    listener.name = `${first} Park`;
    const text = `${first}, over here.`;
    assert.equal(npcAddressedListener(text, listener, [other]), "self", first);
    assert.equal(npcAddressedListener(text, other, [listener]), "other", first);
    for (const embedded of [
      `é${first}`,
      `${first}é`,
      `1${first}`,
      `${first}2`,
      `_${first}`,
      `${first}_`,
    ])
      assert.equal(
        npcAddressedListener(embedded, listener, [other]),
        "none",
        embedded,
      );
  }
  listener.name = "Zoë Park";
  assert.equal(
    npcAddressedListener("ZOË, over here.", listener, [other]),
    "self",
  );
});

test("player name candidates lower NPC reply chances without becoming responders", () => {
  const { g, source, listener } = fixture();
  const player = g.survivors[0];
  player.name = "Jack Park";
  const line = { text: "Jack, is the stairwell clear?" };
  const listeners = [listener];
  const nameCandidates = [player, listener];
  assert.equal(npcAddressedListener(line.text, listener, listeners), "none");
  const addressed = npcAddressedListener(line.text, listener, nameCandidates);
  assert.equal(addressed, "other");
  const baseline = npcReplyChance(g, listener, source, line, options);
  const suppressed = npcReplyChance(g, listener, source, line, {
    ...options,
    addressed,
  });
  near(suppressed, baseline * 0.35);
  assert.ok(suppressed < baseline);
  const draw = (baseline + suppressed) / 2;
  assert.deepEqual(
    pickNpcResponders(g, source, line, listeners, options, draw).map(
      (a) => a.id,
    ),
    [listener.id],
  );
  assert.deepEqual(
    pickNpcResponders(
      g,
      source,
      line,
      listeners,
      { ...options, nameCandidates },
      draw,
    ),
    [],
  );
  assert.deepEqual(
    pickNpcResponders(
      g,
      source,
      line,
      listeners,
      { ...options, nameCandidates },
      0,
    ).map((a) => a.id),
    [listener.id],
  );
});

test("speech acts have deterministic question, request, warning and statement precedence", () => {
  assert.equal(classifyNpcSpeechAct("Is that corridor clear?"), "question");
  assert.equal(classifyNpcSpeechAct("Can you help?", "urgent"), "question");
  for (const cue of [
    "Can you",
    "COULD YOU",
    "anyone",
    "someone",
    "help",
    "give me",
    "need",
    "let's",
    "watch",
    "cover",
  ])
    assert.equal(classifyNpcSpeechAct(`${cue} the corridor!`), "request", cue);
  assert.equal(classifyNpcSpeechAct("Incoming!"), "warning");
  assert.equal(classifyNpcSpeechAct("They're near.", "urgent"), "warning");
  assert.equal(classifyNpcSpeechAct(statement.text), "statement");
  assert.equal(
    classifyNpcSpeechAct("Helpful watchers uncovered a needless shortcut."),
    "statement",
    "request cues must be whole words",
  );
});

test("each speech act supplies its specified base probability", () => {
  const { g, source, listener } = fixture();
  for (const [text, base] of [
    ["Is it clear?", 0.55],
    ["Help me with this.", 0.5],
    ["They're coming!", 0.35],
    [statement.text, 0.22],
  ] as const)
    near(npcReplyChance(g, listener, source, { text }, options), base * 0.8);
});

test("first-name addressing raises the named listener's chance and lowers others'", () => {
  const { g, source, listener, other } = fixture();
  const text = "tHeO, that corridor is quiet.";
  assert.equal(npcAddressedListener(text, listener, [listener, other]), "self");
  assert.equal(npcAddressedListener(text, other, [listener, other]), "other");
  assert.equal(
    npcAddressedListener("Theodore is here.", listener, [other]),
    "none",
  );
  assert.equal(
    npcAddressedListener("Theo and Alex.", other, [listener]),
    "self",
  );
  const baseline = npcReplyChance(g, listener, source, { text }, options);
  const addressed = npcReplyChance(
    g,
    listener,
    source,
    { text },
    {
      ...options,
      addressed: "self",
    },
  );
  const someoneElse = npcReplyChance(
    g,
    listener,
    source,
    { text },
    {
      ...options,
      addressed: "other",
    },
  );
  near(baseline, 0.22 * 0.8);
  near(addressed, 0.85 * 0.8);
  near(someoneElse, baseline * 0.35);
  assert.ok(addressed > baseline && baseline > someoneElse);
});

test("distance falls off within each delivery range and sealed walls make chance zero", () => {
  const { g, source, listener } = fixture();
  const chance = (delivery?: "whisper" | "calm" | "relieved" | "urgent") =>
    npcReplyChance(g, listener, source, { ...statement, delivery }, options);
  listener.x = source.x;
  near(chance(), 0.22);
  listener.x = source.x + 5;
  near(chance(), 0.22 * 0.75);
  listener.x = source.x + 10;
  near(chance(), 0.22 * 0.5);
  listener.x += 0.01;
  assert.equal(chance(), 0);
  assert.ok(chance("urgent") > 0);
  listener.x = source.x + 4;
  near(chance("whisper"), 0.22 * 0.5);
  listener.x += 0.01;
  assert.equal(chance("whisper"), 0);
  listener.x = 14;
  const f = g.floors[source.floor];
  assert.ok(chance() > 0);
  for (let y = 0; y < f.tiles.length; y++) f.tiles[y][12] = 1;
  assert.equal(chance("urgent"), 0);
  f.tiles[15][12] = 0;
  assert.ok(chance("whisper") > 0);
});

test("busy listeners suppress statements more than warnings and respect activity factors", () => {
  const { g, source, listener } = fixture();
  const warning = { text: "Incoming!" };
  const baseline = npcReplyChance(g, listener, source, statement, options);
  const warningBaseline = npcReplyChance(g, listener, source, warning, options);
  for (const activity of ["fleeing", "defending"] as const) {
    listener.activity = activity;
    const fleeing = npcReplyChance(g, listener, source, statement, options);
    const fleeingWarning = npcReplyChance(
      g,
      listener,
      source,
      warning,
      options,
    );
    near(fleeing, baseline * 0.25);
    near(fleeingWarning, warningBaseline * 0.7);
    assert.ok(fleeing < baseline);
    assert.ok(fleeingWarning / warningBaseline > fleeing / baseline);
  }
  listener.activity = "studying";
  near(npcReplyChance(g, listener, source, statement, options), baseline * 0.6);
  listener.activity = "climbing";
  near(npcReplyChance(g, listener, source, statement, options), baseline * 0.4);
});

test("intent, personality, participation, health and turn decay multiply before final caps", () => {
  const { g, source, listener } = fixture();
  const baseline = npcReplyChance(g, listener, source, statement, options);
  near(
    npcReplyChance(g, listener, source, statement, {
      ...options,
      intent: "invite",
    }),
    0.7 * 0.8,
  );
  near(
    npcReplyChance(g, listener, source, statement, {
      ...options,
      participants: new Set([listener.id]),
    }),
    baseline * 1.3,
  );
  listener.hp = 30;
  near(npcReplyChance(g, listener, source, statement, options), baseline * 0.6);
  listener.hp = 100;
  near(
    npcReplyChance(g, listener, source, { ...statement, turn: 2 }, options),
    baseline,
  );
  near(
    npcReplyChance(g, listener, source, { ...statement, turn: 4 }, options),
    baseline * 0.75 ** 2,
  );
  listener.social = -1;
  near(npcReplyChance(g, listener, source, statement, options), baseline * 0.6);
  listener.social = 2;
  near(npcReplyChance(g, listener, source, statement, options), baseline * 1.4);
  listener.x = source.x;
  near(
    npcReplyChance(g, listener, source, statement, {
      addressed: "self",
      participants: new Set([listener.id]),
      intent: "invite",
    }),
    0.95,
  );
  near(
    npcReplyChance(g, listener, source, statement, {
      ...options,
      addressed: "self",
      intent: "close",
    }),
    0.08,
  );
  listener.social = 0;
  listener.hp = 30;
  listener.activity = "fleeing";
  const uncapped = npcReplyChance(g, listener, source, statement, options);
  assert.ok(uncapped < 0.08);
  near(
    npcReplyChance(g, listener, source, statement, {
      ...options,
      intent: "close",
    }),
    uncapped,
  );
});

test("one group draw decides acceptance and weighted first responder with deterministic fallback", () => {
  const { g, source, listener, other } = fixture();
  const listeners = [other, listener];
  const p = npcReplyChance(g, listener, source, statement, options);
  const q = npcReplyChance(g, other, source, statement, options);
  const group = 1 - (1 - p) * (1 - q);
  const pick = (draw: number) =>
    pickNpcResponders(g, source, statement, listeners, options, draw).map(
      (a) => a.id,
    );
  assert.deepEqual(pick(group), []);
  assert.deepEqual(pick(group + 0.01), []);
  assert.deepEqual(pick(0), [listener.id, other.id]);
  assert.deepEqual(pick(group * (p / (p + q) + 0.01)), [other.id, listener.id]);
  assert.deepEqual(pickNpcResponders(g, source, statement, [], options, 0), []);
  other.alive = false;
  assert.deepEqual(pick(0), [listener.id]);
});

test("equal weights break ties by distance then id rather than input order", () => {
  const { g, source, listener, other, listeners } = fixture();
  listener.x = source.x;
  listener.social = 0.25;
  other.x = source.x + 4;
  listeners[2].x = other.x;
  const pick = (actors: Actor[]) =>
    pickNpcResponders(g, source, statement, actors, options, 0).map(
      (a) => a.id,
    );
  assert.equal(
    npcReplyChance(g, listener, source, statement, options),
    npcReplyChance(g, other, source, statement, options),
  );
  assert.deepEqual(pick([...listeners].reverse()), [
    "listener",
    "other",
    "third",
  ]);
});

test("group chance is capped at 0.9 even for several eager addressed participants", () => {
  const { g, source, listeners } = fixture();
  for (const a of listeners)
    Object.assign(a, { x: source.x, name: "Theo", social: 1 });
  const opts = {
    participants: new Set(listeners.map((a) => a.id)),
    intent: "invite" as const,
  };
  const line = { text: "Theo, are you there?" };
  for (const a of listeners)
    near(
      npcReplyChance(g, a, source, line, { ...opts, addressed: "self" }),
      0.95,
    );
  assert.deepEqual(
    pickNpcResponders(g, source, line, listeners, opts, 0.9),
    [],
  );
  assert.deepEqual(
    pickNpcResponders(g, source, line, listeners, opts, 0.999),
    [],
  );
  assert.equal(
    pickNpcResponders(g, source, line, listeners, opts, 0.899).length,
    3,
  );
});
