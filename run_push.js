const { spawnSync } = require('child_process');
const result = spawnSync('npx', ['prisma', 'db', 'push'], {
  cwd: 'f:\\___APPS\\15_26_Maja_site',
  encoding: 'utf8',
  shell: true,
  env: { ...process.env },
});
console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);
console.log('STATUS:', result.status);
