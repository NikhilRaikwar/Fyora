declare module "@particle-network/universal-account-sdk" {
  export type EIP7702Authorization = { userOpHash: string; signature: string };

  export type IToken = {
    assetId: string;
    type: string;
    chainId: number;
    address: string;
    decimals: number;
    realDecimals: number;
  };

  export type IAssetsResponse = {
    totalAmountInUSD: number;
    assets: Array<{
      amountInUSD: number;
      chainAggregation: Array<{
        token: IToken;
        amount: number;
        amountInUSD: number;
        rawAmount: number;
      }>;
    }>;
  };

  export type ITransaction = {
    rootHash: string;
    userOps: Array<{
      chainId: number;
      userOpHash: string;
      eip7702Delegated?: boolean;
      eip7702Auth?: { address: string; chainId: number; nonce?: number };
    }>;
  };

  export class UniversalAccount {
    constructor(config: Record<string, unknown>);
    getPrimaryAssets(): Promise<IAssetsResponse>;
    createTransferTransaction(input: {
      token: { chainId: number; address: string };
      amount: string;
      receiver: string;
    }): Promise<ITransaction>;
    sendTransaction(
      transaction: ITransaction,
      signature: string,
      authorizations?: EIP7702Authorization[],
    ): Promise<{ transactionId: string }>;
  }

  export const UNIVERSAL_ACCOUNT_VERSION: string;
}
