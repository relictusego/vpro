<template>
  <div class="container" ref="container">
    <div class="controls">
      <button :class="{ 'clicked-button': regexMode }" @click="toggleSearchMode">正则</button>
      <button @click="keywordForSearching = ''">清除</button>
      <input type="text" :placeholder="dynamicPlaceholder" v-model="keywordForSearching" ref="searchInput" style="width: 30%;">
      <div>{{ parentData.curNo + '/' + parentData.total }}</div>
      <button @click="nextTextArea(-1)">⇑</button>
      <button @click="nextTextArea(1)">⇓</button>
    </div>
  </div>
</template>

<script>

export default {
  data() {
    return {
      keywordForSearching: '',
      dynamicPlaceholder: `输入内容搜索`,
      regexMode: false
    }
  },
  methods: {
    closeWin() {
      const info = {
        purpose: 'close',
      }
      this.$emit('textSearchEvent', info)
    },
    handleKeyDown(event) {
      if (event.key === 'Escape') {
        this.closeWin()
      } 
    },
    search(keyword) {
      if (keyword === undefined || keyword === null || keyword === '') return
      // console.log(`search: ${keyword}`);

    },
    toggleSearchMode() {
      this.regexMode = !this.regexMode
      this.search(this.keywordForSearching)
    },
    nextTextArea(step) {
      const info = {
        purpose: 'nextTextArea',
        data: step
      }
      this.$emit('textSearchEvent', info)
    }

  },
  props: {
    parentData: {},
  },
  watch: {
    keywordForSearching: {
      handler(newValue, oldValue) {
        const info = {
          purpose: 'keywordSearch',
          data: newValue
        }
        this.$emit('textSearchEvent', info)
      },
      deep: true,
      immediate: true
    },
  },
  mounted() {
    const searchInput = this.$refs.searchInput
    if (searchInput) {
      searchInput.focus()
    }

    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeMount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
};
</script>

<style scoped>
.container {
  width: 20%;
  margin-bottom: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: azure;
  padding: 20px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  display: flex;  
  justify-content: center;
  align-items: center;
}

.clicked-button {
  background-color: rgb(211, 192, 192);
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center; 
  gap: 0px;
}

.controls > * {
  flex: 0 0 auto;
}
</style>