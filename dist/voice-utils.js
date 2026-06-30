import { VOICE_ALIASES } from "./voices.generated.js";
export function resolveSpeakerId(voice, fallback) {
    if (voice == null)
        return fallback;
    if (typeof voice === "number" && Number.isInteger(voice) && voice >= 0)
        return voice;
    const normalized = String(voice).trim().toLowerCase();
    if (/^\d+$/u.test(normalized))
        return Number(normalized);
    const id = VOICE_ALIASES.get(normalized);
    return id ?? fallback;
}
