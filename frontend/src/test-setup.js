import "@testing-library/jest-dom/vitest";

// React 18 only batches updates and silences its act() warning when this flag
// is set; Testing Library cannot set it for us in the jsdom environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
