import browser from "./cli/browser.ts"
import runDeno from "./cli/deno.ts"
import { Command } from "./deps/cliffy.ts"
import { blue, dim, gray, green, red, yellow } from "./deps/std/fmt/colors.ts"
import { walk } from "./deps/std/fs.ts"
import { Buffer } from "./deps/std/io.ts"
import * as path from "./deps/std/path.ts"
import { parseFrontmatter } from "./frontmatter.ts"
import { runWithConcurrency } from "./util.ts"

interface GlobalRunnerParams {
  concurrency: number
  skip: boolean
}

type Run<T extends GlobalRunnerParams> = (
  t: Omit<T, keyof GlobalRunnerParams>,
) => (pathname: string, logs: Buffer) => Promise<number>

const globalRunner = <T extends GlobalRunnerParams>(f: Run<T>) => {
  return async ({ concurrency, skip, ...rest }: T, includePatterns: string) => {
    const include: string[] = []
    for await (
      const { path: pathname } of walk(".", {
        exts: [".ts", ".tsx"],
        followSymlinks: true,
        includeDirs: false,
        match: includePatterns.split(" ").map((value) => {
          if (typeof value !== "string") {
            throw new Error(
              `Specified an invalid include \`${value}\` (expected a glob or path to example file)`,
            )
          }
          return path.isGlob(value) ? path.globToRegExp(value) : new RegExp(value)
        }),
      })
    ) include.push(pathname)

    const failed: string[] = []
    let passed = 0
    let skipped = 0

    await runWithConcurrency(
      include.map((pathname) => async () => {
        const { frontmatter } = parseFrontmatter(pathname, await Deno.readTextFile(pathname), {
          test_skip(value) {
            return value !== undefined
          },
        })
        const quotedPathname = `"${pathname}"`
        if (skip && frontmatter.test_skip) {
          console.log(yellow("Skipped"), quotedPathname)
          skipped++
          return
        }
        console.log(gray("Testing"), quotedPathname)
        const logs = new Buffer()
        const code = await f(rest)(pathname, logs)
        passed++
        const progress = dim(`(${passed + skipped}/${include.length})`)
        if (code) {
          failed.push(pathname)
          console.log(red("Failed"), progress, quotedPathname)
          console.log(new TextDecoder().decode(logs.bytes()))
        } else {
          console.log(green("Passed"), progress, quotedPathname)
        }
      }),
      concurrency,
    )

    if (failed.length) {
      console.log(`${red("Erroring examples")}: \n  - "${failed.join(`"\n  - "`)}"`)
      Deno.exit(1)
    } else {
      if (passed) console.log(blue(`${passed} examples passed`))
      if (skipped) console.log(gray(`${skipped} examples skipped`))
      Deno.exit(0)
    }
  }
}

await new Command()
  .name("egts")
  .description("Example-related utilities used in Capi")
  .command(
    "test",
    new Command()
      .name("test")
      .globalOption("-c, --concurrency <concurrency:integer>", "concurrency", { default: Infinity })
      .globalOption("--no-skip", "ignore skip frontmatter")
      .command("deno")
      .arguments("<includePatterns..>")
      .option("-r, --reload <reload>", "reload")
      .action(globalRunner(runDeno))
      .command("browser", browser),
  )
  .parse(Deno.args)
