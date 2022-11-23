import { CurveMetaPool__factory } from "src/constants/generated";
import { TokenValue } from "src/TokenValue";
import Pool, { Reserves } from "./Pool";

export class CurveMetaPool extends Pool {
  public getContract() {
    return CurveMetaPool__factory.connect(this.address, Pool.sdk.providerOrSigner);
  }

  public getReserves() {
    Pool.sdk.debug(`CurveMetaPool.getReserves(): ${this.address} ${this.name} on chain ${this.chainId}`);

    return this.getContract()
      .get_balances()
      .then((result) => [TokenValue.fromBlockchain(result[0], 0), TokenValue.fromBlockchain(result[1], 0)] as Reserves);
  }
}
