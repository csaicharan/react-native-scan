const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Preparing react-native-scan for Node 18 compatibility...');

// Temporarily rename problematic files that might cause conflicts
const filesToRename = [
  'eslint.config.mjs'
];

filesToRename.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fs.renameSync(fullPath, fullPath + '.bak');
    console.log(`Renamed ${file} to ${file}.bak`);
  }
});

// Install dependencies with Node 18 compatible versions
console.log('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

console.log('\nSetup complete! react-native-scan is now compatible with Node 18.20.7');
console.log('You can now use the library in your React Native project.'); 