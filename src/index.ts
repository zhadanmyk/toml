import type { TomlNode } from "./TomlNode";
import { TomlParseError } from "./TomlParseError";

export function parseToml(content: string, filePath?: string): TomlNode {
  return {
    errors: [new TomlParseError("Invalid TOML")],
  };
}
