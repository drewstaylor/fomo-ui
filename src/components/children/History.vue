<template>
  <div class="history">
    <div class="head row">
      <div class="head-left row">
        <h3 class="text-white activity col">Recent Activity</h3>
      </div>
    </div>
    <div class="body row" v-if="transactions.length">
      <div 
        :class="{'row': true, 'history-item': true, 'you': tx.displayName == defaultPlayerName}" 
        v-for="(tx, i) in historyPage" 
        :key="'history-item-'+i"
      >
        <div class="col display-name" v-if="tx.displayName">
          <span v-if="tx.sender">
            <a 
              :href="profileLink + tx.sender" 
              target="_blank"
            >{{ tx.displayName }}</a>
          </span>
          <span v-else>{{ tx.displayName }}</span>
        </div>
        <div class="col action" v-if="tx.action">
          <span
            v-if="tx.action == 'execute_deposit' && state.extensions"
            class="descr action deposit"
          >Took control and added {{ secondsToMinutes(state.extensions) }}</span>
        </div>
      </div>
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

export default {
  name: 'History',
  props: {
    cwClient: Object,
    accounts: Object,
    state: Object,
  },
  data: () => ({
    cw721: CW721_CONTRACT,
    min_deposit: null,
    transactions: [],
    fomo: { Query },
    page: null,
    size: 10,
    limit: 100,
    profileLink: ARCHID_PROFILE_LINK_PREFIX,
    defaultPlayerName: DefaultPlayerName,
  }),
  mounted: async function () {
    await this.loadHistory();
  },
  methods: {
    loadPlayer: async function (address) {
      if (this.isPlayer(address)) return DefaultPlayerName;
      let query = await TokensOf(this.cw721, address, this.cwClient, this.limit, null);
      if (!Array.isArray(query['tokens'])) return null;
      let domain = query.tokens[0];
      return domain;
    },
    loadHistory: async function () {
      if (!this.cwClient) return console.error("Error loading history, expected cwClient", this.cwClient);
      let query = await this.fomo.Query.History(1, this.cwClient);
      if (!Array.isArray(query)) return console.error("Error loading history, expected array", query)
      query.reverse();
      this.transactions = query;
      await this.setPage();
      // console.log('Tx History', this.transactions);
    },
    setPage: async function (page = 0) {
      let start, end;
      if (this.page == 0) {
        start = 0;
        end = this.size;
      } else {
        start = (page * this.size);
        end = (page * this.size) + this.size;
      }

      for (let i = start; i < (end + 1); i++) {
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
div.action span {
  color: #FFFFFF;
  text-align: right;
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
  background: #702100;
}
div.display-name, div.display-name span, span a {
  color: #FF4D00;
  text-align: left;
  font-size: 18px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
</style>