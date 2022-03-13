import assert from "assert";
import type { File } from "./File";

export class Span {
  constructor(
    readonly file: File,
    readonly start: number,
    readonly end: number = start
  ) {}

  combine(other: Span): Span {
    assert.strictEqual(this.file, other.file);
    return new Span(
      this.file,
      Math.min(this.start, other.start),
      Math.max(this.end, other.end)
    );
  }
}
