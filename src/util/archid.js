import { Client, Accounts } from './client';

const ARCHID_REGISTRY_CONTRACT = process.env.VUE_APP_ARCHID_REGISTRY_CONTRACT;

/**
 * Reads the ArchID registry contract Config
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @returns {QueryResult}
 */
async function Config(client = null) {
  if (!client) client = await Client();
  try {
    let entrypoint = {
      config: {}
    };
    let query = await client.wasmClient.queryClient.wasm.queryContractSmart(
      ARCHID_REGISTRY_CONTRACT,
      entrypoint
    );
    return query;
  } catch(e) {
    console.error(e);
    return {};
  }
}

/**
 * Loads ArchID token ids owned by a specific address
 * @param {String} contract? : (Optional) contract address string for token contract
 * @param {String} account? : (Optional) owner account address to be queried
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @param {Number} limit? : (Optional) max amount of tokens to be loaded; defaults to 100
 * @param {String} start_after? : (Optional) `tokenId` for pagination, begin loading tokens beginning after a specific `tokenId`
 * @returns {QueryResult}
 */
async function TokensOf(contract = null, account = null, client = null,  limit = 100, start_after = null) {
  if (!client) client = await Client();
  try {
    if (!account) {
      let accounts = await Accounts(client);
      account = accounts[0].address;
    }
    if (!contract || typeof contract !== "string") {
      let cw721Query = await Config(client);
      contract = cw721Query.cw721;
    }

    let entrypoint = {
      tokens: {
        owner: account,
        limit: limit,
      }
    };

    if (start_after) entrypoint.tokens["start_after"] = start_after;

    let tokenQuery = await client.wasmClient.queryClient.wasm.queryContractSmart(
      contract,
      entrypoint
    );
    
    return tokenQuery;
  } catch(e) {
    console.error(e);
    return {};
  }
}

/**
 * Load token metadata from token contract for a valid ArchID token ID
 * @param {String} tokenId : The domain name / token ID to be fetched
 * @param {String} contract? : (Optional) contract address string for token contract
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @returns {QueryResult}
 */
async function Token (tokenId = null, contract = null, client = null) {
  if (!client) client = await Client();
  if (!tokenId || typeof tokenId !== 'string') {
    console.warn('Invalid token ID ' + typeof tokenId);
    return {};
  }

  try {
    let entrypoint = {
      nft_info: {
        token_id: tokenId
      }
    };

    if (!contract || typeof contract !== "string") {
      let cw721Query = await Config(client);
      contract = cw721Query.cw721;
    }

    let tokenQuery = await client.wasmClient.queryClient.wasm.queryContractSmart(
      contract,
      entrypoint
    );

    return tokenQuery;
  } catch(e) {
    // console.error(e);
    return {};
  }
}

export { 
  Config, 
  Token,
  TokensOf, 
}