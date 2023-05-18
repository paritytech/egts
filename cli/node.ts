import * as esbuild from "../deps/esbuild.ts"
import { denoPlugins } from "../deps/esbuild_deno_loader.ts"
import { Buffer, readLines } from "../deps/std/io.ts"
import { readerFromStreamReader, writeAll } from "../deps/std/streams.ts"

export interface NodeRunFlags {
  importMap: string
}

export default function run({ importMap }: NodeRunFlags) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    const dir = await Deno.makeTempDir()
    const output = await Deno.makeTempFile({ dir, suffix: ".mjs" })
    await esbuild.build({
      plugins: [
        ...denoPlugins({
          importMapURL: `file://${Deno.cwd()}/${importMap}`,
        }),
      ],
      entryPoints: [pathname],
      bundle: true,
      write: true,
      format: "esm",
      outfile: output,
    })

    const process = new Deno.Command("node", {
      args: [output],
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
}
