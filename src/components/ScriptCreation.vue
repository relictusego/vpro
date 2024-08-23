  <template>
    <div class="container">
      <h1 class="video-title">视频：{{ videoName }}</h1>
      <div class="titles-container">
        <div v-for="(title, index) in titles" :key="index" class="title">
          {{ title }}
        </div>
      </div>
      <div class="scroll-container" ref="scrollContainer">
        <!-- <div class="clearfix"></div> -->
        <div v-for="(script, index) in scripts" :key="script" class="script-item">
          <div class="general editable-container">
            <div class="editable-content" contenteditable="true" v-text="script.outline" @blur="update(script, index)">
            </div>
          </div>
          <div class="general editable-container">
            <div class="editable-content" contenteditable="true" v-text="script.storyBoard"
              @blur="update(script, index)"></div>
          </div>
          <div class="general media-container" @dblclick="change(index)"
            @mouseover="showTooltip($event, script.filePath)" @mouseleave="hideTooltip" @mousemove="moveTooltip($event)"
            @contextmenu.prevent="showContextMenu($event, index)">
            <span v-if="!script.filePath" class="add-file-prompt">双击添加文件</span>
            <MediaGrid :parentData="{ 'filePath': script.filePath, width: 200, height: 200, showButton: true }" v-else>
            </MediaGrid>
            <input type="file" style="display: none;" ref="fileInput" @change="handleFileChange($event, index)">
          </div>
          <div class="general editable-container">
            <div class="editable-content" contenteditable="true" v-text="script.subtitle" @blur="update(script, index)">
            </div>
          </div>
          <div class="general editable-container">
            <div class="editable-content" contenteditable="true" v-text="script.comment" @blur="update(script, index)">
            </div>
          </div>
          <div class="general editable-container">
            <div class="readonly-content" v-text="script.createdTime"></div>
          </div>
          <div class="general editable-container">
            <div class="readonly-content" v-text="script.modifiedTime"></div>
          </div>
          <div class="script-menu-bar-container">
            <div class="script-menu">
              <span class="script-index">{{ index + 1 }}</span>
              <a href="#" class="script-action" @click.prevent="delScript(index)">删除</a>
              <a href="#" class="script-action" @click.prevent="upScript(index)">上移</a>
              <a href="#" class="script-action" @click.prevent="downScript(index)">下移</a>
            </div>
          </div>
        </div>
        <div class="clearfix"></div>
      </div>
      <!-- Tooltip element -->
      <span v-if="tooltip.visible && tooltip.text" class="tooltip"
        :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
        {{ tooltip.text }}
      </span>
      <!-- Context Menu element -->
      <ul v-if="contextMenu.visible" class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <li @click="copyFilePath">复制路径</li>
        <li @click="locateFile">定位文件</li>
        <li @click="removeFile">移除文件</li>
        <li @click="insertRow(0)">往上添行</li>
        <li @click="insertRow(1)">往下添行</li>
      </ul>
      <div>
        <button @click="openFileExplorer">文件浏览</button>
        <button @click="scrollToTop">顶部</button>
        <button @click="scrollToBottom">底部</button>
        <button @click="save">保存</button>
        <button @click="appendRow">新增</button>
        <button @click="test">test</button>
        <!-- <input type="text" style="width: 70px;" placeholder="关键字搜索"
          @blur="keywordSearch(infoForKeywordSearching.keyword)" v-model="infoForKeywordSearching.keyword"> -->
        <!-- <button @click="nextTextArea(-1)">⇑</button> -->
        <!-- <button @click="nextTextArea(1)">⇓</button> -->
        <button @click="nextStep(-1)">撤销</button>
        <button @click="nextStep(1)">恢复</button>
      </div>

      <TextSearch v-if="showTextSearch" :parentData="textSearchData" @mousedown="startDrag"
        @textSearchEvent="handleTextSearchEvent" class="centered-overlay"
        :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></TextSearch>
    </div>
  </template>

<script>
import { DEFAULT_ROW_NUM, TITLES, SPEC, tableNameMap, OPERATION_TYPE, TRANSACTIONS, BOUNDS, ROUTER_HREF } from '@/js/constants'
import { newDataWithinVues, mimeType, delay } from '@/js/functions/vue-functions'
import TextSearch from './kit/TextSearch.vue'
import MediaGrid from './kit/MediaGrid.vue'

const SCRIPT_NUM_IN_ROW = 7

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function Script(outline, storyBoard, filePath, subtitle, comment, createdTime, modifiedTime) {
  this.outline = outline || '';
  this.storyBoard = storyBoard || '';
  this.filePath = filePath || '';
  this.subtitle = subtitle || '';
  this.comment = comment || '';
  this.createdTime = formatDate(new Date())
  this.modifiedTime = modifiedTime || '';
  this.showProgressBar = false;
  this.progress = 0;
}

export default {
  name: 'ScriptCreation',
  data() {
    return {
      titles: TITLES,
      scripts: [],
      scriptsBk: [],
      scriptsBkIdInDB: 1,
      // for showing the file path around the cursor dynamically
      tooltip: {
        visible: false,
        text: '',
        x: 0,
        y: 0
      },
      // for showing the context menu
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        index: null,
      },
      infoForKeywordSearching: {
        keyword: '',
        matchedTextAreas: [],
        matchedTextAreaIndex: 0,
        lastMatchedTextEl: {}
      },
      videoName: '',
      showProgressBar: false,
      progress: 0,

      showTextSearch: false,
      textSearchData: {},
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
    handleTextSearchEvent(info) {
      const { purpose, data } = info
      switch (purpose) {
        case 'close':
          this.showTextSearch = false
          // remove the selected style when exit search mode
          this.keywordSearch('')
          this.infoForKeywordSearching.lastMatchedTextEl.style.backgroundColor = '#e8f4fc'
          break
        case 'keywordSearch':
          this.keywordSearch(data)
          break
        case 'nextTextArea':
          this.nextTextArea(data)
          break
      }
    },
    async test() {
      // console.log(this.getVisibleScriptRowIndices());
      // console.log(newDataWithinVues('you', 'me', 'msg', [1, 2]));
      // console.log(JSON.stringify(this.infoForKeywordSearching));
      // console.log(await window.electronAPI.getCurrentWindowBounds());
      // console.log(this.scripts);
      console.log(this.$route.href);
      // const media = this.$refs['videoMedia_' + 4];
      // if (media) {
      //   console.log(media[0]);
      //   const newTime = 0.5 * media[0].duration;
      //   console.log(newTime);
      //   media[0].currentTime = newTime;
      // }

    },
    updateProgress(index) {
      const videoMedia = this.$refs[`videoMedia_${index}`] ? this.$refs[`videoMedia_${index}`][0] : null
      const audioMedia = this.$refs[`audioMedia_${index}`] ? this.$refs[`audioMedia_${index}`][0] : null
      const media = videoMedia || audioMedia

      if (media) {
        this.scripts[index].progress = ((media.currentTime / media.duration) * 100).toFixed(2);
        console.log(`this.progress=${this.progress}`);
      }
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
    nextStep(step) {
      const info = {
        tableName: tableNameMap.scriptBk,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_NO',
        data: +this.scriptsBkIdInDB + step
      }
      window.electronAPI.executeSql(JSON.stringify(info)).then(nextScriptsInfo => {
        console.log(nextScriptsInfo);
        if (nextScriptsInfo !== null && nextScriptsInfo !== undefined) {
          this.scriptsBkIdInDB += step
          this.scripts = JSON.parse(nextScriptsInfo.txt)
          this.scriptsBk = JSON.parse(nextScriptsInfo.txt)
        }
      })
    },
    update(script, index) {
      script.modifiedTime = formatDate(new Date())
      // compare script in this.scripts with the one in backup
      const fieldsToBeCompared = ['outline', 'storyBoard', 'filePath', 'subtitle', 'comment']
      for (const field of fieldsToBeCompared) {
        if (script[field] !== this.scriptsBk[index][field]) {
          // alert(script[field] + '|' + this.scriptsBk[index][field])
          this.scriptsBk[index][field] = script[field]
          this.updateScriptBkAndScriptsBkIdInDB()
          return
        }
      }
    },
    updateScriptBkAndScriptsBkIdInDB() {
      const transactionInfo = {
        method: TRANSACTIONS.INSERT_SCRIPT_BK_AFTER_DELETION,
        args: [{
          no: this.scriptsBkIdInDB,
          txt: JSON.stringify(this.scriptsBk),
        }]
      }
      // console.log(`transactionInfo=${JSON.stringify(transactionInfo)}`);
      return window.electronAPI.transact(JSON.stringify(transactionInfo))
        .then(() => {
          const countInfo = {
            tableName: tableNameMap.scriptBk,
            operation: OPERATION_TYPE.SELECTION,
            funcName: 'COUNT',
            data: null
          }
          return window.electronAPI.executeSql(JSON.stringify(countInfo))
        })
        .then(scriptsBkIdInDB => {
          this.scriptsBkIdInDB = scriptsBkIdInDB
        }).catch(error => {
          console.error('INSERT_SCRIPT_BK_AFTER_DELETION execution failed', error);

        })
    },
    nextTextArea(step) {
      this.jumpToTextArea(this.infoForKeywordSearching.matchedTextAreaIndex + step)
    },
    jumpToTextArea(index) {
      let len = this.infoForKeywordSearching.matchedTextAreas.length
      if (index >= len) index -= len
      else if (index < 0) index += len
      // console.log('Scrolling to:', this.infoForKeywordSearching.matchedTextAreas[index]);
      const matched = this.infoForKeywordSearching.matchedTextAreas[index];
      matched.style.backgroundColor = 'rgba(189, 252, 201, 1)'
      matched.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
      this.infoForKeywordSearching.lastMatchedTextEl.style.backgroundColor = '#e8f4fc'
      this.infoForKeywordSearching.lastMatchedTextEl = matched

      this.infoForKeywordSearching.matchedTextAreaIndex = index
      this.textSearchData['curNo'] = index + 1
    },
    keywordSearch(keyword) {
      // 在这里添加代码，将屏幕的焦点移动到this.infoForKeywordSearching.matchedTextAreas的第一个元素
      // Scroll to the first matched textarea if any
      this.$nextTick(() => {
        const container = this.$refs.scrollContainer;
        const items = container.querySelectorAll('.editable-content');

        // reset every time to search
        this.infoForKeywordSearching.matchedTextAreas = []
        // iterator
        items.forEach(textEl => {
          if (keyword !== '' && textEl.innerText.indexOf(keyword) >= 0) {
            textEl.style.backgroundColor = '#e8f4fc'
            this.infoForKeywordSearching.matchedTextAreas.push(textEl)
          } else {
            // reset
            textEl.style.backgroundColor = '';
          }
        });
        this.textSearchData['total'] = this.infoForKeywordSearching.matchedTextAreas.length
        if (this.textSearchData['total'] > 0) {
          this.textSearchData['curNo'] = 1
        } else {
          this.textSearchData['curNo'] = 0
        }
        if (this.infoForKeywordSearching.matchedTextAreas.length > 0) {
          const firstMatch = this.infoForKeywordSearching.matchedTextAreas[0];
          firstMatch.style.backgroundColor = 'rgba(189, 252, 201, 1)'
          firstMatch.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
          this.infoForKeywordSearching.lastMatchedTextEl = firstMatch
        }
      });
    },
    openFileExplorer() {
      window.electronAPI.getCurrentWindowBounds().then(bounds => {
        const windowInfo = {
          'href': ROUTER_HREF.FileExplorer,
          'bounds': { 'x': bounds.x, 'y': bounds.y }
        }
        window.electronAPI.openNewWindow(JSON.stringify(windowInfo));
        delay(500).then(() => {
          const data = newDataWithinVues(SPEC.vueNames.SCRIPT_CREATION,
            SPEC.vueNames.FILE_EXPLORER, SPEC.type.FILE_SHARE,
            {
              videoName: this.videoName,
              scriptIndices: this.getVisibleScriptRowIndices(),
              len: this.scripts.length
            }
          )
          window.electronAPI.updateDataWithinVues(data);
        })
      })
    },
    getVisibleScriptRowIndices() {
      const container = this.$refs.scrollContainer;
      const containerRect = container.getBoundingClientRect();

      const items = container.querySelectorAll('.general');

      const visibleScriptRowIndices = [];

      items.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();

        const isVisible = (
          itemRect.top < containerRect.bottom &&
          itemRect.bottom > containerRect.top
        );

        if (isVisible) {
          const idx = Math.floor((index / SCRIPT_NUM_IN_ROW))
          if (visibleScriptRowIndices.indexOf(idx) < 0) visibleScriptRowIndices.push(idx)
        }
      });

      return visibleScriptRowIndices;
    },
    delScript(index) {
      this.scripts.splice(index, 1)
      this.scriptsBk = JSON.parse(JSON.stringify(this.scripts))
      this.updateScriptBkAndScriptsBkIdInDB()
    },
    upScript(index) {
      if (0 == index) return
      let up = this.scripts[index - 1]
      this.scripts[index - 1] = this.scripts[index]
      this.scripts[index] = up
    },
    downScript(index) {
      if (this.scripts.length - 1 == index) return
      let down = this.scripts[index + 1]
      this.scripts[index + 1] = this.scripts[index]
      this.scripts[index] = down
    },
    showTooltip(event, path) {
      this.tooltip.visible = true;
      this.tooltip.text = path;
      this.moveTooltip(event);
    },
    moveTooltip(event) {
      this.tooltip.x = event.clientX + 10; // 10px offset for better positioning
      this.tooltip.y = event.clientY + 10;
    },
    hideTooltip() {
      this.tooltip.visible = false;
    },
    change(index) {
      // Trigger file input programmatically
      const fileInput = this.$refs.fileInput[index];
      if (fileInput) {
        fileInput.click();
      }
    },
    handleFileChange(event, index) {
      const file = event.target.files[0];
      if (file) {
        // Update script.filePath with the absolute path of the selected file
        // this.$set(this.scripts[index], 'filePath', URL.createObjectURL(file));
        this.scripts[index].filePath = file.path
        this.update(this.scripts[index], index)
        const info = {
          tableName: tableNameMap.fileRank,
          operation: OPERATION_TYPE.UPDATE,
          funcName: 'ONE_PLUS_FREQ_BY_FILE_PATH',
          data: file.path
        }
        window.electronAPI.executeSql(JSON.stringify(info))
      }
    },
    appendRow() {
      this.scripts.push(new Script())
      this.$nextTick(() => {
        this.scrollToBottom()
        this.scriptsBk = JSON.parse(JSON.stringify(this.scripts))
        this.updateScriptBkAndScriptsBkIdInDB()
      })
    },
    insertRow(delta) {
      const index = this.contextMenu.index + delta
      this.scripts.splice(index, 0, new Script())
      this.$nextTick(() => {
        this.scriptsBk = JSON.parse(JSON.stringify(this.scripts))
        this.updateScriptBkAndScriptsBkIdInDB()
      })
    },
    save() {
      const transactionInfo = {
        method: TRANSACTIONS.SAVE_SCRIPT_ROWS,
        args: [this.scripts, this.videoId]
      }

      window.electronAPI.transact(JSON.stringify(transactionInfo)).then(scripts => {
        this.scripts = scripts
      })
    },
    scrollToTop() {
      // 获取滚动容器的引用
      const container = this.$refs.scrollContainer;
      // 滚动到顶部
      if (container) {
        container.scrollTop = 0;
      }
    },
    scrollToBottom() {
      // 获取滚动容器的引用
      const container = this.$refs.scrollContainer;
      // 滚动到底部
      if (container) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
      }
    },
    showContextMenu(event, index) {
      this.contextMenu.visible = true;
      this.contextMenu.x = event.clientX;
      this.contextMenu.y = event.clientY;
      this.contextMenu.index = index;
      document.addEventListener('click', this.hideContextMenu);
    },
    hideContextMenu() {
      this.contextMenu.visible = false;
      this.contextMenu.index = null;
      document.removeEventListener('click', this.hideContextMenu);
    },
    contextMenuAction(index) {
      alert(`Menu action for index: ${index}`);
      this.hideContextMenu();
    },
    copyFilePath() {
      const path = this.scripts[this.contextMenu.index].filePath
      // console.log(path);
      if (path) {
        navigator.clipboard.writeText(path)
          .then(() => {
            // console.log('Path copied to clipboard:', path);
          })
          .catch(err => {
            console.error('Unable to copy path to clipboard', err);
          });
      }
    },
    locateFile() {
      const path = this.scripts[this.contextMenu.index].filePath
      window.electronAPI.locateFileInOs(path)
    },
    removeFile() {
      this.scripts[this.contextMenu.index].filePath = ''
      this.update(this.scripts[this.contextMenu.index], this.contextMenu.index)
    },
    handleScroll() {
      const data = newDataWithinVues(SPEC.vueNames.SCRIPT_CREATION,
        SPEC.vueNames.FILE_EXPLORER, SPEC.type.FILE_SHARE,
        {
          videoName: this.videoName,
          scriptIndices: this.getVisibleScriptRowIndices(),
          len: this.scripts.length
        }
      )
      window.electronAPI.updateDataWithinVues(data);
    },
    handleKeyDown(event) {
      // console.log(`按下的键: ${event.key}`);
      const capsLockStatus = event.getModifierState("CapsLock")

      // make it works no matter caps lock is on or off
      if (event.ctrlKey && event.key === 'z') {
        if (capsLockStatus) this.nextStep(1)
        else this.nextStep(-1)
      } else if (event.ctrlKey && event.key === 'Z') {
        if (capsLockStatus) this.nextStep(-1)
        else this.nextStep(1)
      } else if (event.ctrlKey && (event.key === 'f' || event.key === 'f')) {
        this.showTextSearch = !this.showTextSearch
        if (!this.showTextSearch) {
          this.keywordSearch('')
          if (this.infoForKeywordSearching.lastMatchedTextEl.style) {
            this.infoForKeywordSearching.lastMatchedTextEl.style.backgroundColor = '#e8f4fc'
          }
        }
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown)

    window.electronAPI.onDataWithinVues((event, data) => {
      // update the data
      // console.log(`data===${JSON.stringify(data)}`);

      if (data.to === SPEC.vueNames.SCRIPT_CREATION) {
        switch (data.from) {
          case SPEC.vueNames.FILE_EXPLORER:
            switch (data.type) {
              case SPEC.type.FILE_SHARE:
                this.scripts[data.data.index].filePath = data.data.filePath
                const info = {
                  tableName: tableNameMap.fileRank,
                  operation: OPERATION_TYPE.UPDATE,
                  funcName: 'ONE_PLUS_FREQ_BY_FILE_PATH',
                  data: data.data.filePath
                }
                window.electronAPI.executeSql(JSON.stringify(info))
                this.update(this.scripts[data.data.index], data.data.index)
                break
              default:

            }
            break
          default:

        }
      }
    });


    // Add scroll event listener
    const container = this.$refs.scrollContainer;
    if (container) {
      container.addEventListener('scroll', this.handleScroll);
    }

    // Ensure DOM is updated before calling getVisibleScriptRowIndices
    this.$nextTick(async () => {
      const videoInfo = {
        tableName: tableNameMap.video,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_ID',
        data: this.videoId
      }
      let video = await window.electronAPI.executeSql(JSON.stringify(videoInfo))
      // console.log(`video=${JSON.stringify(video)}`);
      // console.log(`video.name=${JSON.stringify(video.name)}`);
      this.videoName = video.name

      const info = {
        tableName: tableNameMap.scriptRows,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_VIDEO_ID',
        data: this.videoId
      }
      let scriptRows = await window.electronAPI.executeSql(JSON.stringify(info))
      // this.scripts = [...scriptRows]
      scriptRows.forEach(scriptRow => {
        scriptRow['showProgressBar'] = false
        scriptRow['progress'] = 0
        this.scripts.push(scriptRow)
      })

      // console.log(`len = ${this.scripts.length}`);
      if (this.scripts.length < DEFAULT_ROW_NUM) {
        const more = DEFAULT_ROW_NUM - this.scripts.length;
        for (let i = 0; i < more; i++) {
          let script = new Script()
          script['createdTime'] = formatDate(new Date())
          this.scripts.push(script);
        }
      }

      const recreationInfo = {
        method: TRANSACTIONS.RECREATE_SCRIPT_BK,
        args: []
      }
      await window.electronAPI.transact(JSON.stringify(recreationInfo))

      this.scriptsBk = JSON.parse(JSON.stringify(this.scripts))
      const scriptBkInfo = {
        tableName: tableNameMap.scriptBk,
        operation: OPERATION_TYPE.INSERTION,
        funcName: 'INSERT_VALUE_WITH_NO',
        data: { txt: JSON.stringify(this.scriptsBk) }
      }
      await window.electronAPI.executeSql(JSON.stringify(scriptBkInfo))

      const data = newDataWithinVues(SPEC.vueNames.SCRIPT_CREATION,
        SPEC.vueNames.FILE_EXPLORER, SPEC.type.FILE_SHARE,
        {
          videoName: this.videoName,
          scriptIndices: this.getVisibleScriptRowIndices(),
          len: this.scripts.length
        }
      )
      window.electronAPI.updateDataWithinVues(data);

    });

  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  props: {
    videoId: null
  },
  watch: {
    scripts: {
      handler(newValue, oldValue) {
        this.$nextTick(() => {
          const data = newDataWithinVues(SPEC.vueNames.SCRIPT_CREATION,
            SPEC.vueNames.FILE_EXPLORER, SPEC.type.FILE_SHARE,
            {
              videoName: this.videoName,
              scriptIndices: this.getVisibleScriptRowIndices(),
              len: this.scripts.length
            }
          )
          window.electronAPI.updateDataWithinVues(data);
        })
      },
      deep: true,
      immediate: true
    },

  },
  components: {
    TextSearch,
    MediaGrid,

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.container {
  background-color: rgba(7, 114, 39, 0.3);
  height: 1125px;
}

.video-title {
  font-size: 24px;
  color: #333333;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  background-color: #fafafa;
  padding: 15px;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.titles-container {
  width: calc(100% - 80px);
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.title {
  width: 10% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-size: 16px;
  color: #555555;
  user-select: none;
}

.scroll-container {
  position: relative;
  width: 100%;
  height: 85%;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  overflow-y: auto;
  /* padding: 20px; */
  background-color: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.script-item {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 3px;
  /* padding: 15px; */
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.general {
  flex: 1;
  min-width: 10%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f9f9f9;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.editable-container {
  /* padding: 10px; */
  border: 1px solid #e1e1e1;
  background-color: #ffffff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.editable-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  outline: none;
  font-size: 14px;
  color: #333333;
  line-height: 1.5;
  text-align: left;
}

.editable-content:focus {
  border: 1px solid #007bff;
}

.media-container {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #ccc;
  background-color: #f0f4f8;
  position: relative;
}

.add-file-prompt {
  color: #888888;
  font-size: 14px;
  text-align: center;
  user-select: none;
}

.readonly-content {
  /* padding: 10px; */
  font-size: 14px;
  color: #555555;
  background-color: #f9f9f9;
  border-radius: 4px;
  user-select: none;
}

.script-menu-bar-container {
  width: 50px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.script-menu {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
}

.script-index {
  color: #ff5733;
  font-weight: bold;
  font-size: 18px;
}

.script-action {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
}

.script-action:hover {
  text-decoration: underline;
}

.title {
  width: 200px;
  height: 30px;
  border: 1px solid black;
  float: left;
  line-height: 30px;
  user-select: none;
  /* 禁止文本选择 */
}

.clearfix {
  clear: both;
}

.tooltip {
  position: absolute;
  background-color: #333;
  color: #fff;
  padding: 5px;
  border-radius: 5px;
  z-index: 1000;
  pointer-events: none;
  white-space: nowrap;
}

.context-menu {
  position: absolute;
  background-color: #f0f0f0;
  border: 1px solid #bbb;
  box-sizing: border-box;
  list-style-type: none;
  padding: 0;
  margin: 0;
  z-index: 1000;
  text-align: left;
  min-width: 150px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.context-menu li {
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.3s;
  color: #333;
}

.context-menu li:hover {
  background-color: #e0e0e0;
}

.context-menu-highlight {
  color: #3182ce;
  /* Highlight color */
  font-family: '黑体', sans-serif;
}

.script-menu-bar-container {
  width: 50px;
  height: 200px;
  border: 1px solid rgb(149, 7, 7);
  float: left;
  display: flex;
  justify-content: center;
  /* 水平居中 */
  align-items: center;
  /* 垂直居中 */
}

.progress-bar {
  /* 调整进度条的位置 */
  left: 0;
  right: 0;
  height: 10px;
  background-color: rgba(86, 169, 123, 0.5);
  cursor: pointer;
}

.progress {
  height: 100%;
  background-color: #f00;
}

.centered-overlay {
  position: fixed;
  height: 5%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  /* Ensure it's above other elements */
  background-color: rgba(219, 230, 240, 0.927);
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

button {
  background-color: #007bff;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  padding: 3px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Button Hover and Active States */
button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

button:active {
  background-color: #003f7f;
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Disable Button Styling */
button:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
  box-shadow: none;
}

.container button {
  margin: 5px 10px;
}

/* Additional Button Styling for Specific Buttons */
button.save-button {
  background-color: #28a745;
}

button.save-button:hover {
  background-color: #218838;
}

button.save-button:active {
  background-color: #1e7e34;
}

button.delete-button {
  background-color: #dc3545;
}

button.delete-button:hover {
  background-color: #c82333;
}

button.delete-button:active {
  background-color: #bd2130;
}

button.test-button {
  background-color: #17a2b8;
}

button.test-button:hover {
  background-color: #138496;
}

button.test-button:active {
  background-color: #117a8b;
}
</style>
