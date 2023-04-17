# Example

Welcome to egts. This very script is an egts. The jsdoc section above serves as
frontmatter. The code serves as to-be markdown code fences. And the comments
serve as ordinary lines of markdown body.

Bring imports into scope.

```ts
import { compile } from "egts"
import { date, description, stability, tags, title } from "egts_frontmatter_parsers"
```

Compile an egts of this very script!

```ts
const result = compile("basic.eg.ts", await Deno.readTextFile(new URL(import.meta.url)), {
  title,
  tags: tags(["example", "docs", "deno", "typescript"]),
  date: date("yyyy-MM-dd"),
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
  `# ${result.frontmatter.title}

${result.content}
`,
)
```

Misc.

```ts
request("a")
request("b")
request("c")


request("%")
request("$")
request("&")
```

