import { initializeScan, RenderOverlay } from 'react-native-scan';
import { Text, View, StyleSheet } from 'react-native';
import React from 'react';

// Initialize the scan tool when the app module loads
// This should ideally only run in development mode.
if (__DEV__) {
  initializeScan({
    log: true, // Enable console logging for renders in the example app
  });
}

export default function App() {
  return (
    <View style={styles.container}>
      <Text>React Native Scan Initialized (in DEV mode)</Text>
      {/* Add some components here to test scanning */}
      <SimpleComponent text="Hello" />
      <SlowComponent />
      
      {/* Render the overlay on top */}
      {__DEV__ && <RenderOverlay />}
    </View>
  );
}

// --- Example components for testing ---

const SimpleComponent = React.memo(({ text }: { text: string }) => {
  console.log('Rendering SimpleComponent');
  return <Text style={{ margin: 5 }}>Simple: {text}</Text>;
});

const SlowComponent = () => {
  console.log('Rendering SlowComponent');
  // Simulate some work
  const end = Date.now() + 50; // Simulate 50ms render time
  while (Date.now() < end) { /* busy wait */ }
  return <Text style={{ margin: 5, color: 'red' }}>I am slowww</Text>;
};

// -------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
