import { useMemo } from "react";
import { UNCATEGORIZED_ID, categoryCounts, hasUserCategories, sortCategories, type Category } from "../lib/storage";
import { useAccount } from "./DBContext";

/** Sorted categories, per-category counts and an id lookup for the signed-in account. */
export function useCategories() {
  const account = useAccount();
  return useMemo(() => {
    const sorted = sortCategories(account.categories);
    const byId = new Map<string, Category>(sorted.map((c) => [c.id, c]));
    return {
      categories: sorted,
      counts: categoryCounts(account),
      byId,
      /** The category a word belongs to (falls back to Uncategorized). */
      of: (id: string) => byId.get(id) ?? byId.get(UNCATEGORIZED_ID)!,
      hasUser: hasUserCategories(account),
    };
  }, [account]);
}
