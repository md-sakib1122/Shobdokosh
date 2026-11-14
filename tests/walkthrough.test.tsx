// @vitest-environment jsdom
// End-to-end walkthroughs from the brief (§9.3), driving the real <App/> in jsdom.
// Network is mocked: static files come from public/, the dictionary API is canned
// (or fails, for the offline case). jsdom has no speechSynthesis/audio → toast path.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import App from "../src/App";

const ROOT = resolve(__dirname, "..");
let online = true;

const API_NECESSARY = [{
  word: "necessary",
  phonetics: [{ audio: "https://api.dictionaryapi.dev/media/pronunciations/en/necessary-us.mp3" },
    { audio: "https://api.dictionaryapi.dev/media/pronunciations/en/necessary-uk.mp3" }],
  meanings: [{ partOfSpeech: "adjective", definitions: [{ definition: "Needed, required.", example: "It is necessary to sleep." }] }],
}];

function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("api.dictionaryapi.dev")) {
    if (!online) return Promise.reject(new TypeError("Failed to fetch"));
    if (url.endsWith("/necessary")) return Promise.resolve(new Response(JSON.stringify(API_NECESSARY)));
    return Promise.resolve(new Response("{}", { status: 404 }));
  }
  const m = /data\/(.+)$/.exec(url);
  if (m) {
    const buf = readFileSync(resolve(ROOT, "public/data", m[1]));
    return Promise.resolve(new Response(buf));
  }
  return Promise.reject(new Error(`unexpected fetch ${url}`));
}

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetch));
  // jsdom lacks the modal dialog API
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  localStorage.clear();
  window.location.hash = "#/login";
});
afterAll(() => { cleanup(); vi.unstubAllGlobals(); });

const LONG = { timeout: 20_000 };

async function login(email: string) {
  const input = await screen.findByLabelText("Email");
  fireEvent.change(input, { target: { value: email } });
  fireEvent.submit(input.closest("form")!);
  await screen.findByRole("heading", { level: 1, name: /^Practice/ });
}

const nav = (name: RegExp) => fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name }));

async function answer(text: string) {
  const input = await screen.findByLabelText("Spell the word");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}

describe("walkthroughs", () => {
  test("login, add, practise with diff, learn, move, switch accounts, offline add", async () => {
    render(<App />);
    expect(screen.getByText(/anyone using this browser can open any account/)).toBeTruthy();

    // 1. log in as a@test.com → add "necessary"
    await login("A@Test.com ");
    expect(screen.getByText("No words to practice")).toBeTruthy();
    nav(/^Add$/);
    fireEvent.change(await screen.findByLabelText("English word"), { target: { value: "necessary" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await waitFor(() => expect((screen.getByLabelText(/Bangla pronunciation/) as HTMLInputElement).value).toBe("নেসেসারি"), LONG);
    await waitFor(() => expect((screen.getByLabelText("Bangla meaning") as HTMLTextAreaElement).value).toMatch(/আবশ্যক/), LONG);
    await waitFor(() => expect((screen.getByLabelText("English definition") as HTMLTextAreaElement).value).toBe("Needed, required."), LONG);
    expect((screen.getByLabelText(/Example sentence/) as HTMLTextAreaElement).value).toBe("It is necessary to sleep.");
    expect(screen.getByText("suggested")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save to Practice" }));
    await screen.findByText(/“necessary” added to Uncategorized/);

    // duplicate is blocked with a link to the existing word
    fireEvent.change(screen.getByLabelText("English word"), { target: { value: " NECESSARY " } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByText(/“necessary” is already in Practice/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open necessary" })).toBeTruthy();

    // 2. it appears in Practice; practise with a misspelling → diff
    nav(/^Practice/);
    expect(await screen.findByText("নেসেসারি")).toBeTruthy();
    await answer("neccesary");
    const wrong = await screen.findByRole("dialog");
    expect(within(wrong).getByLabelText("extra c")).toBeTruthy();
    expect(within(wrong).getByLabelText("missing s")).toBeTruthy();
    fireEvent.click(within(wrong).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // three correct in a row → "Looks learned" prompt
    for (let round = 1; round <= 3; round++) {
      await answer(round === 2 ? "  Necessary " : "necessary");
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Correct")).toBeTruthy();
      if (round < 3) {
        expect(screen.queryByText(/Looks learned/)).toBeNull();
        fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      }
    }
    expect(screen.getByText(/Looks learned – move to Words\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    await screen.findByText(/moved to Words/);

    // 3. Words: Bangla only, word hidden; speaker works (no voice in jsdom → toast); move back
    nav(/^Words/);
    const card = (await screen.findByText("নেসেসারি")).closest("article")!;
    expect(within(card).queryByText("necessary")).toBeNull();
    fireEvent.click(within(card).getByRole("button", { name: "Hear pronunciation" }));
    await screen.findByText(/Speech isn't available|No English voice|Couldn't play/);
    // verify on the card: wrong → GitHub-style diff + meaning in the modal
    const spell = within(card).getByLabelText("Spell the word");
    fireEvent.change(spell, { target: { value: "neccesary" } });
    fireEvent.click(within(card).getByRole("button", { name: "Verify" }));
    let result = await screen.findByRole("dialog");
    expect(within(result).getByText("Not quite")).toBeTruthy();
    expect(within(result).getByLabelText("extra c")).toBeTruthy();
    expect(within(result).getByLabelText("missing s")).toBeTruthy();
    fireEvent.click(within(result).getByRole("button", { name: "Bangla meaning" }));
    expect(within(result).getByText(/দরকারী/)).toBeTruthy();
    fireEvent.click(within(result).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((spell as HTMLInputElement).value).toBe("");
    // correct → "Correct", sentence shown unmasked
    fireEvent.change(spell, { target: { value: "Necessary" } });
    fireEvent.click(within(card).getByRole("button", { name: "Verify" }));
    result = await screen.findByRole("dialog");
    expect(within(result).getByText("Correct")).toBeTruthy();
    fireEvent.click(within(result).getByRole("button", { name: "Example sentence" }));
    expect(within(result).getByText("“It is necessary to sleep.”")).toBeTruthy();
    fireEvent.click(within(result).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(within(card).getByRole("button", { name: "Move to Practice" }));
    await screen.findByText("No learned words yet");

    // 4. switch to b@test.com → empty → back to a@test.com → data intact
    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
    await login("b@test.com");
    expect(screen.getByText("No words to practice")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
    await login("a@test.com");
    expect(await screen.findByText("নেসেসারি")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem("shobdo:v1")!);
    expect(stored.accounts["a@test.com"].words[0].stats).toMatchObject({ attempts: 6, correct: 4 });
    expect(stored.accounts["b@test.com"].words).toEqual([]);

    // 5. offline: Bangla spelling + meaning still saved, definition gets "Retry lookup"
    online = false;
    nav(/^Add$/);
    fireEvent.change(await screen.findByLabelText("English word"), { target: { value: "doctor" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await waitFor(() => expect((screen.getByLabelText(/Bangla pronunciation/) as HTMLInputElement).value).toBe("ডক্টর"), LONG);
    await waitFor(() => expect(screen.getByText(/Couldn't reach the dictionary/)).toBeTruthy(), LONG);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save to Practice" })); });
    nav(/^Practice/);
    const doctorRow = (await screen.findByText("ডক্টর")).closest("li")!;
    fireEvent.click(within(doctorRow).getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/ডাক্তার/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Retry lookup" })).toBeTruthy();
    // back online → retry fills the definition status (404 here → "No definition found")
    online = true;
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry lookup" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByText("No definition found")).toBeTruthy(), LONG);
  }, 120_000);
});
