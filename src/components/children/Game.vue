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

  <div 
    :class="{
      'game': true, 
      'orange': !readOnly, 
      'gameover-default': gameover && winning !== you, 
      'gameover-winner': gameover && winning == you,
    }" 
    v-if="state.expiration"
  >
    <div id="winning_animation" v-if="gameover && winning == you"></div>

    <div 
      :class="{
        'grid-mask': true, 
        'orange': winning !== you && !gameover, 
        'diamond': winning == you && !gameover
      }"
    ></div>

    <!-- Game Active (Timer) -->
    <div class="gameplay" v-if="!gameover">
      <div class="timer" v-if="timer">
        <div :class="{'timer-display': true, 'orange': winning == you, 'gameover': gameover}">
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
        <div :class="{'time-remaining': true, 'orange': winning == you, 'gameover': gameover}">Time Remaining</div>
      </div>
    </div>
    <!-- Game Over (Stale Timer) -->
    <div class="gameplay" v-else>
      <div class="timer" v-if="timer">
        <div :class="{'timer-display': true, 'orange': winning == you}">
          <div class="col days">
            <div class="value">00</div>
            <div class="label">Days</div>
          </div>
          <div class="col separator">:</div>
          <div class="col hours">
            <div class="value">00</div>
            <div class="label">Hours</div>
          </div>
          <div class="col separator">:</div>
          <div class="col minutes">
            <div class="value">00</div>
            <div class="label">Minutes</div>
          </div>
          <div class="col separator">:</div>
          <div class="col seconds">
            <div class="value">00</div>
            <div class="label">Seconds</div>
          </div>
        </div>
        <div :class="{'time-remaining': true, 'orange': winning == you}">Time Remaining</div>
      </div>
    </div>

    <!-- Deposit -->
    <div class="controls-main active-game" v-if="!gameover && state.min_deposit">
      <div class="controls" v-if="!readOnly">
        <button 
          class="btn btn-primary"
          @click="deposit();"
          v-if="winning !== you"
        >Take Control for {{minDeposit}}<span class="icon icon-denom deposit-denom"></span></button>
        <button 
          class="btn btn-inverse"
          @click="deposit();"
          v-if="winning == you"
        >You’re in Control</button>
      </div>
    </div>
    <!-- Gameover -->
    <div class="controls-main gameover" v-if="gameover && accounts && state.last_depositor">
      <div class="controls" v-if="accounts.length && !readOnly">
        <button 
          class="btn btn-inverse" 
          @click="claim();"
          :disabled="state.last_depositor !== accounts[0].address"
          v-if="state.last_depositor == accounts[0].address"
        >Claim Prize</button>
      </div>
    </div>

    
  </div>

  <!-- Game Data Display -->
  <div class="game-data row" v-if="state.expiration">
    <div :class="{'prize-display': true, 'won': winning == you && gameover}" v-if="state.last_depositor">
      <div class="winner-declaration" v-if="winning == you && gameover">You Win!</div>
      <div class="prize-value" title="Prize Pool" alt="Prize Pool" v-if="!gameover || (gameover && winning == you)">{{prizeDisplay}}</div>
      <div class="prize-denom" title="Prize Pool" alt="Prize Pool" v-if="!gameover || (gameover && winning == you)">{{denom}}<span class="icon icon-lg icon-denom"></span></div>
      <div class="winner-avatar" v-if="gameover && winning !== you">
        <div 
          :class="{'img' :true, 'avatar': true, 'default': winnerAvatar == defaultAvatar}" 
          :style="'background-image: url('+ winnerAvatar +');'"
          v-if="winnerAvatar"
        ></div>
      </div>
    </div>
    <hr class="ruled-line" v-if="!gameover || (gameover && winning == you)" />
    <div class="controller" v-if="state.last_depositor">
      <div class="label">
        <span v-if="!gameover">Controller</span>
      </div>
      <div class="value" v-if="winning !== you && !gameover">
        <a :href="profileLink + state.last_depositor" target="_blank">{{ winning }}</a>
      </div>
      <div class="value max-control" v-if="winning == you && !gameover">
        <span class="text-white">You're in control</span>
      </div>
      <div class="value max-control winner" v-if="winning == you && gameover">
        <span>Congratulations, you won the Network Wars. Game will reset when you claim the prize.</span>
      </div>
      <div class="value max-control winner" v-if="winning !== you && gameover">
        <a class="game-winner ucfirst" :href="profileLink + state.last_depositor" target="_blank">{{ winning }}</a><br/>
        <div class="upcase sub-text sub-text-1">held control and won the Network Wars.</div>
        <div class="upcase sub-text sub-text-2">A new round will start when they claim the prize. If the timer runs out and the prize is unclaimed, anyone can restart the game using the current prize funds.</div>
      </div>
    </div>
  </div>

  <!-- Tx Confirming Notification -->
  <Modal
    v-bind:name="'confirm'"
    v-bind:footer="false"
    v-bind:showModal="showModal.confirm"
    v-bind:msg="status.notification"
    @close="closeModals"
    v-if="showModal.confirm && status.type == 'confirm'"
  >
  </Modal>

  <!-- Tx Error Notification -->
  <Modal
    v-bind:name="'error'"
    v-bind:footer="false"
    v-bind:showModal="showModal.error"
    v-bind:msg="status.notification"
    @close="closeModals"
    v-if="showModal.error && status.type == 'error'"
  >
  </Modal>

  <!-- Tx Success Notification -->
  <Modal
    v-bind:name="'success'"
    v-bind:footer="false"
    v-bind:showModal="showModal.success"
    v-bind:msg="status.notification"
    @close="closeModals"
    v-if="showModal.success && status.type == 'success'"
  >
  </Modal>

</template>

<script>
import { Token, TokensOf } from '../../util/archid';
import { Query, Execute } from '../../util/contract';
import { FromAtto } from '../../util/denom';
import { Client } from '../../util/client';

import Modal from './Modal.vue';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const ARCHID_PROFILE_LINK_PREFIX = (IsTestnet) ? "https://test.archid.app/address/" : "https://archid.app/address/";
const DefaultAvatar = "/img/token.svg";
const IPFS_GATEWAY_PREFIX = 'https://ipfs.io/ipfs/';
const IPFS_CID_PREFIX = 'ipfs://';

export default {
  name: 'Game',
  props: {
    accounts: Object,
    cwClient: Object,
    readOnly: Boolean,
  },
  components: { Modal },
  data: () => ({
    state: {},
    netwars: { Query, Execute },
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
    showModal: {
      confirm: false,
      error: false,
      success: false,
    },
    formatFromAtto: FromAtto,
    winningAnimPlaying: false,
    defaultAvatar: DefaultAvatar,
    winnerAvatar: null,
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
      let timerOutput = {
        days: (remaining.days < 10) ? '0' + remaining.days : String(remaining.days),
        hours: (remaining.hours < 10) ? '0' + remaining.hours : String(remaining.hours),
        minutes: (remaining.minutes < 10) ? '0' + remaining.minutes : String(remaining.minutes),
        seconds: (remaining.seconds < 10) ? '0' + remaining.seconds : String(remaining.seconds),
        gameover: remaining.gameover
      };
      this.timer = timerOutput;
    },
    closeModals: function () {
      this.status = {
        notification: null,
        type: null,
      };
      if (this.showModal.confirm) this.showModal.confirm = false;
      if (this.showModal.error) this.showModal.error = false;
      if (this.showModal.success) this.showModal.success = false;
    },
    // Query fns
    loadState: async function () {
      if (!this.cwClient) return;
      this.state = await this.netwars.Query.Game(this.cwClient);
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
      let client = (this.readOnly) ? await Client('offline') : this.cwClient;
      this.prize = await this.netwars.Query.PrizePool(client);
    },
    loadWinning: async function () {
      if (!this.state.last_depositor) return;
      if (this.readOnly) {
        this.winning = await this.loadDomains(this.state.last_depositor);
      } else {
        if (this.state.last_depositor == this.accounts[0].address) this.winning = this.you;
        else this.winning = await this.loadDomains(this.state.last_depositor);
      }
      if (this.gameover) {
        if (!this.winningAnimPlaying && this.winning == this.you) {
          await this.winnerAnimation();
          this.winningAnimPlaying = true;
        } else {
          let winnerData = await Token(this.winning, this.cw721, this.cwClient);
          let winnerImg = (winnerData.extension) ? winnerData.extension.image : null;
          this.winnerAvatar = this.parseAvatar(winnerImg);
        }
      }
    },
    // Execute fns
    deposit: async function () {
      // Confirmation notification
      let msg = (this.state.last_depositor == this.accounts[0].address) ? "You already control the network, but ok LFG" : "Attempting to take control of the network";
      this.status = {
        notification: [msg],
        type: "confirm",
      };
      this.showModal = {
        confirm: true,
        error: false,
        success: false,
      };
      if (document) document.body.style.overflowY = "hidden";

      // Tx broadcast
      let depositAmount = (this.state.min_deposit) ? Number(this.state.min_deposit) : 1000000000000000000;
      this.executeResult = await this.netwars.Execute.Deposit(depositAmount, this.cwClient);
      
      // Error notification
      if (this.executeResult['error']) {
        this.status = {
          notification: [this.executeResult.error],
          type: "error",
        };
        this.showModal = {
          confirm: false,
          error: true,
          success: false,
        };
        if (document) document.body.style.overflowY = "hidden";
        return;
      }

      // Success notification
      this.status = {
        notification: {
          title: "Deposit successful",
          body: ["You control the network"]
        },
        type: "success",
      };
      this.showModal = {
        confirm: false,
        error: false,
        success: true,
      };
      if (document) document.body.style.overflowY = "hidden";

      // Resolve Updates
      await this.loadState();
      this.$root.resolveUpdates();
      // console.log(this.executeResult);
    },
    claim: async function () {
      // Integrity checks
      if (this.state.last_depositor !== this.accounts[0].address) return console.warn("Claimant must be winner");
      let expirationTime = new Date(this.state.expiration * 1000).getTime();
      let currentTime = new Date().getTime();
      if (currentTime < expirationTime) return console.warn("Game must be over");

      // Cache prize amount
      let prize = JSON.stringify(this.formatFromAtto(this.prize.amount));

      // Confirmation notification
      this.status = {
        notification: ["Attempting to claim your prize"],
        type: "confirm",
      };
      this.showModal = {
        confirm: true,
        error: false,
        success: false,
      };
      if (document) document.body.style.overflowY = "hidden";

      // Tx broadcast
      this.executeResult = await this.netwars.Execute.Claim(this.cwClient);

      // Error notification
      if (this.executeResult['error']) {
        this.status = {
          notification: [this.executeResult.error],
          type: "error",
        };
        this.showModal = {
          confirm: false,
          error: true,
          success: false,
        };
        if (document) document.body.style.overflowY = "hidden";
        return;
      }

      // Success notification
      this.status = {
        notification: {
          title: "Epic Win",
          body: [
            "You won this round of Network Wars.",
            "The prize of "+ prize + " " + this.denom + " has been deposited in your account."
          ]
        },
        type: "success",
      };
      this.showModal = {
        confirm: false,
        error: false,
        success: true,
      };
      if (document) document.body.style.overflowY = "hidden";

      // Resolve updates
      await this.loadState();
      this.$root.resolveUpdates();
      // console.log(this.executeResult);
    },
    winnerAnimation: async function () {
      await this.$nextTick();
      if (!document || !window) return console.warn("Error resolving, dom or window", document, window);

      for (let i=0; i < 30; i++) {
        // Random rotation
        let randomRotation = Math.floor(Math.random() * 360);
        // Random width & height between 0 and view pane
        let randomWidth = Math.floor(Math.random() * Math.max(800 || 0));
        let randomHeight = Math.floor(Math.random() * (Math.random() * 800));
        // Shapes
        let randomShape = (Math.random() >= 0.6) ? 100 : 0;
        
        // Random animation-delay
        let randomAnimationDelay = Math.floor(Math.random() * 10);

        // Create confetti piece
        let confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.top = randomHeight + 'px';
        confetti.style.left = randomWidth + 'px';
        confetti.style.borderRadius = randomShape + '%';
        confetti.style.backgroundColor = "#FFF";
        confetti.style.transform='skew(15deg) rotate(' + randomRotation + 'deg)';
        confetti.style.animationDelay=randomAnimationDelay + 's';
        let container = document.getElementById("winning_animation");
        if (container) container.appendChild(confetti);
      }
    },
    parseAvatar: function (avatar) {
      if (typeof avatar !== 'string' || !avatar) return DefaultAvatar;
      let img = (avatar.substr(0,7) == IPFS_CID_PREFIX) 
        ? avatar.replace(IPFS_CID_PREFIX, IPFS_GATEWAY_PREFIX) : avatar;
      return img;
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
  max-height: 90vh;
  top: 2em;
  height: 90%;
  border-radius: 16px;
  max-width: 50%;
}
.game.orange {
  background: rgba(255, 77, 0, 0.15);
}
.game.gameover-default, .game.gameover-winner {
  border-right: 1px solid #FF4D00;
  border-bottom: 1px solid #FF4D00;
}
.game.gameover-default {
  background: linear-gradient(0deg, rgba(255, 77, 0, 0.30) 0%, rgba(255, 77, 0, 0.30) 100%), #000;
}
.game.gameover-winner {
  background: rgb(145, 242, 255, 0.5);
}
.gameplay {
  position: absolute;
  top: 11.5px;
  left: -10px;
  max-width: 678px;
  margin-left: 0.5em;
  margin-right: 0.5em;
}
.timer {
  margin-left: 0.5em;
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
.timer-display.orange, .time-remaining.orange {
  background: linear-gradient(0deg, #FF4D00 0%, #FF4D00 100%), #000 !important;
}
.timer-display.gameover {
  background: linear-gradient(180deg, #DB4139 9.82%, #982826 63.33%);
}
.timer div.time-remaining.gameover {
  background: #982826;
}
.row.game-data {
  position: absolute;
  top: 33%;
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
  color: rgb(255, 255, 255);
}
.prize-display {
  display: flex;
  flex-direction: column;
  width: 75%;
  margin: auto;
}
.prize-display.won {
  text-align: center;
  width: 90%;
}
.winner-declaration {
  text-transform: uppercase;
  color: #FFFFFF;
  font-size: 28px;
  font-style: normal;
  font-weight: 500;
  line-height: 150%;
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
.max-control.winner {
  color: #FFFFFF;
  text-align: left;
}
.controls-main, .controls-main .controls, .controls-main .controls button {
  width: 98.9%;
  margin-top: -56px;
  margin-left: 0.5%;
}
.controls-main .controls button {
  height: 96px;
  padding: 0px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.controls-main {
  position: relative;
  z-index: 500;
}
.icon.deposit-denom {
  top: 3px;
}
#winning_animation {
  height: 90vh;
  position: absolute;
  pointer-events: none;
  z-index: 0;
}
.winner-avatar {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: left;
  margin-bottom: 1em;
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
a.game-winner {
  color: #FF4D00;
  font-size: 28px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
}
.winner .sub-text {
  font-size: 28px;
  font-style: normal;
  font-weight: 500;
  line-height: 150%;
}
.winner .sub-text-1 {
  color: #FFFFFF;
}
.winner .sub-text-2 {
  color: rgba(255, 255, 255, 0.60);
}
.max-control.winner a, .max-control.winner div {
  padding-bottom: 1em;
}

@media (max-width: 800px) {
  .controls-main, .controls, .grid-container, #winning_animation {
    width: 100%;
    max-width: 100%;
  }
  .game {
    min-width: 90%;
    max-width: 95%;
  }
  .controls-main, .controls-main .controls, .controls-main .controls button {
    margin-left: unset;
  }
}

@media (max-width: 660px) {
  .gameplay {
    max-width: 98%;
  }
  .timer-display .col .value, .separator {
    font-size: 45px;
  }
  .prize-display, .prize-value {
    font-size: 66px;
  }
  .controller, .controller .value {
    width: auto;
  }
  .controller .value, .controller, .controller .label span {
    font-size: 18px;
  }
  .controller .value {
    margin-left: 1em;
    margin-top: 4px;
  }
  .controls-main, .controls {
    width: 97.5%;
  }
  .grid-container, .grid-mask, #winning_animation {
    max-width: 660px;
    min-width: unset;
  }
  .game {
    overflow-x: hidden;
  }
  .grid-mask {
    left: -3em;
    width: 520px;
  }
  .row.game-data {
    width: 90%;
    max-width: 90%;
  }
  .controls button {
    margin-left: 2.5% !important;
  }
  .winner .sub-text-2 {
    display: none;
  }
}
</style>
