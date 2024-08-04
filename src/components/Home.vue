<template>
  <div>
    <router-link to="/fileExplorer" exact-active-class="active-link" @click.native="openFileExplorer">文件浏览</router-link>
    <span> | </span>
    <router-link to="/videoSelection" exact-active-class="active-link"
      @click.native="openVideoSelection">脚本</router-link>
    <span> | </span>
    <router-link to="/drag" exact-active-class="active-link">drag</router-link>
    <!-- <button @click="test">test</button> -->
  </div>
</template>

<script>
import { tableNameMap, OPERATION_TYPE } from '@/js/constants';

export default {
  data() {
    return {
    }
  },
  methods: {
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

  },

};
</script>

<style scoped></style>