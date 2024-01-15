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
      <div v-if="!player.id">
        <p>{{accounts[0].address}}</p>
      </div>
      <div v-else>
        <p class="player-id">{{ player.id }}</p>
        <img class="avatar" :src="avatar" />
      </div>
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
const DefaultAvatar = "/img/token.svg";
const IPFS_GATEWAY_PREFIX = 'https://ipfs.io/ipfs/';
const IPFS_CID_PREFIX = 'ipfs://';

export default {
  name: 'Fomo',
  data: () => ({
    cwClient: null,
    accounts: [],
    connected: false,
    connecting: false,
    player: {
      id: null,
      avatar: null,
    },
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
        this.trySetPlayer();
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
        }, 100);
      } catch (e) {
        await this.resumeConnectedState((attempts + 1));
      }
    },
    trySetPlayer: function () {
      if (window) {
        let player = window.localStorage.getItem('player');
        if (player) this.player = JSON.parse(player);
      }
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
  computed: {
    avatar: function () {
      if (!this.player.avatar) return DefaultAvatar;
      let img = (this.player.avatar.substr(0,7) == IPFS_CID_PREFIX) 
        ? this.player.avatar.replace(IPFS_CID_PREFIX, IPFS_GATEWAY_PREFIX) : this.player.avatar;
      return img;
    },
  },
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
