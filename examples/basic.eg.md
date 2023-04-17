<!-- This file is @generated by egts -->

# Example

Welcome to egts. This very script is an egts.
The jsdoc section above serves as frontmatter.
The code serves as to-be markdown code fences.
And the comments serve as ordinary lines of markdown body.

Bring imports into scope.

```ts
import { toMarkdown } from "egts"
import { date, description, stability, tags, title } from "egts_frontmatter_parsers"
```

Compile an egts of this very script!

```ts
const result = toMarkdown("basic.eg.ts", await Deno.readTextFile(new URL(import.meta.url)), {
  title,
  tags: tags(["example", "docs", "deno", "typescript"]),
  date: date("dd-MM-yyyy"),
  description,
  stability,
})
```

Log out the typed frontmatter.

```ts
console.log(result.frontmatter)
```

Write the result to the fs.

```ts
await Deno.writeTextFile(
  new URL(import.meta.resolve("./basic.eg.md")),
  `<!-- This file is @generated by egts -->

# ${result.frontmatter.title}

${result.content}
`,
)
```