import {
  Position, Range
} from '../utils'

const gloomSyntaxNodeKind = Symbol()

export enum SyntaxNodeKind {
  Unknown = -1,

  // Base
  Module,
  Statement,
  Expression,
  Declaration,
}

export enum ExpressionKind {
  // Values
  Literal,
  List,
  Tuple,

  // Ops
  Binary,
  Unary,

  // Statments
  If,
  Match,
  Function,

  Construct,
}

export enum StatementKind {
  Variable,
  Static,
  LeftValue,
  Expression,

  While,
  For,
  Continue,
  Break,
  Return,
  If,

  Class,
}

export enum DeclarationKind {
  Function,
  Variable,

}



export abstract class SyntaxNode {
  readonly [gloomSyntaxNodeKind]: SyntaxNodeKind = SyntaxNodeKind.Unknown
}

export class Module extends SyntaxNode {

}