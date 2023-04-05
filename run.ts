import * as esbuild from "./deps/esbuild.ts"
import { denoPlugin } from "./deps/esbuild_deno_loader.ts"
import { PromiseQueue } from "./deps/pqueue.ts"
import { Browser } from "./deps/puppeteer.ts"
import { deferred } from "./deps/std/async.ts"
import { Buffer, readLines } from "./deps/std/io.ts"
import { readerFromStreamReader, writeAll } from "./deps/std/streams.ts"

export interface RunOptions {
  paths: readonly string[]
  concurrency: number
  runner: (filePath: string) => Promise<void>
  signal: AbortSignal
}

export async function run({ paths, concurrency, runner, signal }: RunOptions) {
  const runQueue = new PromiseQueue({ concurrency })
  runQueue.addAll(paths.map((filePath) => () => runner(filePath)))

  signal.addEventListener("abort", () => runQueue.clear())

  await runQueue.onIdle()
}

export interface RunWithBrowserOptions {
  createBrowser: () => Promise<Browser>
  importMapUrl?: URL
  results: (readonly [filePath: string, exitCode: number])[]
}

export async function runWithBrowser(
  { createBrowser, importMapUrl, results }: RunWithBrowserOptions,
) {
  const browser = await createBrowser()
  const consoleJs = await fetch(import.meta.resolve("./console.js")).then((r) => r.text())

  return (async (filePath: string) => {
    const result = await executionWrapper(filePath, async (outputBuffer) => {
      const page = await browser.newPage()
      const buildResult = await esbuild.build({
        plugins: [
          denoPlugin({
            importMapURL: importMapUrl,
          }) as any,
        ],
        entryPoints: [filePath],
        bundle: true,
        write: false,
        format: "esm",
      })

      await page.exposeFunction("__trun_injected_log", (...[msg]: [string, number]) => {
        outputBuffer.writeSync(new TextEncoder().encode(msg))
      })

      const exitCode = deferred<number>()
      await page.exposeFunction("exit", (args: string) => {
        exitCode.resolve(Number(args))
      })

      await page.addScriptTag({ content: consoleJs, type: "module" })
      const code = wrapCode(buildResult.outputFiles[0]?.text!)
      await page.addScriptTag({ content: code, type: "module" })

      return exitCode
    })

    results.push(result)
  })
}

export interface RunWithDenoOptions {
  results: (readonly [filePath: string, exitCode: number])[]
  reloadUrl?: string
  signal: AbortSignal
}

export async function runWithDeno({ reloadUrl, results, signal }: RunWithDenoOptions) {
  return (async (filePath: string) => {
    const result = await executionWrapper(filePath, async (outputBuffer) => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", ...reloadUrl ? [`-r=${reloadUrl}`] : [], filePath],
        stdout: "piped",
        stderr: "piped",
        signal,
      })

      const task = command.spawn()

      await Promise.all([
        pipeThrough(readerFromStreamReader(task.stdout.getReader()), outputBuffer),
        pipeThrough(readerFromStreamReader(task.stderr.getReader()), outputBuffer),
      ])

      const status = await task.status

      return status.code
    })

    results.push(result)
  })
}

async function executionWrapper(
  filePath: string,
  run: (outputBuffer: Buffer) => Promise<number>,
): Promise<[string, number]> {
  console.log(`running ${filePath}`)

  const outputBuffer = new Buffer()
  const exitCode = await run(outputBuffer)

  if (exitCode !== 0) {
    console.log(`${filePath} failed -- console output:`)
    console.log(new TextDecoder().decode(outputBuffer.bytes()))
  }

  console.log(`finished ${filePath}`)

  return [filePath, exitCode]
}

async function pipeThrough(reader: Deno.Reader, writer: Deno.Writer) {
  const encoder = new TextEncoder()
  for await (const line of readLines(reader)) {
    await writeAll(writer, encoder.encode(`${line}\n`))
  }
}

const wrapCode = (code: string) => `
try {
  ${code}
  exit(0)
} catch (err) {
  console.error(err)
  exit(1)
}
`
