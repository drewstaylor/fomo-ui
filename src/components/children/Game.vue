<template>
  <div class="game">
    <p>Game State goes here</p>
  </div>
</template>

<script>
export default {
  name: 'Game',
  props: {
    accounts: Object,
    cwClient: Object,
    readOnly: Boolean,
  }
}
</script>

<style scoped>
.game {
  margin-top: 2em;
}
</style>
