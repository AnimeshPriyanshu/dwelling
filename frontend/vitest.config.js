import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.js"],
      include: ["src/**/*.test.{js,jsx}"],
      clearMocks: true,
      restoreMocks: true,
    },
  }),
);
