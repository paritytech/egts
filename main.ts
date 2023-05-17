import browser from "./cli/browser.ts"
import deno from "./cli/deno.ts"
import { Command } from "./deps/cliffy.ts"

const test = new Command()
  .name("test")
  .command("deno", deno)
  .command("browser", browser)

await new Command()
  .name("egts")
  .description("Example-related utilities used in Capi")
  .command("test", test)
  .parse(Deno.args)
