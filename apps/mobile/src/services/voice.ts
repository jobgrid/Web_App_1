import { DEMO_UTTERANCE } from "./prompts";

interface SpeechResultEvent {
  results: { 0: { 0: { transcript: string } } };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function transcribeUtterance(fallback = DEMO_UTTERANCE): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      resolve(text.trim() || fallback);
    };

    const host = typeof window === "undefined" ? undefined : (window as SpeechWindow);
    const Recognition = host?.SpeechRecognition ?? host?.webkitSpeechRecognition;
    if (!Recognition) {
      setTimeout(() => finish(fallback), 1100);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => finish(event.results[0][0].transcript);
    recognition.onerror = () => finish(fallback);
    recognition.onend = () => finish(fallback);
    try {
      recognition.start();
    } catch {
      finish(fallback);
      return;
    }
    setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        finish(fallback);
      }
    }, 4500);
  });
}
