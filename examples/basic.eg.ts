/**
 * @title Example
 * @tags example,docs,deno,typescript
 * @date 10-10-2023
 * @description This description can be very long and even span
 * multiple lines. It will be parsed as expected.
 * @stability experiment
 */

// Welcome to egts. This very script is an egts.
// The jsdoc section above serves as frontmatter.
// The code serves as to-be markdown code fences.
// And the comments serve as ordinary lines of markdown body.

// Bring imports into scope.
import { toMarkdown } from "egts"
import { date, description, stability, tags, title } from "egts_frontmatter_parsers"

// Compile an egts of this very script!
const result = toMarkdown("basic.eg.ts", await Deno.readTextFile(new URL(import.meta.url)), {
  title,
  tags: tags(["example", "docs", "deno", "typescript"]),
  date: date("dd-MM-yyyy"),
  description,
  stability,
})

// Log out the typed frontmatter.
console.log(result.frontmatter)

// Write the result to the fs.
await Deno.writeTextFile(
  new URL(import.meta.resolve("./basic.eg.md")),
  `# ${result.frontmatter.title}

${result.content}
`,
)

// hide-next-line
function request(_char: string | number) {}

// Misc.

request("a")
request("b")
request("c")

// hide-start
request(1)
request(2)
request(3)
// hide-end

request("%")
request("$")
request("&")
