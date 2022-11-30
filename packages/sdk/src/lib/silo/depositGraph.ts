import { Graph } from "graphlib";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { FarmFromMode, FarmToMode } from "src/lib/farm";

export const getDepositGraph = (sdk: BeanstalkSDK): Graph => {
  const whitelist: string[] = [];

  // Build an array of the whitelisted token symbols
  for (const token of sdk.tokens.siloWhitelist) {
    whitelist.push(token.symbol);
  }

  // initialize the graph data structure
  const graph: Graph = new Graph({
    multigraph: true,
    directed: true,
    compound: false
  });

  /**
   * ********** NODES ***************
   */

  /**
   * These are the whitelisted assets that we're allowed to deposit
   *
   * Basically:
   * graph.setNode("BEAN");
   * graph.setNode("BEAN3CRV");
   * graph.setNode("urBEAN");
   * graph.setNode("urBEAN3CRV");
   */

  for (const token of sdk.tokens.siloWhitelist) {
    graph.setNode(token.symbol);
  }

  /**
   * Deposit targets, ie "{TOKEN}:SILO" . (":SILO" is just a convention)
   *
   * These are different than, but correspond to, the whitelisted assets. There's a
   * difference between swapping to an asset, and depositing it.
   *
   * For ex, if someone wants to deposit BEAN into the "BEAN:3CRV LP" silo, the
   * steps would be:
   * 1. deposit BEAN into the BEAN3CRV pool on Curve to receive the BEAN3CRV LP token
   * 2. deposit the BEAN3CRV LP token into Beanstalk
   *
   * Therefor we need two nodes related to BEAN3CRV. One that is the token,
   * and one that is a deposit target.
   *
   * For ex, this graph:
   * USDC -> BEAN -> BEAN:SILO
   * allows us to create edges like this:
   * USDC -> BEAN        do a swap using exchangeUnderlying()
   * BEAN -> BEAN:SILO   deposit into beanstalk using deposit()
   * which wouldn't be possible w/o two separate nodes representing BEAN and BEAN:SILO
   *
   * When using the SDK and someone creates a DepositOperation for a target token, for ex "BEAN",
   * we secretly set the end target graph node to "BEAN:SILO" instead.
   **/
  for (const token of sdk.tokens.siloWhitelist) {
    graph.setNode(`${token.symbol}:SILO`);
  }

  /**
   * Add other "nodes", aka Tokens that we allow as input
   * for deposit
   */
  graph.setNode("ETH");
  graph.setNode("WETH");
  graph.setNode("DAI");
  graph.setNode("USDC");
  graph.setNode("USDT");
  graph.setNode("3CRV");

  /**
   * ********** EDGES ***************
   */

  /**
   * Setup the deposit edges.
   * This is the last step of going from a whitelisted asset to depositing it.
   *
   * For ex, the edge BEAN -> BEAN:SILO runs "deposit()" method
   * We create a unique edge for each whitelisted asset between itself and its
   * correpsondign {TOKEN}:SILO node
   */
  for (const token of sdk.tokens.siloWhitelist) {
    const from = token.symbol;
    const to = `${from}:SILO`;
    graph.setEdge(from, to, {
      build: (_: string, from: FarmFromMode) => new sdk.farm.actions.Deposit(token, from),
      from,
      to
    });
  }

  return graph;
};
