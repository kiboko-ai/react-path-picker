// Core (framework-agnostic) re-exports
export { PathPickerInspector } from './core/inspector';
export { getXPath } from './core/xpath';
export { getCssSelector } from './core/css-selector';
export { getReactComponent } from './core/react-fiber';
export type { PathPickerResult, InspectorCallbacks } from './core/types';

// React layer
export { usePathPicker, formatResult } from './react/usePathPicker';
export type { UsePathPickerOptions } from './react/usePathPicker';
export { PathPickerButton } from './react/PathPickerButton';
export type { PathPickerButtonProps } from './react/PathPickerButton';
export { default } from './react/PathPickerButton';
