export class Counter {
  #lines: number
  #cols: number
  #count: number
  #delimiter: RegExp

  constructor(
    lines = 1,
    cols = 0,
    count = 0,
    delimiter = /\n/
  ) {
    this.#cols = cols
    this.#lines = lines
    this.#count = count
    this.#delimiter = delimiter
  }

  add(ch: string) {
    ch = ch.slice(0, 1)
    this.#count += 1
    if (this.#delimiter.test(ch)) {
      this.#cols = 0
      this.#lines += 1
    } else {
      this.#cols += 1
    }
  }

  back() {
    if (this.#count > 0) {
      this.#count -= 1
      if (this.#cols > 0) {
        this.#cols -= 1
      } else if (this.#lines > 1) {
        this.#cols = 0
        this.#lines -= 1
      }
    }
  }

  /**
   * @returns [lines: number, cols: number]
   */
  getPosition() {
    return new Position([this.#lines, this.#cols], this.#count)
  }

  getLines(): number {
    return this.#lines
  }

  getColumns(): number {
    return this.#lines
  }

  getCount(): number {
    return this.#count
  }

}

export enum Compare {
  LT, GT, EQ
}

export class Range {
  readonly from: Position
  readonly to: Position
  constructor(
    x: Position,
    y: Position
  ) {
    if (x.gt(y)) {
      this.from = y
      this.to = x
    } else {
      this.from = x
      this.to = y
    }
  }

  getLength() {
    return this.from.count - this.to.count
  }

  getFromLine() {
    return this.from.position[0]
  }

  getToLine() {
    return this.to.position[0]
  }

  getFromColumn() {
    return this.from.position[1]
  }

  getToColumn() {
    return this.to.position[1]
  }

  getFromCount() {
    return this.from.count
  }

  getToCount() {
    return this.to.count
  }

  getLineLength() {
    return this.getFromLine() - this.getToLine()
  }

  getColumnLength() {
    return this.getFromColumn() - this.getToColumn()
  }

  getPositionLength() {
    return [this.getLineLength(), this.getColumnLength()]
  }

  concat(y: Range) {
    if (this.from.lt(y.to)) {
      return new Range(
        this.from,
        y.to
      )
    } else if (y.from.gt(this.to)) {
      return new Range(
        y.from,
        this.to
      )
    } else {
      //! TODO
      return new Range(
        this.from,
        y.to
      )
    }
  }
}

export class Position {
  constructor(
    public readonly position: [number, number],
    public readonly count: number
  ) {}

  compare(s: Position): Compare {
    return (
      this.count > s.count 
      ? Compare.GT
      : this.count < s.count
      ? Compare.LT
      : Compare.EQ
    )
  }

  max(s: Position): Position {
    return (
      this.lt(s) ? s : this
    )
  }

  min(s: Position): Position {
    return (
      this.gt(s) ? s : this
    )
  }

  eq(s: Position): boolean {
    return this.compare(s) == Compare.EQ
  }

  gt(s: Position): boolean {
    return this.compare(s) == Compare.GT
  }

  lt(s: Position): boolean {
    return this.compare(s) == Compare.LT
  }

  with(y: Position): Range {
    return new Range(this, y)
  }
}