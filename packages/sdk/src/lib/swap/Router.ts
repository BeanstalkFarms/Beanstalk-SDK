import { Graph, alg } from "graphlib";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Token } from "src/classes/Token";
import { FarmFromMode, FarmToMode } from "src/lib/farm/types";
import { StepClass } from "src/classes/Workflow";

type RouterResult = {
  step: (account: string, fromMode?: FarmFromMode, toMode?: FarmToMode) => StepClass;
  from: string;
  to: string;
};

export class Router {
  private static sdk: BeanstalkSDK;
  private graph: Graph;

  constructor(sdk: BeanstalkSDK) {
    Router.sdk = sdk;
    this.buildGraph();
  }

  public findPath(tokenIn: Token, tokenOut: Token): RouterResult[] {
    const a = tokenIn.symbol;
    const b = tokenOut.symbol;

    let path = this.searchGraph(a, b);
    // At this point, path is an array of strings, for ex:
    // [ 'ETH', 'WETH', 'USDT', 'BEAN' ]
    // We need to conver this to an array of edges, by getting the edgets of these pairs
    // them. ex:
    // [ ETH/WETH, WETH/USDT, USDT/BEAN]

    if (path.length === 0) {
      Router.sdk.debug(`Router.findPath: No path found from ${a}->${b}`);
      return [];
    }
    if (path.length === 1) {
      Router.sdk.debug(`Router.findPath: Self transfer ${path[0]}`);
      return [this.buildSelfTransfer(tokenIn)];
    }

    // Get the edges
    const results: RouterResult[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      results.push(this.graph.edge(path[i], path[i + 1]));
    }

    return results;
  }

  private searchGraph(start: string, end: string): string[] {
    const path: string[] = [];
    let res = alg.dijkstra(this.graph, start);
    // console.log(`Search Results [${start}->${end}]: `, res);
    Router.sdk.debug(`[Router.searchGraph()]`, { start, end, results: res });

    // target not found
    if (!res[end]) return [];
    // sournce not found
    if (!res[start]) return [];

    let endStep = res[end];
    if (endStep.distance === Infinity) return [];

    path.push(end);
    while (endStep.distance > 0) {
      path.push(endStep.predecessor);
      endStep = res[endStep.predecessor];
    }
    path.reverse();

    return path;
  }

  private buildGraph() {
    this.graph = new Graph({
      multigraph: true,
      directed: true,
      compound: false
    });

    ////// Add Nodes

    this.graph.setNode("ETH", { token: Router.sdk.tokens.ETH });
    this.graph.setNode("WETH", { token: Router.sdk.tokens.WETH });
    this.graph.setNode("BEAN", { token: Router.sdk.tokens.BEAN });
    this.graph.setNode("USDT", { token: Router.sdk.tokens.USDT });
    this.graph.setNode("USDC", { token: Router.sdk.tokens.USDC });
    this.graph.setNode("DAI", { token: Router.sdk.tokens.DAI });

    ////// Add Edges

    // ETH<>WETH
    this.graph.setEdge("ETH", "WETH", {
      step: (_: string, _2: FarmFromMode, to: FarmToMode) => new Router.sdk.farm.actions.WrapEth(to),
      from: "ETH",
      to: "WETH"
    });
    this.graph.setEdge("WETH", "ETH", {
      step: (_: string, from: FarmFromMode, _2: FarmToMode) => new Router.sdk.farm.actions.UnwrapEth(from),
      from: "WETH",
      to: "ETH"
    });

    // WETH<>USDT
    this.graph.setEdge("WETH", "USDT", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) => Router.sdk.farm.presets.weth2usdt(from, to),
      from: "WETH",
      to: "USDT"
    });
    this.graph.setEdge("USDT", "WETH", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) => Router.sdk.farm.presets.usdt2weth(from, to),
      from: "USDT",
      to: "WETH"
    });

    // USDT<>BEAN
    this.graph.setEdge("USDT", "BEAN", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) => Router.sdk.farm.presets.usdt2bean(from, to),
      from: "USDT",
      to: "BEAN"
    });
    this.graph.setEdge("BEAN", "USDT", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) => Router.sdk.farm.presets.bean2usdt(from, to),
      from: "BEAN",
      to: "USDT"
    });

    // USDC<>BEAN
    this.graph.setEdge("USDC", "BEAN", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.ExchangeUnderlying(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.tokens.USDC,
          Router.sdk.tokens.BEAN,
          from,
          to
        ),
      from: "USDC",
      to: "BEAN"
    });
    this.graph.setEdge("BEAN", "USDC", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.ExchangeUnderlying(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.tokens.BEAN,
          Router.sdk.tokens.USDC,
          from,
          to
        ),
      from: "BEAN",
      to: "USDC"
    });

    // DAI<>BEAN
    this.graph.setEdge("DAI", "BEAN", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.ExchangeUnderlying(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.tokens.DAI,
          Router.sdk.tokens.BEAN,
          from,
          to
        ),
      from: "DAI",
      to: "BEAN"
    });
    this.graph.setEdge("BEAN", "DAI", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.ExchangeUnderlying(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.tokens.BEAN,
          Router.sdk.tokens.DAI,
          from,
          to
        ),
      from: "BEAN",
      to: "DAI"
    });

    // CRV3<>BEAN
    this.graph.setEdge("3CRV", "BEAN", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.Exchange(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.contracts.curve.registries.metaFactory.address,
          Router.sdk.tokens.CRV3,
          Router.sdk.tokens.BEAN,
          from,
          to
        ),
      from: "3CRV",
      to: "BEAN"
    });
    this.graph.setEdge("BEAN", "3CRV", {
      step: (_: string, from: FarmFromMode, to: FarmToMode) =>
        new Router.sdk.farm.actions.Exchange(
          Router.sdk.contracts.curve.pools.beanCrv3.address,
          Router.sdk.contracts.curve.registries.metaFactory.address,
          Router.sdk.tokens.BEAN,
          Router.sdk.tokens.CRV3,
          from,
          to
        ),
      from: "BEAN",
      to: "3CRV"
    });
  }

  private buildSelfTransfer(token: Token): RouterResult {
    return {
      step: (account: string, from?: FarmFromMode, to?: FarmToMode): StepClass => {
        return new Router.sdk.farm.actions.TransferToken(token.address, account, from, to);
      },
      from: token.symbol,
      to: token.symbol
    };
  }

  getGraphCode() {
    let code = "// http://www.webgraphviz.com\ndigraph G {\n";
    this.graph.edges().forEach((e) => {
      code += `\t"${e.v}" -> "${e.w}"\n`;
    });
    code += "}";

    return code;
  }
}
