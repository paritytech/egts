import puppeteer from "./deps/puppeteer.ts"
import { parse } from "./deps/std/flags.ts"
import * as fs from "./deps/std/fs.ts"
import * as path from "./deps/std/path.ts"
import { run, runWithBrowser, runWithDeno } from "./run.ts"

const flags = parse(Deno.args, {
  string: [
    "browser-exec-path",
    "concurrency",
    "include",
    "ignore",
    "import-map",
    "output",
    "reload",
  ],
  boolean: ["browser", "headless"],
  default: {
    "browser-exec-path": "/usr/bin/chromium",
    headless: true,
    ignore: ".trunignore",
  },
  alias: { reload: "r" },
})

const { ignore, browser, output, headless, include } = flags
const importMap = flags["import-map"]
const concurrency = flags.concurrency ? Number(flags.concurrency) : Infinity
if (!include) {
  throw new Error("include flag is required")
}

if (!path.isGlob(include)) {
  throw new Error("include flag must be a glob pattern")
}

const controller = new AbortController()
const { signal } = controller

const skip = await Deno.stat(ignore)
  .then(() => Deno.readTextFile(ignore))
  .then((s) => s.split("\n").map((glob) => path.globToRegExp(glob)))
  .catch(() => [])

const paths = []
for await (
  const entry of fs.walk(".", {
    match: [path.globToRegExp(include)],
    skip,
    includeDirs: false,
  })
) {
  paths.push(entry.path)
}

async function shutdown(exitCode: number) {
  console.log(`\nshutting down with exitcode ${exitCode}`)

  self.addEventListener("unload", () => Deno.exit(exitCode))
  controller.abort()
}

Deno.addSignalListener("SIGINT", () => shutdown(1))
Deno.addSignalListener("SIGTERM", () => shutdown(1))

const createBrowser = async () => {
  const browser = await puppeteer.launch({
    headless,
    executablePath: flags["browser-exec-path"],
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  signal.addEventListener("abort", async () => {
    await browser.close()
  })

  return browser
}

const importMapUrl = importMap
  ? path.toFileUrl(path.resolve(importMap))
  : undefined

const results: [fileName: string, exitCode: number][] = []
const runner = browser
  ? await runWithBrowser({ createBrowser, importMapUrl, results })
  : await runWithDeno({ reloadUrl: flags.reload, signal, results })

console.log(`${paths.length} files found`)
console.log(paths)

await run({ paths, runner, concurrency, signal })
const failedTests = results
  .filter(([_, exitCode]) => exitCode !== 0)
  .map(([fileName, _]) => fileName)
const isFailed = failedTests.length > 0

console.log(`test results -- ${failedTests.length} failure(s)`)
if (output) {
  await Deno.writeTextFile(output, JSON.stringify(failedTests))
}

if (isFailed) {
  console.log(failedTests)
  shutdown(1)
} else {
  shutdown(0)
}
