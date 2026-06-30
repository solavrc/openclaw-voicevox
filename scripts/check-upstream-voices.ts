#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Args = Map<string, string | true>;

type RawVoicevoxStyle = {
  name?: unknown;
  id?: unknown;
  type?: unknown;
};

type RawVoicevoxSpeaker = {
  name?: unknown;
  speaker_uuid?: unknown;
  styles?: unknown;
};

type SnapshotStyle = {
  name: string;
  id: number;
  type?: string;
};

type SnapshotSpeaker = {
  name: string;
  speaker_uuid: string;
  styles: SnapshotStyle[];
};

type Snapshot = {
  engineVersion: string;
  speakers: SnapshotSpeaker[];
};

type FlatStyle = {
  speakerName: string;
  speakerUuid: string;
  styleName: string;
  styleId: number;
  type?: string;
};

type SnapshotDiff = {
  added: FlatStyle[];
  removed: FlatStyle[];
  changed: Array<{ before: FlatStyle; after: FlatStyle }>;
  currentStyles: Map<string, FlatStyle>;
};

type ConfiguredVoiceStyle = {
  name: string;
  id: number;
  aliases: string[];
};

type ConfiguredVoiceSpeaker = {
  speaker: string;
  styles: ConfiguredVoiceStyle[];
};

type MissingAlias = {
  speaker: string;
  style: string;
  id: number;
  aliases: string[];
};

const args: Args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === "--update" || arg === "--strict-aliases") {
    args.set(arg.slice(2), true);
    continue;
  }
  if (arg.startsWith("--")) {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
    args.set(arg.slice(2), value);
    index += 1;
  }
}

const baseUrl = args.get("url") ?? process.env.VOICEVOX_ENGINE_URL ?? "http://127.0.0.1:50021";
const snapshotPath = args.get("snapshot") ?? "data/voicevox-upstream-speakers.snapshot.json";
const update = args.get("update") === true;
const strictAliases = args.get("strict-aliases") === true;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function readEngineJson(endpoint: string): Promise<unknown> {
  const url = new URL(endpoint, String(baseUrl));
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VOICEVOX ${endpoint} failed: ${res.status} ${text}`);
  }
  return res.json();
}

function normalizeSpeakers(speakers: unknown): SnapshotSpeaker[] {
  assert.ok(Array.isArray(speakers), "VOICEVOX /speakers response must be an array");
  return (speakers as RawVoicevoxSpeaker[])
    .map((speaker) => {
      if (typeof speaker.name !== "string") throw new Error("speaker.name must be a string");
      if (typeof speaker.speaker_uuid !== "string") {
        throw new Error(`${speaker.name} speaker_uuid must be a string`);
      }
      assert.ok(Array.isArray(speaker.styles), `${speaker.name} styles must be an array`);
      const speakerName = speaker.name;
      const speakerUuid = speaker.speaker_uuid;
      return {
        name: speakerName,
        speaker_uuid: speakerUuid,
        styles: (speaker.styles as RawVoicevoxStyle[])
          .map((style) => {
            if (typeof style.name !== "string") throw new Error(`${speakerName} style.name must be a string`);
            if (typeof style.id !== "number" || !Number.isInteger(style.id)) {
              throw new Error(`${speakerName}/${style.name} style.id must be an integer`);
            }
            const styleName = style.name;
            const styleId = style.id;
            return {
              name: styleName,
              id: styleId,
              type: typeof style.type === "string" ? style.type : undefined,
            };
          })
          .sort((a, b) => a.id - b.id),
      };
    })
    .sort((a, b) => a.speaker_uuid.localeCompare(b.speaker_uuid));
}

function flattenSnapshot(snapshot: Snapshot): Map<string, FlatStyle> {
  const entries = new Map<string, FlatStyle>();
  for (const speaker of snapshot.speakers) {
    for (const style of speaker.styles) {
      entries.set(`${speaker.speaker_uuid}:${style.id}`, {
        speakerName: speaker.name,
        speakerUuid: speaker.speaker_uuid,
        styleName: style.name,
        styleId: style.id,
        type: style.type,
      });
    }
  }
  return entries;
}

function formatStyle(style: FlatStyle): string {
  const type = style.type ? `, type=${style.type}` : "";
  return `- ${style.speakerName} / ${style.styleName} / id=${style.styleId}${type} / uuid=${style.speakerUuid}`;
}

function diffSnapshots(baseline: Snapshot, current: Snapshot): SnapshotDiff {
  const baselineStyles = flattenSnapshot(baseline);
  const currentStyles = flattenSnapshot(current);
  const added: FlatStyle[] = [];
  const removed: FlatStyle[] = [];
  const changed: Array<{ before: FlatStyle; after: FlatStyle }> = [];

  for (const [key, style] of currentStyles) {
    const old = baselineStyles.get(key);
    if (!old) {
      added.push(style);
      continue;
    }
    if (old.speakerName !== style.speakerName || old.styleName !== style.styleName || old.type !== style.type) {
      changed.push({ before: old, after: style });
    }
  }

  for (const [key, style] of baselineStyles) {
    if (!currentStyles.has(key)) removed.push(style);
  }

  return { added, removed, changed, currentStyles };
}

function validateAliasesExist(currentStyles: Map<string, FlatStyle>): MissingAlias[] {
  const configured = readJson<ConfiguredVoiceSpeaker[]>("data/voices.json");
  const currentStyleIds = new Set([...currentStyles.values()].map((style) => style.styleId));
  const missing: MissingAlias[] = [];
  for (const speaker of configured) {
    for (const style of speaker.styles) {
      if (!currentStyleIds.has(style.id)) {
        missing.push({ speaker: speaker.speaker, style: style.name, id: style.id, aliases: style.aliases });
      }
    }
  }
  return missing;
}

function printReport({
  baseline,
  current,
  diff,
  missingAliases,
}: {
  baseline: Snapshot;
  current: Snapshot;
  diff: SnapshotDiff;
  missingAliases: MissingAlias[];
}): void {
  console.log("# VOICEVOX upstream voice report");
  console.log("");
  console.log(`Snapshot engine version: ${baseline.engineVersion}`);
  console.log(`Current engine version: ${current.engineVersion}`);
  console.log("");

  if (diff.added.length) {
    console.log("## New upstream styles");
    console.log(diff.added.map(formatStyle).join("\n"));
    console.log("");
  }
  if (diff.removed.length) {
    console.log("## Removed upstream styles");
    console.log(diff.removed.map(formatStyle).join("\n"));
    console.log("");
  }
  if (diff.changed.length) {
    console.log("## Changed upstream styles");
    for (const change of diff.changed) {
      console.log(`- before: ${formatStyle(change.before).slice(2)}`);
      console.log(`  after:  ${formatStyle(change.after).slice(2)}`);
    }
    console.log("");
  }
  if (missingAliases.length) {
    console.log("## Configured aliases missing from current upstream");
    for (const item of missingAliases) {
      console.log(`- ${item.speaker} / ${item.style} / id=${item.id} / aliases=${item.aliases.join(", ")}`);
    }
    console.log("");
  }

  if (diff.added.length || diff.removed.length || diff.changed.length) {
    console.log("## Required review");
    console.log("- Confirm VOICEVOX official terms and the relevant voice library terms.");
    console.log("- Decide whether each new style should get a friendly alias.");
    console.log("- Update data/voices.json, regenerate schema/docs, and add release notes if aliases change.");
  } else {
    console.log("No upstream speaker/style drift detected.");
  }
}

const [engineVersion, speakers] = await Promise.all([
  readEngineJson("/version"),
  readEngineJson("/speakers"),
]);

const current: Snapshot = {
  engineVersion: String(engineVersion),
  speakers: normalizeSpeakers(speakers),
};

if (update) {
  mkdirSync(dirname(String(snapshotPath)), { recursive: true });
  writeFileSync(String(snapshotPath), `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Updated ${String(snapshotPath)} from VOICEVOX Engine ${current.engineVersion}`);
  process.exit(0);
}

const baseline = readJson<Snapshot>(String(snapshotPath));
const diff = diffSnapshots(baseline, current);
const missingAliases = validateAliasesExist(diff.currentStyles);
const hasDrift =
  diff.added.length ||
  diff.removed.length ||
  diff.changed.length ||
  (strictAliases && missingAliases.length);

if (hasDrift || missingAliases.length) {
  printReport({ baseline, current, diff, missingAliases });
}

if (hasDrift) {
  process.exit(1);
}

console.log(`VOICEVOX upstream voices match ${String(snapshotPath)}; engine ${current.engineVersion}.`);
