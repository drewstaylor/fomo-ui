<template>
  <div class="game" v-if="state.expiration">
    <!-- Game Data Display -->
    <div class="game-data row">
      <ul class="stats" v-if="state.last_depositor">
        <!-- Game Active -->
        <li v-if="!gameover">
          <span>Leader:</span>&nbsp;
          <a :href="profileLink + state.last_depositor" target="_blank">{{ winning }}</a>
        </li>
        <li><span>Prize Pool:</span> {{ prizeDisplay }}</li>
        <!-- <li v-if="!gameover"><span>Minimum Deposit:</span> {{ minDeposit }}</li> -->
        <!-- Gameover -->
        <li v-if="gameover">
          <h3 class="winner-display">{{ loadDomains(gameWinner) }} has won Fomo!</h3>
          <p class="descr">Game will restart when they've claimed their prize</p>
        </li>
      </ul>
    </div>

    <!-- Game Active -->
    <div class="gameplay row" v-if="!gameover">
      <div class="timer" v-if="timer">
        <p class="row">Time Remaining</p>
        <h1 class="row time-remaining">{{timer}}</h1>
      </div>
      <div class="info-msg">
        <p v-if="winning == 'You'">You're in the lead!</p>
      </div>
      <div class="controls" v-if="!readOnly">
        <button 
          class="btn btn-primary"
          @click="deposit();"
        >Deposit</button>
      </div>
    </div>

    <!-- Gameover -->
    <div class="gameover row" v-if="gameover && accounts">
      <div class="controls" v-if="accounts.length && !readOnly">
        <button 
          class="btn btn-primary" 
          @click="claim();"
          :disabled="gameLeader !== accounts[0].address"
        >Claim Prize</button>
      </div>
    </div>

    <!-- Tx Status Notifications -->
    <div class="tx-msg" v-if="status.notification">
      <span class="close-x" @click="status = {notification: null, type: null}">&times;</span>
      <div class="bg-info" v-if="status.type == 'info'">{{status.notification}}</div>
      <div class="bg-success" v-if="status.type == 'success'">{{status.notification}}</div>
      <div class="bg-danger" v-if="status.type == 'error'">{{status.notification}}</div>
    </div>
  </div>
</template>

<script>
import { TokensOf } from '../../util/archid';
import { Query, Execute } from '../../util/contract';
import { FromAtto } from '../../util/denom';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const ARCHID_PROFILE_LINK_PREFIX = (IsTestnet) ? "https://test.archid.app/address/" : "https://archid.app/address/";

export default {
  name: 'Game',
  props: {
    accounts: Object,
    cwClient: Object,
    readOnly: Boolean,
  },
  data: () => ({
    state: {},
    fomo: { Query, Execute },
    loading: true,
    prize: null,
    winning: null,
    denom: (IsTestnet) ? "CONST" : "ARCH",
    timer: null,
    profileLink: ARCHID_PROFILE_LINK_PREFIX,
    executeResult: null,
    status: {
      notification: null,
      type: null,
    },
    formatFromAtto: FromAtto,
  }),
  mounted: async function () {
    // Initial State
    await this.loadState();
    // Timer
    setInterval(() => {
      this.gameTimer();
    }, 1000); // Update timer 1x per second
    // Poll for contract changes
    // XXX TODO: Replace this w/ grpc socket
    setInterval(async () => {
      await this.loadState();
    }, 10000); // 10 seconds
  },
  methods: {
    // State
    gameTimer: function () {
      if (typeof this.state.expiration !== "number") return "";
      const targ = this.state.expiration * 1000;
      const difference = +new Date(targ) - +new Date();
      let remaining = "";
      if (difference > 0) {
        const parts = {
            d: Math.floor(difference / (1000 * 60 * 60 * 24)),
            h: Math.floor((difference / (1000 * 60 * 60)) % 24),
            m: Math.floor((difference / 1000 / 60) % 60),
            s: Math.floor((difference / 1000) % 60),
        };
        remaining = Object.keys(parts).map(part => {
          return `${parts[part]}${part}`;
        }).join(" ");
      } else remaining = "Game Over"
      this.timer = remaining;
    },
    // Query fns
    loadState: async function () {
      if (!this.cwClient) return;
      this.state = await this.fomo.Query.Game(this.cwClient);
      await this.loadPrizePool();
      await this.loadWinning();
    },
    loadDomains: async function (address) {
      let query = await TokensOf(this.cw721, address, this.cwClient, 1, null);
      if (!query.tokens) return '';
      if (!query.tokens.length) return '';
      return query.tokens[0];
    },
    loadPrizePool: async function () {
      let client = (this.readOnly) ? this.readOnlyClient : this.cwClient;
      this.prize = await this.fomo.Query.PrizePool(client);
    },
    loadWinning: async function () {
      if (!this.state.last_depositor) return;
      if (this.readOnly) {
        this.winning = await this.loadDomains(this.state.last_depositor);
      } else {
        if (this.state.last_depositor == this.accounts[0].address) this.winning = "You";
        else this.winning = await this.loadDomains(this.state.last_depositor);
      }
    },
    // Execute fns
    deposit: async function () {
      this.status = {
        notification: "Waiting for deposit to confirm...",
        type: "info",
      };
      // XXX TODO: Add support for depositing custom amounts?
      let depositAmount = (this.state.min_deposit) ? Number(this.state.min_deposit) : 1000000000000000000;
      this.executeResult = await this.fomo.Execute.Deposit(depositAmount, this.cwClient);
      if (this.executeResult['error']) {
        return this.status = {
          notification: this.executeResult.error,
          type: "error",
        };
      }
      this.status = {
        notification: "Deposit successfully executed",
        type: "success",
      };
      await this.loadState();
      this.$root.resolveUpdates();
      console.log(this.executeResult);
    },
    claim: async function () {
      this.status = {
        notification: "Waiting for prize claim transaction to confirm...",
        type: "info",
      };
      this.status = {notification: null, type: 'info'};
      this.executeResult = await this.fomo.Execute.Claim(this.cwClient);
      if (this.executeResult['error']) {
        return this.status = {
          notification: this.executeResult.error,
          type: "error",
        };
      }
      this.status = {
        notification: "Congratulations! Prize successfully claimed",
        type: "success",
      };
      await this.loadState();
      this.$root.resolveUpdates();
      console.log(this.executeResult);
    },
  },
  computed: {
    gameLeader: function () {
      if (typeof this.state.last_depositor !== "string") return "";
      if (!this.accounts.length) return this.state.last_depositor
      let leader = (this.state.last_depositor == this.accounts[0].address) 
        ? "You" : this.state.last_depositor;
      return leader;
    },
    gameWinner: function () {
      if (typeof this.state.last_depositor !== "string") return "";
      // Game must be over to have a winner
      if (typeof this.state.expiration !== "number") return "";
      let expirationTime = new Date(this.state.expiration * 1000).getTime();
      let currentTime = new Date().getTime();
      if (currentTime < expirationTime) return "";
      // Game winner
      return this.state.last_depositor;
    },
    minDeposit: function () {
      if (!this.state.min_deposit || !this.denom) return "";
      return this.formatFromAtto(this.state.min_deposit) + ' ' + this.denom;
    },
    prizeDisplay: function () {
      if (!this.prize) return "";
      if (!this.prize.amount || !this.prize.denom) return "";
      return this.formatFromAtto(this.prize.amount) + ' ' + this.prize.denom.slice(1).toUpperCase();
    },
    gameover: function () {
      if (typeof this.state.expiration !== "number") return null;
      let expirationTime = new Date(this.state.expiration * 1000).getTime();
      let currentTime = new Date().getTime();
      if (currentTime >= expirationTime) return true;
      else return false;
    },
  },
}
</script>

<style scoped>
ul.stats {
  list-style: none;
}

ul.stats li span {
  color: #808E9B;
  margin-right: 0.25em;
}

.timer {
  min-height: 250px;
  display: flex;
  /* align-items: center; */
  justify-content: center;
  border-radius: 8px;
  margin-bottom: 2em;
  margin-left: 0.5em;
  flex-direction: column;
}

.timer .time-remaining {
  text-align: center;
  font-size: 5em;
}

/* .tx-msg {
} */

.tx-msg span {
  float: right;
  cursor: pointer;
  position: relative;
  top: 1.5em;
  right: 0.5em;
}

.tx-msg div {
  padding: 0.25em;
  border-radius: 8px;
  clear: both;
}

</style>
