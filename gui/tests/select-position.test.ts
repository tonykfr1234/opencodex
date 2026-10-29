import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { computeSelectMenuStyle } from "../src/select-position";

const globals = ["window"] as const;
let previousGlobals: Record<(typeof globals)[number], unknown>;
let testWindow: Window;

beforeEach(() => {
  previousGlobals = Object.fromEntries(globals.map((key) => [key, Reflect.get(globalThis, key)])) as typeof previousGlobals;
  testWindow = new Window({ url: "http://localhost/", width: 1024, height: 800 });
  Object.defineProperty(globalThis, "window", { configurable: true, value: testWindow });
});

afterEach(() => {
  testWindow.close();
  for (const key of globals) {
    Object.defineProperty(globalThis, key, { configurable: true, value: previousGlobals[key] });
  }
});

for (const [htmlZoom, bodyZoom] of [[2, 1], [1, 2], [1.25, 1.6]]) {
  test(`portal coordinates account for html zoom ${htmlZoom} and body zoom ${bodyZoom}`, () => {
    testWindow.document.documentElement.style.zoom = String(htmlZoom);
    testWindow.document.body.style.zoom = String(bodyZoom);
    const scale = htmlZoom * bodyZoom;
    const trigger = { top: 120, bottom: 156, left: 120, right: 320, width: 200, height: 36 };
    const below = computeSelectMenuStyle(trigger);
    expect(below.top).toBeCloseTo(trigger.bottom / scale + 4);
    expect(below.left).toBeCloseTo(trigger.left / scale);
    expect(below.minWidth).toBeCloseTo(trigger.width / scale);
    expect(Number(below.left) + Number(below.maxWidth)).toBeCloseTo(1024 / scale - 8);

    const above = computeSelectMenuStyle({ ...trigger, top: 700, bottom: 736 });
    expect(above.bottom).toBeCloseTo((800 - 700) / scale + 8);
    expect(above.top).toBeUndefined();
    expect(Number(above.bottom) + Number(above.maxHeight)).toBeLessThanOrEqual(800 / scale);

    const beside = computeSelectMenuStyle(trigger, { placement: "right" });
    expect(beside.top).toBeCloseTo(trigger.top / scale);
    expect(beside.left).toBeCloseTo(trigger.right / scale + 12);
    expect(Number(beside.left) + Number(beside.maxWidth)).toBeCloseTo(1024 / scale - 8);
  });
}

for (const width of [360, 412, 440]) {
  test(`long-content menus stay within the ${width}px viewport for each anchor`, () => {
    Object.defineProperty(testWindow, "innerWidth", { configurable: true, value: width });
    for (const top of [120, 700]) {
      const trigger = { top, bottom: top + 44, left: 24, right: width - 24, width: width - 48, height: 44 };
      for (const options of [{ align: "left" }, { align: "right" }, { placement: "right" }] as const) {
        const style = computeSelectMenuStyle(trigger, options);
        const anchor = Number(style.left ?? style.right);
        expect(anchor).toBeGreaterThanOrEqual(8);
        expect(anchor + Number(style.maxWidth)).toBeLessThanOrEqual(width - 8);
        expect(Number(style.minWidth)).toBeLessThanOrEqual(Number(style.maxWidth));
      }
    }
  });
}

test("an oversized off-screen trigger cannot force its menu outside the viewport", () => {
  const style = computeSelectMenuStyle({ top: 120, bottom: 156, left: -500, right: 1500, width: 2000, height: 36 });
  expect(style.right).toBe(8);
  expect(style.minWidth).toBe(1008);
  expect(style.maxWidth).toBe(1008);
});

test("opens below by default when there is room under the trigger", () => {
  const style = computeSelectMenuStyle({
    top: 120,
    bottom: 156,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { menuHeight: 180 });
  expect(style.top).toBe(160);
  expect(style.bottom).toBeUndefined();
  expect(style.left).toBe(120);
  expect(style.minWidth).toBe(200);
});

test("flips upward near the bottom of the viewport", () => {
  const style = computeSelectMenuStyle({
    top: 700,
    bottom: 736,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { menuHeight: 180 });
  expect(style.bottom).toBe(108);
  expect(style.top).toBeUndefined();
  expect(style.maxHeight).toBe(280);
});

test("right placement opens beside the trigger", () => {
  const style = computeSelectMenuStyle({
    top: 120,
    bottom: 156,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { placement: "right", menuHeight: 120 });
  expect(style.left).toBe(332);
  expect(style.top).toBe(120);
  expect(style.minWidth).toBe(160);
});

test("right placement flips above when the trigger is near the bottom edge", () => {
  const style = computeSelectMenuStyle({
    top: 700,
    bottom: 736,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { placement: "right", menuHeight: 220 });
  expect(style.left).toBe(332);
  expect(style.bottom).toBe(108);
  expect(style.top).toBeUndefined();
});

test("right placement clamps horizontally when the menu would overflow the viewport", () => {
  const style = computeSelectMenuStyle({
    top: 120,
    bottom: 156,
    left: 900,
    right: 1000,
    width: 100,
    height: 36,
  }, { placement: "right", menuHeight: 120 });
  expect(style.left).toBe(856);
  expect(style.top).toBe(120);
});

test("right placement flips above when the menu would overflow vertically below the trigger", () => {
  const style = computeSelectMenuStyle({
    top: 700,
    bottom: 736,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { placement: "right", menuHeight: 280 });
  expect(style.left).toBe(332);
  expect(style.bottom).toBe(108);
  expect(style.top).toBeUndefined();
});

test("right alignment anchors the menu to the trigger's right edge", () => {
  const style = computeSelectMenuStyle({
    top: 120,
    bottom: 156,
    left: 120,
    right: 320,
    width: 200,
    height: 36,
  }, { align: "right", menuHeight: 120 });
  expect(style.right).toBe(704);
  expect(style.left).toBeUndefined();
});

test("automatically defaults to right alignment when trigger sits in right half of viewport", () => {
  const style = computeSelectMenuStyle({
    top: 120,
    bottom: 156,
    left: 800,
    right: 960,
    width: 160,
    height: 36,
  }, { menuHeight: 120 });
  expect(style.right).toBe(64);
  expect(style.left).toBeUndefined();
});

