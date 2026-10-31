// Geometry envelopes shared by the offline validator, world builder and renderer.
// Physical furniture dimensions remain in model.FURNITURE; these are small props.
export const PROP_CATALOG = Object.freeze(
  Object.fromEntries(
    Object.entries({
      mug: { w: 0.12, d: 0.12, h: 0.14 },
      book: { w: 0.22, d: 0.28, h: 0.04 },
      papers: { w: 0.22, d: 0.28, h: 0.012 },
      pen: { w: 0.014, d: 0.16, h: 0.014 },
      photo: { w: 0.18, d: 0.06, h: 0.22 },
      note: { w: 0.22, d: 0.24, h: 0.008 },
      plant: { w: 0.2, d: 0.2, h: 0.3 },
      bottle: { w: 0.09, d: 0.09, h: 0.25 },
      phone: { w: 0.075, d: 0.14, h: 0.016 },
      box: { w: 0.24, d: 0.2, h: 0.16 },
      lamp: { w: 0.2, d: 0.2, h: 0.32 },
      trophy: { w: 0.14, d: 0.14, h: 0.25 },
    }).map(([kind, size]) => [kind, Object.freeze(size)]),
  ),
);
export const SCENE_FURNITURE_KINDS = Object.freeze([
  "chair",
  "desk",
  "sofa",
  "fridge",
  "shelf",
  "officeChair",
  "table",
  "cabinet",
  "cooler",
  "plant",
  "printer",
  "whiteboard",
  "partition",
  "coffeeMaker",
  "microwave",
  "vending",
  "cafeTable",
  "coffeeTable",
  "reception",
  "screen",
  "box",
  "drawers",
  "armchair",
]);
export const SCENE_SURFACE_KINDS = Object.freeze([
  "desk",
  "table",
  "cafeTable",
  "coffeeTable",
  "reception",
  "cabinet",
  "shelf",
  "drawers",
]);
export const SCENE_LIMITS = Object.freeze({ furniture: 16, props: 48 });

const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (ok, message) => {
  if (!ok) throw Error(`Run design: ${message}`);
};
function object(value, keys, path) {
  fail(record(value), `${path} must be an object`);
  fail(
    Object.keys(value).every((key) => keys.includes(key)),
    `${path} has an unknown field`,
  );
  fail(
    keys.every((key) => Object.hasOwn(value, key)),
    `${path} is missing a field`,
  );
}
function text(value, min, max, path) {
  fail(
    typeof value === "string" &&
      value.length <= max &&
      (min === 0 || value.trim().length >= min) &&
      !/[\u0000-\u001f\u007f]/u.test(value),
    `${path} must be ${min}–${max} printable characters`,
  );
}
function number(value, min, max, path) {
  fail(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    `${path} must be between ${min} and ${max}`,
  );
}
function array(value, min, max, path) {
  fail(
    Array.isArray(value) && value.length >= min && value.length <= max,
    `${path} needs ${min === max ? min : `${min}–${max}`} entries`,
  );
}
function choice(value, choices, path) {
  fail(choices.includes(value), `${path} must be one of ${choices.join(", ")}`);
}
function color(value, path) {
  fail(
    typeof value === "string" && /^#[0-9a-fA-F]{6}$/u.test(value),
    `${path} needs a six-digit hex color`,
  );
}
function position(value, min, path) {
  object(value, ["x", "y"], path);
  number(value.x, min, 1, `${path}.x`);
  number(value.y, min, 1, `${path}.y`);
}

/** Validate data only. Physical placement is checked by the world builder. */
export function parseSceneDesign(value, rosterNames, path = "scene") {
  object(value, ["version", "rooms"], path);
  fail(value.version === 1, `${path} has an unsupported scene version`);
  array(value.rooms, 4, 4, `${path}.rooms`);
  const rooms = new Set(),
    ids = new Set();
  let furnitureCount = 0,
    propCount = 0;
  const id = (name, p) => {
    fail(
      typeof name === "string" && /^[a-z][a-z0-9-]{0,23}$/u.test(name),
      `${p} needs a lowercase slug of 1–24 characters`,
    );
    fail(!ids.has(name), `${p} must be unique within this floor`);
    ids.add(name);
  };
  const owner = (name, p) =>
    fail(
      name === null || rosterNames.includes(name),
      `${p} must name a roster survivor or be null`,
    );
  for (const [index, room] of value.rooms.entries()) {
    const p = `${path}.rooms[${index}]`;
    object(
      room,
      [
        "room",
        "title",
        "description",
        "owner",
        "palette",
        "condition",
        "furniture",
      ],
      p,
    );
    choice(room.room, [0, 1, 2, 3], `${p}.room`);
    fail(!rooms.has(room.room), `${p}.room must be unique`);
    rooms.add(room.room);
    text(room.title, 1, 40, `${p}.title`);
    text(room.description, 1, 160, `${p}.description`);
    owner(room.owner, `${p}.owner`);
    object(room.palette, ["surface", "metal", "accent"], `${p}.palette`);
    for (const key of ["surface", "metal", "accent"])
      color(room.palette[key], `${p}.palette.${key}`);
    choice(room.condition, ["kept", "worn", "ransacked"], `${p}.condition`);
    array(room.furniture, 1, 6, `${p}.furniture`);
    furnitureCount += room.furniture.length;
    let roomProps = 0;
    for (const [j, item] of room.furniture.entries()) {
      const q = `${p}.furniture[${j}]`;
      object(
        item,
        [
          "id",
          "kind",
          "at",
          "angle",
          "color",
          "condition",
          "owner",
          "label",
          "props",
        ],
        q,
      );
      id(item.id, `${q}.id`);
      choice(item.kind, SCENE_FURNITURE_KINDS, `${q}.kind`);
      position(item.at, 0, `${q}.at`);
      number(item.angle, -180, 180, `${q}.angle`);
      color(item.color, `${q}.color`);
      choice(item.condition, ["intact", "worn", "damaged"], `${q}.condition`);
      owner(item.owner, `${q}.owner`);
      text(item.label, 0, 40, `${q}.label`);
      array(item.props, 0, 8, `${q}.props`);
      fail(
        !item.props.length || SCENE_SURFACE_KINDS.includes(item.kind),
        `${q}.props need a supported furniture surface`,
      );
      roomProps += item.props.length;
      for (const [k, prop] of item.props.entries()) {
        const r = `${q}.props[${k}]`;
        object(
          prop,
          [
            "id",
            "kind",
            "at",
            "angle",
            "scale",
            "color",
            "accent",
            "condition",
            "owner",
            "label",
            "text",
          ],
          r,
        );
        id(prop.id, `${r}.id`);
        choice(prop.kind, Object.keys(PROP_CATALOG), `${r}.kind`);
        position(prop.at, -1, `${r}.at`);
        number(prop.angle, -180, 180, `${r}.angle`);
        number(prop.scale, 0.65, 1.25, `${r}.scale`);
        color(prop.color, `${r}.color`);
        color(prop.accent, `${r}.accent`);
        choice(prop.condition, ["intact", "worn", "damaged"], `${r}.condition`);
        owner(prop.owner, `${r}.owner`);
        text(prop.label, 0, 32, `${r}.label`);
        text(prop.text, 0, 160, `${r}.text`);
      }
    }
    fail(roomProps > 0, `${p} needs at least one authored prop`);
    propCount += roomProps;
  }
  fail(
    furnitureCount <= SCENE_LIMITS.furniture,
    `${path} exceeds ${SCENE_LIMITS.furniture} furniture items`,
  );
  fail(
    propCount <= SCENE_LIMITS.props,
    `${path} exceeds ${SCENE_LIMITS.props} props`,
  );
  return JSON.parse(JSON.stringify(value));
}
