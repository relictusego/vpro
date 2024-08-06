<template>
  <div>
    <router-link to="/fileExplorer" exact-active-class="active-link" @click.native="openFileExplorer"
      style="user-select: none;">文件浏览</router-link>
    <span> | </span>
    <router-link to="/videoSelection" exact-active-class="active-link" @click.native="openVideoSelection"
      style="user-select: none;">脚本</router-link>
    <span> | </span>
    <router-link to="/drag" exact-active-class="active-link" style="user-select: none;">drag</router-link>
    <!-- <button @click="test">test</button> -->
    <ShortcutSetting :parentData="shortcutSettingData"></ShortcutSetting>
    <button @click="toggleError">error</button>
    <input type="text" v-model="val" @blur="camelToSnake">
    <!-- <ErrorPopUP v-if="isErrorVisible" :parentData="parentData" @errorPopUpEvent="handleErrorPopUpEvent"></ErrorPopUP>   -->
  </div>
</template>

<script>
import { tableNameMap, OPERATION_TYPE } from '@/js/constants';
import ShortcutSetting from './kit/ShortcutSetting.vue';
import ErrorPopUP from './kit/ErrorPopUP.vue';

export default {
  data() {
    return {
      isErrorVisible: false,
      parentData: {
        message: 'Something went wrong!',
      },
      shortcutSettingData: {
        href: this.$route.href
      },
      val: ''
    }
  },
  methods: {
    camelToSnake(){
      this.val = this.val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();     
    },
    toggleError(){
      this.isErrorVisible = !this.isErrorVisible
      console.log(this.isErrorVisible);      
    },
    test() {
      const info = {
        tableName: tableNameMap.scriptRows,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_VIDEO_ID',
        data: 3
      }

      window.electronAPI.executeSql(JSON.stringify(info)).then(res => {
        console.log(res);
      })

    },
    openFileExplorer(event) {
      if (event.ctrlKey) {
        event.preventDefault();
        window.electronAPI.getCurrentWindowBounds().then(bounds => {
          const windowInfo = {
            'url': 'fileExplorer',
            'bounds': { 'x': bounds.x, 'y': bounds.y }
          }
          window.electronAPI.openNewWindow(JSON.stringify(windowInfo));
        })
      }
    },
    openVideoSelection(event) {
      if (event.ctrlKey) {
        event.preventDefault();
        window.electronAPI.getCurrentWindowBounds().then(bounds => {
          const windowInfo = {
            'url': 'videoSelection',
            'bounds': { 'x': bounds.x, 'y': bounds.y }
          }
          window.electronAPI.openNewWindow(JSON.stringify(windowInfo));
        })
      }
    },
    handleErrorPopUpEvent(info){
      const { purpose } = info
      switch(purpose){
        case 'close':
          this.isErrorVisible = false
          break
      }
    }

  },
  components: {
    ShortcutSetting, ErrorPopUP
  },
  mounted(){
    setTimeout(() => {
      this.isErrorVisible = true
    }, 100);
  }


};
</script>

<style scoped></style>