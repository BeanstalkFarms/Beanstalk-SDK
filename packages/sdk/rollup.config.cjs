// import resolve from "@rollup/plugin-node-resolve";
// import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";

const pkg = require("./package.json");

export default [
  // {
  //   input: "src/index.ts",
  //   output: {
  //     name: "BeanstalkSDK",
  //     file: pkg.browser,
  //     format: "umd",
  //     sourcemap: true
  //   },
  //   plugins: [resolve(), commonjs(), typescript({ tsconfig: "./tsconfig.json", useTsconfigDeclarationDir: true  }), json()],
  // },
  {
    input: "src/index.ts",
    output: [
      { file: pkg.main, format: "cjs", sourcemap: true},
      { file: pkg.module, format: "es", sourcemap: true},
    ],
    plugins: [typescript({ tsconfig: "./tsconfig.json", useTsconfigDeclarationDir: true }), json()],
  },
];
