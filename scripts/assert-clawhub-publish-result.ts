#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type ClawHubPublishResult = {
  name?: unknown;
  version?: unknown;
  commit?: unknown;
  family?: unknown;
  files?: unknown;
  totalBytes?: unknown;
};

const resultPath = process.argv[2];
if (!resultPath) {
  throw new Error("Usage: assert-clawhub-publish-result <result.json>");
}

const expectedName = process.env.EXPECTED_PACKAGE_NAME;
const expectedVersion = process.env.EXPECTED_VERSION;
const expectedCommit = process.env.EXPECTED_COMMIT;

if (!expectedName) throw new Error("EXPECTED_PACKAGE_NAME is required");
if (!expectedVersion) throw new Error("EXPECTED_VERSION is required");
if (!expectedCommit) throw new Error("EXPECTED_COMMIT is required");

const result = JSON.parse(readFileSync(resultPath, "utf8")) as ClawHubPublishResult;

assert.equal(result.name, expectedName, "published package name mismatch");
assert.equal(result.version, expectedVersion, "published package version mismatch");
assert.equal(result.commit, expectedCommit, "published source commit mismatch");
assert.equal(result.family, "code-plugin", "published package family mismatch");
assert.ok(typeof result.files === "number" && result.files > 0, "published package should contain files");
assert.ok(typeof result.totalBytes === "number" && result.totalBytes > 0, "published package should have bytes");

console.log(`Verified ClawHub result for ${expectedName}@${expectedVersion} (${expectedCommit}).`);
