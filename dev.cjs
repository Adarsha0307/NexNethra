const { spawn } = require('child_process');

console.log('=== Starting Nexnetra Real-Time Workspace ===');
console.log('Starting backend on http://localhost:4000...');
console.log('Starting frontend on http://localhost:5173...');

const backend = spawn('npm', ['run', 'dev:backend'], { stdio: 'inherit', shell: true });
const frontend = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  console.log('\nShutting down Nexnetra workspace servers...');
  try {
    backend.kill();
  } catch (e) {}
  try {
    frontend.kill();
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
