<template>
  <transition name="modal">
    <div :id="'wrapper-'+name" class="modal-wrapper" v-if="showModal" @click="close();">
      <div :id="'modal-'+name" class="modal">
        <div :id="'header-'+name" class="modal-header">
        </div>
        <div :id="'body-'+name" class="modal-body">
        </div>
        <div :id="'footer-'+name" class="modal-footer" v-if="footer">
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { FromAtto } from '../../util/denom';
const IsTestnet = (/true/).test(process.env.VUE_APP_IS_TESTNET);

export default {
  props: {
    name: String,
    footer: Boolean,
    showModal: Boolean,
    state: Object,
    msg: Object,
  },
  emits: ['selectedWallet', 'close'],
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
        if (!this.state['min_deposit']) console.warn('Error resolve game state');
        this.content.header.title = 'Welcome to';
        this.content.header.subtitle = '<span class="brand brand-1">Network</span><span class="brand brand-2">Wars</span>';
        this.content.body.text = [
          'The rules are simple, if you control the network when the time is up, you get the prize pool.',
          'To control the network, users must pay '+ FromAtto(this.state.min_deposit) + ' ' + this.denom +'. Every time there is a new controller, '+ FromAtto(this.state.min_deposit) + ' ' + this.denom +' is added to the prize pool, and '+ this.secondsToMinutes(this.state.extensions) +' added to the countdown.',
          'Good Luck.'
        ];
        this.content.footer.buttons = ['Start Playing'];
        break;
      }
      case 'wallet-select': {
        this.content.header.title = 'Select a Wallet';
        this.content.body.text = ['Select from the supported wallets to get started.'];
        this.content.footer.buttons = [
          '<span class="icon icon-keplr"></span>Keplr',
          '<span class="icon icon-cosmostation"></span>Cosmostation',
          '<span class="icon icon-leap"></span>Leap'
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
      case 'archid-required': {
        this.content.header.title = '<span class="icon icon-stop"></span>';
        this.content.header.subtitle = 'You need an ArchID to play.';
        this.content.body.text = ['Looks like there are no ArchIDs associated with this wallet.'];
        this.content.footer.buttons = [
          'Get Your ArchID<span class="icon icon-external-link"></span>',
          '<span class="icon icon-logout"></span>Logout'
        ];
        break;
      }
      case 'archid-select': {
        this.content.header.subtitle = 'Select Your ArchID';
        this.content.body.text = ['Select the name that you would like to use for this game.'];
        this.content.footer.buttons = this.msg;
        break;
      }
      case 'deposit': {
        this.content.header.subtitle = 'Attempting to take control of the network';
        this.content.body.text = ['Sign the transaction with your wallet app.'];
        break;
      }
      case 'success': {
        if (!this.msg['title'] || !this.msg['body']) console.warn('Error resolve custom success messages (title or body)');
        this.content.header.subtitle = this.msg.title;
        this.content.body.text = [this.msg.body];
        break;
      }
      case 'error': {
        this.content.header.title = '<span class="icon icon-stop"></span>';
        this.content.header.subtitle = 'Something Went Wrong';
        this.content.body.text = [this.msg];
        break;
      }
      default: {
        console.warn("Init failed, unrecognized modal type");
        break;
      }
    }
  },
  methods: {
    close: function () {
      this.$emit('close', this.showModal);
    },
    secondsToMinutes(seconds) {
      if (typeof seconds !== 'number') return '';
      else if (seconds <= 1) return '';
      else if (seconds < 60) = return seconds + ' seconds are';
      let minutes = parseInt(seconds / 60);
      if (minutes == 1) return '1 minute is';
      else return minutes + ' minutes are';
    },
  },
}
</script>

<style scoped>
</style>