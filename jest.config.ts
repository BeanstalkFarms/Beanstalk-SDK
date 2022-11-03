import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  projects: [
    {
      // @ts-ignore
      preset: "ts-jest",
      displayName: "sdk",
      testMatch: ["<rootDir>/packages/sdk/**/?(*.)+(spec|test).[jt]s?(x)"],
    },
    {
      // @ts-ignore
      preset: "ts-jest",
      displayName: "sdk-client",
      testMatch: ["<rootDir>/packages/sdk-client/**/?(*.)+(spec|test).[jt]s?(x)"],
    },
  ],
};

export default jestConfig;
