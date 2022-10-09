export class Position {
  constructor(
    public readonly offset: number,
    public readonly line: number,
    public readonly column: number
  ) {}

  equal(other: Position): boolean {
    return (
      this.offset === other.offset &&
      this.line === other.line &&
      this.column === other.column
    );
  }
}
