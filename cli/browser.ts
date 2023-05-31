import { nodeModulesPolyfillPlugin } from "npm:esbuild-plugins-node-modules-polyfill"
import * as esbuild from "../deps/esbuild.ts"
import puppeteer from "../deps/puppeteer.ts"
import { deferred } from "../deps/std/async.ts"
import { Buffer } from "../deps/std/io.ts"
import * as path from "../deps/std/path.ts"

const controller = new AbortController()
const { signal } = controller

export interface BrowserRunFlags {
  browser?: string | undefined
  // project: string
  // reload: string
}

export default function run(_: BrowserRunFlags) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    const consoleJs = await fetch(import.meta.resolve("../console.js")).then((r) => r.text())

    const shimPath = import.meta.resolve("./shim.js").replaceAll("file://", "")

    const buildResult = await esbuild.build({
      entryPoints: [pathname],
      plugins: [nodeModulesPolyfillPlugin() as any],
      bundle: true,
      write: false,
      inject: [shimPath],
      format: "esm",
    })

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    signal.addEventListener("abort", async () => {
      await browser.close()
    })

    const page = await browser.newPage()

    await page.exposeFunction("__trun_injected_log", (...[msg]: [string, number]) => {
      logs.writeSync(new TextEncoder().encode(msg))
    })

    const exitCode = deferred<number>()
    await page.exposeFunction("exit", (args: string) => {
      exitCode.resolve(Number(args))
    })

    await page.addScriptTag({ content: consoleJs, type: "module" })
    const code = wrapCode(buildResult.outputFiles[0]?.text!)

    Deno.writeFileSync("derp.js", new TextEncoder().encode(code))

    await page.addScriptTag({ content: code, type: "module" })

    return exitCode
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
