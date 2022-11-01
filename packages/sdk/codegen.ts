
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  documents: "src/queries/**/*.graphql",
  generates: {
    "src/constants/generated-gql/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-graphql-request",
      ]
    }
  }
};

export default config;
