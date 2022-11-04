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
      displayName: "examples",
      rootDir: "packages/examples",
      testMatch: ["<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)"],
    },
  ],
};

export default jestConfig;
