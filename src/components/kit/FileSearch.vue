<template>
  <div class="container" ref="container">
    <div class="controls">
      <button :class="{ 'active': regexMode }" @click="toggleSearchMode" class="toggle-button">正则</button>
      <button @click="clearSearch" class="clear-button">清除</button>
      <input type="text" :placeholder="dynamicPlaceholder" v-model="keywordForSearching" ref="searchInput" class="search-input">
      <div class="results-count">{{ parentData.total }}</div>
    </div>
  </div>
</template>

<script>
import { debounce } from '@/js/functions/vue-functions';
export default {
  data() {
    return {
      keywordForSearching: '',
      dynamicPlaceholder: `在‘${this.parentData.path.substring(this.parentData.path.lastIndexOf('\\') + 1)}’下搜索`,
      regexMode: false,
      debounceObj: { timeoutId: null },
    }
  },
  methods: {
    closeWin() {
      const info = {
        purpose: 'closeFileSearch',
        data: false,
        type: this.parentData.type
      }
      this.$emit('fileSearchEvent', info)
    },
    // handleClickOutside(event) {
    //   const container = this.$refs.container;
    //   if (container && !container.contains(event.target)) {
    //     this.closeWin();
    //   }
    // },
    handleKeyDown(event) {
      if (event.key === 'Escape') {
        // console.log(this.parentData.type);
        this.closeWin()
      }
    },
    search(keyword) {
      if (keyword === undefined || keyword === null) return
      if (keyword === '') {
        const info = {
          purpose: 'resetFileList',
          type: this.parentData.type,
        }
        this.$emit('fileSearchEvent', info)
        return
      }
      window.electronAPI.fileSearch(JSON.stringify({
        dir: this.parentData.path,
        keyword: keyword,
        reg: this.regexMode,
      })).then(filePaths => {
        const info = {
          purpose: 'updateSubFilePaths',
          data: filePaths,
          type: this.parentData.type,
          regexMode: this.regexMode,
          keyword: keyword
        }
        this.$emit('fileSearchEvent', info)
      })
    },
    toggleSearchMode() {
      this.regexMode = !this.regexMode
      this.search(this.keywordForSearching)
    }

  },
  props: {
    parentData: {},
  },
  watch: {
    keywordForSearching: {
      handler(newValue, oldValue) {
        // console.log(`this.parentData.path====>${JSON.stringify(this.parentData.path)}`);
        if (oldValue === undefined || oldValue === null) return
        console.log(`keywordForSearching changed from ${oldValue} to ${newValue}`);
        debounce(this.debounceObj, () => { this.search(newValue) }, 300)
      },
      deep: true,
      immediate: true
    },
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
    const searchInput = this.$refs.searchInput
    if (searchInput) {
      searchInput.focus()
    }

    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
    window.removeEventListener('keydown', this.handleKeyDown);

  }
};
</script>

<style scoped>
.container {
  width: 25%;
  margin-bottom: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  background-color: #d0d0d0 !important;
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

.toggle-button, .clear-button {
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
}
</style>
