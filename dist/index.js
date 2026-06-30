import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { resolveSpeakerId } from "./voice-utils.js";
import { VOICE_ALIAS_ENTRIES, VOICE_ALIAS_NAMES } from "./voices.generated.js";
const DEFAULT_SPEAKER = 3;
const DEFAULT_BASE_URL = "http://127.0.0.1:50021";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_AUDIO_BYTES = 32 * 1024 * 1024;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_ERROR_BYTES = 64 * 1024;
const VOICE_DIRECTIVE_KEYS = new Set([
    "voice",
    "voicename",
    "voice_name",
    "voiceid",
    "voice_id",
    "speaker",
    "speakerid",
    "speaker_id",
    "speakervoice",
    "speaker_voice",
    "speakervoiceid",
    "speaker_voice_id",
]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function trimToUndefined(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function resolvePositiveInteger(value, fallback) {
    const number = typeof value === "number" ? value : Number(String(value).trim());
    return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}
function resolvePositiveNumber(value, fallback) {
    if (value == null)
        return fallback;
    const number = typeof value === "number" ? value : Number(String(value).trim());
    return Number.isFinite(number) && number > 0 ? number : fallback;
}
function resolveVoicevoxConfig(rawConfig, defaults) {
    const raw = isRecord(rawConfig) ? rawConfig : {};
    return {
        baseUrl: trimToUndefined(raw.baseUrl) ?? defaults?.baseUrl ?? DEFAULT_BASE_URL,
        defaultSpeakerVoice: resolveSpeakerId(raw.defaultSpeakerVoice ??
            raw.speakerVoice ??
            raw.speaker_voice ??
            raw.speakerVoiceId ??
            raw.speaker_voice_id ??
            raw.voiceName ??
            raw.voice_name ??
            raw.voiceId ??
            raw.voice_id ??
            raw.defaultVoice ??
            raw.defaultVoiceId ??
            raw.defaultStyleId ??
            raw.defaultSpeaker ??
            raw.speaker ??
            raw.voice, defaults?.defaultSpeakerVoice ?? DEFAULT_SPEAKER),
        enabled: raw.enabled === undefined ? defaults?.enabled !== false : raw.enabled !== false,
        timeoutMs: resolvePositiveInteger(raw.timeoutMs, defaults?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        speedScale: resolvePositiveNumber(raw.speedScale ?? raw.speed, defaults?.speedScale),
    };
}
function readVoicevoxProviderConfig(rawConfig) {
    if (!isRecord(rawConfig))
        return rawConfig;
    const providers = isRecord(rawConfig.providers) ? rawConfig.providers : undefined;
    const providerConfig = providers?.voicevox ?? providers?.vv;
    if (isRecord(providerConfig))
        return providerConfig;
    const legacyConfig = rawConfig.voicevox ?? rawConfig.vv;
    if (isRecord(legacyConfig))
        return legacyConfig;
    return rawConfig;
}
function resolveOverrideVoice(overrides) {
    return (overrides.speakerId ??
        overrides.speaker_id ??
        overrides.speakerVoiceId ??
        overrides.speaker_voice_id ??
        overrides.speakerVoice ??
        overrides.speaker_voice ??
        overrides.voiceName ??
        overrides.voice_name ??
        overrides.voiceId ??
        overrides.voice_id ??
        overrides.speaker ??
        overrides.voice);
}
function resolveSpeedScale(overrides, config) {
    const raw = overrides.speedScale ?? overrides.speed ?? config.speedScale;
    return resolvePositiveNumber(raw, undefined);
}
function createVoicevoxEndpointUrl(baseUrl, endpoint) {
    const url = new URL(baseUrl);
    url.search = "";
    url.hash = "";
    if (!url.pathname.endsWith("/")) {
        url.pathname = `${url.pathname}/`;
    }
    return new URL(endpoint, url);
}
function parsePcm16Wav(wavBuffer) {
    if (!Buffer.isBuffer(wavBuffer) || wavBuffer.length < 44) {
        throw new Error("VOICEVOX returned an invalid WAV payload");
    }
    if (wavBuffer.toString("ascii", 0, 4) !== "RIFF" || wavBuffer.toString("ascii", 8, 12) !== "WAVE") {
        throw new Error("VOICEVOX returned non-WAV audio");
    }
    let fmt;
    let data;
    let offset = 12;
    while (offset + 8 <= wavBuffer.length) {
        const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
        const chunkSize = wavBuffer.readUInt32LE(offset + 4);
        const chunkStart = offset + 8;
        const chunkEnd = chunkStart + chunkSize;
        if (chunkEnd > wavBuffer.length)
            break;
        if (chunkId === "fmt ") {
            fmt = {
                audioFormat: wavBuffer.readUInt16LE(chunkStart),
                channels: wavBuffer.readUInt16LE(chunkStart + 2),
                sampleRate: wavBuffer.readUInt32LE(chunkStart + 4),
                blockAlign: wavBuffer.readUInt16LE(chunkStart + 12),
                bitsPerSample: wavBuffer.readUInt16LE(chunkStart + 14),
            };
        }
        else if (chunkId === "data") {
            data = { start: chunkStart, size: chunkSize };
        }
        offset = chunkEnd + (chunkSize % 2);
    }
    if (!fmt || !data)
        throw new Error("VOICEVOX WAV is missing fmt or data chunks");
    if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
        throw new Error(`VOICEVOX WAV must be 16-bit PCM, got format=${fmt.audioFormat} bits=${fmt.bitsPerSample}`);
    }
    if (fmt.channels < 1 || fmt.blockAlign < fmt.channels * 2 || fmt.sampleRate < 1) {
        throw new Error("VOICEVOX WAV has invalid channel layout");
    }
    return { ...fmt, dataStart: data.start, dataSize: data.size };
}
function wavToMonoPcm16(wavBuffer) {
    const wav = parsePcm16Wav(wavBuffer);
    const frameCount = Math.floor(wav.dataSize / wav.blockAlign);
    if (frameCount < 1)
        throw new Error("VOICEVOX WAV contains no audio samples");
    const pcm = Buffer.allocUnsafe(frameCount * 2);
    for (let frame = 0; frame < frameCount; frame += 1) {
        const frameOffset = wav.dataStart + frame * wav.blockAlign;
        let sum = 0;
        for (let channel = 0; channel < wav.channels; channel += 1) {
            sum += wavBuffer.readInt16LE(frameOffset + channel * 2);
        }
        const sample = Math.max(-32768, Math.min(32767, Math.round(sum / wav.channels)));
        pcm.writeInt16LE(sample, frame * 2);
    }
    return { audioBuffer: pcm, sampleRate: wav.sampleRate };
}
function createTimeoutController(timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
    if (typeof timer === "object" && "unref" in timer) {
        timer.unref();
    }
    return {
        signal: controller.signal,
        clear: () => clearTimeout(timer),
    };
}
async function readBodyBuffer(res, { maxBytes, label }) {
    const contentLengthHeader = res.headers.get("content-length");
    const contentLength = contentLengthHeader == null ? undefined : Number(contentLengthHeader);
    if (contentLength !== undefined && Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error(`${label} exceeded ${maxBytes} bytes`);
    }
    if (!res.body)
        return Buffer.alloc(0);
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > maxBytes) {
            await reader.cancel();
            throw new Error(`${label} exceeded ${maxBytes} bytes`);
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks, total);
}
async function readBodyText(res, options) {
    return (await readBodyBuffer(res, options)).toString("utf8");
}
async function voicevoxSynthesize(params) {
    const timeout = createTimeoutController(params.timeoutMs);
    try {
        const queryUrl = createVoicevoxEndpointUrl(params.baseUrl, "audio_query");
        queryUrl.searchParams.set("text", params.text);
        queryUrl.searchParams.set("speaker", String(params.speakerId));
        const queryRes = await fetch(queryUrl.toString(), {
            method: "POST",
            signal: timeout.signal,
        });
        if (!queryRes.ok) {
            const errorText = await readBodyText(queryRes, {
                maxBytes: MAX_ERROR_BYTES,
                label: "VOICEVOX error response",
            });
            throw new Error(`VOICEVOX audio_query failed: ${queryRes.status} ${errorText}`);
        }
        const audioQueryText = await readBodyText(queryRes, {
            maxBytes: MAX_JSON_BYTES,
            label: "VOICEVOX audio_query response",
        });
        const audioQuery = JSON.parse(audioQueryText);
        if (params.speedScale != null) {
            audioQuery.speedScale = params.speedScale;
        }
        const synthUrl = createVoicevoxEndpointUrl(params.baseUrl, "synthesis");
        synthUrl.searchParams.set("speaker", String(params.speakerId));
        const synthRes = await fetch(synthUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(audioQuery),
            signal: timeout.signal,
        });
        if (!synthRes.ok) {
            const errorText = await readBodyText(synthRes, {
                maxBytes: MAX_ERROR_BYTES,
                label: "VOICEVOX error response",
            });
            throw new Error(`VOICEVOX synthesis failed: ${synthRes.status} ${errorText}`);
        }
        return await readBodyBuffer(synthRes, {
            maxBytes: MAX_AUDIO_BYTES,
            label: "VOICEVOX synthesis response",
        });
    }
    finally {
        timeout.clear();
    }
}
function resolveSynthesisParams(req, pluginConfig) {
    const config = resolveVoicevoxConfig(readVoicevoxProviderConfig(req.providerConfig), pluginConfig);
    const overrides = req.providerOverrides ?? {};
    return {
        config,
        speakerId: resolveSpeakerId(resolveOverrideVoice(overrides), config.defaultSpeakerVoice),
        speedScale: resolveSpeedScale(overrides, config),
        timeoutMs: resolvePositiveInteger(req.timeoutMs, config.timeoutMs),
    };
}
export default definePluginEntry({
    id: "voicevox",
    name: "VOICEVOX",
    description: "VOICEVOX text-to-speech provider for Japanese speech synthesis",
    register(api) {
        const pluginConfig = resolveVoicevoxConfig(api.pluginConfig);
        api.registerSpeechProvider({
            id: "voicevox",
            label: "VOICEVOX",
            aliases: ["vv"],
            defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
            voices: VOICE_ALIAS_NAMES,
            resolveConfig({ rawConfig }) {
                return resolveVoicevoxConfig(readVoicevoxProviderConfig(rawConfig), pluginConfig);
            },
            resolveTalkConfig({ baseTtsConfig, talkProviderConfig }) {
                const baseConfig = resolveVoicevoxConfig(readVoicevoxProviderConfig(baseTtsConfig), pluginConfig);
                return resolveVoicevoxConfig(talkProviderConfig, baseConfig);
            },
            isConfigured({ providerConfig }) {
                const config = resolveVoicevoxConfig(readVoicevoxProviderConfig(providerConfig), pluginConfig);
                if (pluginConfig.enabled === false)
                    return false;
                if (config.enabled === false)
                    return false;
                return true;
            },
            resolveTalkOverrides({ params }) {
                const speakerId = resolveSpeakerId(resolveOverrideVoice(params), null);
                const speedScale = resolvePositiveNumber(params.speed, undefined);
                return {
                    ...(speakerId == null ? {} : { speakerId }),
                    ...(speedScale === undefined ? {} : { speedScale }),
                };
            },
            parseDirectiveToken({ key, value, policy, currentOverrides }) {
                const overrides = { ...(currentOverrides ?? {}) };
                const k = key.toLowerCase();
                if (VOICE_DIRECTIVE_KEYS.has(k)) {
                    if (!policy.allowVoice)
                        return { handled: true };
                    const sid = resolveSpeakerId(value, null);
                    if (sid == null) {
                        return { handled: true, warnings: [`Unknown VOICEVOX voice: ${value}`] };
                    }
                    overrides.speakerId = sid;
                    return { handled: true, overrides };
                }
                if (k === "speed" && policy.allowVoiceSettings) {
                    const speedScale = resolvePositiveNumber(value, undefined);
                    if (speedScale !== undefined) {
                        overrides.speedScale = speedScale;
                        return { handled: true, overrides };
                    }
                    return { handled: true, warnings: [`Invalid speed value: ${value}`] };
                }
                return { handled: false };
            },
            async synthesize(req) {
                const { config, speakerId, speedScale, timeoutMs } = resolveSynthesisParams(req, pluginConfig);
                const wavBuffer = await voicevoxSynthesize({
                    baseUrl: config.baseUrl,
                    text: req.text,
                    speakerId,
                    speedScale,
                    timeoutMs,
                });
                return {
                    audioBuffer: wavBuffer,
                    outputFormat: "wav",
                    fileExtension: ".wav",
                    voiceCompatible: false,
                };
            },
            async synthesizeTelephony(req) {
                const { config, speakerId, speedScale, timeoutMs } = resolveSynthesisParams(req, pluginConfig);
                const wavBuffer = await voicevoxSynthesize({
                    baseUrl: config.baseUrl,
                    text: req.text,
                    speakerId,
                    speedScale,
                    timeoutMs,
                });
                const pcm = wavToMonoPcm16(wavBuffer);
                return {
                    audioBuffer: pcm.audioBuffer,
                    outputFormat: "pcm",
                    sampleRate: pcm.sampleRate,
                };
            },
            async listVoices() {
                const voices = [];
                for (const entry of VOICE_ALIAS_ENTRIES) {
                    if (entry.alias.endsWith("-normal"))
                        continue;
                    voices.push({
                        id: String(entry.id),
                        name: entry.alias,
                        category: entry.speaker,
                        description: `${entry.speaker} ${entry.style} - speaker_id ${entry.id}`,
                    });
                }
                return voices;
            },
        });
    },
});
