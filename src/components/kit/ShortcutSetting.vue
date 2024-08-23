<template>
  <div>
    <div v-if="parentData.showDialog" class="dialog">
      <p ref="tips" class="tips-text">Ctrl/Alt+任意键组成快捷键</p>
      <div class="shortcut-display">{{ shortcut }}</div>
    </div>
  </div>
</template>

<script>
import { tableNameMap, OPERATION_TYPE } from '@/js/constants'

export default {
  data() {
    return {
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
              // console.log(res);
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
  beforeMount() {
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
  background: #fff; /* White background for better readability */
  border: 2px solid #ccc;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); /* Slightly darker shadow for depth */
  z-index: 1000;
  user-select: none;
  border-radius: 10px;
  transition: all 0.3s ease-in-out; /* Smooth transition for entry */
  width: 300px; /* Set a fixed width for consistency */
  text-align: center; /* Center-align text for better presentation */
}

.dialog .tips-text {
  font-size: 14px;
  color: #555;
}

.shortcut-display {
  margin-top: 15px;
  font-size: 1.8em;
  font-weight: bold;
  color: #007bff; /* Primary color for emphasis */
}

.dialog-enter-active, .dialog-leave-active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.dialog-enter, .dialog-leave-to /* .dialog-leave-active in <2.1.8 */ {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}
</style>