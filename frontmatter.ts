const rFrontmatterFile = /^\s*\/\*\*(?<comment>.+?)\*\/\s*(?<body>.*)$/s
const rLeadingAsterisk = /^\s*(?:\* ?)?/gm
const rTagStart = /^(?=@\w+)/m
const rTag = /^@(?<key>\w+)\s+(?<value>.*)/s

export function parseFrontmatter<F extends Record<string, unknown>>(
  pathname: string,
  src: string,
  parsers: FrontmatterParsers<F>,
): ParseFrontmatterResult<F> {
  const fileMatch = rFrontmatterFile.exec(src)
  if (!fileMatch) throw new Error("no frontmatter comment")
  const { comment = "", body = "" } = fileMatch.groups ?? {}
  const commentContent = comment.replace(rLeadingAsterisk, "").trim()
  const tagsText = commentContent.split(rTagStart)
  const frontmatterRaw = Object.fromEntries(
    tagsText.map((pairText) => {
      const tagMatch = rTag.exec(pairText)
      if (!tagMatch) throw new Error("invalid tag syntax")
      const { key = "", value = "" } = tagMatch.groups ?? {}
      return [key, value.trim()]
    }),
  )
  const frontmatter = {} as F
  for (const [key, parse] of Object.entries(parsers)) {
    try {
      frontmatter[key as keyof F] = parse(frontmatterRaw[key])
    } catch (e) {
      throw new Error(`Failed to parse "${key}" from "${pathname}"\n${Deno.inspect(e)}`)
    }
  }
  return { frontmatter, body }
}

export type FrontmatterParsers<F extends Record<string, unknown>> = {
  [K in keyof F]: FrontmatterParser<F[K]>
}
export type FrontmatterParser<T> = (raw: string | undefined) => T

export interface ParseFrontmatterResult<F extends Record<string, unknown>> {
  frontmatter: F
  body: string
}
