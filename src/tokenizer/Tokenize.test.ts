import { describe, expect, it } from "vitest";
import { File } from "../File";
import * as errors from "./TokenErrors";
import { Tokenizer } from "./Tokenizer";
import * as Tokens from "./Tokens";

describe("Tokenizer", () => {
  describe("literal strings", () => {
    testString("''", "", false);
    testString("''''''", "", true);
    testString("'''\n'''", "", true);
    testString("'a'", "a", false);
    testString("'\"a'", '"a', false);
    testString("''''a'''", "'a", true);
    testString("'''\n'a\n'''", "'a\n", true);
    testString("'''a\n'a\r\n'''", "a\n'a\r\n", true);
  });

  describe("basic strings", () => {
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

    it("should error on invalid strings", () => {
      expect(() =>
        new Tokenizer(new File('"\\a')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"InvalidEscape (<unnamed file> [0,2]:\\"\\\\): Unexpected character: \\"\\\\\\\\\\""'
      );
      expect(() =>
        new Tokenizer(new File('"\\\n')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"InvalidEscape (<unnamed file> [0,2]:\\"\\\\): Unexpected character: \\"\\\\\\\\\\""'
      );
      expect(() => new Tokenizer(new File('"\\\r\n')).next())
        .toThrowErrorMatchingInlineSnapshot(`
"InvalidEscape (<unnamed file> [0,2]:\\"\\\\
): Unexpected character: \\"\\\\\\\\\\""
        `); // (2, '\n'));
      expect(() =>
        new Tokenizer(new File('"\\')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"UnterminatedString (<unnamed file> [0,2]:\\")"'
      ); // (0));
      expect(() =>
        new Tokenizer(new File('"\u{0}')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"InvalidCharInString (<unnamed file> [0,1]:\\"): Unexpected character: \\"\\\\u0000\\""'
      ); // (1, '\u{0}'));
      expect(() =>
        new Tokenizer(new File('"\\U00"')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"InvalidHexEscape (<unnamed file> [2,5]:\\"\\\\U00): Unexpected character: \\"\\\\\\"\\""'
      ); // (5, '"'));
      expect(() =>
        new Tokenizer(new File('"\\U00')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"UnterminatedString (<unnamed file> [2,5]:\\"\\\\U0)"'
      ); // (0));
      expect(() =>
        new Tokenizer(new File('"\\uD800')).next()
      ).toThrowErrorMatchingInlineSnapshot(
        '"UnterminatedString (<unnamed file> [0,7]:\\"\\\\uD80)"'
      ); // (2, 0xd800));
      expect(() => new Tokenizer(new File('"\\UFFFFFFFF')).next()).throw(
        errors.InvalidEscapeValue
      ); // (2, 0xffff_ffff));
    });
  });

  describe("key-like", () => {
    it("should tokenize key-like identifiers", () => {
      test<Tokens.KeyLike>(Tokens.KeyLike, "foo", 0, 3);
      test<Tokens.KeyLike>(Tokens.KeyLike, "0bar", 0, 4);
      test<Tokens.KeyLike>(Tokens.KeyLike, "bar0", 0, 4);
      test<Tokens.KeyLike>(Tokens.KeyLike, "1234", 0, 4);
      test<Tokens.KeyLike>(Tokens.KeyLike, "a-b", 0, 3);
      test<Tokens.KeyLike>(Tokens.KeyLike, "a_B", 0, 3);
      test<Tokens.KeyLike>(Tokens.KeyLike, "-_-", 0, 3);
      test<Tokens.KeyLike>(Tokens.KeyLike, "___", 0, 3);
    });
  });

  describe("single tokens", () => {
    it("should tokenize each of the single tokens", () => {
      const [whitespace1, keylike, whitespace2] = Array.from(
        new Tokenizer(new File(" a "))
      );

      testToken(whitespace1, Tokens.Whitespace, 0, 1, " ");
      testToken(keylike, Tokens.KeyLike, 1, 2, "a");
      testToken(whitespace2, Tokens.Whitespace, 2, 3, " ");
    });
  });

  it("should tokenize a complex string of tokens", () => {
    const tokens = Array.from(
      new Tokenizer(new File(" a\t [[]] \t [] {} , . =\n# foo \r\n#foo \n "))
    );

    testToken(tokens[0], Tokens.Whitespace, 0, 1, " ");
    testToken(tokens[1], Tokens.KeyLike, 1, 2, "a");
    testToken(tokens[2], Tokens.Whitespace, 2, 4, "\t ");
    testToken(tokens[3], Tokens.LeftBracket, 4, 5);
    testToken(tokens[4], Tokens.LeftBracket, 5, 6);
    testToken(tokens[5], Tokens.RightBracket, 6, 7);
    testToken(tokens[6], Tokens.RightBracket, 7, 8);
    testToken(tokens[7], Tokens.Whitespace, 8, 11, " \t ");
    testToken(tokens[8], Tokens.LeftBracket, 11, 12);
    testToken(tokens[9], Tokens.RightBracket, 12, 13);
    testToken(tokens[10], Tokens.Whitespace, 13, 14, " ");
    testToken(tokens[11], Tokens.LeftBrace, 14, 15);
    testToken(tokens[12], Tokens.RightBrace, 15, 16);
    testToken(tokens[13], Tokens.Whitespace, 16, 17, " ");
    testToken(tokens[14], Tokens.Comma, 17, 18);
    testToken(tokens[15], Tokens.Whitespace, 18, 19, " ");
    testToken(tokens[16], Tokens.Period, 19, 20);
    testToken(tokens[17], Tokens.Whitespace, 20, 21, " ");
    testToken(tokens[18], Tokens.Equals, 21, 22);
    testToken(tokens[19], Tokens.Newline, 22, 23, "\n");
    testToken(tokens[20], Tokens.Comment, 23, 29, "# foo ");
    testToken(tokens[21], Tokens.Newline, 29, 31, "\r\n");
    testToken(tokens[22], Tokens.Comment, 31, 36, "#foo ");
    testToken(tokens[23], Tokens.Newline, 36, 37);
    testToken(tokens[24], Tokens.Whitespace, 37, 38, " ");
  });
});

function testString(input: string, value = "", multiline = false) {
  it("should tokenize " + input, () => {
    const token = test<Tokens.String>(Tokens.String, input, 0, input.length);
    expect(token.multiline).toEqual(multiline);
    expect(token.value).toEqual(value);
  });
}

function test<T extends Tokens.Token>(
  tokenType: unknown,
  input: string,
  start: number,
  end: number
) {
  const tokenizer = new Tokenizer(new File(input));
  const token = tokenizer.next() as Tokens.Token;
  testToken(token, tokenType, start, end);
  return token as T;
}

function testToken(
  token: Tokens.Token | errors.TokenizerError | undefined,
  TokenType: unknown,
  start: number,
  end: number,
  text?: string
): void {
  expect(token).toBeInstanceOf(TokenType);
  if (token instanceof (TokenType as Function)) {
    expect(token?.span?.start).toEqual(start);
    expect(token?.span?.end).toEqual(end);
    if (text !== undefined) {
      expect((token as unknown as { text: string }).text).toEqual(text);
    }
  }
}
