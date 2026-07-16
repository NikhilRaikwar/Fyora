export type UniversalAssetToken = {
  assetId: string;
  type?: string;
  tokenType?: string;
  chainId: number;
  address: string;
  decimals: number;
  realDecimals: number;
};

export type UniversalAssetsResponse = {
  totalAmountInUSD: number;
  assets: Array<{
    tokenType: string;
    price: number;
    amount: number;
    amountInUSD: number;
    chainAggregation: Array<{
      token: UniversalAssetToken;
      amount: number;
      amountInUSD: number;
      rawAmount: number;
    }>;
  }>;
};

export type UniversalTransaction = {
  rootHash: string;
  sender?: string;
  smartAccountOptions?: {
    ownerAddress?: string;
    senderAddress?: string;
    senderSolanaAddress?: string;
  };
  transactionFees: {
    transactionLPFeeAmountInUSD: string;
    transactionServiceFeeAmountInUSD: string;
  };
  tokenChanges: {
    totalFeeInUSD: string;
    totalIncrAmountInUSD: string;
  };
  userOps: Array<{
    chainId: number;
    userOpHash: string;
    eip7702Delegated?: boolean;
    eip7702Auth?: { address: string; chainId: number; nonce: number };
  }>;
};

export type UniversalAuthorization = {
  userOpHash: string;
  signature: string;
};
