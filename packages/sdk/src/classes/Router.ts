import { Graph, alg } from "graphlib";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Token } from "src/classes/Token";
import { FarmFromMode, FarmToMode } from "src/lib/farm/types";
import { StepClass } from "src/classes/Workflow";

export type RouterResult = {
  step: (account: string, fromMode?: FarmFromMode, toMode?: FarmToMode) => StepClass;
  from: string;
  to: string;
};

type SelfEdgeBuilder = (token: Token) => RouterResult;

export class Router {
  private static sdk: BeanstalkSDK;
  private graph: Graph;
  private buildSelfEdge: SelfEdgeBuilder;

  constructor(sdk: BeanstalkSDK, graph: Graph, selfEdgeBuilder: SelfEdgeBuilder) {
    Router.sdk = sdk;
    this.graph = graph;
    this.buildSelfEdge = selfEdgeBuilder;
  }

  public findPath(tokenIn: Token, tokenOut: Token): RouterResult[] {
    const a = tokenIn.symbol;
    const b = tokenOut.symbol;

    let path = this.searchGraph(a, b);
    // At this point, path is an array of strings, for ex:
    // [ 'A', 'B', 'C', 'D' ]
    // We need to conver this to an array of edges, by getting the edgets of these pairs
    // them. ex:
    // [ A/B, B/C, C/D]

    // Length of 0 means there was no path found
    if (path.length === 0) {
      Router.sdk.debug(`Router.findPath: No path found from ${a}->${b}`);
      return [];
    }

    // Length of 1 means the source and target are the same node,
    // for ex, swap BEAN to BEAN, or deposit BEAN to BEAN.
    // This is a special case; we must use the same "edge" for all nodes.
    // For ex, in a swap, we use a 'transfer()' action
    // in a deposit graph, we use addLiquidity. We refer to this as the "selfEdge"
    // and it must be passed in during Router instantiation.
    if (path.length === 1) {
      Router.sdk.debug(`Router.findPath: Self transfer ${path[0]}`);
      return [this.buildSelfEdge(tokenIn)];
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

  getGraphCode() {
    let code = "// http://www.webgraphviz.com\ndigraph G {\n";
    this.graph.edges().forEach((e) => {
      code += `\t"${e.v}" -> "${e.w}"\n`;
    });
    code += "}";

    return code;
  }
}
