import { Range } from "../utils/position"

const gloomTokenKind = Symbol('#Token')

export enum TokenKind {
  Unknown = -1,
  Int,
  Num,
  Ident,
  String,
  Char,
  Bool,
  Op,
  Symbol,
  Keyword,
  BlockComment,
  LineComment
}

export abstract class Token implements Token {
  abstract readonly [gloomTokenKind]: TokenKind
  constructor(
    public range: Range
  ) {}
  getKind() {
    return this[gloomTokenKind]
  }
}

export abstract class Value<T> extends Token {
  abstract readonly [gloomTokenKind]: TokenKind
  readonly [Symbol.toStringTag]: string | undefined
  constructor(
    range: Range,
    public readonly value: T
  ) { super(range); this[Symbol.toStringTag] = `Token(${this.setToStringTag() ?? 'Unknown'})` }  

  setToStringTag(): string | undefined {
    return undefined
  }
}

export enum KeywordKind {
  Let,
  Return,
  Func,
  If,
  Else,
  While,
  For,
  And,
  Or,
  Break,
  Continue,
  Class,
  Interface,
  Import,
  Match,
  Underline, // wtf
  Impl,
  In,
  Pub,
  Static,
  Enum,
  As,
  Async,
  Await,
  Yield,
  Const,
  Type,
  Declare,
}

export enum SymbolKind {
  Plus,
  // +
  Sub,
  // -
  Mul,
  // *
  Div, 
  // /
  Mod,
  // %
  Assign,
  // =
  Eq,
  // ==
  Gt,
  // >
  Lt,
  // >
  GtEq,
  // >=
  LtEq,
  // <=
  NotEq, // !=

  PlusAssign,
  // +=
  SubAssign,
  // -=

  PlusPlus,
  // ++
  SubSub, // --

  Power, // **


  LParen,
  // (
  RParen, // )

  LBrace,
  // {
  RBrace, // }

  LBracket,
  // [
  RBracket, // ]

  Semi,
  // ;
  Comma,
  // ,
  Not,
  // !
  Dot,
  // .
  Colon,
  // :
  DoubleArrow,
  // =>
  SingleArrow,
  // ->
  Newline,
  // \n
}

export enum IntKind {
  Bin, Dec, Hex, Point
}

export interface NumberProps {
  scientific?: string
  kind: IntKind
  postfix?: string
}

export class IntToken extends Value<[string, NumberProps]> {
  readonly [gloomTokenKind] = TokenKind.Int
}

export class NumToken extends Value<[[string, string], NumberProps]> {
  readonly [gloomTokenKind] = TokenKind.Num
}

export class IdentToken extends Value<string> {
  readonly [gloomTokenKind] = TokenKind.Ident
  setToStringTag() {
    return `Identifier<"${this.value}">`
  }
}

export class StringToken extends Value<string> {
  readonly [gloomTokenKind] = TokenKind.String
  setToStringTag() {
    return `String<${this.value.length}>`
  }
}

export class CharToken extends Value<string> {
  readonly [gloomTokenKind] = TokenKind.Char
  setToStringTag() {
    return `Char`
  }
}

export class BoolToken extends Value<boolean> {
  readonly [gloomTokenKind] = TokenKind.Bool
  setToStringTag() {
    return `Bool<${this.value ? 'true' : 'false'}>`
  }
}

export class KeywordToken extends Value<KeywordKind> {
  readonly [gloomTokenKind] = TokenKind.Keyword
  setToStringTag() {
      return `Keyword<${KeywordKind[this.value]}>`
  }
}

export class SymbolToken extends Value<SymbolKind> {
  readonly [gloomTokenKind] = TokenKind.Symbol
  setToStringTag() {
    return `Symbol<${SymbolKind[this.value]}>`
  }
}

export class LineCommentToken extends Value<string> {
  readonly [gloomTokenKind] = TokenKind.LineComment
  setToStringTag() {
    return `LineComment<${this.value.length}>`
  }
}

export class BlockCommentToken extends Value<string> {
  readonly [gloomTokenKind] = TokenKind.BlockComment
  setToStringTag() {
    return `BlockComment<${this.value.length}>`
  }
}