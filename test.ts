import { which } from "./deps/deno_which.ts"
import * as esbuild from "./deps/esbuild.ts"
import { unimplemented } from "./deps/std/assert.ts"
import { parse as parseFlags } from "./deps/std/flags.ts"
import { dim, gray, green, red, yellow } from "./deps/std/fmt/colors.ts"
import { walk } from "./deps/std/fs.ts"
import { Buffer, readLines } from "./deps/std/io.ts"
import * as path from "./deps/std/path.ts"
import { readerFromStreamReader, writeAll } from "./deps/std/streams.ts"
import { parse as parseFrontmatter } from "./frontmatter.ts"

const { _, reload, ...rest } = parseFlags(Deno.args, {
  alias: {
    c: "concurrency",
    p: "project",
    r: "reload",
  },
  string: ["concurrency", "project", "reload"],
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
          `Specified an invalid include \`${pathname}\` (expected a glob or path to example file)`,
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

const browser = typeof rest.browser === "string"
  ? rest.browser === "" ? await which("chromium") : rest.browser
  : undefined
if (browser === "") throw new Error(`Failed to detect chromium path. Specify via \`--browser\`.`)

const queue: (() => Promise<void>)[] = []
const failed: string[] = []
let done = 0

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
      done++
      return
    }
    console.log(gray("Testing"), quotedPathname)
    const logs = new Buffer()
    const code = await (browser ? runBrowser : runDeno)(pathname, logs)
    done++
    const progress = dim(`(${done}/${include.length})`)
    if (code) {
      failed.push(pathname)
      console.log(red("Failed"), progress, quotedPathname)
      console.groupCollapsed()
      console.log(new TextDecoder().decode(logs.bytes()))
      console.groupEnd()
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
})()

globalThis.addEventListener("unload", () => {
  esbuild.stop()
  if (failed.length) {
    console.log(`${red("Erroring examples")}: \n  - "${failed.join(`"\n  - "`)}"`)
    Deno.exit(1)
  }
})

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
