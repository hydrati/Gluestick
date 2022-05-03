import { Counter, Position, Range } from "../utils/position"
import { BlockCommentToken, BoolToken, CharToken, IdentToken, IntKind, IntToken, KeywordKind, KeywordToken, LineCommentToken, NumToken, StringToken, SymbolKind, SymbolToken, Token } from "./token"
import { isXIDContinue, isXIDStart } from "../utils/xid"

export class TokenizeError extends Error {
  static UNEXPECTED_EOF = 'Unexpected End of Input'

  constructor(
    message: string,
    public readonly char: string,
    public readonly position: Position,
    public readonly range: Range,
    public readonly tokenizer: Tokenizer,
  ) {
    super(message)
  }
}

export class Tokenizer {
  #input: string
  #count = new Counter()
  #start = this.#count.getPosition()

  constructor(input: string) {
    this.#input = input
  }

  eof() {
    return (
      this.#count.getCount() >= this.#input.length
    )
  }

  #nextChar() {
    if (this.eof()) {
      throw new RangeError('End of Input')
    }

    const ch = this.#input[this.#count.getCount()]
    this.#count.add(ch)
    console.log('next ch', ch, this.#count.getCount())
    return ch
  }

  #tryNextChar() {
    try {
      return this.#nextChar()
    } catch {
      return undefined
    }
  }

  #currentChar() {
    return this.#input[this.#count.getCount()]
  }

  #backChar() {
    this.#count.back()
    const ch = this.#input[this.#count.getCount()]
    console.log('back ch', ch, this.#count.getCount())
    return ch
  }

  getCounter() {
    return this.#count
  }

  #cause(message: string) {
    return new TokenizeError(
      message,
      this.#currentChar(),
      this.#count.getPosition(),
      this.#createRange(),
      this,
    )
  }

  #throw(message: string) {
    throw this.#cause(message)
  }

  #createRange() {
    const pos = this.#count.getPosition()
    const range = this.#start.with(pos)
    this.#start = pos

    return range
  }

  take(): Token | undefined {
    this.#takeWhitespace()
    return !this.eof() ? (
      this.#takeSymbolOrComment()
      ?? this.#takeCharacter()
      ?? this.#takeMultilineString()
      ?? this.#takeString()
      ?? this.#takeIdentOrKeyword()
      ?? this.#takeNumeric()
    ) : undefined
  }

  #switch<T extends Token>(record: Record<string, () => T | undefined>): () => T | undefined
  #switch<T extends Token>(record: Record<string, () => T | undefined>, def: (x?: string) => T | undefined): () => T | undefined
  #switch(record: Record<string, () => Token | undefined>): () => Token | undefined
  #switch(record: Record<string, () => Token | undefined>, def: (x?: string) => Token | undefined): () => Token | undefined
  #switch<T extends Token>(record: Record<string, () => Token | undefined>, def?: (x?: string) => T | undefined): () => T | undefined {
    return () => {
      const ch = this.#tryNextChar()
      if (ch == undefined) return def?.('');
      const f: any = record[ch]?.() ?? def?.(ch) ?? undefined
      if (f == undefined) {
        this.#backChar()
      }
      return f
    }
  }

  #switchValue<T extends PropertyKey, R>(record: Record<T, (x: T) => R | undefined>): (value: T) => R | undefined
  #switchValue<T extends PropertyKey, R>(record: Record<T, (x: T) => R | undefined>, def: (x: T) => R): (value: T) => R
  #switchValue<T extends PropertyKey, R>(record: Record<T, (x: T) => R | undefined>, def: (x: T) => undefined): (value: T) => R | undefined
  #switchValue<T extends PropertyKey, R>(record: Record<T, (x: T) => R | undefined>, def?: (x: T) => R): (value: T) => R | undefined {
    return value => record[value]?.(value) ?? def?.(value)
  }

  #takeLineComment(): LineCommentToken {
    let ch = this.#tryNextChar()
    const content = []
    while (true) {
      if (this.eof() || ch == '\n') {
        content.push(ch)
        break
      } else {
        ch = this.#tryNextChar()
      }

      if (ch != undefined) content.push(ch)
    }
    return new LineCommentToken(this.#createRange(), content.join(''))
  }

  #expectChar(f: (x: string) => boolean): boolean {
    if (this.eof()) return false
    if (f(this.#nextChar())) {
      return true
    }

    this.#backChar()
    return false
  }

  #expectCharBack(f: (x: string) => boolean): boolean {
    if (this.eof()) return false
    if (f(this.#nextChar())) {
      this.#backChar()
      return true
    }

    this.#backChar()
    return false
  }

  #expectCharEq(f: string, back = true): boolean {
    if (this.eof()) return false
    if (this.#nextChar() == f) {
      return true
    }

    if (back) this.#backChar()
    return false
  }

  #takeBlockComment(): BlockCommentToken {
    let ch = this.#nextChar()
    const content = []
    while (true) {
      if (ch == '\n' || this.eof()) {
        this.#throw(TokenizeError.UNEXPECTED_EOF)
      }

      if (ch == '*') {
        const n = this.#nextChar()
        if (n == '/') {
          break
        }
        content.push(ch)
        ch = n
        continue
      }
      content.push(ch)
      ch = this.#nextChar()
    }

    return new BlockCommentToken(this.#createRange(), content.join(''))
  }

  #takeSymbolOrComment() {
    return this.#switch({
      '+': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.PlusAssign
        ),
        '+': () => new SymbolToken(
          this.#createRange(), SymbolKind.PlusPlus
        ),
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Plus
      )),
      '-': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.SubAssign
        ),
        '-': () => new SymbolToken(
          this.#createRange(), SymbolKind.SubSub
        ),
        '>': () => new SymbolToken(
          this.#createRange(), SymbolKind.SingleArrow
        )
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Sub
      )),
      '*': this.#switch({
        '*': () => new SymbolToken(
          this.#createRange(), SymbolKind.Power
        )
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Mul
      )),
      '/': this.#switch({
        '/': () => this.#takeLineComment(),
        '*': () => this.#takeBlockComment()
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Div
      )),
      '#': () => this.#takeLineComment(),
      '%': () => new SymbolToken(
        this.#createRange(), SymbolKind.Mod
      ),
      '=': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.Eq
        ),
        '>': () => new SymbolToken(
          this.#createRange(), SymbolKind.DoubleArrow
        ),
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Assign
      )),
      '>': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.GtEq
        )
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Gt
      )),
      '<': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.LtEq
        )
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Lt
      )),
      '!': this.#switch({
        '=': () => new SymbolToken(
          this.#createRange(), SymbolKind.NotEq
        )
      }, () => new SymbolToken(
        this.#createRange(), SymbolKind.Not
      )),
      '(': () => new SymbolToken(
        this.#createRange(), SymbolKind.LParen
      ),
      ')': () => new SymbolToken(
        this.#createRange(), SymbolKind.RParen
      ),
      '{': () => new SymbolToken(
        this.#createRange(), SymbolKind.LBrace
      ),
      '}': () => new SymbolToken(
        this.#createRange(), SymbolKind.RBrace
      ),
      '[': () => new SymbolToken(
        this.#createRange(), SymbolKind.LBracket
      ),
      ']': () => new SymbolToken(
        this.#createRange(), SymbolKind.RBracket
      ),

      ';': () => new SymbolToken(
        this.#createRange(), SymbolKind.Semi
      ),
      ',': () => new SymbolToken(
        this.#createRange(), SymbolKind.Comma
      ),
      '.': () => new SymbolToken(
        this.#createRange(), SymbolKind.Dot
      ),
      ':': () => new SymbolToken(
        this.#createRange(), SymbolKind.Colon
      ),
      '\n': () => new SymbolToken(
        this.#createRange(), SymbolKind.Newline
      )
    })()
  }

  #isNumber(x: string): boolean {
    return /[0-9]/.test(x)
  }

  #isHex(x: string): boolean {
    return /[0-9a-fA-F]/.test(x)
  }

  #isBin(x: string): boolean {
    return /0|1/.test(x)
  }

  #takeXIDString(): string | undefined {
    const content = []

    let ch = this.#nextChar()
    
    if (!isXIDStart(ch)) {
      this.#backChar()
      return undefined
    } else {
      
      content.push(ch)
      ch = this.#nextChar()
    }
    
    while(!this.eof()) {
      
      if (ch != '\n' && isXIDContinue(ch)) {
        
        content.push(ch)
        ch = this.#nextChar()
      } else {
        break
      }
    }

    this.#backChar()
    
    return content.join('')
  }

  #takeByLength(l: number): string | undefined {
    const content = []
    let ch = this.#nextChar()
    for(let i = 0; i < l; i += 1) {
      content.push(ch)
      if (this.eof()) {
        break
      } else ch = this.#nextChar()
    }

    this.#backChar()
    const s = content.join()
    if (s.length < l) return undefined
    return s
  }

  #takeNumberString(): string {
    const content = []
    let ch = this.#nextChar()

    while (true) {
      if (this.#isNumber(ch)) {
        content.push(ch)
        if (this.eof()) {
          break
        } else ch = this.#nextChar()
      } else if (ch == '_') {
        if (this.#expectCharBack(this.#isNumber) && content.length > 0) {
          if (this.eof()) {
            break
          } else ch = this.#nextChar()
          continue
        } else {
          this.#throw('Numeric separators are not allowed at the start or end of numeric literals')
        }
      } else break
    }

    if (!this.eof()) this.#backChar()
    console.log('take num string', content)

    return content.join('')
  }

  #takeBinString(): string {
    const content = []
    let ch = this.#nextChar()

    while (true) {
      if (this.#isBin(ch)) {
        content.push(ch)
        if (this.eof()) {
          break
        } else ch = this.#nextChar()
      } else if (ch == '_') {
        if (this.#expectCharBack(this.#isBin) && content.length > 0) {
          if (this.eof()) {
            break
          } else ch = this.#nextChar()
          continue
        } else {
          this.#throw('Numeric separators are not allowed at the start or end of numeric literals')
        }
      } else break
    }

    if (!this.eof()) this.#backChar()

    return content.join('')
  }

  #takeHexString(): string {
    const content = []
    let ch = this.#nextChar()

    while (true) {
      if (this.#isHex(ch)) {
        content.push(ch)
        if (this.eof()) {
          break
        } else ch = this.#nextChar()
      } else if (ch == '_') {
        if (this.#expectCharBack(this.#isHex) && content.length > 0) {
          if (this.eof()) {
            break
          } else ch = this.#nextChar()
          continue
        } else {
          this.#throw('Numeric separators are not allowed at the start or end of numeric literals')
        }
      } else break
    }

    if (!this.eof()) this.#backChar()

    return content.join('')
  }

  #matchKeyword = this.#switchValue<string, Token>({
    'let': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Let
    ),
    'return': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Return
    ),
    'func': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Func
    ),
    'if': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.If
    ),
    'else': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Else
    ),
    'while': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.While
    ),
    'for': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.For
    ),
    'and': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.And
    ),
    'or': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Or
    ),
    'break': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Break
    ),
    'continue': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Continue
    ),
    'class': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Class
    ),
    'interface': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Interface
    ),
    'import': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Import
    ),
    'match': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Match
    ),
    'impl': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Impl
    ),
    'in': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.In
    ),
    'pub': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Pub
    ),
    'static': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Static
    ),
    'enum': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Enum
    ),
    'as': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.As
    ),
    'async': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Async
    ),
    'await': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Await
    ),
    'yield': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Yield
    ),
    'const': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Const
    ),
    'type': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Type
    ),
    'declare': () => new KeywordToken(
      this.#createRange(),
      KeywordKind.Declare
    ),

    // Boolean
    'true': () => new BoolToken(
      this.#createRange(),
      true
    ),
    'false': () => new BoolToken(
      this.#createRange(),
      false
    )
  }, (x) => new IdentToken(
    this.#createRange(),
    x
  ))

  #takeIdentOrKeyword(): Token | undefined {
    const n = this.#takeXIDString()
    
    return n != null ? this.#matchKeyword(n)! : undefined
  }

  #takeNumeric(): Token | undefined {
    const content: string[] = []
    let ch = this.#nextChar()

    if (ch == '0') {
      return this.#switch({
        'b': () => {
          const ctn = this.#takeBinString()
          return new IntToken(
            this.#createRange(),
            [ctn, { kind: IntKind.Bin }]
          )
        },
        'x': () => {
          const ctn = this.#takeHexString()
          return new IntToken(
            this.#createRange(),
            [ctn, { kind: IntKind.Hex }]
          )
        },
        'B': () => {
          const ctn = this.#takeBinString()
          return new IntToken(
            this.#createRange(),
            [ctn, { kind: IntKind.Bin }]
          )
        },
        'X': () => {
          const ctn = this.#takeHexString()
          return new IntToken(
            this.#createRange(),
            [ctn, { kind: IntKind.Hex }]
          )
        },
        'e': () => {
          const p = this.#takeNumberString()
          return new IntToken(
            this.#createRange(),
            [ch, { scientific: p, kind: IntKind.Dec }]
          )
        },
        '.': () => {
          const n = this.#takeNumberString()
          return new NumToken(
            this.#createRange(),
            [[ch, n], {
              scientific: this.#expectCharEq('e', false) ? this.#takeNumberString() : undefined,
              kind: IntKind.Point
            }]
          )
        }
      }, x => {
        if (x != null && isXIDStart(x)) {
          const postfix = x + this.#takeXIDString()
          return new IntToken(
            this.#createRange(),
            [ch, { postfix, kind: IntKind.Dec }]
          )
        } else {
          this.#backChar()
          return new IntToken(
            this.#createRange(),
            [ch, { kind: IntKind.Dec }]
          )
        }
      })()
    } else {
      if (!this.#isNumber(ch)) return undefined
      else this.#backChar()
    }

    content.push(this.#takeNumberString())
    

    return this.#switch({
      '.': () => {

        const n = this.#takeNumberString()
        let scientific: string | undefined
        if (this.#expectCharEq('e')) {
          scientific = this.#takeNumberString()
        }
        const postfix = this.#expectCharBack(isXIDStart) ? this.#takeXIDString() : undefined
        return new NumToken(
          this.#createRange(),
          [
            [content.join(''), n], {
              scientific,
              postfix,
              kind: IntKind.Point
            }
          ]
        )
      },
      'e': () => {
        const scientific = this.#takeNumberString()
        return new IntToken(
          this.#createRange(),
          [content.join(''), { scientific, kind: IntKind.Dec }]
        )
      }
    }, x => {
      if (x != null && isXIDStart(x)) {
        const postfix = x + this.#takeXIDString()
        return new IntToken(
          this.#createRange(),
          [content.join(''), { postfix, kind: IntKind.Dec }]
        )
      } else {
        if (x != null) this.#backChar()
        return new IntToken(
          this.#createRange(),
          [content.join(''), { kind: IntKind.Dec }]
        )
      }
    })()
  }

  #takeWhitespace(): null {
    let ch = this.#nextChar()
    while (/ |\r|\t| /.test(ch)) {
      ch = this.#nextChar()
    }
    this.#backChar()
    return null
  }

  #takeEscapeCharacter(): string {
    // after \, process (....)
    const n = this.#switchValue<string, string>({
      '"': x => x,
      '\\': x => x,
      '/': x => x,
      '`': x => x,
      'b': () => '\b',
      'f': () => '\f',
      'n': () => '\n',
      'r': () => '\r',
      't': () => '\t',
      'u': () => {
        const n = this.#nextChar()
        if (this.#isHex(n)) {
          this.#backChar()
          const code = this.#takeByLength(4)
          if (code == undefined) {
            this.#throw('Invalid Unicode escape sequence')
          }
          const n = parseInt(code!, 16)
          return String.fromCharCode(n)
        } else if (n == '{') {
          const code = this.#takeHexString()
          const c = this.#nextChar()
          if (c != '}') {
            this.#throw('Invalid Unicode escape sequence')
          }
          const n = parseInt(code, 16)
          return String.fromCharCode(n)
        }
          
        this.#throw('Invalid Unicode escape sequence')
        
      }
    }, x => x)(this.#nextChar())

    return n
  }

  #takeCharacter(): Token | undefined {
    if (this.#expectCharEq('\'')) {
      const n = this.#expectCharEq('\\')
        ? this.#takeEscapeCharacter()
        : this.#nextChar()
      
      if (!this.#expectCharEq('\'', false)) {
        this.#throw('Unexpected the end of character')
      }
      return new CharToken(
        this.#createRange(),
        n
      )
    }

    return undefined
  }

  #takeMultilineString(): Token | undefined {
    if (this.#expectCharEq('`')) {
      if (!this.eof()) {
        const content = []
        while(true) {
          if (this.eof()) {
            break
          } else {
            if (this.#expectCharEq('\\')) content.push(this.#takeEscapeCharacter())
            else if (this.#expectCharEq('`')) break;
            else {
              content.push(this.#nextChar())
            }
          }
        }
        return new StringToken(
          this.#createRange(),
          content.join('')
        )
      }
    }
    return undefined
  }

  #takeString(): Token | undefined {
    if (this.#expectCharEq('"')) {
      if (!this.eof()) {
        const content = []
        while(true) {
          if (this.eof()) {
            break
          } else {
            if (this.#expectCharEq('\\')) content.push(this.#takeEscapeCharacter())
            else if (this.#expectCharEq('"')) break;
            else if (this.#expectCharEq('\n')) {
              this.#throw('Unexpectted the end of string')
            } else {
              content.push(this.#nextChar())
            }
          }
        }
        return new StringToken(
          this.#createRange(),
          content.join('')
        )
      }
    }
    return undefined
  }
}

export class TokenStream implements IterableIterator<Token> {
  #tokenizer: Tokenizer
  constructor(tokenizer: Tokenizer) {
    this.#tokenizer = tokenizer
  }

  next(): IteratorResult<Token, any> {
    if (this.#tokenizer.eof()) {
      return { done: true, value: undefined }
    } else {
      const value = this.#tokenizer.take()!
      
      return { value }
    }
  }

  [Symbol.iterator]() {
    return this
  }
}