const { spawnSync } = require('node:child_process');

const steps = [
  ['Lint', ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0']],
  ['Generate database clients', ['scripts/generate.cjs']],
  ['Production build and type checking', ['node_modules/next/dist/bin/next', 'build', '--webpack']],
  ['Unit tests', ['--test', ...require('node:fs').readdirSync('tests').filter(name => name.endsWith('.test.cjs')).map(name => 'tests/' + name)]],
  ['Integration and Chromium browser checks', ['tests/run-browser.cjs']],
  ['Layout hydration regression checks', ['tests/run-layout-hydration.cjs']],
  ['Auth hydration regression checks', ['tests/run-auth-browser.cjs']],
];

for (const [label, args] of steps) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('\nAll application checks passed. External hosting and provider configuration are checked separately with npm run check:production.');
