<template>
  <div>
    <select v-model="selectedPagination">
      <option v-for="(pageOption, index) in pageOptions" :key="index" :value="pageOption">
        {{ pageOption }}
      </option>
    </select>
    <button @click="nextPage(-1)">上一页</button>
    <button @click="nextPage(1)">下一页</button>
    <span>当前:</span>
    <input type="text" v-model="curPageIndex" style="width: 2%;" min="0" @blur="checkCurPageIndex"
      @focus="enterPageInput">
    <span>共:{{ totalPages }}页</span>
    <button @click="test">test</button>
  </div>
</template>

<script>
import { loopInPeriod, debounce } from '@/js/functions/vue-functions';
import { SPEC } from '@/js/constants';

export default {
  data() {
    return {
      curPageIndex: 1,
      lastInputPageIndex: 1,
      pageOptions: [20, 30, 50],
      selectedPagination: 30,
      totalPages: 0,
      debounceObj: { timeoutId: null },  // Store the timeout ID for debouncing
      lastUsedPageIndex: 1
    }
  },
  methods: {
    test() {
      console.log(`lastUsedPageIndex,curPageIndex  -- ${this.lastUsedPageIndex} ||| ${this.curPageIndex}`);
    },
    checkCurPageIndex() {
      if (this.curPageIndex === '') this.curPageIndex = 1
      const info = {
        purpose: 'pageInputToggle',
        data: false
      }
      this.$emit('paginationEvent', info)
    },
    enterPageInput() {
      const info = {
        purpose: 'pageInputToggle',
        data: true
      }
      this.$emit('paginationEvent', info)
    },
    nextPage(step) {
      this.curPageIndex += step
      if (this.curPageIndex > this.totalPages) {
        this.curPageIndex = this.totalPages
      } else if (this.curPageIndex < 1) {
        this.curPageIndex = 1
      }
    },
    updatePagedFilePaths(idx) {
      const info = {
        purpose: 'updatePagedFilePaths',
        data: this.parentData.filePaths.slice(idx * this.selectedPagination, (idx + 1) * this.selectedPagination)
      }
      // console.log(`info.data.length=${info.data.length}, idx=${idx}`);

      this.$emit('paginationEvent', info)
    },
    updatePage(page) {
      this.curPageIndex = page
      this.updatePagedFilePaths(page - 1)
    }
  },
  mounted() {
    loopInPeriod(1000, (callback) => {
      if (this.parentData.filePaths.length !== 0) {
        this.totalPages = Math.ceil(this.parentData.filePaths.length / this.selectedPagination)
        this.updatePagedFilePaths(this.curPageIndex - 1)
        callback(true)
      } else callback(false)
    }),

      window.electronAPI.onDataWithinVues((event, data) => {
        if (data.to === SPEC.vueNames.PAGINATION) {
          switch (data.from) {
            case SPEC.vueNames.FILE_EXPLORER:
              switch (data.type) {
                case SPEC.type.PARENT_TO_CHILD:
                  let fileIdx = this.parentData.filePaths.indexOf(data.data)
                  console.log(`fileIdx = ${fileIdx}`);

                  let idx = Math.ceil((fileIdx + 1) / this.selectedPagination)
                  this.curPageIndex = idx

                  this.updatePagedFilePaths(this.curPageIndex - 1)
                  let filePaths = this.parentData.filePaths.slice((idx - 1) * this.selectedPagination, idx * this.selectedPagination)
                  window.electronAPI.sendDataToMainProcess(filePaths)
                  break
                case SPEC.type.REFRESH_PAGED_FILE_PATHS:
                  this.updatePagedFilePaths(0)
                  break
                default:

              }
              break
            default:

          }
        }
      })
  },
  unmounted() {
    // Clear the timeout when the component is destroyed to prevent memory leaks
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  },
  props: {
    parentData: {}
  },
  watch: {
    'curPageIndex': {
      handler(newValue, oldValue) {
        if (oldValue === undefined || oldValue === null) return;
        if (isNaN(newValue)) {
          this.curPageIndex = this.lastInputPageIndex
        } else {
          if (newValue === '') {
            newValue = 1
            // this.curPageIndex = 1
          }
          this.lastInputPageIndex = +newValue
        }

        debounce(this.debounceObj, () => {
          try {
            console.log(`curPageIndex new, old -- ${newValue}, ${oldValue}`);
            this.updatePagedFilePaths(newValue - 1);
          } catch (error) {
            console.error(error);
          }
        }, 50)
      },
      immediate: true
    },
    'selectedPagination': {
      handler(newValue, oldValue) {
        if (oldValue === undefined || oldValue === null) return
        try {
          this.totalPages = Math.ceil(this.parentData.filePaths.length / this.selectedPagination)
          this.updatePagedFilePaths(this.curPageIndex - 1)
        } catch (error) {

        }
      },
      immediate: true
    },
    'parentData.filePaths': {
      handler(newValue, oldValue) {
        try {
          if (oldValue === undefined || oldValue === null) return
          // console.log(`parentData.filePaths new,old  -- ${newValue} |||  ${oldValue}`);
          this.curPageIndex = 1
          this.totalPages = Math.ceil(this.parentData.filePaths.length / this.selectedPagination)
          this.updatePagedFilePaths(this.curPageIndex - 1)
          // console.log(`newValue.length=${newValue.length}`);

        } catch (error) {

        }
      },
      // deep: true,
      immediate: true
    },
    'parentData.keywordForSearching': {
      handler(newValue, oldValue) {
        try {
          // console.log(`parentData.resetCurPagination new,old  -- ${newValue} ||| ${oldValue}`);
          // console.log(`lastUsedPageIndex,curPageIndex  -- ${this.lastUsedPageIndex} ||| ${this.curPageIndex}`);
          // if (oldValue === undefined || oldValue === null) return
          if (newValue) {
            if (this.curPageIndex !== 1) {
              this.lastUsedPageIndex = this.curPageIndex
              this.curPageIndex = 1
            }
            this.updatePagedFilePaths(this.curPageIndex - 1);
          } else {
            this.curPageIndex = this.lastUsedPageIndex
          }

        } catch (error) {

        }
      },
      // deep: true,
      immediate: true
    },


  }
};
</script>

<style scoped>
select {
  width: 50px;
  padding: 5px;
  border-radius: 5px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
}

option {
  padding: 5px;
  background-color: #fff;
}
</style>