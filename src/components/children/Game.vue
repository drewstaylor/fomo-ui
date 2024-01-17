<template>
  <div class="game">
    <p>Game State goes here</p>
  </div>
</template>

<script>
import { Query, Execute } from '../../util/contract';

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
  }),
  mounted: async function () {
    console.log('Game mounted', this.accounts, this.cwClient, this.readOnly);
    await this.loadState();
  },
  methods: {
    loadState: async function () {
      if (!this.cwClient) return;
      this.state = await this.fomo.Query.Game(this.cwClient);
    },
  },
  computed: {},
}
</script>

<style scoped>
</style>
