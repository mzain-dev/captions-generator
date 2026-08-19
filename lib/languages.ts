// Languages Whisper transcribes in a non-Latin script that are, in everyday practice,
// far more commonly read/typed in a casual Latin-letter ("Roman") spelling than in their
// native script — e.g. Roman Urdu on WhatsApp, Arabizi for Arabic, Hinglish for Hindi.
// Keyed by the lowercase language name Whisper's verbose_json response reports.
//
// No server-only imports here (no OpenAI SDK) so this is safe to use from client components.
export const ROMANIZABLE_LANGUAGES: Record<string, string> = {
  urdu: "Urdu",
  hindi: "Hindi",
  arabic: "Arabic",
  persian: "Persian (Farsi)",
  punjabi: "Punjabi",
};

export function isRomanizableLanguage(language: string | undefined): boolean {
  return !!language && language.toLowerCase() in ROMANIZABLE_LANGUAGES;
}

export function romanizableLanguageName(language: string): string {
  return ROMANIZABLE_LANGUAGES[language.toLowerCase()] ?? language;
}
