<template>
  <div class="container" ref="container">
    <div class="controls">
      <button :class="{ 'active': regexMode }" @click="toggleSearchMode" class="toggle-button">正则</button>
      <button @click="clearSearch" class="clear-button">清除</button>
      <input type="text" :placeholder="dynamicPlaceholder" v-model="keywordForSearching" ref="searchInput"
        class="search-input">
      <div class="results-count">{{ parentData.curNo + '/' + parentData.total }}</div>
      <button @click="nextTextArea(-1)" class="navigate-button">⇑</button>
      <button @click="nextTextArea(1)" class="navigate-button">⇓</button>
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
  width: 25%;
  margin-bottom: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  background-color: #d0d0d0;
  padding: 20px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-button,
.clear-button {
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.toggle-button.active {
  background-color: #007bff;
  color: #ffffff;
}

.clear-button {
  background-color: #f8f9fa;
  color: #007bff;
}

.clear-button:hover {
  background-color: #e2e6ea;
}

.navigate-button {
  background-color: #007bff;
  color: #ffffff;
}

.navigate-button:hover {
  background-color: #0056b3;
}

.search-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  box-sizing: border-box;
}

.results-count {
  font-size: 14px;
  color: #666;
  user-select: none;
}
</style>