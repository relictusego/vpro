<template>
  <div style="background-color: rgba(2, 255, 255, 3); height: 925px;">
    <div class="left-side">
      <div class="path-selector" @click="change()">
        <span style="user-select: none;">{{ curPath }}</span>
        <span v-if="curPath === ''" style="user-select: none;">选择文件夹</span>
      </div>
      &nbsp;<input type="text" v-model="keywordForFilterFolder" ref="kwInput" placeholder="输入关键字筛选文件夹">
      <button @click="resetFileList" type="button">清空</button>
      <div class="path-displayer">
        <div v-for="(file, index) in fileList" :key="index">
          <div class="file-tab" @dblclick="diveIntoDir(index)" :class="{ selected: selectedIndex === index }"
            @click="selectFile(index)" :style="{ fontWeight: file.isDir ? 'bold' : 'normal' }">
            {{ file.name }}
          </div>
        </div>
      </div>
    </div>
    <div class="right-side">
      <div v-for="(subFilePath, index) in subFilePaths" :key="index">
        <div class="pic-grid" @contextmenu.prevent="showContextMenu($event, index, subFilePath)">
          <div v-if="subFilePath.indexOf('.') > 0" class="number-badge">{{ subFilePathRankMap[subFilePath] > 0 ?
            subFilePathRankMap[subFilePath] : 0 }}</div>
          <img v-if="subFilePath.indexOf('.') > 0" :src="'file:///' + subFilePath" alt="">
          <div v-if="subFilePath.indexOf('.') <= 0">{{ subFilePath.substring(subFilePath.lastIndexOf("\\") + 1) }}</div>
          <div v-if="mimeType(subFilePath) === 'VIDEO' || mimeType(subFilePath) === 'AUDIO'"
            style="width: 100%; height: 100%;" @click="togglePlay(index, mimeType(subFilePath))">
            <div v-if="mimeType(subFilePath) === 'AUDIO'" style="user-select: none;">{{
              subFilePath.substring(subFilePath.lastIndexOf('\\') + 1) }}</div>
            <video v-if="mimeType(subFilePath) === 'VIDEO'" :src="'file:///' + subFilePath"
              style="max-width: 100%;  max-height: 100%;  object-fit: cover; " :ref="'videoMedia_' + index" autoplay
              muted></video>
            <audio v-if="mimeType(subFilePath) === 'AUDIO'" :src="'file:///' + subFilePath"
              :ref="'audioMedia_' + index"></audio>
          </div>
        </div>
        <div style="width: 200px;">{{ subFilePath.substring(subFilePath.lastIndexOf('\\') + 1) }}</div>
      </div>
    </div>
    <!-- Context Menu element -->
    <ul v-if="contextMenu.visible" class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <li @mouseenter="scriptOptions">移动到<span style="color: blue; font-family: '黑体', sans-serif;">{{
        curVideoInfo.videoName }}</span></li>
      <li @click="copyFilePath" @mouseenter="hideScriptNumMenu">复制路径</li>
      <li @click="locateFile" @mouseenter="hideScriptNumMenu">定位文件</li>
    </ul>

    <ul v-if="scriptNumMenu.visible" class="context-menu"
      :style="{ top: scriptNumMenu.y + 'px', left: scriptNumMenu.x + 'px' }">
      <div>
        添加到:<input type="text" ref="addToInput" style="width: 50px;">行
      </div>
      <div v-for="(idx, index) in curVideoInfo.scriptIndices">
        <li @click="sendFilePath(idx)">{{ idx + 1 }}</li>
      </div>
    </ul>

    <div>
      <button @click="getFileList">fileList</button>
    </div>

    <FileSearch class="centered-overlay" v-if="showFileSearch" @fileSearchEvent="handleFileSearchEvent"
      :parentData="{ path: this.curPath, type: 1 }" @mousedown="startDrag"
      :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></FileSearch>

    <FileSearch class="centered-overlay" v-if="showFileSearchInCurDir" @fileSearchEvent="handleFileSearchEvent"
      :parentData="{ path: this.fileList[this.selectedIndex].path, type: 2 }" @mousedown="startDrag"
      :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></FileSearch>

  </div>
</template>

<script>
import { SPEC, tableNameMap, OPERATION_TYPE, BOUNDS, DEFAULT_CONFIG_DEST } from '@/js/constants';
import { newDataWithinVues, mimeType, similarity } from '@/js/functions/vue-functions'
import FileSearch from './FileSearch.vue';


function splitWithSlashOrBackSlash(str) {
  let l = 0, r = 1, len = str.length
  let res = []
  while (r < len) {
    if (str[r] === '/' || str[r] === '\\') {
      // console.log(`l=${l}, r=${r}, str${r}=${str[r]}`);
      res.push(str.substring(l, r))
      // overlook the separator itself
      l = ++r
    }
    r++
  }
  return res;
}

//TODO scale the picture grid using scrolling

export default {
  data() {
    return {
      // TODO need to remember the last selected one
      curPath: '',
      // curPath: 'E:/multi-media',
      fileList: [],
      selectedIndex: 0,
      forwardIndices: [],
      backwardIndices: [],
      subFilePaths: [],
      // for showing the context menu
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        index: null,
      },
      scriptNumMenu: {
        visible: false,
        x: 0,
        y: 0,
        index: null,
      },
      curVideoInfo: {},
      selectedSubfilePath: '',
      subFilePathRankMap: new Map(),
      keywordForFilterFolder: '',
      showFileSearch: false,
      showFileSearchInCurDir: false,

      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      componentTop: BOUNDS.HEIGHT / 2, // Initial top position
      componentLeft: BOUNDS.WIDTH / 2, // Initial left position
    }
  },
  methods: {
    startDrag(event) {
      this.isDragging = true;
      this.dragStartX = event.clientX - this.componentLeft;
      this.dragStartY = event.clientY - this.componentTop;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    onDrag(event) {
      if (this.isDragging) {
        this.componentLeft = event.clientX - this.dragStartX;
        this.componentTop = event.clientY - this.dragStartY;
      }
    },
    stopDrag() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    },
    handleFileSearchEvent(info) {
      switch (info.purpose) {
        case 'closeFileSearch':
          if (info.type === 1) {
            this.showFileSearch = info.data
            this.updateFileList().then(() => {
              this.selectFile(this.selectedIndex)
            })
          } else if (info.type === 2) {
            this.showFileSearchInCurDir = info.data
            this.selectFile(this.selectedIndex)
          }
          break
        case 'updateSubFilePaths':
          this.subFilePaths = info.data
          this.fileList = []
          this.updateSubFilePathRankMap()
      }
    },
    updateSubFilePathRankMap() {
      // update the frequency of the usage of each file
      const info = {
        tableName: tableNameMap.fileRank,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_FILE_PATHS',
        data: this.subFilePaths
      }
      window.electronAPI.executeSql(JSON.stringify(info)).then(fileRanks => {
        this.subFilePathRankMap = new Map()
        for (const fileRank of fileRanks) {
          this.subFilePathRankMap[fileRank.filePath] = fileRank.freq
        }
      })
    },
    togglePlay(index, type) {
      const media = type === 'VIDEO' ? this.$refs['videoMedia_' + index][0] : this.$refs['audioMedia_' + index][0];
      if (media) {
        if (media.paused) {
          media.play();
        } else {
          media.pause();
        }
      }
    },
    mimeType(filePath) {
      return mimeType(filePath)
    },
    copyFilePath() {
      const path = this.subFilePaths[this.contextMenu.index]
      console.log(path);
      if (path) {
        navigator.clipboard.writeText(path)
          .then(() => {
            console.log('Path copied to clipboard:', path);
          })
          .catch(err => {
            console.error('Unable to copy path to clipboard', err);
          });
      }
    },
    locateFile() {
      const path = this.subFilePaths[this.contextMenu.index]
      // console.log('this.contextMenu.index======>', this.contextMenu.index);
      // console.log('path======>', path);
      window.electronAPI.locateFileInOs(path)
    },
    hideScriptNumMenu() {
      this.scriptNumMenu.visible = false;
      this.scriptNumMenu.index = null;
      document.removeEventListener('click', this.hideScriptNumMenu);
      // 移除 keydown 事件监听器
      const addToInput = this.$refs.addToInput;
      if (addToInput) {
        addToInput.removeEventListener('keydown', this.handleKeyDown);
      }
    },
    sendFilePath(idx) {
      const data = newDataWithinVues(SPEC.vueNames.FILE_EXPLORER,
        SPEC.vueNames.SCRIPT_CREATION, SPEC.type.FILE_SHARE,
        {
          index: idx,
          filePath: this.selectedSubfilePath
        }
      )

      window.electronAPI.updateDataWithinVues(data)
    },
    scriptOptions() {
      this.scriptNumMenu.visible = true

      this.$nextTick(() => {
        const contextMenuElement = this.$el.querySelector('.context-menu');
        if (contextMenuElement) {
          const contextMenuWidth = contextMenuElement.offsetWidth;
          this.scriptNumMenu.x = this.contextMenu.x + contextMenuWidth;
          this.scriptNumMenu.y = this.contextMenu.y;
        }

        // focus on the input automatically
        const addToInput = this.$refs.addToInput;
        if (addToInput) {
          addToInput.focus();
          addToInput.addEventListener('keydown', this.handleKeyDown, { once: true });
        }
      });

      document.addEventListener('click', this.hideScriptNumMenu);
    },
    showContextMenu(event, index, subFilePath) {
      this.contextMenu.visible = true;
      this.contextMenu.x = event.clientX;
      this.contextMenu.y = event.clientY;
      this.contextMenu.index = index;
      document.addEventListener('click', this.hideContextMenu);

      console.log('index------', index);
      this.selectedSubfilePath = subFilePath
    },
    hideContextMenu() {
      this.contextMenu.visible = false;
      this.contextMenu.index = null;
      document.removeEventListener('click', this.hideContextMenu);
    },
    // contextMenuAction(index) {
    //   alert(`Menu action for index: ${index}`);
    //   this.hideContextMenu();
    // },
    getFileList() {
      // console.log(JSON.stringify(this.fileList));
      // console.log(JSON.stringify(this.selectedIndex));
      // console.log(JSON.stringify(this.contextMenu));
      console.log(JSON.stringify(this.curPath));
    },
    change() {
      window.electronAPI.fr(DEFAULT_CONFIG_DEST)
        .then(txt => {
          return JSON.parse(txt)['lastPickedPath']
        })
        .then(lastPickedPath => {
          return window.electronAPI.openDirectory(JSON.stringify({ defaultPath: lastPickedPath }))
        })
        .then(path => {
          if (path === null || path === undefined) return Promise.reject()
          this.curPath = path
          return this.updateFileList().then(() => { return path })
        })
        .then(path => {
          return window.electronAPI.addRowInJsonFile(JSON.stringify({
            fieldName: 'lastPickedPath',
            fieldValue: path,
            dest: DEFAULT_CONFIG_DEST
          }))
        })
        .then(() => {
          this.selectFile(0)
        })
        .catch(e => { console.log(e); })
    },
    selectFile(index) {
      this.selectedIndex = index;
      this.updateWhenFolderChanged(index)
    },
    backToParentPath() {
      let lastIdx = this.curPath.lastIndexOf('\\')
      let firstIdx = this.curPath.indexOf('\\')
      // forbidden backing to root, must be in folder
      if (lastIdx === firstIdx) return
      let lastPath = this.curPath
      console.log(`this.curPath===>${this.curPath}`);
      this.curPath = this.curPath.substring(0, this.curPath.lastIndexOf('\\'))
      console.log(`this.curPath===>${this.curPath}`);
      this.updateFileList()
        .then(() => { return window.electronAPI.subfilePathsInDir(this.curPath) })
        .then(subFilePaths => {
          this.subFilePaths = subFilePaths

          this.forwardIndices.unshift(this.selectedIndex)
          let nextIndex = this.backwardIndices.shift()
          if (nextIndex) {
            this.selectedIndex = nextIndex
          }
          else {
            for (let i = 0; i < this.fileList.length; i++) {
              if (this.fileList[i].path === lastPath) {
                this.selectedIndex = i
                break
              }
            }
            console.log(JSON.stringify(lastPath));
            console.log(JSON.stringify(this.fileList));
            console.log(this.selectedIndex);
          }
        })
        .then(() => { this.updateWhenFolderChanged(this.selectedIndex) })
    },
    async diveIntoDir(index) {
      let path = this.fileList[index].path
      // do not dive if there is no subfolder in the folder
      const filePaths = await window.electronAPI.subfilePathsInDir(path)
      let pathNum = 0
      for (const filePath of filePaths) {
        if (filePath.indexOf('.') < 0) pathNum++
      }
      if (pathNum === 0) return

      this.backwardIndices.unshift(index)
      let nextIndex = this.forwardIndices.shift()
      if (nextIndex) this.selectedIndex = nextIndex
      else this.selectedIndex = 0

      this.curPath = path
      this.fileList = []
      for (const filePath of filePaths) {
        // console.log(filePath);
        this.fileList.push({
          name: filePath.substring(filePath.lastIndexOf('\\') + 1),
          path: filePath,
          isDir: (await window.electronAPI.subfilePathsInDir(filePath)).length !== 0
        })
      }

      await this.updateWhenFolderChanged(this.selectedIndex)
    },
    // handleFileChange(event) {
    //   const targetFiles = event.target.files;
    //   if (targetFiles.length) {
    //     let absoluteFilePath = targetFiles[0].path
    //     let webkitRelativePath = targetFiles[0].webkitRelativePath
    //     let arr1 = splitWithSlashOrBackSlash(absoluteFilePath)
    //     let arr2 = splitWithSlashOrBackSlash(webkitRelativePath)
    //     arr1.splice(arr1.indexOf(arr2[0]) + 1)
    //     this.curPath = arr1.join('\\')
    //     console.log(typeof (this.curPath));
    //     this.updateFileList().then(() => {
    //       return window.electronAPI.addRowInJsonFile(JSON.stringify({
    //         fieldName: 'lastUsedPath',
    //         fieldValue: this.curPath,
    //         dest: DEFAULT_CONFIG_DEST
    //       }))
    //     }).then(() => {
    //       this.selectFile(0)
    //     })
    //   }
    // },
    async updateFileList() {
      const filePaths = await window.electronAPI.subfilePathsInDir(this.curPath)
      // reset fileList
      this.fileList = []
      for (const filePath of filePaths) {
        this.fileList.push({
          name: filePath.substring(filePath.lastIndexOf('\\') + 1),
          path: filePath,
          isDir: (await window.electronAPI.subfilePathsInDir(filePath)).length !== 0
        })
      }
    },
    /**
     * update subfiles real time when folder is changed
     * @param index index where current folder locates in the directory
     */
    updateWhenFolderChanged(index) {
      try {
        const path = this.fileList[index].path
        window.electronAPI.subfilePathsInDir(path)
          .then(subFilePaths => {
            this.subFilePaths = subFilePaths

            // Ensure DOM is updated before scrolling
            this.$nextTick(() => {
              const selectedElement = this.$el.querySelector('.file-tab.selected');
              if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            });
          })
          .then(() => {
            this.updateSubFilePathRankMap()
          })
      } catch (error) {
        console.log('there is an error when page changed:', JSON.stringify(error));
      }
    },
    handleKeyDown() {
      console.log(`按下的键: ${event.key}`);
      let inputting = this.$refs.kwInput === document.activeElement ||
        this.showFileSearch || this.showFileSearchInCurDir

      if (event.key === 'w' && !inputting) {
        if (this.selectedIndex > 0) this.selectedIndex--;
        this.forwardIndices = []
      } else if (event.key === 's' && !inputting) {
        if (this.selectedIndex < this.fileList.length - 1) this.selectedIndex++;
        this.forwardIndices = []
      } else if (event.key === 'a' && !inputting) {
        this.backToParentPath();
      } else if (event.key === 'd' && !inputting) {
        if (this.fileList.length) { // avoid the exception once app mounted
          this.diveIntoDir(this.selectedIndex);
        }
      } else if (event.key === 'e') {
        console.log('fdasfdsafds');
        this.change();
      } else if (event.key === 'Tab') {
        event.preventDefault();  // 防止默认的 Tab 键行为（如焦点移动）
        event.stopImmediatePropagation(); // 阻止事件冒泡
        const addToInput = this.$refs.addToInput;
        if (addToInput) {
          const idx = addToInput.value
          if (!Number.isInteger(Number(idx))) {
            alert('输入内容必须是数字')
          }
          if (idx < 1 || idx > this.curVideoInfo.len) {
            alert(`输入数字必须在1~${this.curVideoInfo.len}范围内`)
          }
          this.sendFilePath(idx - 1)
          this.contextMenu.visible = false
          this.scriptNumMenu.visible = false
        }
      } else if (event.ctrlKey && event.key === 'f') {
        event.preventDefault(); // Prevent default action for Ctrl+F
        this.showFileSearch = true
        this.showFileSearchInCurDir = false
      } else if (event.altKey && event.key === 'f') {
        event.preventDefault();
        this.showFileSearchInCurDir = true
        this.showFileSearch = false
      }
    },
    resetFileList() {
      this.updateFileList().then(() => {
        this.selectFile(this.selectedIndex)
        return Promise.resolve()
      }).then(() => {
        this.keywordForFilterFolder = ''
      })
    }
  },
  mounted() {
    window.electronAPI.fr(DEFAULT_CONFIG_DEST)
      .then(txt => {
        try {
          const path = JSON.parse(txt)['lastUsedPath']
          if (path !== undefined && path !== null) this.curPath = path
          return Promise.resolve()
        } catch (error) {
          return window.electronAPI.fw(JSON.stringify({
            text: '{}',
            dest: DEFAULT_CONFIG_DEST
          })).then(() => {
            return Promise.reject()
          })
        }
      })
      .then(() => { return this.updateFileList() })
      .then(() => { this.selectFile(this.selectedIndex) })
      .catch(e => {
        console.log(e);
      })


    window.addEventListener('keydown', this.handleKeyDown);

    window.electronAPI.onDataWithinVues((event, data) => {
      if (data.to === SPEC.vueNames.FILE_EXPLORER) {
        switch (data.from) {
          case SPEC.vueNames.SCRIPT_CREATION:
            switch (data.type) {
              case SPEC.type.FILE_SHARE:
                // update the video information from script creation
                this.curVideoInfo = data.data
                console.log(this.curVideoInfo);
                break
              default:

            }
            break
          default:

        }
      }

    });
  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.curPath !== '') {
      window.electronAPI.addRowInJsonFile(JSON.stringify({
        fieldName: 'lastUsedPath',
        fieldValue: this.curPath,
        dest: DEFAULT_CONFIG_DEST
      }))
    }
  },
  watch: {
    selectedIndex: {
      handler(newValue, oldValue) {
        // to forbide the code below running when initializing the page
        if (oldValue === undefined || oldValue === null) return
        this.selectFile(newValue)
      },
      deep: true,
      immediate: true
    },
    keywordForFilterFolder: {
      async handler(newValue, oldValue) {
        // to forbide the code below running when initializing the page
        if (oldValue === undefined || oldValue === null) return

        if (newValue !== undefined && newValue !== null && newValue.length > 0) {
          this.fileList.forEach(file => {
            file['similarity'] = similarity(file.name, this.keywordForFilterFolder)
          })
          this.fileList = this.fileList.filter(file => file.similarity > 0)
          // empty subfiles when there is no matched one at all
          if (this.fileList.length === 0) {
            this.subFilePaths = []
          }
          this.fileList.sort((f1, f2) => { return f2.similarity - f1.similarity })
          this.selectFile(0)
        } else {
          this.resetFileList()
        }
      },
      deep: true,
      immediate: true
    }
  },
  components: {
    FileSearch,
  }

};
</script>

<style scoped>
.left-side {
  width: 250px;
  height: 920px;
  border: 1px solid black;
  margin-left: 1%;
  float: left;
}

.right-side {
  width: 1200px;
  height: 920px;
  border: 1px solid black;
  margin-left: 1%;
  float: left;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  user-select: none;
}

.path-selector {
  border: 1px solid red;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.path-displayer {
  height: 800px;
  overflow: auto;
}

.file-tab {
  border-bottom: 1px dashed blue;
  user-select: none;
  transition: background-color 0.1s ease;
  /* 增加平滑过渡 */
  text-align: left;
  /* 确保文本左对齐 */
  padding-left: 30px;
  /* 添加适当的内边距以保持文本距离左边框 */
}

.file-tab:hover {
  background-color: #f0f0f0;
  /* 背景底色 */
}

.file-tab.selected {
  background-color: #d0d0d0;
  /* 选中时的背景色 */
}

.file-tab.selected:hover {
  background-color: #d0d0d0;
  /* 鼠标悬停时选中状态保持选中背景色 */
}

.pic-grid {
  width: 200px;
  height: 200px;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid red;
  margin: 0;
  /* 移除默认的margin */
  padding: 0;
  /* 移除默认的padding */
  background-color: #eee;
  position: relative;
}

.pic-grid img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  /* 保持图片比例 */
}

.number-badge {
  position: absolute;
  top: 10px;
  /* 调整为你想要的具体位置 */
  right: 10px;
  /* 调整为你想要的具体位置 */
  background-color: rgba(0, 0, 0, 0.5);
  /* 半透明背景 */
  color: white;
  width: 24px;
  /* 调整为你想要的具体大小 */
  height: 24px;
  /* 调整为你想要的具体大小 */
  border-radius: 50%;
  font-size: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}


.context-menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  list-style-type: none;
  padding: 0;
  margin: 0;
  z-index: 1000;
  text-align: left;
  min-width: 150px;
  /* 设置最小宽度 */
}

.context-menu li {
  padding: 8px 12px;
  cursor: pointer;
}

.context-menu li:hover {
  background-color: #eee;
}

.centered-overlay {
  position: fixed;
  transform: translate(-50%, -50%);
  z-index: 1000;
  /* Ensure it's above other elements */
  background-color: rgba(219, 230, 240, 0.927);
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
</style>
