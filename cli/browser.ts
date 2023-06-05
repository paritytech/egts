import { unimplemented } from "../deps/std/assert.ts"
import { Buffer } from "../deps/std/io.ts"

export interface BrowserRunFlags {
  browser?: string
  project: string
  reload: string
}

export default function run(_: BrowserRunFlags) {
  return async (pathname: string, logs: Buffer): Promise<number> => {
    unimplemented()

    // TODO
    // const project = rest.project ?? await (async () => {
    //   for (const pathname of ["deno.json", "deno.jsonc"]) {
    //     try {
    //       return JSON.parse(await Deno.readTextFile(pathname))
    //     } catch (_e) {}
    //   }
    //   return
    // })()
    // const _importMapURL = project.importMap
    //   ? path.toFileUrl(path.join(Deno.cwd(), project.importMap))
    //   : undefined
  }
}
