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
    testString("'''a\n'a\r\n'''", "a\n'a\n", true);
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
"InvalidEscape (<unnamed file> [0,3]:\\"\\\\
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

      expect(whitespace1).toBeInstanceOf(Tokens.Whitespace);
      expect(whitespace1?.span?.start).toEqual(0);
      expect(whitespace1?.span?.end).toEqual(1);
      expect((whitespace1 as Tokens.Whitespace).text).toEqual(" ");

      expect(keylike).toBeInstanceOf(Tokens.KeyLike);
      expect(keylike?.span?.start).toEqual(1);
      expect(keylike?.span?.end).toEqual(2);
      expect((keylike as Tokens.KeyLike).text).toEqual("a");

      expect(whitespace2).toBeInstanceOf(Tokens.Whitespace);
      expect(whitespace2?.span?.start).toEqual(2);
      expect(whitespace2?.span?.end).toEqual(3);
      expect((whitespace2 as Tokens.Whitespace).text).toEqual(" ");
    });
  });

  //     // t(
  //     //     " a\t [[]] \t [] {} , . =\n# foo \r\n#foo \n ",
  //     //     &[
  //     //         ((0, 1), Token::Whitespace(" "), " "),
  //     //         ((1, 2), Token::Keylike("a"), "a"),
  //     //         ((2, 4), Token::Whitespace("\t "), "\t "),
  //     //         ((4, 5), Token::LeftBracket, "["),
  //     //         ((5, 6), Token::LeftBracket, "["),
  //     //         ((6, 7), Token::RightBracket, "]"),
  //     //         ((7, 8), Token::RightBracket, "]"),
  //     //         ((8, 11), Token::Whitespace(" \t "), " \t "),
  //     //         ((11, 12), Token::LeftBracket, "["),
  //     //         ((12, 13), Token::RightBracket, "]"),
  //     //         ((13, 14), Token::Whitespace(" "), " "),
  //     //         ((14, 15), Token::LeftBrace, "{"),
  //     //         ((15, 16), Token::RightBrace, "}"),
  //     //         ((16, 17), Token::Whitespace(" "), " "),
  //     //         ((17, 18), Token::Comma, ","),
  //     //         ((18, 19), Token::Whitespace(" "), " "),
  //     //         ((19, 20), Token::Period, "."),
  //     //         ((20, 21), Token::Whitespace(" "), " "),
  //     //         ((21, 22), Token::Equals, "="),
  //     //         ((22, 23), Token::Newline, "\n"),
  //     //         ((23, 29), Token::Comment("# foo "), "# foo "),
  //     //         ((29, 31), Token::Newline, "\r\n"),
  //     //         ((31, 36), Token::Comment("#foo "), "#foo "),
  //     //         ((36, 37), Token::Newline, "\n"),
  //     //         ((37, 38), Token::Whitespace(" "), " "),
  //   });
  // });
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
  expect(token).toBeInstanceOf(tokenType);
  expect(token.span?.start).toEqual(start);
  expect(token.span?.end).toEqual(end);
  return token as T;
}
