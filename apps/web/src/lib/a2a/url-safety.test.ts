import assert from "node:assert/strict";
import test from "node:test";
import {
  hostnameLooksBlocked,
  inspectPublicHttpsUrl,
  isPrivateIP,
  looksLikeTemplateDocument,
} from "./url-safety.ts";

test("blocks localhost and private hosts", () => {
  assert.equal(hostnameLooksBlocked("localhost"), true);
  assert.equal(hostnameLooksBlocked("127.0.0.1"), true);
  assert.equal(hostnameLooksBlocked("10.0.0.8"), true);
  assert.equal(hostnameLooksBlocked("192.168.1.1"), true);
  assert.equal(hostnameLooksBlocked("169.254.169.254"), true);
  assert.equal(hostnameLooksBlocked("openagreements.org"), false);
});

test("only public https is allowed", () => {
  assert.equal(inspectPublicHttpsUrl("http://openagreements.org/.well-known/agent-card.json").ok, false);
  assert.equal(inspectPublicHttpsUrl("https://localhost/.well-known/agent-card.json").ok, false);
  assert.equal(inspectPublicHttpsUrl("https://openagreements.org/.well-known/agent-card.json").ok, true);
  assert.equal(inspectPublicHttpsUrl("https://user:pass@evil.example/").ok, false);
});

test("detects Jekyll agent-card templates", () => {
  const jekyll = `---\npermalink: /.well-known/agent-card.json\n---\n{%- assign cfg = site.agent_readiness.a2a -%}\n{"name": "{{ cfg.name }}"}`;
  assert.equal(looksLikeTemplateDocument(jekyll), true);
  assert.equal(looksLikeTemplateDocument('{"name":"Echo Agent (Demo)"}'), false);
});

test("allows GitHub raw Agent Card URLs", () => {
  const raw =
    "https://raw.githubusercontent.com/open-agreements/open-agreements/HEAD/.well-known/agent-card.json";
  assert.equal(inspectPublicHttpsUrl(raw).ok, true);
});

test("private IP ranges", () => {
  assert.equal(isPrivateIP("172.16.0.1"), true);
  assert.equal(isPrivateIP("8.8.8.8"), false);
  assert.equal(isPrivateIP("::1"), true);
});
