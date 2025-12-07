import { assertEquals } from "jsr:@std/assert";
import { normalizeChordSymbol } from "./chords.ts";

Deno.test("normalizeChordSymbol uppercases roots", () => {
  assertEquals(normalizeChordSymbol("e"), "E");
  assertEquals(normalizeChordSymbol("ebmaj7"), "D#maj7");
  assertEquals(normalizeChordSymbol("c/e"), "C/E");
});
