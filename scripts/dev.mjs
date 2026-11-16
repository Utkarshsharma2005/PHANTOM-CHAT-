import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['--watch', 'server/index.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '5173'], { stdio: 'inherit', env: process.env }),
];

let stopping = false;
const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  process.exitCode = exitCode;
};

for (const child of children) {
  child.on('error', error => {
    process.stderr.write(`Could not start development service: ${error.message}\n`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      process.stderr.write(`Development service stopped (${signal ?? code ?? 'unknown'}); stopping the other service.\n`);
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
