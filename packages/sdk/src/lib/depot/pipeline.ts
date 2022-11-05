import { ethers } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";

export enum AdvancedDataType {
  EMPTY = 0,
  FLAT = 1,
  NESTED = 2,
}

export type AdvancedDataTuple = Readonly<
  [returnDataIndex: number, copyIndex: number, pasteIndex: number]
>;

export type CopyData = {
  [AdvancedDataType.EMPTY]: Readonly<[]>;
  [AdvancedDataType.FLAT]: Readonly<AdvancedDataTuple>;
  [AdvancedDataType.NESTED]: Readonly<AdvancedDataTuple[]>;
}

export class Pipeline {
  /**
   * data is a list of the 3 indices: [returnDataIndex, copyIndex, pasteIndex]
   * preBytes is optional and should be used if the function call performs exactly 1 data copy operation
   * in which case it should be set to `0x0${type}0${useEtherFlag}`
   * where type is 0, 1 or 2 and useEtherFlag is 0 or 1.
   */
  private static packAdvanced(
    data: AdvancedDataTuple,
    preBytes : string = '0x0000'
  ) {
    return ethers.utils.solidityPack(
      ['bytes2', 'uint80', 'uint80', 'uint80'],
      [preBytes, data[0], data[1], data[2]]
    );
  }

  /**
   * 
   */
  private static prepareAdvancedData<Type extends AdvancedDataType>(
    type: Type,
    copyData : CopyData[Type],
    value: ethers.BigNumber,
  ) {
    let hasValue = value.gt(0);
    let types : string[] = [];
    let encodeData : (string | string[])[] = [];
    let typeBytes = `0x0${type}0${hasValue ? 1 : 0}`;

    switch (type) {
      case 0: {
        types.push('bytes2');
        encodeData.push(typeBytes)
        break;
      };
      case 1: {
        types.push('bytes32');
        encodeData.push(
          Pipeline.packAdvanced(copyData as AdvancedDataTuple, typeBytes)
        );
        break;
      };
      case 2: {
        types = types.concat(['bytes2', 'uint256[]']);
        encodeData = encodeData.concat([
          typeBytes,
          (copyData as AdvancedDataTuple[]).map((d) => Pipeline.packAdvanced(d))
        ])
        break;
      }
      default: {
        throw new Error(`Pipeline: Unrecognized advanced data type ${type}`);
      }
    }

    if (hasValue) {
      types.push('uint256');
      encodeData.push(value.toString());
    }

    return { types, encodeData };
  }

  /**
   * Encode "advanced data" for copying calldata between pipeline calls. 
   * 
   * @note calldata byte positions use their "assembly" indices.
   * 
   * - for the "copyIndex" encoded in `copyData[1]`, bytes 0-31 encode
   *   the length of the return tuple. the first element is stored at
   *   byte 32.
   * 
   * - for the "pasteIndex" encoded in `copyData[2]`, bytes 0-3 encode
   *   the function signature and bytes 4-35 encode the length of the following
   *   data. so the first slot begins at index 36:
   *   - `0x` (0x is trimmed in solidity)
   *   - `ab01cd23` (first 8 hex characters = 4 bytes is the length of data)
   *   - `0000....` (next 64 hex characters = 32 bytes is first element)
   */
  public static encodeAdvancedData(
    copyData: CopyData[AdvancedDataType],
    value: ethers.BigNumber = ethers.BigNumber.from(0),
  ) {
    let type : number;
    if (copyData.length === 0) {
      // empty array
      type = 0;
    } else if (Array.isArray(copyData[0])) {
      // nested array
      type = 2;
    } else {
      // single array
      type = 1;
    }
    const { types, encodeData } = Pipeline.prepareAdvancedData(type, copyData, value)
    return defaultAbiCoder.encode(types, encodeData);
  }
}