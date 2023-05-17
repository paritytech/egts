import { unimplemented } from "https://deno.land/std@0.182.0/testing/asserts.ts"

export default async function(browser: string, project: string, reload: string) {
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
