import { Command } from "../deps/cliffy.ts"
import { blue, dim, gray, green, red, yellow } from "../deps/std/fmt/colors.ts"
import { walk } from "../deps/std/fs.ts"
import { Buffer, readLines } from "../deps/std/io.ts"
import * as path from "../deps/std/path.ts"
import { readerFromStreamReader, writeAll } from "../deps/std/streams.ts"
import { parseFrontmatter } from "../frontmatter.ts"
import { runWithConcurrency } from "../util.ts"

const cmd = new Command()
  .name("deno")
  .option("-b, --concurrency <concurrency:integer>", "concurrency", { default: Infinity })
  .option("-r, --reload <reload>", "reload")
  .option("--no-skip", "ignore skip frontmatter")
  .arguments("<includePatterns..>")
  .action(async ({ concurrency, skip, reload }, includePatterns) => {
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
        console.log("pathname", pathname)
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
        const code = await run(pathname, logs, reload)
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
  })

async function run(pathname: string, logs: Buffer, reload?: string): Promise<number> {
  const flags = reload ? [`-r${reload === "" ? "" : `=${reload}`}`] : []
  const process = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", ...flags, pathname],
    stdout: "piped",
    stderr: "piped",
  }).spawn()
  const [{ code }] = await Promise.all([
    process.status,
    ...[process.stdout, process.stderr].map(async (stream) => {
      const lineIter = readLines(readerFromStreamReader(stream.getReader()))
      const encoder = new TextEncoder()
      for await (const line of lineIter) await writeAll(logs, encoder.encode(`${line}\n`))
    }),
  ])
  return code
}

export default cmd
