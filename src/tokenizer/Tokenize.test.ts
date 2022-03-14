import { describe, expect, it } from "vitest";
import { File } from "../File";
import { Tokenizer } from "./Tokenizer";
import * as tokens from "./Tokens";

describe("Tokenizer", () => {
  it("should tokenize literal strings", () => {
    function test(
      input: string,
      value: string,
      multiline: boolean,
      start: number,
      end: number
    ) {
      const tokenizer = new Tokenizer(new File(input));
      const token = tokenizer.next() as tokens.String;
      expect(token).toBeInstanceOf(tokens.String);
      expect(token.value).toEqual(value);
      expect(token.multiline).toEqual(multiline);
      expect(token.span.start).toEqual(start);
      expect(token.span.start).toEqual(end);
    }

    test("''", "", false, 0, 0);
    test("''''''", "", true, 0, 0);
    test("'''\n'''", "", true, 0, 0);
    test("'a'", "a", false, 0, 0);
    test("'\"a'", '"a', false, 0, 0);
    test("''''a'''", "'a", true, 0, 0);
    test("'''\n'a\n'''", "'a\n", true, 0, 0);
    test("'''a\n'a\r\n'''", "a\n'a\n", true, 0, 0);
  });
});
