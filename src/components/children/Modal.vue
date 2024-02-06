<template>
  <transition name="modal">
    <div :id="'wrapper-'+name" class="modal-wrapper" v-if="showModal" @click="close">
      <div :id="'modal-'+name" class="modalt">
        <div class="modal-dialog" role="document">
          <!-- Modals From Props -->
          <div class="modal-content" v-if="name !== 'player-create'">

            <!-- Header -->
            <div :id="'header-'+name" class="modal-header">
              <div class="title modal-title" v-if="content.header.title" v-html="content.header.title"></div>
              <div class="subtitle" v-if="content.header.subtitle" v-html="content.header.subtitle"></div>
            </div>

            <!-- Body -->
            <div :id="'body-'+name" class="modal-body" v-if="content.body.text.length && name !== 'confirm'">
              <p class="descr" v-for="(content, i) in content.body.text" :key="i+'-body'">{{content}}</p>
            </div>
            <div :id="'body-'+name" class="modal-body" v-if="content.body.text.length && name == 'confirm'">
              <p class="descr" v-for="(content, i) in content.body.text" :key="i+'-body'">{{content}}</p>
              <div class="loading default"></div>
            </div>

            <!-- Footer -->
            <div :id="'footer-'+name" class="modal-footer" v-if="footer">
              <div class="controls" v-if="content.footer.buttons.length">
                <ul class="list-none">
                  <li class="list-none" v-for="(button, i) in content.footer.buttons" :key="i+'-footer'">
                    <button 
                      :class="'btn btn-secondary ' + name" 
                      v-html="button.value" 
                      @click="emitButton(button.name);"
                      v-if="name !== 'archid-select'"
                    ></button>
                    <button 
                      :class="'btn btn-secondary ' + name" 
                      v-html="button.value" 
                      @click="selectDomain(button.value)"
                      v-if="name == 'archid-select'"
                    ></button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Modals From Components -->
          <Player
            v-bind:accounts="accounts"
            v-bind:cwClient="cwClient"
            @setPlayer="setPlayer"
            v-if="name == 'player-create'"
          ></Player>

        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { FromAtto } from '../../util/denom';
import { Token } from '../../util/archid';

import Player from './Player.vue';

const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);
const DefaultAvatar = "/img/token.svg";

export default {
  props: {
    // Generic props
    name: String,
    footer: Boolean,
    showModal: Boolean,
    msg: Object,
    // State props
    accounts: Object,
    cwClient: Object,
    state: Object,
  },
  components: { Player },
  emits: ['button', 'close', 'setPlayer'],
  data: () => ({
    content: {
      header: { title: null, subtitle: null },
      body: { text: [] },
      footer: { buttons: [] },
    },
    denom: (IsTestnet) ? "CONST" : "ARCH",
    formatFromAtto: FromAtto,
  }),
  mounted: async function () {
    switch(this.name) {
      case 'welcome': {
        if (!this.state['min_deposit']) console.warn('Error resolving game state', this.state);
        this.content.header.title = 'Welcome to';
        this.content.header.subtitle = '<span class="brand brand-1">Network</span><span class="brand brand-2">Wars</span>';
        this.content.body.text = [
          'The rules are simple. Pay '+ FromAtto(this.state.min_deposit) + ' ' + this.denom +' to control the network. If you control the network when the time is up, you win the funds in the prize pool.',
          'Every time there is a new controller, '+ FromAtto(this.state.min_deposit) + ' ' + this.denom +' is added to the prize pool and '+ this.secondsToMinutes(this.state.extensions) +' added to the countdown.',
          'Good Luck.'
        ];
        this.content.footer.buttons = [{name: 'welcome', value: 'Start Playing'}];
        break;
      }
      case 'wallet-select': {
        this.content.header.title = 'Select a Wallet';
        this.content.body.text = ['Select from the supported wallets to get started.'];
        this.content.footer.buttons = [
          {name: 'keplr', value: '<span class="icon icon-keplr"></span>Keplr'},
          {name: 'cosmostation', value: '<span class="icon icon-cosmostation"></span>Cosmostation'},
          {name: 'leap', value: '<span class="icon icon-leap"></span>Leap'}
        ];
        break;
      }
      case 'wallet-connecting': {
        switch(this.msg) {
          case 'keplr': {
            this.content.header.title = '<span class="icon icon-keplr"></span>Keplr';
            break;
          }
          case 'cosmostation': {
            this.content.header.title = '<span class="icon icon-cosmostation"></span>Cosmostation';
            break;
          }
          case 'leap': {
            this.content.header.title = '<span class="icon icon-leap"></span>Leap';
            break;
          }
        }
        this.content.header.subtitle = ['Connecting...'];
        break;
      }
      case 'player-create': {
        break;
      }
      case 'archid-select': {
        this.content.header.title = 'Select ArchID';
        this.content.body.text = ['Select a name to use for this game'];
        this.msg.forEach((domain) => {
          this.content.footer.buttons.push({name: 'archid-select', value: domain});
        });
        break;
      }
      case 'confirm': {
        if (!this.msg.length || !Array.isArray(this.msg)) console.warn('Error resolve custom confirm messages. Expected Array');
        this.content.header.title = this.msg[0];
        this.content.body.text = ['Sign the transaction with your wallet app.'];
        break;
      }
      case 'error': {
        if (!this.msg.length || !Array.isArray(this.msg)) console.warn('Error resolve custom errpr messages. Expected Array');
        this.content.header.title = '<span class="icon icon-lg icon-alert"></span>';
        this.content.header.subtitle = '<span class="text-white">Something Went Wrong</span>';
        this.content.body.text = this.msg;
        break;
      }
      case 'success': {
        if (!this.msg['title'] || !this.msg['body']) console.warn('Error resolve custom success messages (title or body)');
        this.content.header.title = this.msg.title;
        this.content.body.text = this.msg.body;
        break;
      }
      default: {
        console.warn("Init failed, unrecognized modal type");
        break;
      }
    }
  },
  methods: {
    close: function (event) {
      if (event.target.classList[0] !== 'modal-wrapper') return;
      this.$emit('close', this.showModal);
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
      this.emitButton(this.name);
    },
    setPlayer: function (player)  {
      this.$emit('setPlayer', player);
    },
    emitButton: async function (name) {
      this.$emit('button', name);
    },
    secondsToMinutes(seconds) {
      if (typeof seconds !== 'number') return '';
      else if (seconds <= 1) return '';
      else if (seconds < 60) return seconds + ' seconds are';
      let minutes = parseInt(seconds / 60);
      if (minutes == 1) return '1 minute is';
      else return minutes + ' minutes are';
    },
  },
}
</script>

<style scoped>
div.subtitle {
  margin-top: 16px;
}
.controls {
  width: 100%;
}
.controls ul, .controls ul li {
  padding: 0;
  width: 100%;
}
.controls ul li {
  margin-bottom: 0.5em;
}
li .btn.wallet-select {
  text-align: left;
}
.btn.wallet-select span {
  margin-right: 1em;
}
#header-welcome {
  align-items: center;
}
#header-welcome .modal-title {
  text-align: center;
}
#modal-player-create, #modal-archid-select {
  min-width: 50vw;
  max-height: 50vh;
}
.modal-dialog, .modal-content {
  max-width: 100%;
}
.loading.default {
  margin-top: 1em;
  margin-bottom: 1em;
}
</style>