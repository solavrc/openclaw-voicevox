import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

type PluginManifest = {
  configSchema: {
    properties: {
      defaultSpeakerVoice: {
        oneOf: Array<{
          enum?: string[];
        }>;
      };
    };
  };
};

type VoiceUtilsModule = {
  resolveSpeakerId(voice: unknown, fallback: number): number;
  resolveSpeakerId(voice: unknown, fallback: null): number | null;
};

type VoicesGeneratedModule = {
  VOICE_ALIAS_ENTRIES: readonly unknown[];
  VOICE_ALIAS_NAMES: readonly string[];
};

const voiceUtils = await import(pathToFileURL(resolve("dist/voice-utils.js")).href) as VoiceUtilsModule;
const voicesGenerated = await import(pathToFileURL(resolve("dist/voices.generated.js")).href) as VoicesGeneratedModule;

test("resolves friendly aliases and raw VOICEVOX style ids", () => {
  assert.equal(voiceUtils.resolveSpeakerId("zundamon", 999), 3);
  assert.equal(voiceUtils.resolveSpeakerId(" ZUNDAMON-NAMIDAME ", 999), 76);
  assert.equal(voiceUtils.resolveSpeakerId("126", 999), 126);
  assert.equal(voiceUtils.resolveSpeakerId(118, 999), 118);
});

test("falls back for unknown or invalid voices", () => {
  assert.equal(voiceUtils.resolveSpeakerId("unknown-voice", 3), 3);
  assert.equal(voiceUtils.resolveSpeakerId("unknown-voice", null), null);
  assert.equal(voiceUtils.resolveSpeakerId(-1, 3), 3);
});

test("generated aliases are unique and match plugin schema enum", () => {
  assert.equal(new Set(voicesGenerated.VOICE_ALIAS_NAMES).size, voicesGenerated.VOICE_ALIAS_NAMES.length);
  assert.equal(voicesGenerated.VOICE_ALIAS_ENTRIES.length, voicesGenerated.VOICE_ALIAS_NAMES.length);

  const manifest = JSON.parse(readFileSync("openclaw.plugin.json", "utf8")) as PluginManifest;
  const schemaAliases = manifest.configSchema.properties.defaultSpeakerVoice.oneOf[0].enum;
  assert.deepEqual(schemaAliases, voicesGenerated.VOICE_ALIAS_NAMES);
});
