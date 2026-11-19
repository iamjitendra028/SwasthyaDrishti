import { spawn } from 'node:child_process';
let closing = false;
const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit', windowsHide: true })
];
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  children.forEach(child => { if (child.exitCode === null) child.kill(); });
  process.exitCode = code;
}
children.forEach(child => child.on('exit', code => { if (!closing && code !== 0) shutdown(code || 1); }));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
