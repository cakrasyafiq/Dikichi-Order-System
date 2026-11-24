import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const STAGES = [
  { name: 'Format check', script: 'format:check' },
  { name: 'Typecheck', script: 'typecheck' },
  { name: 'Lint', script: 'lint' },
  { name: 'Unit tests', script: 'test' },
  { name: 'Production build', script: 'build', fullOnly: true },
];

const quick = process.argv.includes('--quick');
const keepGoing = process.argv.includes('--keep-going');

if (!existsSync('node_modules')) {
  console.log(
    'NOT CONFIGURED: dependencies are missing. Run "npm install" first, then run this script again.',
  );
  process.exit(1);
}

const results = [];
for (const stage of STAGES.filter((s) => !(quick && s.fullOnly))) {
  console.log(`\n=== ${stage.name} (npm run ${stage.script}) ===`);
  const run = spawnSync('npm', ['run', stage.script], {
    stdio: 'inherit',
    // WHY: on Windows npm is a .cmd shim that spawn cannot execute without a shell.
    shell: process.platform === 'win32',
  });
  const passed = run.status === 0;
  results.push({ name: stage.name, status: passed ? 'PASS' : 'FAIL' });
  if (!passed && !keepGoing) break;
}

console.log('\n=== Summary ===');
for (const { name, status } of results) console.log(`${status.padEnd(5)} ${name}`);
const skipped = STAGES.length - results.length - (quick ? 1 : 0);
if (skipped > 0) console.log(`SKIPPED ${skipped} stage(s) after the first failure`);

process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
