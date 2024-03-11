<template>
  <div class="modal-content" v-if="!loading && tokens.length">
    <div class="modal-header">
      <div class="title modal-title">Select ArchID</div>
    </div>
    <div class="modal-body">
      <p class="descr">Select a name to use for this game</p>
      <ul class="token-list">
        <li v-for="tokenId in tokens" :key="tokenId">
          <button class="btn btn-secondary btn-archid" @click="selectDomain(tokenId);">{{tokenId}}</button>
        </li>
      </ul>
    </div>
  </div>
  <div class="modal-content" v-if="!loading && !tokens.length">
    <div class="modal-header">
      <div class="warn">
        <span class="icon icon-lg icon-alert"></span>
      </div>
      <h3 class="title modal-title">You need an ArchID to play</h3>
    </div>
    <div class="modal-body">
      <p class="descr">Looks like there are no ArchIDs associated with this wallet</p>
      <ul class="option-list">
        <li>
          <a :href="archIdMintLink" target="_blank">
            <button class="btn btn-secondary btn-archid">Get an ArchID<span class="icon icon-external-link"></span></button>
          </a>
        </li>
        <li>
          <button class="btn btn-secondary btn-archid" @click="logout();">Logout<span class="icon icon-logout"></span></button>
        </li>
      </ul>
    </div>
  </div>
  <div class="loading modal-content" v-if="loading">
    <div class="modal-header">
      <div class="title modal-title">Loading ArchIDs</div>
    </div>
    <div class="modal-body">
      <div class="loading default"></div>
    </div>
  </div>
</template>

<script>
import { Token, TokensOf } from '../../util/archid';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const CW721_CONTRACT = process.env.VUE_APP_ARCHID_CW721_CONTRACT;
const DefaultAvatar = "/img/token.svg";

const LIMIT = 100;

export default {
  name: 'Player',
  props: {
    accounts: Object,
    cwClient: Object,
  },
  data: () => ({
    cw721: CW721_CONTRACT,
    tokens: [],
    loading: true,
    archIdMintLink: (IsTestnet) ? "https://test.archid.app" : "https://archid.app",
  }),
  emits: ['setPlayer'],
  watch: {
    async accounts() {
      if (!Array.isArray(this.accounts)) return;
      if (!this.accounts.length) return;
      this.loading = true;
      await this.loadDomains();
      this.loading = false;
    },
  },
  mounted: async function () {
    await this.loadDomains();
    if (this.tokens.length) this.loading = false;
    if (document) document.body.style.overflowY = "hidden";
  },
  methods: {
    loadDomains: async function () {
      if (!Array.isArray(this.accounts)) return;
      if (!this.accounts.length) return;
      // Load tokens
      this.tokens = [];
      let finished = false, i = 0;
      do {
        let start = (i > 0) ? this.tokens[this.tokens.length - 1] : null;
        let query = await TokensOf(this.cw721, this.accounts[0].address, this.cwClient, LIMIT, start);
        i++;
        if (!Array.isArray(query['tokens'])) return;
        else if (!query.tokens.length) return finished = true;
        else this.tokens = [...this.tokens, ...query.tokens];
      } while (!finished);
    },
    selectDomain: async function (archid) {
      let domain = await Token(archid, this.cw721, this.cwClient);
      if (typeof domain !== "object") return;
      if (!domain.extension) return;
      let player = {
        id: domain.extension.domain,
        avatar: (domain.extension.image) ? domain.extension.image : DefaultAvatar,
      };
      this.$root.domains = this.tokens;
      this.$emit('setPlayer', player);
      if (document) document.body.style.overflowY = "";
    },
    logout: function () {
      try {
        window.sessionStorage.removeItem('connected');
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    },
    startWatching: function () {
      this.$emit('watchGame', true);
    }
  },
  computed: {
    mintLinkDisplay: function () {
      if (!this.archIdMintLink) return "archid.app";
      else if (this.archIdMintLink.length <= 8) return "archid.app";
      else return this.archIdMintLink.slice(8);
    }
  },
}
</script>

<style scoped>
.player-id-select {
  background: linear-gradient(0deg, rgba(255, 77, 0, 0.20) 0%, rgba(255, 77, 0, 0.20) 100%), #000;
  color: #FFFFFF;
}
p.descr {
  color: rgba(255, 255, 255, 0.60);
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
  letter-spacing: -0.16px;
}
ul.option-list, ul.token-list li {
  margin: 0;
}
ul.token-list, ul.token-list li, ul.option-list, ul.option-list li {
  list-style: none;
  padding-left: 0;
}
.btn-archid {
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
  letter-spacing: -0.16px;
  margin-bottom: 0.5em;
  width: 100%;
}
.icon-logout {
  top: 3px;
  margin-left: 0.4px;
}
</style>
