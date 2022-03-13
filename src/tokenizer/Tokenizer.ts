import type { File } from "../File";
import { Span } from "../Span";
import * as tokens from "./Tokens";
import * as errors from "./TokenErrors";

export type Char = string;

export class Cursor {
  constructor(private readonly file: File, public position: number) {}
  clone() {
    return new Cursor(this.file, this.position);
  }
  peek(): Char {
    return this.file.content.charAt(this.position);
  }
  forward(): void {
    this.position++;
  }
  span(start?: Cursor): Span {
    return new Span(this.file, (start ?? this).position, this.position);
  }
  text(start?: Cursor): string {
    return this.file.content.substring(
      (start ?? this).position,
      this.position + 1
    );
  }
}

export class Tokenizer {
  private cursor = new Cursor(this.file, 0);
  constructor(private readonly file: File) {
    // Skip any UTF8 BOM char
    this.tryChar("\uFEFF");
  }

  next(): tokens.Token | errors.TokenizerError {
    if (this.atEnd()) {
      return new tokens.EndOfFile(this.cursor.span());
    }
    const start = this.cursor.clone();
    const char = this.cursor.peek();
    this.cursor.forward();
    switch (char) {
      case "\n":
        return new tokens.Newline(start.span());
      case " ":
      case "\t":
        return this.consumeWhitespace(start);
      case "#":
        return this.consumeComment(start);
      case "=":
        return new tokens.Equals(start.span());
      case ".":
        return new tokens.Period(start.span());
      case ",":
        return new tokens.Comma(start.span());
      case ":":
        return new tokens.Colon(start.span());
      case "+":
        return new tokens.Plus(start.span());
      case "{":
        return new tokens.LeftBrace(start.span());
      case "}":
        return new tokens.RightBrace(start.span());
      case "[":
        return new tokens.LeftBracket(start.span());
      case "]":
        return new tokens.RightBracket(start.span());
      case "'":
        return this.consumeLiteralString(start);
      case '"':
        return this.consumeBasicString(start);
      default:
        if (isKeyLike(char)) {
          return this.consumeKeyLike(start);
        } else {
          return new errors.Unexpected(start.span(), char);
        }
    }
  }

  private consumeWhitespace(start: Cursor): tokens.Whitespace {
    while ((!this.atEnd() && this.tryChar(" ")) || this.tryChar("\t")) {
      // ...
    }
    return new tokens.Whitespace(
      this.cursor.span(start),
      this.cursor.text(start)
    );
  }

  private consumeComment(start: Cursor): tokens.Comment {
    while (!this.atEnd()) {
      const ch = this.cursor.peek();
      if (ch != "\t" && (ch < "\u{20}" || ch > "\u{10ffff}")) {
        break;
      }
      this.cursor.forward();
    }
    return new tokens.Comment(this.cursor.span(start), this.cursor.text(start));
  }

  private consumeLiteralString(start: Cursor): tokens.String {
    return new tokens.String(start.span(), " ", " ", false);
  }

  private consumeBasicString(start: Cursor): tokens.String {
    return new tokens.String(start.span(), " ", " ", false);
  }

  private consumeKeyLike(start: Cursor): tokens.KeyLike {
    while (!this.atEnd()) {
      const ch = this.cursor.peek();
      if (!isKeyLike(ch)) {
        break;
      }
      this.cursor.forward();
    }
    return new tokens.KeyLike(this.cursor.span(start), this.cursor.text(start));
  }

  private atEnd() {
    return this.cursor.peek() !== undefined;
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
