import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import { createServer } from "node:net";

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });

let port;
let child;
let base;

before(async () => {
  execSync("npm run build", { stdio: "pipe" });
  port = await freePort();
  child = spawn("npm", ["run", "preview:serve"], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  base = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try {
      const res = await fetch(base + "/");
      up = res.ok;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

after(() => {
  if (child) child.kill("SIGTERM");
});

test("preview:serve serves the built homepage with the site title", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<title>AI Learn Kun<\/title>/);
});

test("preview:serve resolves clean URLs to their directory index", async () => {
  const res = await fetch(base + "/en/blog/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html[^>]*lang="en"/);
});

test("preview:serve returns 404 for a page that does not exist", async () => {
  const res = await fetch(base + "/no-such-page/");
  assert.equal(res.status, 404);
});

test("preview:serve blocks path traversal outside _site root", async () => {
  const res = await fetch(base + "/../../../etc/passwd");
  assert.equal(res.status, 404);
  if (res.status === 200) {
    const body = await res.text();
    assert.doesNotMatch(body, /root:x:0:/);
  }
});

test("preview:serve serves CSS with correct content type", async () => {
  const res = await fetch(base + "/assets/css/style.css");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/css/);
});

test("npm run test:build passes and npm run preview:serve serves the verified build", async () => {
  execSync("npm run test:build", { stdio: "pipe" });
  assert.ok(true, "test:build passed");

  const previewPort = await freePort();
  const previewChild = spawn("npm", ["run", "preview:serve"], {
    env: { ...process.env, PORT: String(previewPort) },
    stdio: "ignore",
  });
  const previewBase = `http://127.0.0.1:${previewPort}`;
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try {
      const res = await fetch(previewBase + "/");
      up = res.ok;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(up, "preview:serve came up after a clean test:build");
  previewChild.kill("SIGTERM");
});

