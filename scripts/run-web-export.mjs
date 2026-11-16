import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const TUNNEL_TEARDOWN_ERROR = 'WebSocket was closed before the connection was established';
const distDir = join(process.cwd(), 'dist');

const result = spawnSync('npx', ['expo', 'export', '--platform', 'web'], {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
  maxBuffer: 64 * 1024 * 1024,
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.status === 0) process.exit(0);

const outputComplete = existsSync(join(distDir, 'index.html')) && existsSync(join(distDir, '_expo'));
const onlyTeardownFailed = output.includes(TUNNEL_TEARDOWN_ERROR);

if (outputComplete && onlyTeardownFailed) {
  console.log('Web bundle is complete; ignoring Expo dev-tunnel shutdown error.');
  process.exit(0);
}

console.error('Web export failed and dist output is incomplete.');
process.exit(result.status ?? 1);
