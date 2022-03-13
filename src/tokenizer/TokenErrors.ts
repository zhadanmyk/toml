import type { Span } from "../Span";

export abstract class TokenizerError extends Error {
  constructor(readonly span: Span) {
    super();
  }
}

export class InvalidCharInString extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(span);
  }
}

export class InvalidEscape extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(span);
  }
}

export class InvalidHexEscape extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(span);
  }
}

export class InvalidEscapeValue extends TokenizerError {
  constructor(span: Span, readonly value: number) {
    super(span);
  }
}

export class NewlineInString extends TokenizerError {
  constructor(span: Span) {
    super(span);
  }
}

export class Unexpected extends TokenizerError {
  constructor(span: Span, readonly char: string) {
    super(span);
  }
}

export class UnterminatedString extends TokenizerError {
  constructor(span: Span) {
    super(span);
  }
}

export class NewlineInTableKey extends TokenizerError {
  constructor(span: Span) {
    super(span);
  }
}

export class MultilineStringKey extends TokenizerError {
  constructor(span: Span) {
    super(span);
  }
}

export class Wanted extends TokenizerError {
  constructor(span: Span, readonly expected: string, readonly found: string) {
    super(span);
  }
}
