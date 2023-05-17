import deno from "./cli/deno.ts"
import { Command } from "./deps/cliffy.ts"

await new Command()
  .name("egts")
  .description("Example-related utilities used in Capi")
  .command("deno")
  .option("-b, --concurrency <concurrency:integer>", "concurrency", { default: Infinity })
  .arguments("<includePatterns..>")
  .option("-r, --reload <reload>", "reload")
  .action(async ({ concurrency }, includePatterns) => deno(includePatterns.split(" "), concurrency))
  .command("browser")
  .option("-b, --browser", "browser binary")
  .option("-p, --project <project>", "project")
  .option("-r, --reload <reload>", "reload")
  .parse(Deno.args)
