import type { File } from "../File";
import { Span } from "../Span";
import * as tokens from "./Tokens";
import * as errors from "./TokenErrors";

type Char = string;

export class Cursor {
  constructor(private readonly file: File, public position: number) {}
  clone() {
    return new Cursor(this.file, this.position);
  }
  peek(offset: number = 0): Char | undefined {
    return this.file.chars[this.position + offset];
  }
  peekCode(): number | undefined {
    return this.file.chars[this.position]?.codePointAt(0);
  }
  forward(): void {
    this.position++;
    if (this.peek() === "\r" && this.peek(1) === "\n") {
      this.position++;
    }
  }
  done(): boolean {
    return this.position >= this.file.chars.length;
  }
  span(start?: Cursor): Span {
    return new Span(this.file, (start ?? this).position, this.position);
  }
}

export class Tokenizer {
  private cursor = new Cursor(this.file, 0);
  constructor(private readonly file: File) {
    // Skip any UTF8 BOM char
    this.tryChar("\uFEFF");
  }

  [Symbol.iterator]() {
    const tokenizer = this;
    return {
      next(): { value: tokens.Token | errors.TokenizerError; done: boolean } {
        const token = tokenizer.next();
        return { value: token, done: token instanceof tokens.EndOfFile };
      },
    };
  }

  next(): tokens.Token | errors.TokenizerError {
    if (this.cursor.done()) {
      return new tokens.EndOfFile(this.cursor.span());
    }
    const char = this.cursor.peek()!;
    switch (char) {
      case "\n":
        return new tokens.Newline(this.cursor.span());
      case " ":
      case "\t":
        return this.consumeWhitespace();
      case "#":
        return this.consumeComment();
      case "=":
        return new tokens.Equals(this.cursor.span());
      case ".":
        return new tokens.Period(this.cursor.span());
      case ",":
        return new tokens.Comma(this.cursor.span());
      case ":":
        return new tokens.Colon(this.cursor.span());
      case "+":
        return new tokens.Plus(this.cursor.span());
      case "{":
        return new tokens.LeftBrace(this.cursor.span());
      case "}":
        return new tokens.RightBrace(this.cursor.span());
      case "[":
        return new tokens.LeftBracket(this.cursor.span());
      case "]":
        return new tokens.RightBracket(this.cursor.span());
      case "'":
        return this.consumeLiteralString();
      case '"':
        return this.consumeBasicString();
      default:
        if (isKeyLike(char)) {
          return this.consumeKeyLike();
        } else {
          throw new errors.Unexpected(this.cursor.span(), char);
        }
    }
  }

  private consumeWhitespace(): tokens.Whitespace {
    const start = this.cursor.clone();
    while (this.cursor.peek() === " " || this.cursor.peek() === "\t") {
      this.cursor.forward();
    }
    const span = this.cursor.span(start);
    return new tokens.Whitespace(span.text(), span);
  }

  private consumeComment(): tokens.Comment {
    const start = this.cursor.clone();
    let char: Char | undefined;
    while (undefined !== (char = this.cursor.peek())) {
      if (isControlChar(char)) {
        break;
      }
      this.cursor.forward();
    }
    const span = this.cursor.span(start);
    return new tokens.Comment(span.text(), span);
  }

  private consumeLiteralString(): tokens.String {
    const start = this.cursor.clone();
    return this.consumeString("'", start, this.consumeLiteralChar);
  }

  private consumeLiteralChar: ReadCharFn = (ch, start) => {
    if (isControlChar(ch)) {
      throw new errors.InvalidCharInString(this.cursor.span(start), ch);
    }
    return ch;
  };

  private consumeBasicString(): tokens.String {
    const start = this.cursor.clone();
    return this.consumeString('"', start, this.consumeBasicChar);
  }

  private consumeBasicChar: ReadCharFn = (ch, start, multiline) => {
    if (ch === "\\") {
      this.cursor.forward();
      switch (this.cursor.peek()) {
        case '"':
          return '"';
        case "\\":
          return "\\";
        case "b":
          return "\u{8}";
        case "f":
          return "\u{c}";
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "u":
          return String.fromCodePoint(this.consumeHex(4));
        case "U":
          const hexStr = this.consumeHex(8);
          try {
            return String.fromCodePoint(hexStr);
          } catch {
            throw new errors.InvalidEscapeValue(
              this.cursor.span(start),
              hexStr
            );
          }
        case "\n":
          if (!multiline) {
            throw new errors.InvalidEscape(this.cursor.span(start), ch);
          }
          if (this.skipWhitespace() === undefined) {
            throw new errors.InvalidEscape(this.cursor.span(start), ch);
          }
          return "";
        case undefined:
          throw new errors.UnterminatedString(this.cursor.span(start));
      }
      throw new errors.InvalidEscape(this.cursor.span(start), ch);
    }
    if (isControlChar(ch)) {
      throw new errors.InvalidCharInString(this.cursor.span(start), ch);
    }
    return ch;
  };

  private skipWhitespace() {
    let nextChar = this.cursor.peek(1);
    while (nextChar && /[\n\t ]/.test(nextChar)) {
      this.cursor.forward();
      nextChar = this.cursor.peek(1);
    }
    return nextChar;
  }

  private consumeKeyLike(): tokens.KeyLike {
    const start = this.cursor.clone();
    while (!this.cursor.done()) {
      const ch = this.cursor.peek()!;
      if (!isKeyLike(ch)) {
        break;
      }
      this.cursor.forward();
    }
    const span = this.cursor.span(start);
    return new tokens.KeyLike(span.text(), span);
  }

  private consumeString(
    delimiter: Char,
    start: Cursor,
    readChar: ReadCharFn
  ): tokens.String {
    let multiline = false;
    let value = "";
    // Skip the starting delimiter.
    this.cursor.forward();
    if (this.tryChar(delimiter)) {
      if (this.tryChar(delimiter)) {
        multiline = true;
      } else {
        // Empty string
        const span = this.cursor.span(start);
        return new tokens.String(value, span.text(), multiline, span);
      }
    }

    while (!this.cursor.done()) {
      const char = this.cursor.peek()!;
      switch (char) {
        case "\r":
          if (!multiline) {
            throw new errors.NewlineInString(this.cursor.span(start));
          } else {
            throw new errors.InvalidCharInString(this.cursor.span(start), "\r");
          }
        case "\n":
          if (!multiline) {
            throw new errors.NewlineInString(this.cursor.span(start));
          }
          if (value !== "") {
            // We only add the newline if it is not at the start of the multiline string.
            value += char;
          }
          this.cursor.forward();
          break;
        case delimiter:
          if (!multiline) {
            // We found the end of a non-multiline string.
            this.cursor.forward();
            const span = this.cursor.span(start);
            return new tokens.String(value, span.text(), multiline, span);
          }
          this.cursor.forward();
          if (this.tryChar(delimiter)) {
            if (this.tryChar(delimiter)) {
              // We found the end of a multiline string.
              const span = this.cursor.span(start);
              return new tokens.String(value, span.text(), multiline, span);
            } else {
              // Just two quotes in a row so add them to the value.
              value += delimiter + delimiter;
            }
          } else {
            // Just a single quote so add it to the value.
            value += delimiter;
          }
          break;
        default:
          value += readChar(char, start, multiline);
          this.cursor.forward();
          break;
      }
    }
    throw new errors.UnterminatedString(this.cursor.span(start));
  }

  private tryChar(char: Char): boolean {
    if (this.cursor.peek() === char) {
      this.cursor.forward();
      return true;
    } else {
      return false;
    }
  }

  private consumeHex(expectedLength: number): number {
    const start = this.cursor.clone();
    let digits = "";
    while (expectedLength > 0) {
      this.cursor.forward();
      const ch = this.cursor.peek();
      if (ch === undefined) {
        throw new errors.UnterminatedString(this.cursor.span(start));
      } else if (!/[0-9A-Za-z]/.test(ch)) {
        throw new errors.InvalidHexEscape(this.cursor.span(start), ch);
      } else {
        digits += ch;
      }
      expectedLength -= 1;
    }
    return parseInt(digits, 16);
  }
}

function isKeyLike(ch: Char): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

function isControlChar(ch: Char): boolean {
  return /[\x00-\x08\x0A-\x1F\x7F]/.test(ch);
}

type ReadCharFn = (
  initialChar: Char,
  start: Cursor,
  multiline: boolean
) => Char;
