import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface Highlight {
  id: string; // Unique ID for managing highlights (e.g., timestamp + component name)
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // Color based on render duration or type
  timestamp: number; // To help with fading/cleanup
  opacity?: Animated.Value; // Add opacity for fade-out animation
}

// Store highlights globally within this module for now
// TODO: Consider a more robust state management approach (Context, Zustand, etc.)
let highlightsState: Highlight[] = [];
let listeners: React.Dispatch<React.SetStateAction<Highlight[]>>[] = [];

// Duration for highlight display in ms
const HIGHLIGHT_DURATION = 750;

// Function to update all subscribed RenderOverlay components
const updateHighlights = (newHighlights: Highlight[]) => {
  highlightsState = newHighlights;
  listeners.forEach((listener) => listener(newHighlights));
};

// --- Public API ---

/**
 * Adds a highlight box to be rendered by the overlay.
 * This function will be called from the component wrapping logic.
 */
export const addHighlight = (
  id: string,
  layout: { x: number; y: number; width: number; height: number },
  color: string
) => {
  // Create opacity animation value for fade effect
  const opacity = new Animated.Value(1);

  const newHighlight: Highlight = {
    id,
    ...layout,
    color,
    timestamp: Date.now(),
    opacity,
  };

  // Create fade-out animation
  Animated.timing(opacity, {
    toValue: 0,
    duration: HIGHLIGHT_DURATION,
    useNativeDriver: true,
  }).start(() => {
    // Remove this highlight when animation completes
    removeHighlight(id);
  });

  // Remove highlights older than HIGHLIGHT_DURATION
  const now = Date.now();
  const updatedHighlights = [
    ...highlightsState.filter((h) => now - h.timestamp < HIGHLIGHT_DURATION),
    newHighlight,
  ];

  updateHighlights(updatedHighlights);
};

/**
 * Removes a specific highlight by ID
 */
const removeHighlight = (id: string) => {
  const updatedHighlights = highlightsState.filter((h) => h.id !== id);
  if (updatedHighlights.length !== highlightsState.length) {
    updateHighlights(updatedHighlights);
  }
};

/**
 * Clears all currently displayed highlights.
 */
export const clearHighlights = () => {
  updateHighlights([]);
};

// --- Component ---

export const RenderOverlay: React.FC = () => {
  const [highlights, setHighlights] = useState<Highlight[]>(highlightsState);
  const mounted = useRef(true);

  useEffect(() => {
    // Subscribe to global state changes
    listeners.push(setHighlights);
    // Set initial state in case highlights were added before mount
    setHighlights(highlightsState);

    return () => {
      mounted.current = false;
      // Unsubscribe on unmount
      listeners = listeners.filter((l) => l !== setHighlights);
    };
  }, []);

  // On Android, measure() might give coordinates relative to the root view,
  // on iOS, it might be relative to the window.
  // `position: 'absolute'` without top/left defaults to 0,0 relative to parent,
  // which should work if the Overlay is rendered at the root.
  // Adjustments might be needed based on testing.

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {highlights.map((h) => (
        <Animated.View
          key={h.id}
          style={[
            styles.highlightBox,
            {
              left: h.x,
              top: h.y,
              width: h.width,
              height: h.height,
              borderColor: h.color,
              opacity: h.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // Ensure it's on top
    elevation: 9999, // For Android
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 2, // Make highlights visible
    backgroundColor: 'rgba(0, 0, 255, 0.05)', // Optional: slight background tint
  },
});
