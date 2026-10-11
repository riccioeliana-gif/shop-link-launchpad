// Tag chips. Tailwind can't build dynamic class names, so keep full literal
// classes here and route the tag to one through a tiny hash — the same tag
// always gets the same colour across pages.
const TAG_CHIP: Array<{ bg: string; text: string }> = [
  { bg: "bg-brand-yellow", text: "text-ink" },
  { bg: "bg-brand-pink", text: "text-ink" },
  { bg: "bg-brand-blue", text: "text-white" },
  { bg: "bg-brand-green", text: "text-white" },
  { bg: "bg-brand-purple", text: "text-white" },
];

export function tagChipClass(tag: string): string {
  let hash = 0;
  for (const char of tag) hash = (hash + char.charCodeAt(0)) % TAG_CHIP.length;
  const chip = TAG_CHIP[hash];
  return `${chip.bg} ${chip.text}`;
}
