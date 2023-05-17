import { unimplemented } from "https://deno.land/std@0.182.0/testing/asserts.ts"
import { Command } from "../deps/cliffy.ts"

const cmd = new Command()
  .name("browser")
  .option("-b, --browser", "browser binary")
  .option("-p, --project <project>", "project")
  .option("-r, --reload <reload>", "reload")
  .action(() => {
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
  })

export default cmd
