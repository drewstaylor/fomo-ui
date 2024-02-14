<template>
  <div class="history">
    <div class="head row">
      <div class="head-left row">
        <h3 class="text-white activity col">Recent Activity</h3>
      </div>
      <div class="round-select row" v-if="roundFilter && round">
        <select class="col form-control round-selector" v-model="roundFilter">
          <option 
            v-for="game in newestRoundsFirst"
            :class="{'active': game == roundFilter}"
            :value="game" 
            :key="'round-select-' + game"
          >
            <span v-if="game == round">Current Game</span>
            <span v-else>Round {{game}}</span>
          </option>
        </select>
        <div class="col caret">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
    <div class="body row" v-if="historyPage.length">
      <div 
        :class="{'row': true, 'history-item': true, 'you': (accounts.length) ? tx.sender == accounts[0].address : false}" 
        v-for="(tx, i) in historyPage" 
        :key="'history-item-'+i"
      >
        <div class="col display-name">
          <span v-if="tx.sender">
            <a :href="profileLink + tx.sender" target="_blank">
              <span v-if="(accounts.length) ? tx.sender == accounts[0].address : false">You</span>
              <span v-else>{{tx.displayName}}</span>
            </a>
          </span>
        </div>
        <div class="col action" v-if="tx.action">
          <a 
            :href="explorerLink + tx.hash" 
            class="explorer-link" 
            target="_blank"
          >
            <!-- Deposit -->
            <span
              v-if="tx.action == 'execute_deposit' && state.extensions"
              class="descr action deposit"
            >Took control and added {{ secondsToMinutes(state.extensions) }}</span>
            <!-- Prize Claim -->
            <span
              v-if="tx.action == 'execute_claim' && state.round"
              class="descr action claim"
            >Won round {{ state.round }} of {{ app_name }}</span>
          </a>
        </div>
      </div>
    </div>
    <div v-if="!historyPage.length && round">
      <h5>No activity yet in round {{round}}</h5>
    </div>
  </div>
</template>

<script>
import { Query } from '../../util/contract';
import { TokensOf } from '../../util/archid';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const DefaultPlayerName = 'You';
const CW721_CONTRACT = process.env.VUE_APP_ARCHID_CW721_CONTRACT;
const ARCHID_PROFILE_LINK_PREFIX = (IsTestnet) ? "https://test.archid.app/address/" : "https://archid.app/address/";
const EXPLORER_LINK = (IsTestnet) ? "https://testnet.mintscan.io/archway-testnet/txs/" : "https://www.mintscan.io/archway/tx/";

export default {
  name: 'History',
  props: {
    cwClient: Object,
    accounts: Object,
    state: Object,
  },
  data: () => ({
    app_name: "Network Wars",
    cw721: CW721_CONTRACT,
    min_deposit: null,
    transactions: [],
    netwars: { Query },
    round: null,
    page: null,
    size: 10,
    limit: 100,
    roundFilter: null ,
    profileLink: ARCHID_PROFILE_LINK_PREFIX,
    explorerLink: EXPLORER_LINK,
    defaultPlayerName: DefaultPlayerName,
  }),
  watch: {
    async roundFilter() {
      await this.loadHistory(this.roundFilter);
    },
    async state() {
      this.round = parseInt(this.state.round);
      this.roundFilter = this.round;
      await this.loadHistory(this.round);
    },
  },
  mounted: async function () {
    this.round = parseInt(this.state.round);
    this.roundFilter = this.round;
    await this.loadHistory(this.round);
  },
  methods: {
    loadPlayer: async function (address) {
      if (this.isPlayer(address)) return DefaultPlayerName;
      let query = await TokensOf(this.cw721, address, this.cwClient, this.limit, null);
      if (!Array.isArray(query['tokens'])) return null;
      let domain = query.tokens[0];
      return domain;
    },
    loadHistory: async function (round = 1) {
      if (!this.cwClient) return console.error("Error loading history, expected cwClient", this.cwClient);
      let query = await this.netwars.Query.History(round, this.cwClient);
      if (!Array.isArray(query)) return console.error("Error loading history, expected array", query)
      query.reverse(); // Sort -> newest txs first
      this.transactions = query;
      await this.setPage();
      // console.log('Tx History', this.transactions);
    },
    setPage: async function (page = 0) {
      if (!this.historyPage.length) return this.page = page;
      let start, end;
      if (this.page == 0) {
        start = 0;
        end = this.size;
      } else {
        start = (page * this.size);
        end = (page * this.size) + this.size;
      }

      for (let i = start; i < (end + 1); i++) {
        if (!this.transactions[i]) break;
        let events = this.transactions[i].events;
        if (Array.isArray(events)) {
          events.forEach(async (event) => {
            if (event['type'] == "wasm") {
              let wasm = event.attributes;
              wasm.forEach(async (item) => {
                if (item['key'] == "depositer") {
                  this.transactions[i].displayName = await this.loadPlayer(item.value);
                }
              });
            }
          });
        }
      }
      this.page = page;
    },
    isPlayer: function (address) {
      if (!this.accounts) return false;
      if (!Array.isArray(this.accounts)) return false;
      if (!this.accounts.length) return false;
      return (this.accounts[0].address == address) ? true : false;
    },
    secondsToMinutes(seconds) {
      if (typeof seconds !== 'number') return '';
      else if (seconds <= 1) return '';
      else if (seconds < 60) return seconds + ' seconds';
      let minutes = parseInt(seconds / 60);
      if (minutes == 1) return '1 minute';
      else return minutes + ' minutes';
    },
  },
  computed: {
    historyPage: function () {
      if (!this.transactions.length) return [];
      let start, end;
      if (this.page == 0) {
        start = 0;
        end = this.size;
      } else {
        start = (this.page * this.size);
        end = (this.page * this.size) + this.size;
      }
      let pageData = [];
      let txs = this.transactions.slice(start, end);
      txs.forEach((tx) => {
        let action, sender;
        let events = tx['events'];
        let hash = tx['hash'];
        let height = tx['height'];
        let displayName = tx['displayName'];
        if (Array.isArray(events)) {
          events.forEach(async (event) => {
            if (event['type'] == "wasm") {
              let wasm = event.attributes;
              wasm.forEach(async (item) => {
                if (item['key'] == "depositer") {
                  action = "execute_deposit";
                  sender = item.value;
                  pageData.push({action, sender, displayName, hash, height});
                }
              });
            }
          })
        }
      });
      // console.log('pageData', pageData);
      return pageData;
    },
    newestRoundsFirst: function() {
      if (!this.round) return [];
      let rounds = [];
      for (let i = 0; i < this.round; i++) {
        rounds.push(i+1);
      }
      rounds.reverse();
      return rounds;
    },
  },
}
</script>

<style scoped>
.history {
  padding: 1em;
}
.head-left .activity {
  font-size: 24px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
div.action a, div.action a span {
  color: #FFFFFF;
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-self: stretch;
  padding: 0.5em;
  border-bottom: solid 1px rgba(255, 255, 255, 0.1);
  width: 98%;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 0.25em;
}
.history-item .col {
  height: 35px;
  display: flex;
  align-items: center;
}
.history-item.you div {
  background: rgba(255, 77, 0, 0.30);
}
div.display-name, 
div.display-name span {
  color: #FF4D00;
  text-align: left;
  font-size: 18px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.col.display-name, .col.action {
  width: 20%;
}
.col.action {
  min-width: fit-content;
  text-align: center;
}
.col.height {
  width: 10%;
  text-align: right;
  display: block;
}
.round-select.row {
  margin-left: 0;
  margin-top: 12px;
  margin-bottom: 12px;
}
select.round-selector {
  border-radius: 8px;
  border: 1px solid #FF4D00;
  background: rgba(255, 77, 0, 0.30);
  padding-top: 12px;
  padding-bottom: 12px;
  padding-left: 16px;
  padding-right: 16px;
}
select.round-selector:active, select.round-selector:focus {
  box-shadow: 3px 9px 32px -4px rgba(0, 0, 0, 0.07);
}
select.round-selector, select.round-selector span {
  color: #FFFFFF;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
}
.col.caret {
  max-width: 16px;
  padding: 0;
  margin-left: -32px;
  position: relative;
  top: 5px;
  pointer-events: none;
}
</style>
