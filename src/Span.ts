import assert from "assert";
import type { File } from "./File";

export class Span {
  constructor(
    readonly file: File,
    readonly start: number,
    readonly end: number = start + 1
  ) {}

  combine(other: Span): Span {
    assert.strictEqual(this.file, other.file);
    return new Span(
      this.file,
      Math.min(this.start, other.start),
      Math.max(this.end, other.end)
    );
  }

  text(): string {
    return this.file.chars.slice(this.start, this.end).join("");
  }

  toString(): string {
    const start = Math.max(this.start - 3, 0);
    const end = Math.min(this.end + 3, this.file.chars.length - 1);
    const prefix = start > 0 ? "..." : "";
    const postfix = end < this.file.chars.length - 1 ? "..." : "";
    const text = this.file.chars.slice(start, end).join("");
    const file = this.file.filePath
      ? `${this.file.filePath}`
      : "<unnamed file>";
    return (
      `${file} [${this.start},${this.end}]:` + `${prefix + text + postfix}`
    );
  }
}
