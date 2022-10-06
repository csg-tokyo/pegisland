export class Position {
  constructor(
    public offset: number,
    public line: number,
    public column: number
  ) {}

  equal(other: Position): boolean {
    return (
      this.offset === other.offset &&
      this.line === other.line &&
      this.column === other.column
    );
  }
}
