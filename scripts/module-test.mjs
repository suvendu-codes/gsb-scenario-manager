import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const artifacts = join(cwd, 'test-results', 'module', randomUUID());
mkdirSync(artifacts, { recursive: true });
const project = `scenario-module-${randomUUID()}`;
const compose = ['compose', '-p', project, '-f', 'compose.local.yml', '-f', 'compose.module.yml'];
const env = { ...process.env, LOCAL_WORKER_IMAGE: `${project}:dev` };
writeFileSync(join(artifacts, 'project.txt'), project);
console.info(`Module test project: ${project}\nArtifacts: ${artifacts}`);
let active;
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    active?.kill('SIGTERM');
  });
}

function run(args, filename, { timeout = 480_000, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...compose, ...args], { cwd, env, timeout });
    active = child;
    const log = join(artifacts, filename);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        appendFileSync(log, chunk);
        if (!quiet) process.stdout.write(chunk);
      });
    }
    child.on('error', reject);
    child.on('close', (code, signal) => {
      active = undefined;
      if (code === 0) resolve();
      else reject(new Error(`docker compose ${args[0]} failed (${signal ?? code}); see ${log}`));
    });
  });
}

try {
  // Build once; init and worker share this image.
  await run(['build', 'worker'], 'build.log');
  if (interrupted) throw new Error('Module tests interrupted');
  await run(['up', '-d', '--no-build', 'worker'], 'startup.log', { timeout: 240_000 });
  if (interrupted) throw new Error('Module tests interrupted');
  await run(['run', '--rm', '--no-deps', 'module-tests'], 'tests.tap', { timeout: 240_000 });
  if (interrupted) throw new Error('Module tests interrupted');
  console.info('Module tests passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Collect logs before removing even a failed/partially initialized stack.
  for (const [args, filename] of [
    [['ps', '-a'], 'containers.log'],
    [['logs', '--no-color', '--timestamps'], 'infrastructure.log'],
    [['down', '--volumes', '--remove-orphans', '--timeout', '20'], 'cleanup.log'],
  ]) {
    try { await run(args, filename, { timeout: 60_000, quiet: true }); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  console.info(`Reports and service logs: ${artifacts}`);
}
