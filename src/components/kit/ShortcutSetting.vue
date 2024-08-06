<template>
  <div>
    <div v-if="parentData.showDialog" class="dialog">
      <p ref="tips">Ctrl/Alt+任意键组成快捷键</p>
      <div class="shortcut-display">{{ shortcut }}</div>
    </div>
  </div>
</template>

<script>
import { tableNameMap, OPERATION_TYPE } from '@/js/constants'

export default {
  data() {
    return {
      // tips: 'Ctrl/Alt+任意键组成快捷键',
      shortcut: '无'
    };
  },
  methods: {
    handleKeydown(event) {
      if (!this.parentData.showDialog) return
      if ((event.ctrlKey || event.altKey) && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Shift') {
        this.shortcut = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.key}`;
      }
    }
  },
  watch: {
    shortcut(newVal, oldVal) {
      window.electronAPI.bindGlobalShortcut({
        shortcut: this.shortcut,
        href: this.parentData.href
      }).then(res => {
        const { innerHTML } = res
        const tipsEl = this.$refs.tips
        tipsEl.innerHTML = innerHTML
      })
    },
    parentData: {
      handler(newVal, oldVal) {
        if (newVal.showDialog) {
          const info = {
            tableName: tableNameMap.globalShortcut,
            operation: OPERATION_TYPE.SELECTION,
            funcName: 'SELECT_BY_HREF',
            data: this.parentData.href
          }
          
          this.$nextTick(() => {
            window.electronAPI.executeSql(JSON.stringify(info)).then(res => {
              console.log('------==-=-o-=ofdasf');
              console.log(res);
              if (res) {
                const tipsEl = this.$refs.tips
                let keysCombinations = res.keysCombination
                if (tipsEl) {
                  tipsEl.innerHTML = `<span style="font-weight: bold;">${keysCombinations}</span>已绑定到当前界面`;
                }
              }
            })
          })
        }
      },
      deep: true,
      immediate: true
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  props: {
    parentData: {}
  }
};
</script>

<style scoped>
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgb(244, 224, 243);
  border: 3px solid #aaa; /* Slightly darker border */
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); /* Thicker and darker shadow */
  z-index: 1000; /* Higher z-index to ensure it's on top */
  user-select: none;
  border-radius: 8px; /* Rounded corners */
}

.shortcut-display {
  margin-top: 10px;
  font-size: 1.5em;
  color: #333;
}
</style>
