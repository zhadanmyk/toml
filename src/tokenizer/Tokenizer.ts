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
  peek(): Char | undefined {
    return this.file.chars[this.position];
  }
  peekCode(): number | undefined {
    return this.file.chars[this.position]?.codePointAt(0);
  }
  forward(): void {
    this.position++;
  }
  done(): boolean {
    return this.position >= this.file.chars.length;
  }
  span(start?: Cursor): Span {
    return new Span(this.file, (start ?? this).position, this.position);
  }
  text(start?: Cursor): string {
    return this.file.chars
      .slice((start ?? this).position, this.position + 1)
      .join("");
  }
}

export class Tokenizer {
  private cursor = new Cursor(this.file, 0);
  constructor(private readonly file: File) {
    // Skip any UTF8 BOM char
    this.tryChar("\uFEFF");
  }

  next(): tokens.Token | errors.TokenizerError {
    if (this.cursor.done()) {
      return new tokens.EndOfFile(this.cursor.span());
    }
    try {
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
            return new errors.Unexpected(this.cursor.span(), char);
          }
      }
    } finally {
      this.cursor.forward();
    }
  }

  private consumeWhitespace(): tokens.Whitespace {
    const start = this.cursor.clone();
    while (this.cursor.peek() === " " || this.cursor.peek() === "\t") {
      this.cursor.forward();
    }
    return new tokens.Whitespace(
      this.cursor.span(start),
      this.cursor.text(start)
    );
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
    return new tokens.Comment(this.cursor.span(start), this.cursor.text(start));
  }

  private consumeLiteralString(): tokens.String {
    const start = this.cursor.clone();
    return this.consumeString("'", start, (ch) => {
      if (isControlChar(ch)) {
        throw new errors.InvalidCharInString(this.cursor.span(start), ch);
      }
      return ch;
    });
  }

  private consumeBasicString(): tokens.String {
    const start = this.cursor.clone();
    return new tokens.String(start.span(), " ", " ", false);
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
    return new tokens.KeyLike(this.cursor.span(start), this.cursor.text(start));
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
        return new tokens.String(
          this.cursor.span(start),
          this.cursor.text(start),
          value,
          multiline
        );
      }
    }

    while (!this.cursor.done()) {
      const char = this.cursor.peek()!;
      switch (char) {
        case "\r":
          if (!multiline) {
            throw new errors.NewlineInString(this.cursor.span(start));
          }
          // Skip the "\r" of "\r\n".
          this.cursor.forward();
          if (this.cursor.peek() !== "\n") {
            // But error if is a freestanding "\r".
            throw new errors.InvalidCharInString(this.cursor.span(start), "\r");
          }
          break;
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
            return new tokens.String(
              this.cursor.span(start),
              this.cursor.text(start),
              value,
              multiline
            );
          }
          this.cursor.forward();
          if (this.tryChar(delimiter)) {
            if (this.tryChar(delimiter)) {
              // We found the end of a multiline string.
              return new tokens.String(
                this.cursor.span(start),
                this.cursor.text(start),
                value,
                multiline
              );
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
          value += readChar(char, multiline);
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
}

function isKeyLike(ch: Char): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

function isControlChar(ch: Char): boolean {
  return /[\x00-\x08\x0A-\x1F\x7F]/.test(ch);
}

type ReadCharFn = (initialChar: Char, multiline: boolean) => Char;
