import { coin } from "@cosmjs/stargate";
import { Client } from './client';
import { FromAtto } from './denom';

const FOMO_CONTRACT = process.env.VUE_APP_FOMO_CONTRACT;
const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);

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
  try {
    let balances = await client.bankClient.getAllBalances(FOMO_CONTRACT);
    return balances[0];
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
const Query = { Game, PrizePool };
const Execute = { Deposit, Claim};

export {
  Query,
  Execute
}