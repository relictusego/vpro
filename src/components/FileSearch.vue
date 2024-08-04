<template>
  <div class="container" ref="container">
    <input type="text" :placeholder="dynamicPlaceholder" v-model="keywordForSearching" ref="searchInput">
    <button @click="keywordForSearching = ''">清除</button>
  </div>
</template>

<script>

export default {
  data() {
    return {
      keywordForSearching: '',
      dynamicPlaceholder: `在‘${this.parentData.path.substring(this.parentData.path.lastIndexOf('\\') + 1)}’下搜索`
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
    handleKeyDown() {
      if (event.key === 'Escape') {
        console.log(this.parentData.type);
        this.closeWin()
      }
    },

  },
  props: {
    parentData: {},
  },
  watch: {
    keywordForSearching: {
      handler(newValue, oldValue) {
        console.log(`keywordForSearching changed from ${oldValue} to ${newValue}`);
        console.log(`this.parentData.path====>${JSON.stringify(this.parentData.path)}`);
        if (newValue === undefined || newValue === null || newValue === '') return
        window.electronAPI.fileSearch(JSON.stringify({
          dir: this.parentData.path,
          keyword: newValue
        })).then(filePaths => {
          const info = {
            purpose: 'updateSubFilePaths',
            data: filePaths
          }
          this.$emit('fileSearchEvent', info)
        })
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
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
};
</script>

<style scoped>
.container {
  margin-bottom: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: azure;
}

.close {
  width: 15px;
  height: 15px;
  position: fixed;
  top: 0%;
  left: 98%;
  user-select: none;
  cursor: pointer;
  font-size: 25px;
}
</style>