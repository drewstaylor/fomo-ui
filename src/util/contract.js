import { coin } from "@cosmjs/stargate";
import { Client } from './client';
import { FromAtto } from './denom';

const FOMO_CONTRACT = process.env.VUE_APP_FOMO_CONTRACT;
const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);

// Helpers

/**
 * Private parsing function for tx filter args.
 * @param { String } oneLiner : Tx filter arguments; e.g. `wasm._contract_address=${contract}&wasm.token_id=${tokenId}`
 * @returns { Object } : { key, value } kv pairs
 */
function _makeTags(oneLiner)  {
  return oneLiner.split("&").map((pair) => {
    if (pair.indexOf("=") === -1) throw new Error("Parsing error: Equal sign missing");
    const parts = pair.split("=");
    if (parts.length > 2) {
      throw new Error(
        "Parsing error: multiple equal signs found.",
      );
    }
    const [key, value] = parts;
    if (!key) throw new Error("Parsing error: key must not be empty");
    return { key, value };
  });
}

// Queries

/**
 * Retrieve the current game state
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @returns {QueryResult}
 */
async function Game(client = null) {
  if (!client) client = await Client();
  try {
    let entrypoint = {game: {}};
    let query = await client.wasmClient.queryClient.wasm.queryContractSmart(
      FOMO_CONTRACT,
      entrypoint
    );
    return query;
  } catch(e) {
    console.error(e);
    return {};
  }
}

async function PrizePool(client = null) {
  if (!client) client = await Client();
  if (!client.wasmClient) client = await Client('offline');
  try {
    let denom = (IsTestnet) ? "aconst" : "aarch";
    let balance = await client.wasmClient.queryClient.bank.balance(FOMO_CONTRACT, denom);
    return balance;
  } catch(e) {
    console.error(e);
    return {error: e};
  }
}

async function History(round = 1, client = null) {
  if (!client) client = await Client();
  if (!round) round = 1;
  try {
    // let historyQuery = await client.wasmClient.searchTx(
    //   _makeTags(`wasm._contract_address=${FOMO_CONTRACT}&wasm.round=${round}`),
    // );
    let historyQuery = await client.wasmClient.searchTx(
      _makeTags(`wasm._contract_address=${FOMO_CONTRACT}`),
    );
    return historyQuery;
  } catch(e) {
    console.error(e);
    return {error: e};
  }
}

// Txs

/**
 * Deposit to the game contract, increasing the timer and become 
 * the next game leader (last depositor)
 * @param {Number} amount : Deposit amount in ATTO
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @returns {ExecuteResult}
 */
async function Deposit(amount = 0, client = null) {
  if (typeof amount !== 'number') return;
  if (amount <= 0) return;
  if (!client) client = await Client();
  try {
    let funds = [coin(String(amount), client.chainInfo.currencies[0].coinMinimalDenom)];
    let deposit = FromAtto(amount);
    let denom = (IsTestnet) ? "CONST" : "ARCH";
    let entrypoint = {
      deposit: {}
    };
    let accounts = await client.offlineSigner.getAccounts();
    let tx = await client.wasmClient.execute(
      accounts[0].address,
      FOMO_CONTRACT,
      entrypoint,
      client.fees,
      "Fomo-ing in with " + deposit + " " + denom,
      funds
    );
    return tx;
  } catch (e) {
    console.error(e);
    return {
      error: String(e)
    };
  }
}

/**
 * Claim the prize funds if you won the game
 * @param {SigningCosmWasmClient} client? :  (Optional) instance of signing client
 * @returns {ExecuteResult}
 */
async function Claim(client = null) {
  if (!client) client = await Client();
  try {
    let entrypoint = {
      claim: {}
    };
    let accounts = await client.offlineSigner.getAccounts();
    let tx = await client.wasmClient.execute(
      accounts[0].address,
      FOMO_CONTRACT,
      entrypoint,
      client.fees,
      "Did I win?"
    );
    return tx;
  } catch (e) {
    console.error(e);
    return {
      error: String(e)
    };
  }
}


// Exports
const Query = { Game, PrizePool, History };
const Execute = { Deposit, Claim};

export {
  Query,
  Execute
}