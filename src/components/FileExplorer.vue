<template>
  <div class="container">
    <div class="left-side">
      <div class="path-selector" @click="change()">
        <span>{{ curPath }}</span>
        <span v-if="curPath === ''">选择文件夹</span>
      </div>
      <div class="path-displayer">
        <div v-for="(file, index) in fileList" :key="index">
          <div class="file-tab" @dblclick="diveIntoDir(index)" :class="{ selected: selectedIndex === index }"
            @click="selectFile(index)">
            <div class="file-name" :class="{ bold: file.isDir }">{{ file.name }}</div>
            <div v-if="file.len > 0">{{ file.len }}</div>
          </div>
        </div>
      </div>
      <div class="input-area">
        <input type="text" v-model="keywordForFilterFolder" ref="kwInput" placeholder="输入关键字筛选文件夹">
        <div style="height: 18px;"></div>
        <HorizontalControlBar v-if="horizontalControlBarData.show"
          @horizontalControlBarEvent="handleHorizontalControlBarEvent" :parentData="horizontalControlBarData">
        </HorizontalControlBar>
        <button @click="resetFileList" type="button">清空</button>
        <button @click="recentlyMostUsed" :class="{ 'clicked-button': horizontalControlBarData.show }">常用文件</button>
      </div>
    </div>
    <div class="right-side">
      <div class="file-viewer" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave"
        @drop.prevent="handleDrop" @wheel="handleWheel" :class="{ 'dragging': isDraggingFile }">
        <input type="file" ref="fileInput" @change="handleFileChange" style="display: none;" />
        <div v-for="(pagedFilePath, index) in pagedFilePaths" :key="pagedFilePath" class="media-container">
          <div class="media-grid-wrapper"
            :style="{ width: mediaGrid.width + 5 + 'px', height: mediaGrid.height + 5 + 'px' }">
            <span class="media-grid-span"></span>
            <MediaGrid
              :parentData="{ 'filePath': pagedFilePath, width: mediaGrid.width, height: mediaGrid.height, showButton: showFileRank }"
              @contextmenu.prevent="showContextMenu($event, index, pagedFilePath)">
              <template #number-badge>
                <div v-if="pagedFilePath.includes('.') && showFileRank" class="number-badge">{{
                  subFilePathRankMap[pagedFilePath] > 0 ?
                    subFilePathRankMap[pagedFilePath] : 0 }}
                </div>
              </template>
            </MediaGrid>
          </div>
          <div class="filename-div" ref="filenameDivs" :style="filenameDivStyle">
            {{ pagedFilePath.substring(pagedFilePath.lastIndexOf('\\') + 1) }}
          </div>
        </div>
      </div>
      <div class="operation-area">
        <Pagination :parentData="{
          'filePaths': subFilePaths, 'showFileSearch': showFileSearch,
          'keywordForSearching': paginationData.keywordForSearching,
          'filePathDived': paginationData.filePathDived,
        }" @paginationEvent="handlePaginationEvent" ref="pagination">
          <template #extra-button>
            <button @click="getFileList">fileList</button>
          </template>
        </Pagination>

      </div>
    </div>

    <!-- Context Menu element -->
    <ul v-if="contextMenu.visible" class="context-menu" ref="contextMenu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <li v-if="pagedFilePaths[contextMenu.index].includes('.')" @mouseenter="scriptOptions">发送到<span
          class="context-menu-highlight">{{
            curVideoInfo.videoName }}</span></li>
      <li @click="copyFilePath" @mouseenter="hideScriptNumMenu">复制路径</li>
      <li @click="locateFile" @mouseenter="hideScriptNumMenu">定位文件</li>
      <li @click="deleteFile" @mouseenter="hideScriptNumMenu">删除文件</li>
      <li v-if="showFileSearch || horizontalControlBarData.show"
        @click="diveIntoDirByPath(pagedFilePaths[contextMenu.index])" @mouseenter="hideScriptNumMenu">
        跳转</li>
    </ul>

    <ul v-if="scriptNumMenu.visible" class="context-menu" ref="scriptNumMenu"
      :style="{ top: scriptNumMenu.y + 'px', left: scriptNumMenu.x + 'px' }">
      <div>
        添加到:<input type="text" ref="addToInput" style="width: 50px;">行
      </div>
      <div v-for="(idx, index) in curVideoInfo.scriptIndices">
        <li @click="sendFilePath(idx)">{{ idx + 1 }}</li>
      </div>
    </ul>

    <ShrinkBox :parentData="shrinkBoxData" v-if="shrinkBoxData.show"></ShrinkBox>

    <FileSearch class="centered-overlay" v-if="showFileSearch" @fileSearchEvent="handleFileSearchEvent"
      :parentData="{ path: curPath, type: 1, total: searchResult.global }" @mousedown="startDrag"
      :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></FileSearch>

    <FileSearch class="centered-overlay" v-if="showFileSearchInCurDir" @fileSearchEvent="handleFileSearchEvent"
      :parentData="{ path: fileList[selectedIndex].path, type: 2, total: searchResult.local }" @mousedown="startDrag"
      :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></FileSearch>
    <ShortcutSetting :parentData="shortcutSettingData"></ShortcutSetting>

  </div>
</template>

<script>
import { SPEC, tableNameMap, OPERATION_TYPE, BOUNDS, DEFAULT_CONFIG_DEST, CONFIG_FIELD_NAMES } from '@/js/constants'
import { newDataWithinVues, mimeType, similarity, delay, debounce } from '@/js/functions/vue-functions'
import FileSearch from './kit/FileSearch.vue'
import ShrinkBox from './kit/ShrinkBox.vue'
import HorizontalControlBar from './kit/HorizontalControlBar.vue'
import ShortcutSetting from './kit/ShortcutSetting.vue'
import MediaGrid from './kit/MediaGrid.vue'
import Pagination from './kit/Pagination.vue'

const MEDIA_GRID = {
  WIDTH: 200,
  HEIGHT: 200,
  STEP: 10,
  STEP_BK: 10,
  MIN_STEP: 10,
  MAX_STEP: 100,
  STEP_ACC: 5,
  MIN: 50
}

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


export default {
  data() {
    return {
      curPath: '',
      fileList: [],
      selectedIndex: 0,
      forwardIndices: [],
      backwardIndices: [],
      subFilePaths: [],
      pagedFilePaths: [],
      // for showing the context menu
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        index: 0,
      },
      scriptNumMenu: {
        visible: false,
        x: 0,
        y: 0,
        index: 0,
      },
      curVideoInfo: {},
      selectedPagedFilePath: '',
      subFilePathRankMap: new Map(),
      keywordForFilterFolder: '',
      showFileSearch: false,
      showFileSearchInCurDir: false,
      showFileRank: true,

      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      componentLeft: BOUNDS.WIDTH / 2, // Initial left position
      componentTop: BOUNDS.HEIGHT / 2, // Initial top position

      isDraggingFile: false,
      dragCounter: 0,

      shrinkBoxData: {
        show: false
      },
      horizontalControlBarData: {
        show: false
      },
      mediaGrid: {
        width: MEDIA_GRID.WIDTH,
        height: MEDIA_GRID.HEIGHT,
      },
      filenameDivStyle: {},

      shortcutSettingData: {
        href: this.$route.href,
        showDialog: false
      },
      paginationData: {
      },
      searchResult: {
        global: '',
        local: ''
      },

      debounceObj: {
        timeoutId: null,
        flag: false // mark if it's necessary to debounce
      },
      lastSearchedFilenameDivs: [],
      isPageInput: false,
      /**
       * key: audio file path
       * value: corresponding canvas image path
       */
      canvasMap: {}
    }
  },
  methods: {
    deleteFile() {
      const path = this.pagedFilePaths[this.contextMenu.index]
      const idxForSub = this.subFilePaths.indexOf(path)
      const idxForPaged = this.contextMenu.index

      window.electronAPI.deleteFile(path).then(success => {
        if (success) {
          this.pagedFilePaths.splice(idxForPaged, 1)
          this.subFilePaths.splice(idxForSub, 1)
          // TODO need to delete record in DB and corresponding waveform synchronously if it's audio file. 
          this.fileList[this.selectedIndex].len--
        } else {
          alert(`${path}删除失败`)
        }
      })
    },
    /**
     * save batch files
     * @param event input event
     */
    handleFileChange(event) {
      const files = event.target.files;
      if (files.length > 0) {
        const filePromises = Array.from(files).map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                filename: file.name,
                fileData: e.target.result
              })
            }
            reader.onerror = reject
            reader.readAsArrayBuffer(file)
          })
        })

        Promise.all(filePromises)
          .then(fileObjList => {
            const curSelectedFile = this.fileList[this.selectedIndex];
            if (curSelectedFile.isDir) {
              const batchFileInfo = fileObjList.map(({ filename, fileData }) => ({
                dirPath: curSelectedFile.path,
                filename,
                fileData
              }))

              return window.electronAPI.saveFiles(batchFileInfo)
            }
            return Promise.reject('Directory is not selected.')
          })
          .then(({ savedFilePaths, failedFilePaths }) => {
            if (savedFilePaths.length === 0) {
              alert('保存失败')
            } else {
              this.subFilePaths.push(...savedFilePaths);
              this.subFilePaths = [...new Set(this.subFilePaths)].sort()
            }

            if (failedFilePaths.length > 0) {
              alert(`Failed to save some files: ${failedFilePaths.join(', ')}`)
            }
          })
          .catch(err => {
            console.error(`Error: ${err}`)
            alert('保存失败')
          });
      }
    },
    handleDragOver(event) {
      event.preventDefault()
      if (this.dragCounter === 0) {
        this.isDraggingFile = true
      }
      this.dragCounter++
    },
    handleDragLeave(event) {
      /*
        prevent this.isDraggingFile changing between true/false frequently
        if this.dragCounter doesn't increment in a while, arbitrarily assert that 
        the file is not being dragging now 
      */
      let c1, c2
      delay(30)
        .then(() => {
          c1 = this.dragCounter
          return delay(30)
        })
        .then(() => {
          c2 = this.dragCounter
          if (c1 === c2) {
            this.isDraggingFile = false
            this.dragCounter = 0
          }
        })
    },
    handleDrop(event) {
      const file = event.dataTransfer.files[0]
      if (file) {
        this.$refs.fileInput.files = event.dataTransfer.files;
        this.handleFileChange({ target: { files: event.dataTransfer.files } })
      }
      this.isDraggingFile = false
      this.dragCounter = 0
    },
    handleWheel(event) {
      if (event.ctrlKey) {
        event.preventDefault(); // Prevent default scrolling
        if (event.deltaY > 0) {
          // Scroll down
          let width = Math.max(+this.mediaGrid.width - MEDIA_GRID.STEP, MEDIA_GRID.MIN)
          let height = Math.max(+this.mediaGrid.height - MEDIA_GRID.STEP, MEDIA_GRID.MIN)
          this.mediaGrid.width = width
          this.mediaGrid.height = height
          if (MEDIA_GRID.STEP > MEDIA_GRID.MIN_STEP) MEDIA_GRID.STEP -= MEDIA_GRID.STEP_ACC

          if (width < MEDIA_GRID.WIDTH || height < MEDIA_GRID.HEIGHT) {
            console.log('000000000000');

            this.filenameDivStyle = {
              'overflow': 'hidden',
              'white-space': 'nowrap',
              'text-overflow': 'ellipsis',
              width: this.mediaGrid.width + 'px'
            }
            this.showFileRank = false
          } else {
            this.filenameDivStyle = {
              width: this.mediaGrid.width + 'px'
            }
          }
        } else {
          // Scroll up
          let width = +this.mediaGrid.width + MEDIA_GRID.STEP
          let height = +this.mediaGrid.height + MEDIA_GRID.STEP
          this.mediaGrid.width = width
          this.mediaGrid.height = height
          MEDIA_GRID.STEP += MEDIA_GRID.STEP_ACC
          if (width >= MEDIA_GRID.WIDTH || height >= MEDIA_GRID.HEIGHT) {
            this.filenameDivStyle = {
              width: this.mediaGrid.width + 'px'
            }
            this.showFileRank = true
          }
        }
        // console.log(`step: ${PIC_GRID.STEP}`);

      }
    },
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
      const { purpose, data, type } = info
      switch (purpose) {
        case 'closeFileSearch':
          if (type === 1) {
            this.showFileSearch = data
            this.updateFileList().then(() => {
              this.selectFile(this.selectedIndex)
            })
          } else if (type === 2) {
            this.showFileSearchInCurDir = data
            this.selectFile(this.selectedIndex)
          }
          // remove the yellow background color for marking after the file is located
          this.lastSearchedFilenameDivs.forEach(div => {
            let txt = div.textContent
            let innerHTML = `<span>${txt}</span>`
            div.innerHTML = innerHTML
          })

          this.searchResult.global = ''
          this.searchResult.local = ''
          // for resetting the curPageIndex of Pagination to original
          this.paginationData['keywordForSearching'] = ''
          break
        case 'updateSubFilePaths':
          const { regexMode, keyword } = info
          this.subFilePaths = data

          this.$nextTick(() => {
            const divs = []
            this.$refs.filenameDivs.forEach(div => divs.push(div))
            this.lastSearchedFilenameDivs = divs
            // mark out the parts that match the keyword
            if (regexMode) {
              divs.forEach(div => {
                let txt = div.textContent
                let innerHTML = txt.replace(new RegExp(keyword, 'gi'), match => `<span style="background-color: yellow;">${match}</span>`);
                div.innerHTML = innerHTML
              })
            } else {
              divs.forEach(div => {
                let txt = div.textContent
                let innerHTML = txt.replace(keyword, `<span style="background-color: yellow;">${keyword}</span>`)
                div.innerHTML = innerHTML
              })
            }
          })
          if (type === 1) {
            // reset only when global search
            this.fileList = []
            this.searchResult.global = data.length
          } else if (type === 2) {
            this.searchResult.local = data.length
          }
          this.updateSubFilePathRankMap()

          // for resetting the curPageIndex of Pagination to 1
          this.paginationData['keywordForSearching'] = keyword
          break
        case 'resetFileList':
          this.searchResult.global = ''
          this.searchResult.local = ''
          if (type === 1) {
            this.resetFileList()
          } else if (type === 2) {
            this.selectFile(this.selectedIndex)
          }
          // remove the yellow background color for marking after the file is located
          this.lastSearchedFilenameDivs.forEach(div => {
            let txt = div.textContent
            let innerHTML = `<span>${txt}</span>`
            div.innerHTML = innerHTML
          })
          break
      }
    },
    handlePaginationEvent(info) {
      const { purpose, data } = info
      switch (purpose) {
        case 'updatePagedFilePaths':
          this.pagedFilePaths = data
          break
        case 'pageInputToggle':
          this.isPageInput = data
          console.log(data);

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
      const path = this.pagedFilePaths[this.contextMenu.index]
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
      const path = this.pagedFilePaths[this.contextMenu.index]
      // console.log('path======>', path);
      window.electronAPI.locateFileInOs(path)
    },
    hideScriptNumMenu() {
      this.scriptNumMenu.visible = false;
      this.scriptNumMenu.index = 0;
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
          filePath: this.selectedPagedFilePath
        }
      )

      window.electronAPI.updateDataWithinVues(data)
    },
    scriptOptions() {
      this.scriptNumMenu.visible = true
      const container = document.documentElement
      const containerWidth = container.clientWidth;

      this.$nextTick(() => {
        const contextMenuElement = this.$refs.contextMenu;
        const scriptMenuElement = this.$refs.scriptNumMenu;
        if (contextMenuElement) {
          const contextMenuWidth = contextMenuElement.offsetWidth;
          const scriptMenuWidth = scriptMenuElement.offsetWidth;
          // if it exceed the boundary, show it on the contrary direction
          if (this.contextMenu.x + contextMenuWidth + scriptMenuWidth > containerWidth) {
            this.scriptNumMenu.x = this.contextMenu.x - scriptMenuWidth
          } else {
            this.scriptNumMenu.x = this.contextMenu.x + contextMenuWidth
          }
          this.scriptNumMenu.y = this.contextMenu.y;
        }

        // focus on the input automatically
        const addToInput = this.$refs.addToInput;
        if (addToInput) {
          addToInput.focus();
          addToInput.addEventListener('keydown', (event) => { this.handleKeyDown(event) }, { once: true });
        }
      });

      document.addEventListener('click', this.hideScriptNumMenu);
    },
    showContextMenu(event, index, pagedFilePath) {
      const container = document.documentElement
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      this.scriptNumMenu.visible = false
      this.contextMenu.visible = true;
      this.contextMenu.x = event.clientX;
      this.contextMenu.y = event.clientY;
      this.contextMenu.index = index;
      document.addEventListener('click', this.hideContextMenu);

      // Get context menu dimensions after making it visible
      this.$nextTick(() => {
        const menu = this.$refs.contextMenu;

        if (menu) {
          const menuWidth = menu.offsetWidth;
          const menuHeight = menu.offsetHeight;

          // Check if the menu exceeds the right boundary
          if (this.contextMenu.x + menuWidth > containerWidth) {
            this.contextMenu.x -= menuWidth;
          }
          // Check if the menu exceeds the bottom boundary
          if (this.contextMenu.y + menuHeight > containerHeight) {
            this.contextMenu.y -= menuHeight;
          }

          document.addEventListener('click', this.hideContextMenu);
        }
      });

      // console.log('index------', index);
      this.selectedPagedFilePath = pagedFilePath
    },
    hideContextMenu() {
      this.contextMenu.visible = false;
      this.contextMenu.index = 0;
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
      // console.log(JSON.stringify(this.curPath));
      // console.log(this.subFilePaths);
      // console.log(this.fileList[this.selectedIndex]);
      // console.log(this.$route.href);

      this.shortcutSettingData.showDialog = !this.shortcutSettingData.showDialog
      // let spans = this.$el.querySelectorAll('.media-grid-span')
      // console.log(spans);
      console.log(this.selectedIndex);

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
          return window.electronAPI.addRowsInJsonFile(JSON.stringify({
            rows: [
              {
                fieldName: CONFIG_FIELD_NAMES.LAST_PICKED_PATH,
                fieldValue: path,
              }
            ],
            dest: DEFAULT_CONFIG_DEST
          }))
        })
        .then(() => {
          this.selectFile(0)
        })
        .catch(e => { console.log(e); })
    },
    selectFile(index) {
      this.selectedIndex = index
      this.horizontalControlBarData.show = false
      return this.updateWhenFolderChanged(index)
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
        .then(() => {
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
    // throttle the requests or using a concurrency limit
    async getFileInfosInBatch(filePaths) {
      return Promise.all(filePaths.map(async (filePath) => {
        const len = (await window.electronAPI.subfilePathsInDir(filePath)).length
        return {
          path: filePath,
          isDir: len > 0,
          len: len
        };
      }));
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
      const fileInfos = await this.getFileInfosInBatch(filePaths)
      for (const fileInfo of fileInfos) {
        fileInfo['name'] = fileInfo.path.substring(fileInfo.path.lastIndexOf('\\') + 1)
        this.fileList.push(fileInfo)
      }

      await this.updateWhenFolderChanged(this.selectedIndex)
    },
    async diveIntoDirByPath(path, shrink = true) {
      // const path = this.pagedFilePaths[this.contextMenu.index]
      const parentDir = path.substring(0, path.lastIndexOf('\\'))
      const grandDir = parentDir.substring(0, parentDir.lastIndexOf('\\'))
      const filePaths = await window.electronAPI.subfilePathsInDir(grandDir)
      this.fileList = []
      const fileInfos = await this.getFileInfosInBatch(filePaths);
      for (let i = 0; i < fileInfos.length; i++) {
        let fileInfo = fileInfos[i]
        fileInfo['name'] = fileInfo.path.substring(fileInfo.path.lastIndexOf('\\') + 1)
        this.fileList.push(fileInfo)
        if (fileInfo.path === parentDir) {
          this.selectedIndex = i
        }
      }

      await this.updateWhenFolderChanged(this.selectedIndex)
      this.curPath = grandDir
      this.showFileSearch = false
      this.horizontalControlBarData.show = false

      const data = newDataWithinVues(SPEC.vueNames.FILE_EXPLORER,
        SPEC.vueNames.PAGINATION, SPEC.type.PARENT_TO_CHILD,
        path
      )
      window.electronAPI.updateDataWithinVues(data).then((pagedFilePaths) => {
        // this.pagedFilePaths = [...pagedFilePaths]
        let idx = this.pagedFilePaths.indexOf(path)
        let span = this.$el.querySelectorAll('.media-grid-span')[idx]
        if (span === undefined || span === null) return
        const selectedElement = span.parentElement
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
          selectedElement.classList.add('media-grid-selected')
          delay(6000).then(() => {
            selectedElement.classList.remove('media-grid-selected')
          })

          if (shrink) {
            this.shrinkBoxData.show = true
            const targetRect = selectedElement.getBoundingClientRect();
            // define the position of end of the animation
            this.shrinkBoxData['finalWidth'] = targetRect.width
            this.shrinkBoxData['finalHeight'] = targetRect.height
            this.shrinkBoxData['finalTop'] = targetRect.top + window.scrollY
            this.shrinkBoxData['finalLeft'] = targetRect.left + window.scrollX
            this.shrinkBoxData['bkColorRgba'] = `rgba(119, 117, 117, 0.516)`
          }
          // time unit: second
          this.shrinkBoxData['aliveTime'] = 0.4
          console.log(this.shrinkBoxData);

          delay(this.shrinkBoxData['aliveTime'] * 1000).then(() => {
            this.shrinkBoxData.show = false
          })

          // remove the yellow background color for marking after the file is located
          this.lastSearchedFilenameDivs.forEach(div => {
            let txt = div.textContent
            let innerHTML = `<span>${txt}</span>`
            div.innerHTML = innerHTML
          })
        }
      })
    },

    async updateFileList() {
      const filePaths = await window.electronAPI.subfilePathsInDir(this.curPath)
      // reset fileList
      this.fileList = []
      const fileInfos = await this.getFileInfosInBatch(filePaths)
      for (const fileInfo of fileInfos) {
        fileInfo['name'] = fileInfo.path.substring(fileInfo.path.lastIndexOf('\\') + 1)
        this.fileList.push(fileInfo)
      }
    },
    /**
     * update subfiles real time when folder is changed
     * @param index index where current folder locates in the directory
     * @returns all subFilePaths under the folder specified by index
     */
    updateWhenFolderChanged(index) {
      try {
        const path = this.fileList[index].path
        return window.electronAPI.subfilePathsInDir(path)
          .then(subFilePaths => {
            this.subFilePaths = subFilePaths

            // Ensure DOM is updated before scrolling
            this.$nextTick(() => {
              // scroll selected element smoothly only when it's visible, otherwise scroll hastely
              const selectedElement = this.$el.querySelector('.file-tab.selected');
              const container = this.$el.querySelector('.path-displayer');
              const containerRect = container.getBoundingClientRect();
              const selectedElementRect = selectedElement.getBoundingClientRect();
              const isVisible = (
                selectedElementRect.top < containerRect.bottom &&
                selectedElementRect.bottom > containerRect.top
              );

              if (selectedElement) {
                if (isVisible) {
                  selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                  selectedElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
              }
            })
            return subFilePaths
          })
          .then((res) => {
            this.updateSubFilePathRankMap()
            return res
          })
      } catch (error) {
        console.log('there is an error when page changed:', JSON.stringify(error));
      }
    },
    handleKeyDown(event) {
      // console.log(`按下的键: ${event.key}`);
      let inputting = this.$refs.kwInput === document.activeElement ||
        this.showFileSearch || this.showFileSearchInCurDir || this.isPageInput

      if ((event.key === 'w' || event.key === 'W') && !inputting) {
        this.debounceObj.flag = true
        if (this.selectedIndex > 0) this.selectedIndex--;
        this.forwardIndices = []
      } else if ((event.key === 's' || event.key === 'S') && !inputting) {
        this.debounceObj.flag = true
        if (this.selectedIndex < this.fileList.length - 1) this.selectedIndex++;
        this.forwardIndices = []
      } else if ((event.key === 'a' || event.key === 'A') && !inputting) {
        this.backToParentPath();
      } else if ((event.key === 'd' || event.key === 'D') && !inputting) {
        if (this.fileList.length) { // avoid the exception once app mounted
          this.diveIntoDir(this.selectedIndex);
        }
      } else if (event.altKey && event.key === 'e') {
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
        this.showFileSearch = !this.showFileSearch
        this.searchResult.global = ''
        this.showFileSearchInCurDir = false
      } else if (event.altKey && event.key === 'f') {
        event.preventDefault();
        if (this.fileList[this.selectedIndex].isDir) {
          this.showFileSearchInCurDir = !this.showFileSearchInCurDir
          this.showFileSearch = false
        }
        this.searchResult.local = ''
      } else if (event.ctrlKey && event.key === '0') {
        this.mediaGrid.width = MEDIA_GRID.WIDTH
        this.mediaGrid.height = MEDIA_GRID.HEIGHT
        MEDIA_GRID.STEP = MEDIA_GRID.STEP_BK
        this.filenameDivStyle = {
          width: this.mediaGrid.width + 'px'
        }
        this.showFileRank = true
      } else if (event.key === 'Escape' && this.$refs.kwInput === document.activeElement) {
        this.resetFileList()
        this.$refs.kwInput.blur()
      }
    },
    handleKeyUP(event) {
      // console.log(`松开的键: ${event.key}`);
    },
    resetFileList() {
      this.updateFileList()
        .then(() => {
          return this.selectFile(this.selectedIndex)
        })
        .then(() => {
          const data = newDataWithinVues(SPEC.vueNames.FILE_EXPLORER,
            SPEC.vueNames.PAGINATION, SPEC.type.REFRESH_PAGED_FILE_PATHS,
            ''
          )
          return window.electronAPI.updateDataWithinVues(data)
        })
      this.keywordForFilterFolder = ''
    },
    handleHorizontalControlBarEvent(info) {
      const { freq } = info
      this.subFilePaths = this.horizontalControlBarData.fileRanks.filter(fileRank => fileRank.freq >= freq).map(({ filePath }) => filePath)
    },
    recentlyMostUsed() {
      if (this.horizontalControlBarData.show) {
        this.selectFile(this.selectedIndex)
        return
      }
      const info = {
        tableName: tableNameMap.fileRank,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_FREQ',
        data: 1
      }
      window.electronAPI.executeSql(JSON.stringify(info)).then(fileRanks => {
        this.subFilePathRankMap = new Map()
        for (const fileRank of fileRanks) {
          this.subFilePathRankMap[fileRank.filePath] = fileRank.freq
        }
        fileRanks.sort((f1, f2) => f2.freq - f1.freq)
        this.subFilePaths = [...fileRanks.map(({ filePath }) => filePath)]
        return fileRanks
      }).then(fileRanks => {
        this.horizontalControlBarData.show = true
        const freqList = fileRanks.map(({ freq }) => freq)
        let maxFreq = Math.max(...freqList)
        let minFreq = Math.min(...freqList)
        if (freqList.length === 0) {
          maxFreq = 0
          minFreq = 0
        }

        this.horizontalControlBarData['fileRanks'] = fileRanks
        this.horizontalControlBarData['maxFreq'] = maxFreq
        this.horizontalControlBarData['minFreq'] = minFreq
        this.horizontalControlBarData['minVolume'] = maxFreq ? minFreq / maxFreq * 100 : 0
      })
    },
  },
  mounted() {
    window.electronAPI.fr(DEFAULT_CONFIG_DEST)
      .then(txt => {
        try {
          const path = JSON.parse(txt)['lastUsedPath']
          const lastSelectedIndex = JSON.parse(txt)['lastSelectedIndex']
          if (path !== undefined && path !== null) this.curPath = path
          if (lastSelectedIndex !== undefined && lastSelectedIndex !== null) this.selectedIndex = lastSelectedIndex
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


    window.addEventListener('keydown', (event) => { this.handleKeyDown(event) })
    window.addEventListener('keyup', (event) => { this.handleKeyUP(event) })

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
          case SPEC.vueNames.SITE_BROWSER:
            switch (data.type) {
              case SPEC.type.PASS_MEDIA_INFO_TO_MAIN_PROCESS:
                const { filename, suffix } = data.data
                const mediaData = {
                  'filename': filename,
                  'suffix': suffix,
                  'dirPath': this.fileList[this.selectedIndex].path
                }
                window.electronAPI.sendDataToMainProcess(mediaData)
            }

          default:

        }
      }
    })

    window.electronAPI.onDataFromMainProcess((event, info) => {
      const { purpose, data } = info
      switch (purpose) {
        case 'storageInform':
          // this.selectFile(this.selectedIndex)
          this.diveIntoDirByPath(data, false)
          break
      }
    })

    /*
    handle the situation when window is close directly, at this time,
    unmounted() won't be called as usual, so it's necessary to handle via ipc
    */
    window.electronAPI.onUnmountComponents((event, data) => {
      if (this.curPath !== '') {
        const info = {
          rows: [
            {
              fieldName: CONFIG_FIELD_NAMES.LAST_USED_PATH,
              fieldValue: this.curPath,
            },
            {
              fieldName: CONFIG_FIELD_NAMES.LAST_SELECTED_INDEX,
              fieldValue: this.selectedIndex,
            }
          ],
          dest: DEFAULT_CONFIG_DEST
        }
        window.electronAPI.addRowsInJsonFile(JSON.stringify(info)).then(added => {
          if (added) {
            window.electronAPI.unmountComponents()
          }
        })
      }
    })

  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUP)
    if (this.curPath !== '') {
      const info = {
        rows: [
          {
            fieldName: CONFIG_FIELD_NAMES.LAST_USED_PATH,
            fieldValue: this.curPath,
          },
          {
            fieldName: CONFIG_FIELD_NAMES.LAST_SELECTED_INDEX,
            fieldValue: this.selectedIndex,
          }
        ],
        dest: DEFAULT_CONFIG_DEST
      }
      window.electronAPI.addRowsInJsonFile(JSON.stringify(info))
    }
  },
  watch: {
    selectedIndex: {
      handler(newValue, oldValue) {
        // to forbide the code below running when initializing the page
        if (oldValue === undefined || oldValue === null) return
        if (this.debounceObj.flag) {
          debounce(this.debounceObj, () => {
            this.selectFile(newValue)
            this.debounceObj.flag = false
          }, 50)
        } else {
          this.selectFile(newValue)
        }
      },
      // deep: true,
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
          console.log('rerere');

          this.resetFileList()
        }
      },
      deep: true,
      immediate: true
    }
  },
  components: {
    FileSearch,
    ShrinkBox,
    HorizontalControlBar,
    ShortcutSetting,
    MediaGrid,
    Pagination

  }

};
</script>

<style scoped>
.container {
  /* background-color: #e0e0e0;  */
  height: 1080px;
  /* box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);  */
  display: flex;
  gap: 20px;
}

.left-side {
  width: 250px;
  height: 100%;
  border: 1px solid #bbb;
  border-radius: 8px;
  padding: 20px;
  background-color: #f0f0f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-left: 1.5%;
}

.right-side {
  flex-grow: 1;
  height: 100%;
  border: 1px solid #bbb;
  border-radius: 8px;
  padding: 20px;
  background-color: #f0f0f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-viewer {
  width: 100%;
  flex-grow: 1;
  border: 1px solid #bbb;
  border-radius: 8px;
  box-sizing: border-box;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background-color: #e0e0e0;
}

.file-viewer.dragging {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border-color: #aaa;
  background-color: #d0d0d0;
}

.operation-area {
  height: auto;
  border: 1px solid #bbb;
  border-radius: 8px;
  padding: 10px;
  background-color: #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.path-selector {
  border: 1px solid #bbb;
  border-radius: 8px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ccc;
  color: #333;
  cursor: pointer;
  transition: background-color 0.3s;
}

.path-selector:hover {
  background-color: #bbb;
}

.path-displayer {
  flex-grow: 1;
  overflow: auto;
  border: 1px solid #bbb;
  border-radius: 8px;
  padding: 10px;
  background-color: #f5f5f5;
  color: #333;
  width: 230px;
}

.file-tabs-wrapper {
  overflow-y: auto;
  height: 100%;
}

.file-tab {
  border-bottom: 1px dashed #ddd;
  user-select: none;
  transition: background-color 0.1s ease;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: #333;
}

.file-tab:hover {
  background-color: #e0e0e0;
}

.file-tab.selected {
  background-color: #d0d0d0;
}

.file-tab.selected:hover {
  background-color: #d0d0d0;
}

.file-name {
  width: 50%;
}

.file-name.bold {
  font-weight: bold;
}

.input-area {
  gap: 10px;
  margin-top: 10px;
}

.input-area input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #bbb;
  /* Lighter border */
  border-radius: 8px;
  background-color: #e0e0e0;
  /* Lighter gray background */
  color: #333;
  /* Darker text for contrast */
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  /* Subtle inset shadow */
}

.input-area button {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background-color: #3182ce;
  /* Primary button color */
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 50%;
}

.input-area button:hover {
  background-color: #2c5282;
  /* Darker button color on hover */
}

.media-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.media-grid-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #bbb;
  /* Lighter border */
  border-radius: 8px;
  box-sizing: border-box;
  background-color: #f0f0f0;
  /* Light gray background */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  /* Subtle shadow */
  transition: box-shadow 0.3s ease-in-out;
}

.media-grid-wrapper:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  /* Slightly more noticeable shadow on hover */
}

.filename-div {
  width: 200px;
  text-align: center;
  font-size: 14px;
  color: #333;
  user-select: none;
}

.number-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #3182ce;
  /* Badge color */
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.context-menu {
  position: absolute;
  background-color: #f0f0f0;
  /* Light gray background */
  border: 1px solid #bbb;
  /* Lighter border */
  box-sizing: border-box;
  list-style-type: none;
  padding: 0;
  margin: 0;
  z-index: 1000;
  text-align: left;
  min-width: 150px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  /* Subtle shadow */
  border-radius: 8px;
  overflow: hidden;
}

.context-menu li {
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.3s;
  color: #333;
  /* Darker text for contrast */
}

.context-menu li:hover {
  background-color: #e0e0e0;
  /* Light gray background on hover */
}

.context-menu-highlight {
  color: #3182ce;
  /* Highlight color */
  font-family: '黑体', sans-serif;
}

.centered-overlay {
  position: fixed;
  height: auto;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background-color: rgba(240, 240, 240, 0.95);
  /* Lighter overlay background */
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  /* Subtle shadow */
  border-radius: 10px;
}

.clicked-button {
  background-color: #e0e0e0;
  /* Lighter button background */
}

@keyframes borderPulse {
  0% {
    border-color: #3b3c36;
    box-shadow: 0 0 0 0 rgba(59, 60, 54, 0.7);
  }

  50% {
    border-color: transparent;
    box-shadow: 0 0 20px 10px rgba(59, 60, 54, 0.7);
  }

  100% {
    border-color: #3b3c36;
    box-shadow: 0 0 0 0 rgba(59, 60, 54, 0.7);
  }
}

.media-grid-selected {
  animation: borderPulse 3s infinite;
  border: 2px solid #3b3c36;
  box-sizing: border-box;
  transition: border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
  z-index: 10;
  /* Ensure it’s on top */
}
</style>
