import { pathsToModuleNameMapper } from "ts-jest";
import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  projects: [
    {
      // @ts-ignore
      preset: "ts-jest",
      displayName: "sdk",
      rootDir: "packages/sdk",
      testMatch: ["<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)"],
      moduleNameMapper: {
        "@sdk/(.*)$": "<rootDir>/src/$1",
        "src/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      // @ts-ignore
      preset: "ts-jest",
      displayName: "sdk-client",
      rootDir: "packages/sdk-client",
      testMatch: ["<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)"],
    },
  ],
};

export default jestConfig;
// packages/sdk/src/lib/farm/LibraryPresets.ts
// packages/sdk/src/classes/Token
