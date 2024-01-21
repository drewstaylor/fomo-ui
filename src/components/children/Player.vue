<template>
  <div class="player-id-select" v-if="!loading">
    <div v-if="tokens.length">
      <p>Select an ArchID to use for this game</p>
      <ul class="token-list">
        <li v-for="tokenId in tokens" :key="tokenId">
          <a class="cursor-pointer" @click="selectDomain(tokenId);">{{tokenId}}</a>
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Fomo requires an ArchID domain to play. Visit <a :href="archIdMintLink" target="_blank">{{mintLinkDisplay}}</a> to claim yours today!</p>
      <p>Still Fomo-ing? You can watch the game in read only mode.</p>
      <button class="btn btn-primary" @click="startWatching();">Start Watching</button>
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
  emits: ['playerConfig', 'setPlayer'],
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
      console.log("Tokens?", this.tokens);
    },
    selectDomain: async function (archid) {
      let domain = await Token(archid, this.cw721, this.cwClient);
      if (typeof domain !== "object") return;
      if (!domain.extension) return;
      let player = {
        id: domain.extension.domain,
        avatar: (domain.extension.image) ? domain.extension.image : DefaultAvatar,
      };
      this.$emit('setPlayer', player);
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
ul.token-list, ul.token-list li {
  list-style: none;
  padding-left: 0;
}
</style>
