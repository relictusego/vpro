<template>
  <div>
    <router-link to="/fileExplorer" exact-active-class="active-link" @click.native="openFileExplorer"
      style="user-select: none;">文件浏览</router-link>
    <span> | </span>
    <router-link to="/videoSelection" exact-active-class="active-link" @click.native="openVideoSelection"
      style="user-select: none;">脚本</router-link>
    <span> | </span>
    <router-link to="/drag" exact-active-class="active-link" style="user-select: none;">drag</router-link>
    <ShortcutSetting :parentData="shortcutSettingData"></ShortcutSetting>
    <input type="text" v-model="val" @blur="camelToSnake">
    <button @click="test">test</button>
    
  </div>
</template>

<script>
import ShortcutSetting from './kit/ShortcutSetting.vue'


export default {
  components: {
    ShortcutSetting,
    
  },
  data() {
    return {
      isErrorVisible: false,
      parentData: {
        message: 'Something went wrong!',
      },
      shortcutSettingData: {
        href: this.$route.href,
        showDialog: false
      },
      val: '',

      subFilePaths: [
        'E:\\multi-media\\image\\情绪表情包\\夸奖\\nice.jpg',
        'E:\\multi-media\\video\\bili.mp4',
        'E:\\multi-media\\video\\bili.mp4',
        'F:\\CloudMusic\\神前暁 - パティのテーマ.mp3',
        'E:\\multi-media\\audio\\音效\\转场\\唰-挥剑唰一声.mp3'
      ],
      wh: {},
      isDrawing: true,
      
    }
  },
  methods: {
    camelToSnake() {
      this.val = this.val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },

    test() {
      // const info = {
      //   tableName: tableNameMap.scriptRows,
      //   operation: OPERATION_TYPE.SELECTION,
      //   funcName: 'SELECT_BY_VIDEO_ID',
      //   data: 3
      // }

      // window.electronAPI.executeSql(JSON.stringify(info)).then(res => {
      //   console.log(res);
      // })
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
    handleErrorPopUpEvent(info) {
      const { purpose } = info
      switch (purpose) {
        case 'close':
          this.isErrorVisible = false
          break
      }
    },

  },
  mounted() {
    setTimeout(() => {
      this.isErrorVisible = true
    }, 100);

  }


};
</script>

<style scoped></style>