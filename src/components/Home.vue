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
    <button @click="test">test</button>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script>
import ShortcutSetting from './kit/ShortcutSetting.vue'

export default {
  components: {
    ShortcutSetting,
    // DrawWave

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
    toggleError() {
      this.isErrorVisible = !this.isErrorVisible
      console.log(this.isErrorVisible);
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
    startDrawing() {
      let canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      // Clear canvas before drawing new content
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Drawing logic
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(100, 100);
      ctx.stroke();
    },
  },
  mounted() {
    setTimeout(() => {
      this.isErrorVisible = true
    }, 100);
    // Start drawing
    this.startDrawing();

  }


};
</script>

<style scoped></style>