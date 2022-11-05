import paradox from './contract';
import { sdk } from '../setup';

/**
 * Test Paradox contract.
 */
(async () => {
  console.log("Total pools: ", (await paradox.connect(sdk.providerOrSigner).getTotalPools()).toString());
})()