import puppeteer from "./deps/puppeteer.ts"
import { parse } from "./deps/std/flags.ts"
import * as path from "./deps/std/path.ts"
import { run, runWithBrowser, runWithDeno } from "./run.ts"

const flags = parse(Deno.args, {
  string: [
    "browser-exec-path",
    "concurrency",
    "dir",
    "filter",
    "ignore",
    "import-map",
    "output",
    "reload",
  ],
  boolean: ["browser", "headless"],
  default: {
    "browser-exec-path": "/usr/bin/chromium",
    headless: true,
    ignore: ".ignore",
  },
  alias: { reload: "r" },
})

const { ignore, dir, browser, output, headless } = flags
const importMap = flags["import-map"]
const concurrency = flags.concurrency ? Number(flags.concurrency) : Infinity
if (!dir) {
  throw new Error("dir flag is required")
}

const filter = flags.filter ? new Set(flags.filter.split(",")) : new Set()

const controller = new AbortController()
const { signal } = controller

const ignoreFile = await Deno.readTextFile(path.join(dir, ignore))
const ignoredFiles = new Set(ignoreFile.split("\n"))

const sourceFileNames = Array.from(Deno.readDirSync(dir))
  .filter((e) =>
    /\.ts$/.test(e.name)
    && e.isFile
    && !ignoredFiles.has(e.name)
    && (!filter.size || filter.has(e.name))
  )
  .map((f) => f.name)

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
const paths = sourceFileNames.map((fileName) => [dir, fileName] as const)

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
