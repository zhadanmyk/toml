export class File {
  readonly chars = [...this.content];
  constructor(readonly content: string, readonly filePath?: string) {}
}
