<template>
  <div class="app">
    <div class="connect">
      <!-- Not Logged In -->
      <div class="wallet-choice" v-if="!connected">
        <p class="title">Choose a wallet to connect</p>
        <p class="subtitle">Select from the supported wallets to get started.</p>
        <ul class="wallet-connect row">
          <li 
            id="connect_keplr" 
            class="btn-connect btn-keplr" 
            @click="connectWallet('keplr');"
          ><span class="icon icon-keplr"></span>Keplr</li>
          <li 
            id="connect_cosmostation" 
            class="btn-connect btn-cosmostation" 
            @click="connectWallet('cosmostation');"
          ><span class="icon icon-cosmostation"></span>Cosmostation</li>
          <li 
            id="connect_leap" 
            class="btn-connect btn-leap" 
            @click="connectWallet('leap');"
          ><span class="icon icon-leap"></span>Leap</li>
        </ul>
      </div>
    </div>

    <!-- Logged In -->
    <div class="account-data" v-if="connected && accounts.length">
      <p>{{accounts[0].address}}</p>
      <p 
        :alt="formatFromAtto(accounts[0].balance.amount) + ' ' + denom" 
        :title="formatFromAtto(accounts[0].balance.amount) + ' ' + denom"
      >{{balanceDisplayFormat(accounts[0].balance.amount)}} {{ denom }}</p>
    </div>

    <!-- Page Content -->
    <div class="page-content">
      <router-view :key="render" />
    </div>
  </div>
</template>

<script>
import { Client, Accounts } from './util/client';
import { FromAtto } from './util/denom';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);

export default {
  name: 'Fomo',
  data: () => ({
    cwClient: null,
    accounts: [],
    connected: false,
    connecting: false,
    walletTypes: ['keplr', 'cosmostation', 'leap'],
    walletType: null,
    render: 0,
    denom: (IsTestnet) ? "CONST" : "ARCH",
    formatFromAtto: FromAtto,
  }),
  mounted: async function () {
    if (window) {
      this.route = location.pathname;
      let connected = window.sessionStorage.getItem('connected');
      if (connected) {
        this.resumeConnectedState();
        this.connected = true;
      }
    }
  },
  methods: {
    connectWallet: async function (wallet = "keplr") {
      if (this.walletTypes.indexOf(wallet) == -1) return;

      this.connecting = true;
      this.walletType = wallet;

      try {
        this.cwClient = await Client(this.walletType);
        this.accounts = await Accounts(this.cwClient);
        console.log('?', this.cwClient, this.accounts);
        if (!this.accounts[0].address) return;
        this.connected = true;
        this.connecting = false;
        window.sessionStorage.setItem('connected', this.walletType);
      } catch(e) {
        this.connected = false;
        this.connecting = false;
        console.error(e);
      }
      this.render += 1;
      // console.log('App', {cwClient: this.cwClient, accounts: this.accounts, walletType: this.walletType});
    },
    resumeConnectedState: async function (attempts = 0) {
      if (attempts >= 5) {
        this.cwClient = await Client('offline');
        return;
      }
      try {
        setTimeout(async () => { 
          let walletType = sessionStorage.getItem("connected");
          this.cwClient = await Client(walletType);
          this.accounts = await Accounts(this.cwClient);
          // console.log('App', {cwClient: this.cwClient, accounts: this.accounts, walletType: walletType});
        }, 100);
      } catch (e) {
        await this.resumeConnectedState((attempts + 1));
      }
    },
    connectHandler: function () {
      window.scrollTo(0, 0);
      const connectEl = document.getElementById('connect_modal');
      connectEl.click();
    },
    connectCancel: function () {
      this.connected = false;
      this.connecting = false;
    },
    disconnectWallet: async function () {
      sessionStorage.removeItem("connected");
      window.location.reload();
    },
    resolveUpdates: async function () {
      try {
        let accounts = await Accounts(this.cwClient);
        if (!accounts[0].address) return;
        this.accounts = accounts;
      } catch(e) {
        console.error('Error resolving wallet balance', e);
      }
    },
    balanceDisplayFormat: function (balance = null) {
      if (!balance) return "";
      let archBalance = FromAtto(balance);
      if (archBalance < 1) return archBalance;
      return archBalance.toLocaleString("en");
    },
    accountDisplayFormat: function (account = null) {
      if (!account) return "";
      return account.slice(0,12) + "..." + account.slice(-5);
    },
  },
  computed: {}
}
</script>

<style scoped>
.app {
  max-width: 1080px;
  margin: auto;
  display: block;
  padding: 2em;
}
.wallet-connect li {
  cursor: pointer;
}
</style>
