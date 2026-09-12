export type Tag = string;

const SPLITTERS = /[\/,;]+/;

function fold(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function parseTags(value: string | null | undefined): Tag[] {
  if (!value) return [];

  const tags: Tag[] = [];
  const seen = new Set<string>();

  for (const part of value.split(SPLITTERS)) {
    const tag = part.trim();
    if (!tag) continue;

    const key = fold(tag);
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function tagKey(tag: Tag): string {
  return fold(tag);
}

export function materialHasTag<T extends { description: string | null }>(
  material: T,
  tag: Tag
): boolean {
  const key = tagKey(tag);
  return parseTags(material.description).some((t) => tagKey(t) === key);
}
