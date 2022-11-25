import { Graph } from "graphlib";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { FarmFromMode, FarmToMode } from "src/lib/farm";

export const getDepositGraph = (sdk: BeanstalkSDK): Graph => {
  const graph: Graph = new Graph({
    multigraph: true,
    directed: true,
    compound: false
  });

  ////// Add Nodes

  graph.setNode("ETH", { token: sdk.tokens.ETH });
  graph.setNode("WETH", { token: sdk.tokens.WETH });
  graph.setNode("BEAN", { token: sdk.tokens.BEAN });
  graph.setNode("USDT", { token: sdk.tokens.USDT });
  // graph.setNode("USDC", { token: sdk.tokens.USDC });
  // graph.setNode("DAI", { token: sdk.tokens.DAI });
  graph.setNode("3CRV", { token: sdk.tokens.CRV3 });

  // Allowed Target Tokens
  graph.setNode("BEAN", { token: sdk.tokens.BEAN });
  graph.setNode("BEAN3CRV", { token: sdk.tokens.BEAN_CRV3_LP });
  graph.setNode("urBEAN", { token: sdk.tokens.UNRIPE_BEAN });
  graph.setNode("urBEAN3CRV", { token: sdk.tokens.UNRIPE_BEAN_CRV3 });

  ////// Add Edges

  // ETH->WETH
  graph.setEdge("ETH", "WETH", {
    // step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.WrapEth(to),
    step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.DevDebug("ETH->WETH"),
    from: "ETH",
    to: "WETH"
  });
  graph.setEdge("WETH", "USDT", {
    // step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.WrapEth(to),
    step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.DevDebug("WETH->USDT"),
    from: "WETH",
    to: "USDT"
  });

  // USDT->3POOL for 3CRV
  graph.setEdge("USDT", "3CRV", {
    step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.DevDebug("USDT->3CRV"),
    from: "USDT",
    to: "3CRV"
  });

  // 3CRV->BEAN_CRV3_LP
  graph.setEdge("3CRV", "BEAN3CRV", {
    step: (_: string, _2: FarmFromMode, to: FarmToMode) => new sdk.farm.actions.DevDebug("3CRV->BEAN3CRV"),
    from: "3CRV",
    to: "BEAN3CRV"
  });

  return graph;
};
