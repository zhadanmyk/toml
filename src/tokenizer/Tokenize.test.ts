import { describe, expect, it } from "vitest";
import { File } from "../File";
import * as errors from "./TokenErrors";
import { Tokenizer } from "./Tokenizer";
import * as tokens from "./Tokens";

describe("Tokenizer", () => {
  it("should tokenize literal strings", () => {
    testString("''", "", false);
    testString("''''''", "", true);
    testString("'''\n'''", "", true);
    testString("'a'", "a", false);
    testString("'\"a'", '"a', false);
    testString("''''a'''", "'a", true);
    testString("'''\n'a\n'''", "'a\n", true);
    testString("'''a\n'a\r\n'''", "a\n'a\n", true);
  });

  it("should tokenize basic strings", () => {
    testString('""', "", false);
    testString('""""""', "", true);
    testString('"a"', "a", false);
    testString('"""a"""', "a", true);
    testString('"\\t"', "\t", false);
    testString('"\\u0000"', "\0", false);
    testString('"\\U00000000"', "\0", false);
    testString('"\\U000A0000"', "\u{A0000}", false);
    testString('"\\\\t"', "\\t", false);
    testString('"\t"', "\t", false);
    testString('"""\n\t"""', "\t", true);
    testString('"""\\\n"""', "", true);
    testString('"""\\\n     \t   \t  \\\r\n  \t \n  \t \r\n"""', "", true);
    testString('"\\r"', "\r", false);
    testString('"\\n"', "\n", false);
    testString('"\\b"', "\u{8}", false);
    testString('"a\\fa"', "a\u{c}a", false);
    testString('"\\"a"', '"a', false);
    testString('"""\na"""', "a", true);
    testString('"""\n"""', "", true);
    testString('"""a\\"""b"""', 'a"""b', true);

    expect(() => testString('"\\a')).to.toThrowErrorMatchingInlineSnapshot(
      '"InvalidEscape (<unnamed file> [0,2]:\\"\\\\): Unexpected character: \\"\\\\\\\\\\""'
    );
    expect(() => testString('"\\\n')).to.toThrowErrorMatchingInlineSnapshot(
      '"InvalidEscape (<unnamed file> [0,2]:\\"\\\\): Unexpected character: \\"\\\\\\\\\\""'
    );
    expect(() => testString('"\\\r\n')).to.toThrowErrorMatchingInlineSnapshot(`
"InvalidEscape (<unnamed file> [0,3]:\\"\\\\
): Unexpected character: \\"\\\\\\\\\\""
`); // (2, '\n'));
    expect(() => testString('"\\')).to.toThrowErrorMatchingInlineSnapshot(
      '"UnterminatedString (<unnamed file> [0,2]:\\")"'
    ); // (0));
    expect(() => testString('"\u{0}')).to.toThrowErrorMatchingInlineSnapshot(
      '"InvalidCharInString (<unnamed file> [0,1]:\\"): Unexpected character: \\"\\\\u0000\\""'
    ); // (1, '\u{0}'));
    expect(() => testString('"\\U00"')).to.toThrowErrorMatchingInlineSnapshot(
      '"InvalidHexEscape (<unnamed file> [2,5]:\\"\\\\U00): Unexpected character: \\"\\\\\\"\\""'
    ); // (5, '"'));
    expect(() => testString('"\\U00')).to.toThrowErrorMatchingInlineSnapshot(
      '"UnterminatedString (<unnamed file> [2,5]:\\"\\\\U0)"'
    ); // (0));
    expect(() => testString('"\\uD800')).to.toThrowErrorMatchingInlineSnapshot(
      '"UnterminatedString (<unnamed file> [0,7]:\\"\\\\uD80)"'
    ); // (2, 0xd800));
    expect(() => testString('"\\UFFFFFFFF')).to.throw(
      errors.InvalidEscapeValue
    ); // (2, 0xffff_ffff));
  });
});

function testString(input: string, value = "", multiline = false) {
  const token = test<tokens.String>(tokens.String, input, 0, 0);
  expect(token.multiline).toEqual(multiline);
  expect(token.value).toEqual(value);
  return token;
}

function test<T extends tokens.Token>(
  tokenType: unknown,
  input: string,
  start: number,
  end: number
) {
  const tokenizer = new Tokenizer(new File(input));
  const token = tokenizer.next() as tokens.Token;
  expect(token).toBeInstanceOf(tokenType);
  expect(token.span.start).toEqual(start);
  expect(token.span.start).toEqual(end);
  return token as T;
}
