"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type SR = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
};

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Thin wrapper around the browser's Web Speech API. */
export function useSpeech(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const rec = useRef<SR | null>(null);
  const finalRef = useRef("");
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => setSupported(!!getSR()), []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const C = getSR();
    if (!C) { setError("Voice input isn't supported in this browser. Try Chrome or Safari."); return; }
    setError(null);
    finalRef.current = "";
    setInterim("");
    const r = new C();
    r.lang = navigator.language || "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let fin = "", mid = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript; else mid += res[0].transcript;
      }
      finalRef.current = fin;
      setInterim((fin + " " + mid).trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Microphone access is blocked. Allow it in your browser settings.");
      else if (e.error === "no-speech") setError("Didn't catch that. Tap the mic and try again.");
      else if (e.error !== "aborted") setError("Voice input stopped. Try again.");
    };
    r.onend = () => {
      setListening(false);
      const text = (finalRef.current || "").trim();
      if (text) cb.current(text);
      setInterim("");
    };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setError("Couldn't start the microphone."); }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);
  return { supported, listening, interim, error, start, stop };
}
