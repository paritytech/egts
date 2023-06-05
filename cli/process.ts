import { Buffer, readLines } from "../deps/std/io.ts"
import { readerFromStreamReader, writeAll } from "../deps/std/streams.ts"

export interface DenoRunFlags {
  reload?: string
}

export function runDeno({ reload }: DenoRunFlags) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    const flags = reload ? [`-r${reload === "" ? "" : `=${reload}`}`] : []
    const process = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", ...flags, pathname],
      stdout: "piped",
      stderr: "piped",
    }).spawn()
    return runProcess(process, logs)
  }
}

export function runNode({}: Record<string, unknown>) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    const process = new Deno.Command("node", {
      args: [pathname],
      stdout: "piped",
      stderr: "piped",
    }).spawn()
    return runProcess(process, logs)
  }
}

async function runProcess(process: Deno.ChildProcess, logs: Buffer) {
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
