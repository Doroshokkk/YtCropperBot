import { en } from "./en";
import { uk } from "./uk";

export type Lang = "en" | "uk";
export type TranslationKey = keyof typeof en;

const translations: Record<Lang, Record<TranslationKey, string>> = { en, uk };
export const langs: Lang[] = ["en", "uk"];

export function t(lang: Lang, key: TranslationKey, params?: Record<string, string | number>): string {
    let text = translations[lang][key];
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replace(`{${name}}`, String(value));
        }
    }
    return text;
}

export function hearKeys(key: TranslationKey): string[] {
    return langs.map((lang) => t(lang, key));
}

export function isDoneInput(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    return hearKeys("btn.done").some((label) => label.toLowerCase() === normalized);
}

export function mapTimeError(lang: Lang, message: string): string {
    if (message.includes("MM:SS")) {
        return t(lang, "error.invalidTimeFormat");
    }
    if (message.includes("number of seconds")) {
        return t(lang, "error.invalidSecondsInput");
    }
    return message;
}
