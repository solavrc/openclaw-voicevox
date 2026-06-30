# VOICEVOX upstream tracking

This repository separates two concerns:

- Runtime compatibility: users can always pass a raw numeric VOICEVOX style ID through `defaultSpeakerVoice` or a TTS directive.
- Friendly aliases: curated names in `data/voices.json` are reviewed before they become documented plugin aliases.

## When VOICEVOX adds voices

The scheduled `VOICEVOX Upstream Watch` workflow starts `voicevox/voicevox_engine:cpu-latest`, reads `/version` and `/speakers`, and compares the normalized speaker/style list with `data/voicevox-upstream-speakers.snapshot.json`.

If the workflow reports new, removed, or changed styles:

1. Check the VOICEVOX official terms and the relevant voice library or character terms.
2. Decide whether the new style should receive a friendly alias.
3. Update `data/voices.json` for accepted aliases.
4. Run `npm run sync:voices`.
5. Refresh the upstream snapshot with a reviewed engine version:

```sh
npm run check:upstream -- --update
```

6. Run `npm run check`.

Alias availability can differ by VOICEVOX Engine build or installed voice libraries. A configured alias missing from the local engine is reported as a warning by default; pass `--strict-aliases` to `scripts/check-upstream-voices.ts` only when testing against a known complete engine image.

The current reviewed snapshot was generated from VOICEVOX Engine `0.25.2`. The scheduled workflow intentionally checks `cpu-latest` against that reviewed baseline so new upstream speaker/style changes surface as a review issue.
