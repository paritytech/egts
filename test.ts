import { which } from "./deps/deno_which.ts"
import { unimplemented } from "./deps/std/assert.ts"
import { parse as parseFlags } from "./deps/std/flags.ts"
import { blue, dim, gray, green, red, yellow } from "./deps/std/fmt/colors.ts"
import { walk } from "./deps/std/fs.ts"
import { Buffer, readLines } from "./deps/std/io.ts"
import * as path from "./deps/std/path.ts"
import { readerFromStreamReader, writeAll } from "./deps/std/streams.ts"
import { parse as parseFrontmatter } from "./frontmatter.ts"

const { _: includePatterns, reload, ...rest } = parseFlags(Deno.args, {
  alias: {
    b: "browser",
    c: "concurrency",
    p: "project",
    r: "reload",
  },
  string: ["browser", "concurrency", "project", "reload"],
  default: {
    concurrency: Infinity,
  },
})

const include: string[] = []
for await (
  const { path: pathname } of walk(".", {
    exts: [".ts", ".tsx"],
    followSymlinks: true,
    includeDirs: false,
    match: _.map((value) => {
      if (typeof value !== "string") {
        throw new Error(
          `Specified an invalid include \`${value}\` (expected a glob or path to example file)`,
        )
      }
      return path.isGlob(value) ? path.globToRegExp(value) : new RegExp(value)
    }),
  })
) include.push(pathname)

const concurrency = +rest.concurrency

const project = rest.project ?? await (async () => {
  for (const pathname of ["deno.json", "deno.jsonc"]) {
    try {
      return JSON.parse(await Deno.readTextFile(pathname))
    } catch (_e) {}
  }
  return
})()
const _importMapURL = project.importMap
  ? path.toFileUrl(path.join(Deno.cwd(), project.importMap))
  : undefined

const browser = rest.browser === undefined ? undefined : rest.browser || "chromium"

const queue: (() => Promise<void>)[] = []
const failed: string[] = []
let passed = 0
let skipped = 0

include.forEach((pathname) =>
  queue.push(async () => {
    const { frontmatter } = parseFrontmatter(pathname, await Deno.readTextFile(pathname), {
      test_skip(value) {
        return value !== undefined
      },
    })
    const quotedPathname = `"${pathname}"`
    if (frontmatter.test_skip) {
      console.log(yellow("Skipping"), quotedPathname)
      skipped++
      return
    }
    console.log(gray("Testing"), quotedPathname)
    const logs = new Buffer()
    const code = await (browser ? runBrowser : runDeno)(pathname, logs)
    passed++
    const progress = dim(`(${passed + skipped}/${include.length})`)
    if (code) {
      failed.push(pathname)
      console.log(red("Failed"), progress, quotedPathname)
      console.log(new TextDecoder().decode(logs.bytes()))
    } else {
      console.log(green("Passed"), progress, quotedPathname)
    }
  })
)

let active = 0
;(function next() {
  while (active < concurrency && queue.length > 0) {
    active++
    queue.shift()!().finally(() => {
      active--
      next()
    })
  }
  if (active === 0) {
    if (failed.length) {
      console.log(`${red("Erroring examples")}: \n  - "${failed.join(`"\n  - "`)}"`)
      Deno.exit(1)
    } else {
      if (passed) console.log(blue(`${passed} examples passed`))
      if (skipped) console.log(gray(`${skipped} examples skipped`))
      Deno.exit()
    }
  }
})()

async function runDeno(pathname: string, logs: Buffer): Promise<number> {
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

async function runBrowser(_pathname: string, _logs: Buffer) {
  return unimplemented()
}
