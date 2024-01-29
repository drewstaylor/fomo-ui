<template>
  <div class="app row">
    <!-- Page Content -->
    <div class="page-content col left">
      <router-view :key="render" />
    </div>

    <!-- User / Nav -->
    <div class="navbar col right">
      <div class="navbar-brand">
        <div class="brand-wrapper row">
          <div class="col left raised">
            <span class="brand brand-1">Network</span>
            <span class="brand brand-2">Wars</span>
          </div>
          <div class="col right fade-web-right"></div>
        </div>
      </div>
      <div class="get-connected">
        <button class="btn btn-connect btn-primary">Connect</button>
      </div>
      <div class="connected" v-if="connected">
        <!-- Not Logged In -->
        <ul>
          <!-- <li class="wallet-choice nav-item" v-if="!connected">
            <button 
              class="btn btn-inverse nav-link dropdown-toggle" 
              role="button" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
            >Connect</button>
            <ul class="wallet-connect row dropdown-menu nav-item dropdown">
              <li 
                id="connect_keplr" 
                class="btn-connect btn-keplr dropdown-item" 
                @click="connectWallet('keplr');"
              ><span class="icon icon-keplr"></span>Keplr</li>
              <li 
                id="connect_cosmostation" 
                class="btn-connect btn-cosmostation dropdown-item" 
                @click="connectWallet('cosmostation');"
              ><span class="icon icon-cosmostation"></span>Cosmostation</li>
              <li 
                id="connect_leap" 
                class="btn-connect btn-leap dropdown-item" 
                @click="connectWallet('leap');"
              ><span class="icon icon-leap"></span>Leap</li>
            </ul>
          </li> -->
        

          <!-- Logged In -->
          <li class="pfp nav-item" v-if="player.avatar">
            <div 
              class="img avatar" 
              :style="'background-image: url('+ avatar +');'"
            ></div>
          </li>
          <li class="nav-item greeting" v-if="!player.id && connected">
            <p>Greetings {{ displayName }}</p>
            <p>Claim your <a :href="archIdMintLink" target="_blank">ArchID</a> to participate in Fomo!</p>
          </li>
          <li class="nav-item greeting" v-if="player.id && connected">
            <p>Welcome back <a :href="profileLink + player.id" target="_blank">{{ displayName }}</a></p>
            <p>Ready to fomo?</p>
          </li>
          <li 
            class="balance nav-item" 
            v-if="connected && player.id"
            :alt="formatFromAtto(accounts[0].balance.amount) + ' ' + denom" 
            :title="formatFromAtto(accounts[0].balance.amount) + ' ' + denom"
          >
            <p>You have</p>
            <p>{{balanceDisplayFormat(accounts[0].balance.amount)}} {{ denom }}</p>
          </li>
        </ul>
        <div class="logout" v-if="connected">
          <button class="btn btn-inverse" @click="logout();">Logout</button>
        </div>
      </div>
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
const ARCHID_PROFILE_LINK_PREFIX = (IsTestnet) ? "https://test.archid.app/domains/" : "https://archid.app/domains/";

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
    archIdMintLink: (IsTestnet) ? "https://test.archid.app" : "https://archid.app",
    walletTypes: ['keplr', 'cosmostation', 'leap'],
    walletType: null,
    render: 0,
    denom: (IsTestnet) ? "CONST" : "ARCH",
    profileLink: ARCHID_PROFILE_LINK_PREFIX,
    formatFromAtto: FromAtto,
  }),
  mounted: async function () {
    if (window) {
      let connected = window.sessionStorage.getItem('connected');
      if (connected) {
        this.resumeConnectedState();
        this.trySetPlayer();
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
    logout: function () {
      try {
        window.sessionStorage.removeItem('connected');
        window.location.reload();
      } catch (e) {
        console.error(e);
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
    displayName: function () {
      if (!this.accounts.length) return "";
      if (!this.player.id) return "player";
      return this.player.id;
    },
  },
}
</script>

<style scoped>
.app {
  max-width: 1440px;
  margin: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 2em;
  padding-bottom: 2em;
}
.page-content.col.left, .navbar.col.right {
  max-width: 50%;
  margin: 0;
  padding: 0;
}
.page-content.col.left {
  border-radius: 16px;
  border: 1px solid #FF4D00;
  margin: -1px;
  margin-right: 1em;
  max-height: 855px;
  overflow: hidden;
  padding: 0;
}
.wallet-connect {
  top: 5.5em;
  left: 2.25em;
}
.wallet-connect li {
  cursor: pointer;
}
li.nav-item {
  margin: 2em;
}
.img.avatar {
  width: 120px;
  height: 120px;
  background-size: contain;
  background-color: #FFFFFF;
  background-position: center center;
  background-repeat: no-repeat;
  position: relative;
  border: 1px solid #000000;
}
.navbar {
  max-width: 50%;
}
.navbar, .nav-item {
  align-items: flex-end;
  justify-content: flex-end;
}
.navbar-brand {
  height: 150px;
  border-radius: 16px;
  border: 1px solid #FF4D00;
  background: rgba(255, 77, 0, 0.20);
  box-sizing: border-box;
  flex: 1 0 0;
  padding: 0.5em;
  overflow: hidden;
}
.col.left.raised {
  z-index: 100;
}
.navbar, .img.avatar {
  border-radius: 8px;
}
.navbar-collapse, .navbar {
  background-color: #000000 !important;
}
.page-content {
  margin-top: 2em;
}
.logout {
  margin: 2em;
}
.btn-connect {
  border-radius: 12px;
  border: 1px solid #FF4D00;
  background: #FF4D00;
  box-shadow: 3px 9px 32px -4px rgba(0, 0, 0, 0.07);
  display: flex;
  height: 150px;
  padding: 0px 24px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1 0 0;
}
</style>
