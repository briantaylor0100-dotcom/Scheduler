import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Vite refuses static requests for a configured private sales file", { timeout: 20000 }, async () => {
  const tempDir = await mkdtemp(path.join(root, ".private-sales-"));
  const salesPath = path.join(tempDir, "sales.json");
  await writeFile(salesPath, '[{"date":"2026-10-05","sales":4850}]', "utf8");
  const portServer = createServer();
  portServer.listen(0, "127.0.0.1");
  await once(portServer, "listening");
  const port = portServer.address().port;
  await new Promise((resolve, reject) => portServer.close((error) => error ? reject(error) : resolve()));
  const vite = spawn(process.execPath, [
    path.join(root, "node_modules", "vite", "bin", "vite.js"),
    "--host", "127.0.0.1", "--port", String(port), "--strictPort",
  ], {
    cwd: root,
    env: { ...process.env, SALES_DATA_PATH: salesPath },
    stdio: "ignore",
  });
  try {
    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (vite.exitCode !== null) throw new Error("Vite exited before becoming ready.");
      try {
        ready = (await fetch(origin)).ok;
        if (ready) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(ready, true, "Vite dev server should start for the static-file test.");
    const relativePath = path.relative(root, salesPath).split(path.sep).join("/");
    const response = await fetch(`${origin}/${relativePath}`);
    assert.ok([403, 404].includes(response.status));
    assert.doesNotMatch(await response.text(), /4850/);
  } finally {
    if (vite.exitCode === null) {
      vite.kill();
      await once(vite, "exit");
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});
