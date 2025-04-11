import React from 'react';
import { View } from 'react-native';
import { addHighlight, clearHighlights } from './RenderOverlay';

// TODO: Define a proper type for collected render data
type RenderData = {
  [componentName: string]: Array<{
    duration: number;
    timestamp: number;
    props?: Record<string, unknown>;
  }>;
};

/**
 * Configuration options for react-native-scan, similar to react-scan options
 */
interface ScanOptions {
  /**
   * Enable/disable scanning
   * @default true in dev mode, false in production
   */
  enabled?: boolean;

  /**
   * Log renders to the console
   * @default false
   */
  log?: boolean;

  /**
   * Animation speed for highlighting
   * @default "fast"
   */
  animationSpeed?: 'slow' | 'fast' | 'off';

  /**
   * Milliseconds threshold for render warning (yellow highlight)
   * @default 16 (~1 frame at 60fps)
   */
  renderTimeThresholdWarn?: number;

  /**
   * Milliseconds threshold for render error (red highlight)
   * @default 50 (significant slowdown)
   */
  renderTimeThresholdError?: number;

  /**
   * Track unnecessary renders (components that re-render with no visible change)
   * @default false
   */
  trackUnnecessaryRenders?: boolean;

  /**
   * Force React Scan to run in production (not recommended)
   * @default false
   */
  dangerouslyForceRunInProduction?: boolean;

  // Event hooks
  onRenderStart?: () => void;
  onRender?: (
    componentName: string,
    renderInfo: { duration: number; timestamp: number }
  ) => void;
  onRenderFinish?: () => void;
}

const defaultOptions: ScanOptions = {
  enabled: true, // Should default to true only in __DEV__
  log: false,
  animationSpeed: 'fast',
  renderTimeThresholdWarn: 16, // ~1 frame at 60fps
  renderTimeThresholdError: 50, // Significant slowdown
  trackUnnecessaryRenders: false,
  dangerouslyForceRunInProduction: false,
};

let currentOptions: ScanOptions = { ...defaultOptions };
let isInitialized = false;
const originalCreateElement = React.createElement;
const renderTimings: RenderData = {}; // Placeholder for storing timing data

// Function to patch React.createElement
const patchCreateElement = () => {
  // @ts-ignore Adjust typing as needed
  React.createElement = (type, props, ...children) => {
    // Only wrap function and class components
    // TODO: Add checks to avoid wrapping our own overlay/internal components
    // Example: Check type.displayName or specific flags
    const componentNameFromType =
      (type as any).displayName || (type as any).name || 'Unknown';
    if (
      componentNameFromType === 'RenderOverlay' ||
      componentNameFromType.startsWith('Scanned(')
    ) {
      return originalCreateElement(type, props, ...children);
    }

    if (typeof type === 'function' && currentOptions.enabled) {
      const originalType = type;

      // Create a wrapper component
      const WrappedComponent = (wrapperProps: any) => {
        const viewRef = React.useRef<View>(null);

        // Call onRenderStart if provided
        currentOptions.onRenderStart?.();

        const start = performance.now();

        let result = null;
        try {
          result = originalType(wrapperProps);
        } catch (e) {
          console.error(
            `[react-native-scan] Error rendering component ${componentNameFromType}:`,
            e
          );
          throw e;
        }

        const end = performance.now();
        const duration = end - start;

        const componentName =
          originalType.displayName || originalType.name || 'UnknownComponent';

        // --- Data Collection ---
        if (!renderTimings[componentName]) {
          renderTimings[componentName] = [];
        }

        const renderInfo = {
          duration,
          timestamp: start,
          props: currentOptions.trackUnnecessaryRenders
            ? { ...wrapperProps }
            : undefined,
        };

        renderTimings[componentName].push(renderInfo);

        // Call onRender callback if provided
        currentOptions.onRender?.(componentName, renderInfo);

        if (currentOptions.log) {
          console.log(
            `[react-native-scan] Render: ${componentName} took ${duration.toFixed(2)}ms`
          );
        }

        // Call onRenderFinish callback if provided
        currentOptions.onRenderFinish?.();

        // Define handleLayout function - ALWAYS define hooks regardless of whether we'll use them
        const handleLayout = React.useCallback(() => {
          // Skip if animations are off
          if (currentOptions.animationSpeed === 'off') return;

          // Adjust animation timing based on speed setting
          const animationDelay =
            currentOptions.animationSpeed === 'slow' ? 100 : 0;

          // Use setTimeout with delay for slow animation mode
          setTimeout(() => {
            requestAnimationFrame(() => {
              if (viewRef.current) {
                viewRef.current.measure(
                  (_, __, width, height, pageX, pageY) => {
                    // Ensure layout dimensions are valid before highlighting
                    if (width <= 0 || height <= 0) return;

                    const layout = { x: pageX, y: pageY, width, height };
                    let color = 'rgba(0, 255, 0, 0.5)';
                    if (
                      duration > (currentOptions.renderTimeThresholdError ?? 50)
                    ) {
                      color = 'rgba(255, 0, 0, 0.5)';
                    } else if (
                      duration > (currentOptions.renderTimeThresholdWarn ?? 16)
                    ) {
                      color = 'rgba(255, 255, 0, 0.5)';
                    }

                    const highlightId = `${componentName}-${start}`;
                    addHighlight(highlightId, layout, color);
                  }
                );
              }
            });
          }, animationDelay);
        }, [componentName, duration, start]);

        // Skip highlighting if animation is off, but still render wrapped content
        if (currentOptions.animationSpeed === 'off') {
          return <View collapsable={false}>{result}</View>;
        }

        // --- Render Wrapping View for Measurement ---
        return (
          <View ref={viewRef} onLayout={handleLayout} collapsable={false}>
            {result}
          </View>
        );
      };

      WrappedComponent.displayName = `Scanned(${originalType.displayName || originalType.name || 'Component'})`;

      return originalCreateElement(WrappedComponent, props, ...children);
    }

    return originalCreateElement(type, props, ...children);
  };
};

// Function to restore the original React.createElement
const restoreCreateElement = () => {
  React.createElement = originalCreateElement;
};

/**
 * Initializes the React Native Scan tool.
 * Should ideally be called once at the root of the application in development mode.
 * Exports RenderOverlay component to be included in the app root.
 * @param options Configuration options for the scanner.
 */
export { RenderOverlay } from './RenderOverlay';

export function initializeScan(options: ScanOptions = {}): void {
  if (isInitialized && !options.dangerouslyForceRunInProduction && !__DEV__) {
    console.warn('[react-native-scan] Already initialized. Skipping.');
    return;
  }

  // Only run in development by default
  const isDev = __DEV__;
  const shouldEnable = options.enabled !== undefined ? options.enabled : isDev;

  currentOptions = {
    ...defaultOptions,
    ...options,
    enabled: shouldEnable && !options.dangerouslyForceRunInProduction, // Enforce dev check unless forced
  };

  if (currentOptions.dangerouslyForceRunInProduction) {
    console.warn(
      '[react-native-scan] Running in production mode. This is not recommended and may impact performance.'
    );
  }

  if (currentOptions.enabled && !isInitialized) {
    console.log('[react-native-scan] Initializing...');
    patchCreateElement();
    isInitialized = true;
  } else if (!currentOptions.enabled && isInitialized) {
    console.log('[react-native-scan] Disabling...');
    restoreCreateElement();
    isInitialized = false;
  }
}

/**
 * Hook API to enable/configure scanning within a component's lifecycle.
 * Note: This primarily controls options. Initialization should happen globally.
 * @param options Configuration options for the scanner.
 */
export function useScan(options: ScanOptions): void {
  // Using useEffect to update options when they change
  React.useEffect(() => {
    setOptions(options);
    // TODO: Consider cleanup? If options disable scan, should we restore?
    // Current initializeScan handles enable/disable toggling.
  }, [options]);
}

/**
 * Updates the scanner options at runtime.
 * @param options New options to merge with the current configuration.
 */
export function setOptions(options: ScanOptions): void {
  const previousEnabledState = currentOptions.enabled;
  currentOptions = { ...currentOptions, ...options };

  // Handle enable/disable transitions via setOptions
  if (currentOptions.enabled && !previousEnabledState && !isInitialized) {
    console.log('[react-native-scan] Enabling via setOptions...');
    patchCreateElement();
    isInitialized = true;
  } else if (!currentOptions.enabled && previousEnabledState && isInitialized) {
    console.log('[react-native-scan] Disabling via setOptions...');
    restoreCreateElement();
    isInitialized = false;
  }
}

/**
 * Retrieves the current scanner options.
 * @returns The currently active options.
 */
export function getOptions(): ScanOptions {
  return { ...currentOptions };
}

/**
 * Retrieves the collected render report.
 * @returns An object containing collected render data (currently timings).
 */
export function getReport(): RenderData {
  // TODO: Improve report structure (e.g., aggregate stats, identify issues)
  return { ...renderTimings };
}

// --- Placeholder for future additions ---

/**
 * Hooks into a specific component's renders (Placeholder).
 * This might require a different approach than the global patch.
 */
// export function onRender(Component, onRenderCallback) {
//   // TODO: Implement specific component targeting
// }

// Cleanup function (optional, might be useful for specific scenarios)
export function cleanupScan(): void {
  if (isInitialized) {
    restoreCreateElement();
    isInitialized = false;
    // Clear collected data
    Object.keys(renderTimings).forEach((key) => delete renderTimings[key]);
    // Clear highlights
    clearHighlights();
    console.log('[react-native-scan] Cleaned up.');
  }
}

// --- Keeping original native module export example for reference (commented out) ---
/*
import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-scan' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Use a proxy to error out if the native module is not found
const ScanModule = NativeModules.Scan
  ? NativeModules.Scan
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Example native function (if we add native features later)
export function nativeExample(a: number, b: number): Promise<number> {
  if (!ScanModule) {
      throw new Error(LINKING_ERROR);
  }
  return ScanModule.multiply(a, b); // Assuming 'multiply' exists natively
}
*/
