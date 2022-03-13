import type { TomlParseError } from "./TomlParseError";

export interface TomlNode {
  errors?: TomlParseError[];
}
