import { 
  leapClient, 
  keplrClient, 
  cosmostationClient, 
  offlineClient,
} from './cosmwasm';
  
  /**
   * Gets signing client instance
   * @param {String} wallet : Supported wallet values are; 'keplr', 'leap', 'cosmostation', 'offline'
   * @returns {SigningCosmWasmClient}
   */
async function Client(wallet = 'keplr') {
  let client;
  switch (wallet) {
    case 'cosmostation': {
      client = await cosmostationClient();
      break;
    }
    case 'keplr': {
      client = await keplrClient();
      break;
    }
    case 'leap': {
      client = await leapClient();
      break;
    }
    case 'offline': {
      client = await offlineClient();
      break;
    }
  }
  return client;
}
  
async function Accounts(client = null) {
  if (!client) client = await Client();
  let accounts = (client['offlineSigner']) ? await client.offlineSigner.getAccounts() : [];
  if (!accounts.length) return accounts;

  for (let i = 0; i < accounts.length; i++) {
    accounts[i].balance = await client.wasmClient.getBalance(
      accounts[i].address, 
      client.chainInfo.currencies[0].coinMinimalDenom
    );
  }

  return accounts;
}
  
  export { Client, Accounts };