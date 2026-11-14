// @vitest-environment jsdom
// Category journey through the real <App/>: v1 data migrates, categories are created,
// a word is moved via Word details, Practice filters (and remembers), delete + Undo.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import App from "../src/App";

const ROOT = resolve(__dirname, "..");
const A = "a@test.com";

function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  const m = /data\/(.+)$/.exec(url);
  if (m) return Promise.resolve(new Response(readFileSync(resolve(ROOT, "public/data", m[1]))));
  return Promise.resolve(new Response("{}", { status: 404 }));
}

const v1Word = (word: string, bn: string, status: "practice" | "all" = "practice") => ({
  id: `id-${word}`, word, bnPronunciation: bn, pronSource: "override", pronReliable: true, bnMeaning: null,
  definition: null, partOfSpeech: null, audioUrl: null, sentence: null, status,
  stats: { attempts: 0, correct: 0, streak: 0, lastPracticedAt: null },
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
});

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetch));
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  Element.prototype.scrollIntoView ??= function () { /* jsdom */ };
  // A v1 document from before categories existed, already signed in.
  localStorage.clear();
  localStorage.setItem("shobdo:v1", JSON.stringify({
    version: 1, session: A,
    accounts: { [A]: { email: A, createdAt: "2026-01-01T00:00:00.000Z", words: [v1Word("apple", "অ্যাপল"), v1Word("train", "ট্রেন")] } },
  }));
  window.location.hash = "#/practice";
});
afterAll(() => { cleanup(); vi.unstubAllGlobals(); });

const nav = (name: RegExp) => fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name }));
const stored = () => JSON.parse(localStorage.getItem("shobdo:v1")!);

describe("categories", () => {
  test("migrate, create, assign, filter, delete + undo", async () => {
    render(<App />);

    // v1 → v2 is silent: both words are in Practice, no filter yet (only Uncategorized exists)
    expect(await screen.findByText("অ্যাপল")).toBeTruthy();
    expect(screen.getByText("ট্রেন")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Category" })).toBeNull();

    // Categories: empty state → create "Travel"
    nav(/^Categories/);
    expect(await screen.findByText("Group your words into lists")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create a category" }));
    const name = await screen.findByLabelText("Category name");
    fireEvent.change(name, { target: { value: "uncategorized" } });
    expect(screen.getByText(/You already have a category called “Uncategorized”/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(name, { target: { value: "  Travel " } });
    fireEvent.submit(name.closest("form")!);
    await screen.findByText(/Category “Travel” created/);
    expect(stored().version).toBe(2);

    // Word details: move "train" into Travel with the change-mode combobox
    nav(/^Practice/);
    const trainCard = (await screen.findByText("ট্রেন")).closest("article")!;
    fireEvent.click(within(trainCard).getByRole("button", { name: "Details" }));
    const details = await screen.findByRole("dialog");
    fireEvent.click(within(details).getByRole("button", { name: "Change" }));
    const change = within(details).getByRole("combobox");
    fireEvent.focus(change);
    fireEvent.change(change, { target: { value: "trav" } });
    const option = await within(details).findByRole("option", { name: /Travel/ });
    fireEvent.click(option);
    await screen.findByText("Moved to Travel.");
    fireEvent.click(within(details).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Practice filter: pick Travel by keyboard → only "train"; selection is remembered
    const filter = screen.getByRole("combobox", { name: "Category" });
    fireEvent.change(filter, { target: { value: "Tra" } });
    expect(filter.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(filter, { key: "Enter" });
    await screen.findByText(/1 word in/);
    expect(screen.queryByText("অ্যাপল")).toBeNull();
    expect(screen.getByText("ট্রেন")).toBeTruthy();
    expect(stored().accounts[A].prefs.practiceCategory).not.toBe("all");

    // Delete Travel → confirm names the counts → word goes to Uncategorized, filter resets
    nav(/^Categories/);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Travel" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText(/Its 1 word moves to Uncategorized \(1 in practice, 0 learned\)/)).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Cancel"); // safe default focus
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete category" }));
    await screen.findByText(/“Travel” deleted\. 1 word moved to Uncategorized\./);
    let acc = stored().accounts[A];
    expect(acc.categories).toHaveLength(1);
    expect(acc.prefs.practiceCategory).toBe("all");

    // Undo restores the category, the word's membership and the remembered filter
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); });
    await screen.findByText("“Travel” restored.");
    acc = stored().accounts[A];
    const travel = acc.categories.find((c: { name: string }) => c.name === "Travel");
    expect(travel).toBeTruthy();
    expect(acc.words.find((w: { word: string }) => w.word === "train").categoryId).toBe(travel.id);
    expect(acc.prefs.practiceCategory).toBe(travel.id);
  }, 60_000);
});
