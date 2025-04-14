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

// Update package.json to ensure dependencies are compatible with Node 18
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Set engine constraints
  packageJson.engines = {
    "node": ">=14.0.0 <=18.x.x",
    "npm": ">=6.0.0"
  };
  
  // Update dependencies to versions compatible with Node 18
  const updatedDevDependencies = {
    "@commitlint/config-conventional": "^17.6.7",
    "@eslint/eslintrc": "^2.1.4",
    "@evilmartians/lefthook": "^1.5.0",
    "@react-native-community/cli": "^11.3.7",
    "@react-native/eslint-config": "^0.73.2",
    "@release-it/conventional-changelog": "^7.0.2",
    "@types/jest": "^29.5.5",
    "@types/react": "^18.2.37",
    "commitlint": "^17.7.1",
    "del-cli": "^5.1.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^8.10.0",
    "eslint-plugin-prettier": "^4.2.1",
    "jest": "^29.7.0",
    "prettier": "^2.8.8",
    "react-native": "0.72.6",
    "react-native-builder-bob": "^0.18.3",
    "release-it": "^16.2.1",
    "turbo": "^1.10.7",
    "typescript": "^5.0.4"
  };
  
  packageJson.devDependencies = { ...packageJson.devDependencies, ...updatedDevDependencies };
  
  // Update builder bob config to add commonjs target
  if (packageJson["react-native-builder-bob"] && 
      packageJson["react-native-builder-bob"].targets &&
      Array.isArray(packageJson["react-native-builder-bob"].targets)) {
    
    // Check if commonjs is already in the targets
    const hasCommonjs = packageJson["react-native-builder-bob"].targets.some(
      target => target === "commonjs" || (Array.isArray(target) && target[0] === "commonjs")
    );
    
    if (!hasCommonjs) {
      packageJson["react-native-builder-bob"].targets.splice(1, 0, "commonjs");
      console.log('Added commonjs target to react-native-builder-bob config');
    }
  }
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with Node 18 compatible versions');
} catch (error) {
  console.error('Error updating package.json:', error);
}

// Create a standard .eslintrc.js file if needed
const eslintrcPath = path.join(__dirname, '.eslintrc.js');
if (!fs.existsSync(eslintrcPath)) {
  const eslintrcContent = `module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'prettier/prettier': [
      'error',
      {
        quoteProps: 'consistent',
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        useTabs: false,
      },
    ],
  },
  ignorePatterns: ['node_modules/', 'lib/'],
};`;

  fs.writeFileSync(eslintrcPath, eslintrcContent);
  console.log('Created .eslintrc.js compatible with Node 18');
}

// Update tsconfig.json to be compatible with Node 18
try {
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    // Replace bundler with node moduleResolution
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.moduleResolution === 'bundler') {
      tsconfig.compilerOptions.moduleResolution = 'node';
      console.log('Updated tsconfig.json moduleResolution to "node"');
    }
    
    // Remove verbatimModuleSyntax if present
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.verbatimModuleSyntax) {
      delete tsconfig.compilerOptions.verbatimModuleSyntax;
      console.log('Removed verbatimModuleSyntax from tsconfig.json');
    }
    
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }
} catch (error) {
  console.error('Error updating tsconfig.json:', error);
}

// Install dependencies with Node 18 compatible versions
console.log('\nInstalling dependencies with --legacy-peer-deps...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('Dependencies installed successfully!');

  console.log('\nRunning builder bob to prepare the package...');
  try {
    execSync('npm run prepare', { stdio: 'inherit' });
    console.log('Package prepared successfully!');
  } catch (error) {
    console.warn('Warning: Error running prepare script:', error.message);
    console.log('You may need to run "npm run prepare" manually after fixing any issues.');
  }
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

console.log('\nSetup complete! react-native-scan is now compatible with Node 18.20.7');
console.log('You can now use the library in your React Native project.');
console.log('\nTo install in your project:');
console.log(`npm install --save ${__dirname}`);
console.log('or');
console.log(`yarn add file:${__dirname} --ignore-engines`); 