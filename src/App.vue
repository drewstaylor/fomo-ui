<template>
  <div class="app row">
    <!-- Page Content: Left -->
    <div class="page-content col left">
      <router-view :key="render" />
    </div>

    <!-- Page Content: Right -->
    <div class="navbar col right">
      <!-- User / Nav -->
      <div class="navbar-brand">
        <div class="brand-wrapper row">
          <div class="col left raised">
            <span class="brand brand-1">Network</span>
            <span class="brand brand-2">Wars</span>
          </div>
          <div class="col right fade-web-right"></div>
          <div class="info rules cursor-pointer" @click="welcomeModal();">
            <span class="icon icon-info"></span>
          </div>
        </div>
      </div>
      <div class="get-connected" v-if="!connected">
        <button class="btn btn-connect btn-primary" @click="walletModal();">Connect</button>
      </div>
      <div class="connected player-display" v-if="connected && player.id">
        <div class="row player-row">
          <div class="col left">
            <button class="btn btn-secondary player-id">{{player.id}}</button>
            <div class="row sub">
              <div class="col sub">
                <button class="btn btn-tertiary change-id" @click="playerModal();">Change</button>
                <button class="btn btn-tertiary logout" @click="logout();">
                  <span class="icon icon-logout"></span>
                </button>
              </div>
            </div>
          </div>
          <div class="col right">
            <div 
              :class="{'img' :true, 'avatar': true, 'default': avatar == defaultAvatar}" 
              :style="'background-image: url('+ avatar +');'"
            ></div>
          </div>
        </div>
      </div>

      <!-- Tx History -->
      <div class="page-content game-history row right" v-if="readOnlyClient">
        <History
          v-bind:cwClient="readOnlyClient"
          v-bind:accounts="accounts"
          v-bind:state="state"
          :key="historyRender"
        >
        </History>
      </div>
    </div>
  </div>

  <!-- Connect -->
  <Modal
    v-bind:name="'wallet-select'"
    v-bind:footer="true"
    v-bind:showModal="showModal.connect"
    @close="walletModal"
    @button="connectHandler"
  >
  </Modal>

  <!-- Welcome -->
  <Modal
    v-bind:name="'welcome'"
    v-bind:footer="!connected"
    v-bind:showModal="showModal.welcome"
    v-bind:state="state"
    @close="welcomeModal"
    @button="selectWalletHandler"
    v-if="showModal.welcome && state.min_deposit"
  ></Modal>

  <!-- Change Player -->
  <Modal
    v-bind:name="'archid-select'"
    v-bind:footer="true"
    v-bind:showModal="showModal.id"
    v-bind:msg="domains"
    @close="playerModal"
    @setPlayer="selectPlayerHandler"
    v-if="showModal.id && domains.length"
  >
  </Modal>

</template>

<script>
import { Client, Accounts } from './util/client';
import { FromAtto } from './util/denom';
import { Query } from './util/contract';

import History from './components/children/History.vue';
import Modal from './components/children/Modal.vue';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const DefaultAvatar = "/img/token.svg";
const IPFS_GATEWAY_PREFIX = 'https://ipfs.io/ipfs/';
const IPFS_CID_PREFIX = 'ipfs://';
const ARCHID_PROFILE_LINK_PREFIX = (IsTestnet) ? "https://test.archid.app/domains/" : "https://archid.app/domains/";

export default {
  name: 'Network Wars',
  components: { History, Modal },
  data: () => ({
    cwClient: null,
    accounts: [],
    connected: false,
    connecting: false,
    state: {},
    domains: [],
    player: {
      id: null,
      avatar: null,
    },
    readOnlyClient: null,
    defaultAvatar: DefaultAvatar,
    archIdMintLink: (IsTestnet) ? "https://test.archid.app" : "https://archid.app",
    walletTypes: ['keplr', 'cosmostation', 'leap'],
    walletType: null,
    render: 0,
    denom: (IsTestnet) ? "CONST" : "ARCH",
    profileLink: ARCHID_PROFILE_LINK_PREFIX,
    historyRender: 0,
    formatFromAtto: FromAtto,
    showModal: {
      welcome: false,
      connect: false,
      id: false,
    },
  }),
  mounted: async function () {
    if (window) {
      let connected = window.sessionStorage.getItem('connected');
      if (connected) {
        await this.resumeConnectedState();
        this.trySetPlayer();
        this.trySetState();
        this.connected = true;
      } else await this.trySetState();
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
    connectHandler: function (type) {
      this.connectWallet(type);
      this.showModal.connect = false;
    },
    selectWalletHandler: function () {
      this.showModal.welcome = false;
      this.showModal.connect = true;
    },
    selectPlayerHandler: function (player) {
      if (player.id) this.player = player;
      this.showModal.id = false;
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
    trySetState: async function () {
      let client = (this.cwClient) ? this.cwClient : await Client('offline');
      this.state = await Query.Game(client);
    },
    welcomeModal: function () {
      this.showModal.welcome = !this.showModal.welcome;
    },
    walletModal: function () {
      this.showModal.connect = !this.showModal.connect;
    },
    playerModal: function () {
      this.showModal.id = !this.showModal.id;
    },
    resolveHistory: function () {
      ++this.historyRender;
    },
    resolveUpdates: async function () {
      try {
        this.resolveHistory();
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
      if (!this.player.avatar) return DefaultAvatar
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
  max-width: 1640px;
  margin: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 2em;
  padding-bottom: 2em;
}
.navbar.col.right {
  max-width: 50%;
  margin: 0;
  padding: 0;
  position: relative;
  left: -15px;
}
.page-content.col.left {
  border-radius: 16px;
  border: 1px solid #FF4D00;
  margin: -1px;
  margin-right: 34px;
  max-height: 90vh;
  overflow: hidden;
  padding: 0;
}
.page-content.right {
  width: 100%;
  height: calc(90vh - (150px + 1em));
  border-radius: 16px;
  border: 1px solid #FF4D00;
  background: rgba(255, 77, 0, 0.20);
  margin: -1px;
  margin-top: 1em;
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
.connected.player-display {
  display: flex;
  padding: 0px 16px 0px 8px;
  justify-content: space-around;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  align-self: stretch;
  border-radius: 16px;
  border: 1px solid #FF4D00;
  background: rgba(255, 77, 0, 0.20);
}
.img.avatar {
  background-size: contain;
  background-color: rgba(255, 77, 0, 0.20);
  background-position: center center;
  background-repeat: no-repeat;
  position: relative;
  border-radius: 96px;
  width: 96px;
  height: 96px;
  top: 8px;
  flex-shrink: 0;
}
.img.avatar.default {
  background-color: transparent;
  border-radius: unset;
}
.row.sub {
  margin: 0;
}
.row.sub, .col.sub {
  padding: 0;
}
.col.sub {
  display: inline-flex;
  margin-top: 16px;
}
.btn.player-id, .btn.change-id {
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.btn.player-id {
  width: 100%;
  height: 64px;
  cursor: default;
}
.btn.change-id {
  margin-right: 8px;
  width: 75%;
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
  min-width: 400px;
  border-radius: 16px;
  border: 1px solid #FF4D00;
  background: rgba(255, 77, 0, 0.20);
  box-sizing: border-box;
  flex: 1 0 0;
  padding: 0.5em;
  overflow: hidden;
}
.info.rules {
  width: 48px;
  height: 48px;
  padding-top: 7px;
  border-radius: 8px;
  border: 1px solid #FF4D00;
  background: linear-gradient(0deg, rgba(255, 77, 0, 0.30) 0%, rgba(255, 77, 0, 0.30) 100%), #000000;
  box-shadow: 3px 9px 32px -4px rgba(0, 0, 0, 0.07);
  position: relative;
  right: 0.5em;
  top: 3.25em;
}
.col.left.raised {
  z-index: 100;
}
.navbar {
  border-radius: 8px;
}
.navbar-collapse, .navbar {
  background-color: #000000 !important;
}
.page-content {
  margin-top: 2em;
}
.btn-connect {
  min-width: 220px;
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
