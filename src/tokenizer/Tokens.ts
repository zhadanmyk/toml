import type { Span } from "../Span";

export const enum TokenKind {
  EndOfFile,
  Whitespace,
  Newline,
  Comment,
  Equals,
  Period,
  Comma,
  Colon,
  Plus,
  LeftBrace,
  RightBrace,
  LeftBracket,
  RightBracket,
  KeyLike,
  String,
}

export abstract class Token {
  constructor(readonly kind: TokenKind, readonly span: Span) {}
}

export class EndOfFile extends Token {
  constructor(span: Span) {
    super(TokenKind.EndOfFile, span);
  }
}

export class Whitespace extends Token {
  constructor(span: Span, readonly text: string) {
    super(TokenKind.Whitespace, span);
  }
}

export class Newline extends Token {
  constructor(span: Span) {
    super(TokenKind.Newline, span);
  }
}

export class Comment extends Token {
  constructor(span: Span, readonly text: string) {
    super(TokenKind.Comment, span);
  }
}

export class Equals extends Token {
  constructor(span: Span) {
    super(TokenKind.Equals, span);
  }
}

export class Period extends Token {
  constructor(span: Span) {
    super(TokenKind.Period, span);
  }
}

export class Comma extends Token {
  constructor(span: Span) {
    super(TokenKind.Comma, span);
  }
}

export class Colon extends Token {
  constructor(span: Span) {
    super(TokenKind.Colon, span);
  }
}

export class Plus extends Token {
  constructor(span: Span) {
    super(TokenKind.Plus, span);
  }
}

export class LeftBrace extends Token {
  constructor(span: Span) {
    super(TokenKind.LeftBrace, span);
  }
}

export class RightBrace extends Token {
  constructor(span: Span) {
    super(TokenKind.RightBrace, span);
  }
}

export class LeftBracket extends Token {
  constructor(span: Span) {
    super(TokenKind.LeftBracket, span);
  }
}

export class RightBracket extends Token {
  constructor(span: Span) {
    super(TokenKind.RightBracket, span);
  }
}

export class KeyLike extends Token {
  constructor(span: Span, readonly text: string) {
    super(TokenKind.KeyLike, span);
  }
}

export class String extends Token {
  constructor(
    span: Span,
    readonly src: string,
    readonly value: string,
    readonly multiline: boolean
  ) {
    super(TokenKind.String, span);
  }
}
