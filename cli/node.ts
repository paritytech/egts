import { Buffer, readLines } from "../deps/std/io.ts"
import { readerFromStreamReader, writeAll } from "../deps/std/streams.ts"

export interface NodeRunFlags {
}

export default function run({}: NodeRunFlags) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    const process = new Deno.Command("node", {
      args: [pathname],
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
