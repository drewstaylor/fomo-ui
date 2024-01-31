<template>

  <div class="grid-container">
    <div class="grid1">
      <div class="grid1-fade"></div>
      <div class="grid1-lines"></div>
    </div>
    <div class="grid2">
      <div class="grid2-fade"></div>
      <div class="grid2-lines"></div>
    </div>
  </div>

  <div class="game" v-if="state.expiration">

    <div :class="{'grid-mask': true, 'orange': winning !== you, 'diamond': winning == you}"></div>

    <!-- Game Active (Timer) -->
    <div class="gameplay" v-if="!gameover">
      <div class="timer" v-if="timer">
        <div class="timer-display">
          <div class="col days">
            <div class="value">{{timer.days}}</div>
            <div class="label">Days</div>
          </div>
          <div class="col separator">:</div>
          <div class="col hours">
            <div class="value">{{timer.hours}}</div>
            <div class="label">Hours</div>
          </div>
          <div class="col separator">:</div>
          <div class="col minutes">
            <div class="value">{{timer.minutes}}</div>
            <div class="label">Minutes</div>
          </div>
          <div class="col separator">:</div>
          <div class="col seconds">
            <div class="value">{{timer.seconds}}</div>
            <div class="label">Seconds</div>
          </div>
        </div>
        <div class="time-remaining">Time Remaining</div>
      </div>
      <div class="controls" v-if="!readOnly">
        <button 
          class="btn btn-primary"
          @click="deposit();"
        >Deposit</button>
      </div>
    </div>

    <!-- Gameover -->
    <div class="gameover row" v-if="gameover && accounts && state.last_depositor">
      <div class="controls" v-if="accounts.length && !readOnly">
        <button 
          class="btn btn-primary" 
          @click="claim();"
          :disabled="state.last_depositor !== accounts[0].address"
        >Claim Prize</button>
      </div>
    </div>

    
  </div>

  <!-- Game Data Display -->
  <div class="game-data row" v-if="state.expiration">
    <div class="prize-display" v-if="state.last_depositor">
      <div class="prize-value">{{prizeDisplay}}</div>
      <div class="prize-denom">{{denom}}<span class="icon icon-lg icon-denom"></span></div>
    </div>
    <hr class="ruled-line" />
    <div class="controller" v-if="state.last_depositor">
      <div class="label">
        <span v-if="!gameover">Controller</span>
        <span v-else>Winner</span>
      </div>
      <div class="value" v-if="winning !== you">
        <a :href="profileLink + state.last_depositor" target="_blank">{{ winning }}</a>
      </div>
      <div class="value max-control" v-if="winning == you && !gameover">
        <span>You're in control</span>
      </div>
      <div class="value max-control winner" v-if="winning == you && gameover">
        <span>Congratulations, you won the Network Wars</span>
      </div>
    </div>
  </div>

  <!-- Tx Status Notifications -->
  <div class="tx-msg" v-if="status.notification">
    <span class="close-x" @click="status = {notification: null, type: null}">&times;</span>
    <div class="bg-info" v-if="status.type == 'info'">{{status.notification}}</div>
    <div class="bg-success" v-if="status.type == 'success'">{{status.notification}}</div>
    <div class="bg-danger" v-if="status.type == 'error'">{{status.notification}}</div>
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
    you: 'You',
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
      let remaining = {};
      if (difference > 0) {
        remaining = {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
            gameover: false
        };
      } else remaining = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        gameover: true
      }
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
        if (this.state.last_depositor == this.accounts[0].address) this.winning = this.you;
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
        ? this.you : this.state.last_depositor;
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
      let prize = this.formatFromAtto(this.prize.amount);
      return prize.toLocaleString("en");
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
.game {
  position: absolute;
  top: 2.5em;
  max-width: 678px;
  margin-left: 0.5em;
  margin-right: 0.5em;
}
.timer-display {
  display: flex;
  padding: 16px;
  flex-direction: row;
  align-items: flex-start;
  border-radius: 8px 8px 8px 0;
  background: linear-gradient(0deg, rgba(255, 77, 0, 0.60) 0%, rgba(255, 77, 0, 0.60) 100%), #000;
}
.timer-display .col .value,
.separator {
  color: #FFFFFF;
  text-align: center;
  font-size: 64px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
}
.timer-display .col .label {
  color: rgba(255, 255, 255, 0.60);
  text-align: center;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
}
.timer div.time-remaining {
  max-width: fit-content;
  color: #FFFFFF;
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  border-radius: 0  0 8px 8px;
  background: linear-gradient(0deg, rgba(255, 77, 0, 0.60) 0%, rgba(255, 77, 0, 0.60) 100%), #000;
}
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
.row.game-data {
  position: absolute;
  top: 15.5em;
  width: 45%;
  max-width: 790px;
  margin: auto;
}
.ruled-line {
  text-align: center;
  margin: auto;
  margin-top: 1em;
  margin-bottom: 1em;
  width: 75%;
  color: rgba(255, 255, 255, 0.20);
}
.prize-display {
  display: flex;
  flex-direction: column;
  width: 75%;
  margin: auto;
}
.prize-display .prize-value {
  color: #FFFFFF;
  font-size: 120px;
  font-style: normal;
  font-weight: 400;
  line-height: 110%;
  letter-spacing: -1.2px;
}
.prize-display .prize-denom {
  color: #FFFFFF;
  font-size: 28px;
  font-style: normal;
  font-weight: 500;
  line-height: 150%;
}
.icon-denom {
  margin-left: 0.25em;
}
.controller {
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  width: 75%;
  margin: auto;
}
.controller .label {
  color: #FFFFFF;
  text-align: left;
  font-size: 22px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.controller .value {
  color: #FF4D00;
  text-align: right;
  font-size: 22px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
</style>
