# Maintainer operations

This document captures the maintenance flow for this repository. It is intended for maintainers, not for end users installing the plugin.

## Release model

The repository uses two release paths:

- Normal releases: `release-please` opens and updates a release PR after conventional commits land on `main`. Merging that release PR creates the GitHub release and then runs ClawHub publishing.
- Manual publish: `.github/workflows/publish-clawhub.yml` can publish a selected ref. Use this for the first publication, dry runs, and break-glass republishing.

The package version is stored in both `package.json` and `openclaw.plugin.json`. `release-please-config.json` keeps `openclaw.plugin.json` synchronized through `extra-files`.

## Required GitHub setup

Create a GitHub Environment named `clawhub-production`.

Recommended settings:

- Required reviewers: repository owner or maintainer.
- Deployment branches and tags: restrict to `main` for production publish.
- Environment secret: `CLAWHUB_TOKEN`.

Set the token without printing it:

```sh
clawhub token | gh secret set CLAWHUB_TOKEN \
  --repo solavrc/openclaw-voicevox \
  --env clawhub-production
```

Check that the secret exists:

```sh
gh secret list --repo solavrc/openclaw-voicevox --env clawhub-production
```

## First publish

The first publish was intentionally manual.

1. Merge the publication PR into `main`.
2. Confirm `main` CI and Release Please workflow are green.
3. Confirm the ClawHub dry run against `main`.
4. Run the manual publish workflow with `ref=main` and `dry_run=false`.
5. Approve the `clawhub-production` deployment when GitHub asks for environment approval.
6. Confirm the workflow reaches `Publish to ClawHub` and `Verify publish result`.

Useful commands:

```sh
gh run list --repo solavrc/openclaw-voicevox --branch main --limit 10

COMMIT="$(git rev-parse origin/main)"
VERSION="$(git show origin/main:package.json | node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => console.log(JSON.parse(s).version));')"

clawhub package publish "solavrc/openclaw-voicevox@$COMMIT" \
  --family code-plugin \
  --owner solavrc \
  --name @solavrc/openclaw-voicevox \
  --version "$VERSION" \
  --source-repo solavrc/openclaw-voicevox \
  --source-commit "$COMMIT" \
  --dry-run \
  --json
```

Trigger the manual workflow:

```sh
gh workflow run publish-clawhub.yml \
  --repo solavrc/openclaw-voicevox \
  --ref main \
  -f ref=main \
  -f dry_run=false
```

Watch the run:

```sh
gh run watch <run-id> --repo solavrc/openclaw-voicevox --interval 10 --exit-status
```

## Normal release flow

For future changes:

1. Land changes on `main` with conventional commits such as `fix:`, `feat:`, or `chore:`.
2. Release Please updates or opens a release PR.
3. Review the release PR. It should update `CHANGELOG.md`, `package.json`, `package-lock.json`, `.release-please-manifest.json`, and `openclaw.plugin.json` when the version changes.
4. Merge the release PR.
5. The `Release Please` workflow creates the GitHub release.
6. The `publish-clawhub` job runs against `clawhub-production`.
7. Approve the deployment.
8. Confirm ClawHub publish and verification passed.

The automated publish job uses `clawhub@0.23.0`, authenticates with `CLAWHUB_TOKEN`, performs a dry run, verifies the JSON result, publishes, and verifies the publish result.

## ClawHub status checks

Public package URL:

```text
https://clawhub.ai/solavrc/openclaw-voicevox
```

Package API inspection:

```sh
clawhub package inspect @solavrc/openclaw-voicevox --json
```

Print the scan status:

```sh
clawhub package inspect @solavrc/openclaw-voicevox --json \
  | node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => { const j = JSON.parse(s); console.log(j.package?.scanStatus); });'
```

Print a compact release summary:

```sh
clawhub package inspect @solavrc/openclaw-voicevox --json \
  | node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => { const p = JSON.parse(s).package; console.log(JSON.stringify({ latestVersion: p.latestVersion, latestReleaseId: p.latestReleaseId, scanStatus: p.scanStatus, verification: p.verification }, null, 2)); });'
```

## Testing the ClawHub-installed package locally

During development, this checkout lives at:

```text
/Users/local/.openclaw/extensions/voicevox
```

That path is auto-discovered as a local OpenClaw extension. To ensure OpenClaw loads the ClawHub package instead of this checkout, move the checkout out of the auto-discovered `extensions` directory and leave an empty directory behind so existing shell or Codex sessions do not fail on a missing current directory.

```sh
mv /Users/local/.openclaw/extensions/voicevox /Users/local/Desktop/openclaw-voicevox-dev
mkdir -p /Users/local/.openclaw/extensions/voicevox
openclaw plugins registry --refresh --json
openclaw plugins install clawhub:@solavrc/openclaw-voicevox
openclaw plugins inspect voicevox --json
```

The inspected `rootDir` or `manifestPath` should point under:

```text
/Users/local/.openclaw/npm/projects/.../node_modules/@solavrc/openclaw-voicevox
```

Move the checkout back when returning to local development:

```sh
rmdir /Users/local/.openclaw/extensions/voicevox
mv /Users/local/Desktop/openclaw-voicevox-dev /Users/local/.openclaw/extensions/voicevox
```

## Upstream voice tracking

VOICEVOX speaker/style tracking is documented separately in `docs/voicevox-upstream.md`.

The scheduled workflow checks `voicevox/voicevox_engine:cpu-latest` against `data/voicevox-upstream-speakers.snapshot.json`. When drift is detected, it opens or updates an issue labelled `voicevox-upstream` and fails the workflow so a maintainer reviews the new upstream voice/style data.

Common commands:

```sh
npm run check:upstream
npm run check:upstream -- --update
npm run sync:voices
npm run sync:voices:check
npm run check
```
