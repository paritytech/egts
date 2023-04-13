import { splitFirst } from "./util/splitFirst.ts"

export function parse<F extends Record<string, unknown>>(
  pathname: string,
  src: string,
  parsers: FrontmatterParsers<F>,
): ParseResult<F> {
  const pieces = splitFirst(src, FRONTMATTER_TRAILING)
  if (!pieces) {
    throw new Error(
      `Expected "${FRONTMATTER_TRAILING}" to terminate frontmatter section of "${pathname}"`,
    )
  }
  const lines = pieces[0].split("\n").slice(1)
  const frontmatterRaw = Object.fromEntries(
    lines.reduce<[string, string][]>((acc, line, i) => {
      const lineI = i + 1
      if (line.startsWith(KV_LEADING)) {
        const field = line.slice(KV_LEADING.length)
        let kv = splitFirst(field, " ")
        if (!kv) kv = [field, ""]
        acc.push(kv)
      } else if (line.startsWith(V_LEADING)) {
        const prev = acc[acc.length - 1]
        if (!prev) {
          throw new Error(`Expected "@"-prefixed key to precede line ${lineI} of "${pathname}"`)
        }
        prev[1] += "\n" + line.slice(V_LEADING.length)
      } else throw new Error(`Expected leading " * " on line ${lineI} of "${pathname}"`)
      return acc
    }, []),
  )
  const frontmatter = {} as F
  for (const [key, parse] of Object.entries(parsers)) {
    try {
      frontmatter[key as keyof F] = parse(frontmatterRaw[key])
    } catch (e) {
      throw new Error(`Failed to parse "${key}" from "${pathname}"\n${Deno.inspect(e)}`)
    }
  }
  return { frontmatter, body: pieces[1] }
}

export type FrontmatterParsers<F extends Record<string, unknown>> = {
  [K in keyof F]: FrontmatterParser<F[K]>
}
export type FrontmatterParser<T> = (raw: string | undefined) => T

export interface ParseResult<F extends Record<string, unknown>> {
  frontmatter: F
  body: string
}

const FRONTMATTER_TRAILING = "\n */\n\n"
const KV_LEADING = " * @"
const V_LEADING = " *"
