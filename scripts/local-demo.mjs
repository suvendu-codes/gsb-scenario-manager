import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const compose = ['compose', '-f', 'compose.local.yml'];

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...compose, ...args], { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Docker command failed (${signal ?? code})`));
    });
  });
}

async function main() {
  await run(['up', '--build', '-d', 'worker']);
  const logs = spawn('docker', [...compose, 'logs', '--follow', '--since', '0s', 'worker'], { cwd, stdio: 'inherit' });
  logs.on('error', (error) => console.error('Cannot follow worker logs:', error.message));
  try {
    await run(['run', '--rm', '--no-deps', 'generator']);
    console.info('Local demo passed. Services remain running. Use pnpm local:logs or pnpm local:down.');
  } finally { logs.kill('SIGTERM'); }
}

main().catch((error) => {
  console.error(error.message);
  console.error('Check Docker Desktop and pnpm local:logs. Services are retained for inspection.');
  process.exitCode = 1;
});
