// One shared speak() helper: saved dictionary audio first (UK preferred at save time),
// then speechSynthesis with an en-GB voice (else any en-*), rate 0.9. Never throws.

type Notify = (message: string) => void;
let notify: Notify = () => undefined;

/** Register where playback problems are reported (the toast system). */
export function setSpeechNotifier(fn: Notify): void {
  notify = fn;
}

function playAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(url);
      audio.onerror = () => resolve(false);
      audio.play().then(() => resolve(true), () => resolve(false)); // blocked autoplay → false
    } catch {
      resolve(false);
    }
  });
}

function voices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  // Chrome fills the list asynchronously
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1000);
  });
}

export function pickVoice(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  return list.find((v) => lang(v) === "en-gb") ?? list.find((v) => lang(v).startsWith("en")) ?? null;
}

async function speakTts(word: string): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    notify("Speech isn't available in this browser.");
    return false;
  }
  try {
    const voice = pickVoice(await voices());
    if (!voice) {
      notify("No English voice is installed on this device.");
      return false;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    u.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") notify("Couldn't play the pronunciation.");
    };
    synth.speak(u);
    return true;
  } catch {
    notify("Couldn't play the pronunciation.");
    return false;
  }
}

export async function speak(word: string, audioUrl?: string | null): Promise<boolean> {
  if (audioUrl && (await playAudio(audioUrl))) return true;
  return speakTts(word);
}
