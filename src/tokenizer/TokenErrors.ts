import type { Span } from "../Span";

export abstract class TokenizerError extends Error {
  constructor(readonly type: string, readonly span: Span, message = "") {
    super(`${type} (${span.toString()})${message ? ": " + message : ""}`);
  }
}

export class InvalidCharInString extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(
      "InvalidCharInString",
      span,
      `Unexpected character: ${JSON.stringify(char)}`
    );
  }
}

export class InvalidEscape extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(
      "InvalidEscape",
      span,
      `Unexpected character: ${JSON.stringify(char)}`
    );
  }
}

export class InvalidHexEscape extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(
      "InvalidHexEscape",
      span,
      `Unexpected character: ${JSON.stringify(char)}`
    );
  }
}

export class InvalidEscapeValue extends TokenizerError {
  constructor(span: Span, readonly value: number) {
    super("InvalidEscapeValue", span, `Invalid value: 0x${value.toString(16)}`);
  }
}

export class NewlineInString extends TokenizerError {
  constructor(span: Span) {
    super("NewlineInString", span);
  }
}

export class Unexpected extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super("Unexpected", span, `Unexpected character: ${JSON.stringify(char)}`);
  }
}

export class UnterminatedString extends TokenizerError {
  constructor(span: Span) {
    super("UnterminatedString", span);
  }
}

export class NewlineInTableKey extends TokenizerError {
  constructor(span: Span) {
    super("NewlineInTableKey", span);
  }
}

export class MultilineStringKey extends TokenizerError {
  constructor(span: Span) {
    super("MultilineStringKey", span);
  }
}

export class Wanted extends TokenizerError {
  constructor(span: Span, readonly expected: string, readonly found: string) {
    super("Wanted", span);
  }
}
