# react-native-scan

A powerful tool for automatically detecting performance issues in your React Native app, inspired by [react-scan](https://github.com/aidenybai/react-scan).

## Features

- 🔍 **Zero-Config Detection**: Automatically highlights slow and inefficient component renders
- 🚫 **No Code Changes**: Drop it in and start analyzing performance
- 📱 **Cross-Platform**: Works on both iOS and Android
- 🧰 **Flexible API**: Use via import, hooks, or programmatically
- 🔄 **Live Feedback**: Visual highlights around components as they render
- 📊 **Performance Reports**: Get detailed data about render times

## Installation

```sh
npm install react-native-scan
# or
yarn add react-native-scan
# or 
pnpm add react-native-scan
```

## Node 18 Compatibility

If you're using Node 18.x (such as 18.20.7), follow these steps for compatibility:

1. Clone the repository:
   ```sh
   git clone https://github.com/csaicharan/react-native-scan.git
   ```

2. Run the Node 18 compatibility script (will fix the `react-native-builder-bob` version issue):
   ```sh
   cd react-native-scan
   node install-node18.js
   ```

3. Install the library from your local copy:
   ```sh
   # From your project directory
   npm install --save /path/to/react-native-scan
   # or
   yarn add file:/path/to/react-native-scan --ignore-engines
   ```

   Note: Using the `--ignore-engines` flag with Yarn helps bypass Node version checks.

### Manual Fix for Builder-Bob Error

If you encounter the error: `react-native-builder-bob: The engine "node" is incompatible with this module`, you can manually fix it:

1. Edit package.json in the react-native-scan directory:
   ```json
   "devDependencies": {
     "react-native-builder-bob": "0.18.3"
   }
   ```

2. Reinstall with:
   ```sh
   npm install --legacy-peer-deps
   # or
   yarn install --ignore-engines
   ```

## Basic Usage

Add to your app's entry point (e.g., App.tsx or index.js):

```tsx
import React from 'react';
import { initializeScan, RenderOverlay } from 'react-native-scan';
import { View } from 'react-native';

// Initialize in development mode only
if (__DEV__) {
  initializeScan({
    log: true, // Optional: log render times to console
  });
}

function App() {
  return (
    <View style={{ flex: 1 }}>
      {/* Your app components */}
      
      {/* Add the overlay to visualize renders */}
      {__DEV__ && <RenderOverlay />}
    </View>
  );
}

export default App;
```

## API Reference

### `initializeScan(options)`

Initialize the scanning tool with options:

```tsx
initializeScan({
  enabled: true, // Enable/disable scanning
  log: false, // Log renders to console
  animationSpeed: "fast", // "slow" | "fast" | "off"
  renderTimeThresholdWarn: 16, // Yellow highlight threshold (ms)
  renderTimeThresholdError: 50, // Red highlight threshold (ms)
  trackUnnecessaryRenders: false, // Track re-renders that don't change output
  dangerouslyForceRunInProduction: false, // Not recommended!
  
  // Optional callbacks
  onRenderStart: () => {},
  onRender: (componentName, renderInfo) => {},
  onRenderFinish: () => {},
});
```

### `useScan(options)`

Hook API to enable/configure scanning within a component:

```tsx
import { useScan } from 'react-native-scan';

function MyComponent() {
  useScan({ log: true });
  // ...
}
```

### `getReport()`

Get the collected render data:

```tsx
import { getReport } from 'react-native-scan';

const report = getReport();
console.log(report);
// Output: { "ComponentName": [{ duration: 15, timestamp: 12345678 }, ...] }
```

### Other Utilities

- `setOptions(options)`: Update options at runtime
- `getOptions()`: Get current options
- `cleanupScan()`: Clean up and stop scanning

## How It Works

`react-native-scan` patches React's component creation to:

1. Measure render times of components
2. Identify slow or unnecessary renders
3. Visually highlight components as they render
4. Collect performance data for analysis

## Caveats

- Only runs in development mode by default (can be forced in production but not recommended)
- Adds a small wrapper View around each component for measurement
- May have a minor impact on performance (only in development)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
