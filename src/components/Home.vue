<template>
  <div class="home page" v-if="connected">
    
    <!-- Player Config State -->
    <Player 
      v-if="state == playerState"
      v-bind:accounts="accounts"
      v-bind:cwClient="cwClient"
      @setPlayer="setPlayer"
      @watchGame="watchGame"
    ></Player>

    <!-- Game State -->
    <Game 
      v-if="state == gameState"
      v-bind:accounts="accounts"
      v-bind:cwClient="cwClient"
      v-bind:readOnly="readOnly"
    ></Game>

  </div>

  <!-- Game Preview -->
  <div v-if="!connected && readOnlyClient">
    <Game 
      v-bind:cwClient="readOnlyClient"
      v-bind:readOnly="true"
    ></Game>
  </div>
</template>

<script>
import { Client, Accounts } from '../util/client';

import Game from './children/Game.vue';
import Player from './children/Player.vue';

const PlayerState = 0;
const GameState = 1;
const STATES = [PlayerState, GameState];

export default {
  name: 'Home',
  components: { Game, Player },
  data: () => ({
    cwClient: null,
    readOnlyClient: null,
    accounts: null,
    connected: false,
    states: STATES,
    state: PlayerState,
    gameState: GameState,
    playerState: PlayerState,
    readOnly: null, // Observation mode (e.g. GameState with no account)
  }),
  mounted: async function () {
    if (window) {
      let connected = sessionStorage.getItem('connected');
      if (connected) this.resumeConnectedState();
    }
    if (this.$root.connected) this.connected = true;
    this.readOnlyClient = await Client('offline');
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
          }
        }, 100);
      } catch (e) {
        await this.resumeConnectedState((attempts + 1));
      }
    },
    setPlayer: async function (player) {
      if (window) sessionStorage.setItem("player", JSON.stringify(player));
      this.$root.player.id = player.id;
      this.$root.player.avatar = player.avatar;
      this.state = this.gameState;
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
