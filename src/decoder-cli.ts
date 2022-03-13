import getStdIn from "get-stdin";
import { parseToml } from "./index";
const input = await getStdIn();
const toml = parseToml(input);
if (toml.errors?.length) {
  process.exitCode = 1;
}
