<template>
  <div class="home page" v-if="connected">

    <!-- Set Player -->
    <Modal
      v-bind:name="'player-create'"
      v-bind:accounts="accounts"
      v-bind:cwClient="cwClient"
      v-bind:showModal="showModal"
      @setPlayer="setPlayer"
      v-if="showModal"
    >
    </Modal>

    <!-- Game State -->
    <Game 
      v-bind:accounts="accounts"
      v-bind:cwClient="cwClient"
      v-bind:readOnly="readOnly"
      v-if="state == gameState"
    ></Game>

  </div>

  <!-- Game Preview -->
  <div v-if="readOnlyClient && state !== gameState">
    <Game 
      v-bind:cwClient="readOnlyClient"
      v-bind:readOnly="true"
    ></Game>
  </div>

</template>

<script>
import { Client, Accounts } from '../util/client';

import Game from './children/Game.vue';
import Modal from './children/Modal.vue';

const PlayerState = 0;
const GameState = 1;
const STATES = [PlayerState, GameState];

export default {
  name: 'Home',
  components: { Game, Modal },
  data: () => ({
    cwClient: null,
    readOnlyClient: null,
    accounts: null,
    connected: false,
    states: STATES,
    state: PlayerState,
    gameState: GameState,
    playerState: PlayerState,
    showModal: false,
    readOnly: null, // Observation mode (e.g. GameState with no account)
  }),
  mounted: async function () {
    if (window) {
      let connected = window.sessionStorage.getItem('connected');
      if (connected) this.resumeConnectedState();
    }
    if (this.$root.connected) {
      this.connected = true;
      this.showModal = true;
    }
    this.readOnlyClient = await Client('offline');
    this.$root.readOnlyClient = this.readOnlyClient;
  },
  methods: {
    resumeConnectedState: async function (attempts = 0) {
      if (attempts >= 5) return;
      try {
        setTimeout(async () => { 
          let walletType = sessionStorage.getItem("connected");
          if (!walletType) this.cwClient = await Client("offline");
          else {
            this.cwClient = await Client(walletType);
            this.accounts = await Accounts(this.cwClient);
            this.connected = true;
            this.showModal = true;
          }
        }, 100);
      } catch (e) {
        await this.resumeConnectedState((attempts + 1));
      }
    },
    setPlayer: async function (player) {
      // if (window) window.localStorage.setItem("player", JSON.stringify(player));
      this.$root.player.id = player.id;
      this.$root.player.avatar = player.avatar;
      this.state = this.gameState;
      this.showModal = false;
    },
    watchGame: function () {
      this.readOnly = true;
      this.state = this.gameState;
    },
  }
}
</script>

<style scoped>
</style>
