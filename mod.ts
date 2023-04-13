import { FrontmatterParsers, parse } from "./frontmatter.ts"
import { formatter } from "./util/formatter/md.ts"

export function compile<F extends Record<string, unknown>>(
  pathname: string,
  src: string,
  parsers: FrontmatterParsers<F>,
) {
  const { frontmatter, body } = parse(pathname, src, parsers)

  const lines = body.split("\n")
  let i = 0
  let line = lines[i]

  const sections: string[][] = []
  while (typeof line === "string") {
    const isCommentSection = line.startsWith("//")
    const section = isCommentSection ? [] : ["```ts"]
    sections.push(section)

    while (typeof line === "string") {
      if (line === IGNORE_NEXT_LINE) {
        advance(2)
        continue
      }

      if (line === IGNORE_START) {
        while (true) {
          if (typeof line !== "string") {
            throw new Error(`Hit end of "${pathname}" before \`hide-end\``)
          }
          advance()
          if (line.startsWith(IGNORE_END)) {
            advance()
            break
          }
        }
        continue
      }

      const isEmptyLine = line === ""
      const isCommentLine = line.startsWith("//")

      if (isCommentSection && (isEmptyLine || isCommentLine)) {
        section.push(line.slice(2))
        advance()
        continue
      }

      if (!isCommentSection && (isEmptyLine || !isCommentLine)) {
        section.push(line)
        advance()
        continue
      }

      if (!isCommentSection) section.push("```")

      break
    }
  }

  const content = formatter.formatText(
    pathname,
    sections.map((section) => section.join("\n")).join("\n"),
  )

  return { frontmatter, content }

  function advance(count = 1) {
    i += count
    line = lines[i]
  }
}

const IGNORE_START = "// hide-start"
const IGNORE_END = "// hide-end"
const IGNORE_NEXT_LINE = "// hide-next-line"
