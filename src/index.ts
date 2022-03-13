export class TomlParseError extends Error {}
export interface TomlNode {
  errors?: TomlParseError[];
}

export function parseToml(content: string, filePath?: string): TomlNode {
  return {
    errors: [new TomlParseError("Invalid TOML")],
  };
}
