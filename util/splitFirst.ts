export function splitFirst(value: string, search: string): [string, string] | undefined {
  const i = value.indexOf(search)
  if (i === -1) return undefined
  return [value.slice(0, i), value.slice(i + search.length)]
}
