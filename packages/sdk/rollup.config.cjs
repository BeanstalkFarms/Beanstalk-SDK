import fs from "fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import multi from "@rollup/plugin-multi-entry";

// import nodePolyfills from 'rollup-plugin-polyfill-node';
import excludeDeps from "rollup-plugin-exclude-dependencies-from-bundle";

const pkg = require("./package.json");
delete pkg.exports;

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
  makeEntry("dist/js/index.js", "sdk"), // do not change the "sdk" name

  // This is just an example of how to create a new module entry.
  // This lets you do this on the client side:
  // import {BeanNumber} from "@beanstalk/sdk/BeanNumber"
  makeEntry("dist/js/beannumber.js", "BeanNumber"),
];

export default config;

function makeEntry(inputFile, name) {
  const outRoot = "dist";
  const esmPath = `./${outRoot}/${name}/${name}.esm.js`;
  const cjsPath = `./${outRoot}/${name}/${name}.cjs.js`;
  const udmPath = `./${outRoot}/${name}/${name}.umd.js`;

  let config = {
    input: inputFile,
    output: [
      { file: esmPath, format: "es", sourcemap: true },
      { file: cjsPath, format: "cjs", sourcemap: true },
      { file: udmPath, format: "umd", sourcemap: true, name: "BeanstalkSDK" },
    ],
    external: Object.keys(pkg.dependencies),
    plugins: [resolve(), commonjs(), json(), excludeDeps(), multi({ preserveModules: true })],
  };

  const pkgExport = {
    module: esmPath,
    default: cjsPath,
    browser: udmPath,
  };

  pkg.exports = pkg.exports || {};
  const key = name === "sdk" ? "." : `./${name}`;
  pkg.exports[key] = pkgExport;

  // Write back to package.json !!!!
  fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2));

  return config;
}
