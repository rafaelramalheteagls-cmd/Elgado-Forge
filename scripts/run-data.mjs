import { spawnSync } from 'node:child_process';

const full = 'src/data/generated/mhriceCatalog.json';
const compact = 'src/data/generated/mhriceAppCatalog.json';
const tasks = {
  import: [['scripts/import-mhrice.py', 'mhrice.json', full], ['scripts/build-mhrice-app-catalog.py']],
  validate: [['scripts/validate-mhrice.py', full], ['scripts/validate-mhrice-app.py', full, compact]],
};
const task = tasks[process.argv[2]];
if (!Array.isArray(task)) {
  console.error('Run npm run data:import or npm run data:validate.');
  process.exit(1);
}

const commands = process.platform === 'win32' ? [['python'], ['py', '-3'], ['python3']] : [['python3'], ['python']];
const interpreter = commands.find(([command, ...args]) => {
  const result = spawnSync(command, [...args, '--version'], { encoding: 'utf8' });
  return result.status === 0 && /^Python 3\./m.test(`${result.stdout}\n${result.stderr}`);
});
if (!interpreter) {
  console.error('Python 3 is required to import or validate the MHRice catalogs.');
  process.exit(1);
}
const [python, ...args] = interpreter;
for (const script of task) {
  const result = spawnSync(python, [...args, ...script], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
