import { titleCase } from "./deps/case.ts"
import * as $ from "./deps/scale.ts"
import * as datetime from "./deps/std/datetime.ts"
import { FrontmatterParser } from "./frontmatter.ts"

export const title: FrontmatterParser<string> = (raw) => {
  $.assert($.str, raw)
  return titleCase(raw)
}

export const description: FrontmatterParser<string> = (raw) => {
  $.assert($.str, raw)
  return raw
}

const $stability = $.literalUnion(["experiment", "unstable", "nearing", "stable"])
export const stability: FrontmatterParser<$.Native<typeof $stability>> = (raw) => {
  $.assert($stability, raw)
  return raw
}

export function tags<T extends string>(allowed: T[]): FrontmatterParser<T[]> {
  return (raw) => {
    const tags = raw?.split(",")
    $.assert($.array($.literalUnion(allowed)), tags)
    return tags
  }
}

export function date(format: string): FrontmatterParser<Date> {
  return (raw) => {
    $.assert($.str, raw)
    return datetime.parse(raw, format)
  }
}
