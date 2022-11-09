import { ERC20Token } from "src/classes/Token/ERC20Token";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { SignedPermit } from "src/lib/permit";
import { TokenValue } from "src/TokenValue";
import { Farmable, FarmFromMode, FarmToMode } from "src/lib/farm/types";
import { ethers } from "ethers";

export function depositAndMintRoot(sdk: BeanstalkSDK) {
  return (account: string, token: ERC20Token, amount: TokenValue, permit: SignedPermit): Farmable[] => {
    const steps: Farmable = [];
    // load pipeline
    steps.push(sdk.farm.presets.loadPipeline(token, amount.toBlockchain(), FarmFromMode.EXTERNAL, permit));
    steps.push(async () => {
      const season = await sdk.sun.getSeason();
      return sdk.depot.advancedPipe([
        // 0:
        // Approve BEANSTALK to use BEAN from PIPELINE
        // Use case: deposit BEAN as Pipeline
        // (it's gas-optimal for PIPELINE to deposit instead of FARMER)
        sdk.depot.advancedPacket(sdk.tokens.BEAN.getContract(), "approve", [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256]),

        // 1:
        // Within Beanstalk: Approve ROOT to use deposits of `_token` owned by PIPELINE
        // Use case: send `_token` Deposit from PIPELINE -> ROOT
        sdk.depot.advancedPacket(sdk.contracts.beanstalk, "approveDeposit", [
          sdk.contracts.root.address,
          token.address,
          ethers.constants.MaxUint256,
        ]),

        // 2:
        // Approve BEANSTALK to use ROOT from PIPLEINE
        // Use case: send ROOT from PIPELINE -> FARMER
        sdk.depot.advancedPacket(sdk.tokens.ROOT.getContract(), "approve", [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256]),

        // 3:
        // Deposit `_token` in the Silo
        // Use case: gives PIPELINE a deposit to transfer to ROOT
        sdk.depot.advancedPacket(sdk.contracts.beanstalk, "deposit", [token.address, amount.toBlockchain(), FarmFromMode.EXTERNAL]),

        // 4:
        // Mint ROOT using the deposit created in the above step
        // Tokens are delivered to the external balance of PIPELINE
        sdk.depot.advancedPacket(sdk.contracts.root, "mint", [
          [
            {
              token: token.address,
              seasons: [season], // FIXME: will fail if season flips during execution
              amounts: [amount.toBlockchain()], //
            },
          ],
          FarmToMode.EXTERNAL, // send to PIPELINE's external balance
        ]),

        // 5:
        // Transfer token from PIPELINE to ACCOUNT
        sdk.depot.advancedPacket(
          sdk.contracts.beanstalk,
          "transferToken",
          [
            sdk.tokens.ROOT.address,
            account,
            "0", // Will be overwritten by advancedData
            FarmFromMode.EXTERNAL, // use PIPELINE's external balance
            FarmToMode.EXTERNAL, // TOOD: make this a parameter
          ],
          sdk.depot.encodeAdvancedData([4, 32, 100]) // packet 4, slot 32 -> packet 5, slot 100
        ),
      ]);
    });

    return steps;
  };
}
