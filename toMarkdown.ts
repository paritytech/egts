import { FrontmatterParsers, parseFrontmatter } from "./frontmatter.ts"

type Directive = "hide-start" | "hide-end" | "hide-next-line"
const rDirective = /^\s*\/{2}\s*(?<directive>hide-start|hide-end|hide-next-line)(?:\s+.*)?$/
const rMarkdownLine = /^\s*\/{3} ?(?<content>.+)/

type Line =
  | { kind: "markdown"; content: string }
  | { kind: "code"; content: string }
  | { kind: "directive"; directive: Directive }
  | { kind: "blank"; content: "" }

export function toMarkdown<F extends Record<string, unknown>>(
  pathname: string,
  src: string,
  parsers: FrontmatterParsers<F>,
) {
  const { frontmatter, body } = parseFrontmatter(pathname, src, parsers)

  const lines = body.split("\n").map((line): Line => {
    if (line.trim() === "") return { kind: "blank", content: "" }

    const directiveMatch = rDirective.exec(line)
    if (directiveMatch) {
      const directive = directiveMatch.groups!.directive! as Directive
      return { kind: "directive", directive }
    }

    const markdownMatch = rMarkdownLine.exec(line)
    if (markdownMatch) {
      const content = markdownMatch.groups!.content!
      return { kind: "markdown", content }
    }

    return { kind: "code", content: line }
  })

  console.log(lines)

  const filteredLines = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!
    if (line.kind === "directive") {
      if (line.directive === "hide-next-line") {
        i += 2
      } else if (line.directive === "hide-start") {
        while (true) {
          i++
          const line = lines[i]
          if (!line) throw new Error("unmatched hide-start comment")
          if (line.kind === "directive" && line.directive === "hide-end") {
            i++
            break
          }
        }
      } else if (line.directive === "hide-end") {
        throw new Error("unmatched hide-end comment")
      } else {
        assertNever(line.directive)
      }
    } else {
      filteredLines.push(line)
      i++
    }
  }

  type Section = { kind: "code" | "markdown"; lines: string[] }
  const sections: Section[] = []

  for (const line of filteredLines) {
    if ((line.kind === "code" || line.kind === "markdown") && sections.at(-1)?.kind !== line.kind) {
      sections.push({ kind: line.kind, lines: [] })
    }
    sections.at(-1)?.lines.push(line.content)
  }

  const content = sections.map((section) => {
    const inner = section.lines.join("\n")
    return section.kind === "code" ? `\`\`\`ts\n${inner}\`\`\`` : inner
  }).join("\n\n")

  return { frontmatter, content }
}

function assertNever(value: never) {
  throw new Error(`Expected to never be called; got ${Deno.inspect(value)}`)
}
