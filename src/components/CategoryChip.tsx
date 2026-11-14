import { UNCATEGORIZED_ID, type Category } from "../lib/storage";

/** Square category chip (DESIGN.md › Category chip). Uncategorized uses the receded variant. */
export default function CategoryChip({ category, wrap = false }: { category: Category; wrap?: boolean }) {
  const cls = category.id === UNCATEGORIZED_ID ? "chip-uncategorized" : "chip-category";
  return (
    <span
      className={`${cls} ${wrap ? "h-auto min-h-6 max-w-none whitespace-normal py-0.5" : ""}`}
      title={wrap ? undefined : `Category: ${category.name}`}
    >
      <span className={wrap ? "" : "truncate"}>{category.name}</span>
    </span>
  );
}
