import OpenAI from "openai";

export class TransliterationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TransliterationError";
  }
}

// Keep batches small so the model can't drift out of alignment with the input array,
// and so a single bad batch doesn't risk the whole (possibly long) transcript.
const BATCH_SIZE = 80;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TransliterationError("OPENAI_API_KEY is not configured on the server.");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

async function transliterateBatch(words: string[]): Promise<string[]> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You transliterate Urdu-script words into Roman Urdu (Urdu written phonetically " +
          "in Latin letters, the casual style Urdu speakers use when typing, e.g. on WhatsApp). " +
          'You receive a JSON array of words in order. Return a JSON object {"words": [...]} ' +
          "with EXACTLY the same number of items in the same order, each item being the Roman " +
          "Urdu spelling of the corresponding input word. Keep punctuation attached to a word " +
          "(e.g. a trailing comma or period) attached to its transliteration. Do not merge, " +
          "split, drop, or reorder words.",
      },
      { role: "user", content: JSON.stringify(words) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new TransliterationError("Empty response from the transliteration model.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new TransliterationError("Transliteration response was not valid JSON.", err);
  }

  const result = (parsed as { words?: unknown }).words;
  if (!Array.isArray(result) || result.length !== words.length) {
    throw new TransliterationError(
      "Transliteration response length did not match the input word count."
    );
  }

  return result.map((w) => String(w));
}

/** Transliterates a list of Urdu-script words into Roman Urdu, preserving order and count. */
export async function transliterateToRomanUrdu(words: string[]): Promise<string[]> {
  const output: string[] = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    output.push(...(await transliterateBatch(batch)));
  }
  return output;
}
