  <template>
    <div style="background-color: rgba(2, 255, 255, 3); height: 1050px;">
      <h1>视频：{{ videoName }}</h1>
      <div v-for="(title, index) in titles" :key="index">
        <div class="title">
          {{ title }}
        </div>
      </div>
      <div class="scroll-container" ref="scrollContainer">
        <!-- <div class="clearfix"></div> -->
        <div v-for="(script, index) in scripts" :key="index">
          <div class="general">
            <textarea v-model="script.outline" @blur="update(script, index)"></textarea>
          </div>
          <div class="general">
            <textarea v-model="script.storyBoard" @blur="update(script, index)"></textarea>
          </div>
          <div class="general" style="display: flex;  align-items: center;  justify-content: center;"
            @dblclick="change(index)" @mouseover="showTooltip($event, script.filePath)" @mouseleave="hideTooltip"
            @mousemove="moveTooltip($event)" @contextmenu.prevent="showContextMenu($event, index)">
            <span v-if="script.filePath === null || script.filePath === undefined || script.filePath === ''"
              style="user-select: none;">双击添加文件</span>
            <img v-if="mimeType(script.filePath) === 'IMAGE'" :src="'file:///' + script.filePath" />

            <div v-if="mimeType(script.filePath) === 'VIDEO' || mimeType(script.filePath) === 'AUDIO'"
              style="width: 100%; height: 100%;" @click="togglePlay(index, mimeType(script.filePath))"
              @mouseover="script.showProgressBar = true" @mouseleave="script.showProgressBar = false">
              <div v-if="mimeType(script.filePath) === 'AUDIO'" style="user-select: none;">{{
                script.filePath.substring(script.filePath.lastIndexOf('\\') + 1) }}</div>
              <video v-if="mimeType(script.filePath) === 'VIDEO'" :src="'file:///' + script.filePath"
                style="max-width: 100%;  max-height: 100%;  object-fit: cover; " :ref="'videoMedia_' + index"
                @timeupdate="updateProgress(index)" autoplay muted></video>
              <audio v-if="mimeType(script.filePath) === 'AUDIO'" :src="'file:///' + script.filePath"
                :ref="'audioMedia_' + index" @timeupdate="updateProgress(index)"></audio>

              <div v-if="script.showProgressBar" class="progress-bar" @click.stop="seek($event, index)">
                <div class="progress" :style="{ width: script.progress + '%' }">{{ script.progress }}%</div>
              </div>
            </div>

            <input type="file" style="display: none;" ref="fileInput" @change="handleFileChange($event, index)">
          </div>
          <div class="general">
            <textarea v-model="script.subtitle" @blur="update(script, index)"></textarea>
          </div>
          <div class="general">
            <textarea v-model="script.comment" @blur="update(script, index)"></textarea>
          </div>
          <div class="general">
            <textarea v-model="script.createdTime" readonly></textarea>
          </div>
          <div class="general">
            <textarea v-model="script.modifiedTime" readonly></textarea>
          </div>
          <div class="script-menu-bar-container">
            <div style="display: inline-block;">
              <div style="user-select: none;"><span style="color: #ff5733; font-weight: bold;">{{ index + 1 }}</span>
              </div>
              <div style="user-select: none;">&nbsp;</div>
              <div><a href="#" @click.prevent="delScript(index)">删除</a></div>
              <div><a href="#" @click.prevent="upScript(index)">上移</a></div>
              <div><a href="#" @click.prevent="downScript(index)">下移</a></div>
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
        <li @click="removeImg">移除文件</li>
      </ul>
      <div>
        <button @click="openFileExplorer">文件浏览</button>
        <button @click="scrollToTop">顶部</button>
        <button @click="scrollToBottom">底部</button>
        <button @click="save">保存</button>
        <button @click="addRow">新增</button>
        <button @click="test">test</button>
        <input type="text" style="width: 70px;" placeholder="关键字搜索" @blur="keywordSearch"
          v-model="infoForKeywordSearching.keyword">
        <button @click="nextTextArea(-1)">⇑</button>
        <button @click="nextTextArea(1)">⇓</button>
        <button @click="nextStep(-1)">撤销</button>
        <button @click="nextStep(1)">恢复</button>
      </div>
    </div>
  </template>

<script>
import { DEFAULT_ROW_NUM, TITLES, SPEC, tableNameMap, OPERATION_TYPE, TRANSACTIONS } from '@/js/constants'
import { newDataWithinVues, mimeType } from '@/js/functions/vue-functions'

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
        matchedTextAreaIndex: 0
      },
      videoName: '',
      showProgressBar: false,
      progress: 0
    }
  },
  methods: {
    async test() {
      // console.log(this.getVisibleScriptRowIndices());
      // console.log(newDataWithinVues('you', 'me', 'msg', [1, 2]));
      // console.log(JSON.stringify(this.infoForKeywordSearching));
      // console.log(await window.electronAPI.getCurrentWindowBounds());
      console.log(this.scripts);
      const media = this.$refs['videoMedia_' + 4];
      if (media) {
        console.log(media[0]);
        const newTime = 0.5 * media[0].duration;
        console.log(newTime);
        media[0].currentTime = newTime;
      }
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

    seek(event, index) {
      const videoMedia = this.$refs[`videoMedia_${index}`] ? this.$refs[`videoMedia_${index}`][0] : null
      const audioMedia = this.$refs[`audioMedia_${index}`] ? this.$refs[`audioMedia_${index}`][0] : null
      const media = videoMedia || audioMedia
      if (media) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const width = rect.width;
        const newTime = (x / width) * media.duration;
        media.currentTime = newTime;
        console.log(newTime);
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
      console.log(`--------+++++++++++----------`);
      console.log(info);
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
        })
    },
    nextTextArea(step) {
      this.jumpToTextArea(this.infoForKeywordSearching.matchedTextAreaIndex + step)
    },
    jumpToTextArea(index) {
      let len = this.infoForKeywordSearching.matchedTextAreas.length
      const legal = (0 <= index) && (index < len)

      if (len > 0 && legal) {
        console.log('Scrolling to:', this.infoForKeywordSearching.matchedTextAreas[index]);
        const matched = this.infoForKeywordSearching.matchedTextAreas[index];
        matched.focus(); // Set focus to textarea
        const length = matched.value.length;
        matched.setSelectionRange(length, length);

        this.infoForKeywordSearching.matchedTextAreaIndex = index
      }
    },
    keywordSearch() {
      const keyword = this.infoForKeywordSearching.keyword

      // 在这里添加代码，将屏幕的焦点移动到this.infoForKeywordSearching.matchedTextAreas的第一个元素
      // Scroll to the first matched textarea if any
      this.$nextTick(() => {
        const container = this.$refs.scrollContainer;
        const items = container.querySelectorAll('textarea');

        // iterator
        items.forEach(textarea => {
          console.log(textarea.value);
          if (keyword !== '' && textarea.value.indexOf(keyword) >= 0) {
            textarea.style.backgroundColor = '#e8f4fc'
            this.infoForKeywordSearching.matchedTextAreas.push(textarea)
          } else {
            // reset
            textarea.style.backgroundColor = '';
          }
        });
        if (this.infoForKeywordSearching.matchedTextAreas.length > 0) {
          console.log('Scrolling to:', this.infoForKeywordSearching.matchedTextAreas[0]);
          const firstMatch = this.infoForKeywordSearching.matchedTextAreas[0];
          firstMatch.focus(); // Set focus to textarea
          const length = firstMatch.value.length;
          firstMatch.setSelectionRange(length, length);
        }
      });
    },
    openFileExplorer() {
      window.electronAPI.getCurrentWindowBounds().then(bounds => {
        const windowInfo = {
          'url': 'fileExplorer',
          'bounds': { 'x': bounds.x, 'y': bounds.y }
        }
        window.electronAPI.openNewWindow(JSON.stringify(windowInfo));
        setTimeout(() => {
          const data = newDataWithinVues(SPEC.vueNames.SCRIPT_CREATION,
            SPEC.vueNames.FILE_EXPLORER, SPEC.type.FILE_SHARE,
            {
              videoName: this.videoName,
              scriptIndices: this.getVisibleScriptRowIndices(),
              len: this.scripts.length
            }
          )
          window.electronAPI.updateDataWithinVues(data);
        }, 500);
      })
    },
    getVisibleScriptRowIndices() {
      const container = this.$refs.scrollContainer;
      const containerRect = container.getBoundingClientRect();

      // 获取所有条目的 DOM 元素
      const items = container.querySelectorAll('.general'); // 修改为你的条目类名

      const visibleScriptRowIndices = [];

      items.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();

        // 判断条目是否在视口中
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
    addRow() {
      this.scripts.push(new Script())
      this.$nextTick(() => {
        this.scrollToBottom()
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
      const path = this.scripts[this.contextMenu.index].filePath
      window.electronAPI.locateFileInOs(path)
    },
    removeImg() {
      this.scripts[this.contextMenu.index].filePath = ''
      this.update(this.scripts[this.contextMenu.index], this.contextMenu.index)
    },
    handleScroll() {
      // 处理滚动事件的方法
      console.log('滚动事件触发');
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
  },
  mounted() {

    window.electronAPI.onDataWithinVues((event, data) => {
      // update the data
      console.log(`data===${JSON.stringify(data)}`);

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
      console.log(`video=${JSON.stringify(video)}`);
      console.log(`video.name=${JSON.stringify(video.name)}`);
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

      console.log(`len = ${this.scripts.length}`);
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
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.scroll-container {
  position: relative;
  width: 1500px;
  height: 900px;
  border: 1px solid black;
  overflow: auto;
}

.general {
  width: 200px;
  height: 150px;
  border: 1px solid black;
  float: left;
  background-color: #eee;
}

.general img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.general video {
  max-width: 100%;
  /* Or set a specific width */
  max-height: 100%;
  object-fit: cover;
  /* Or contain, scale-down */
}

.general textarea {
  width: 100%;
  height: 100%;
  object-fit: cover;
  box-sizing: border-box;
  background-color: #eee;
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
  background-color: white;
  border: 1px solid #ccc;
  list-style-type: none;
  padding: 0;
  margin: 0;
  z-index: 1000;
  text-align: left;
}

.context-menu li {
  padding: 8px 12px;
  cursor: pointer;
}

.context-menu li:hover {
  background-color: #eee;
}

.script-menu-bar-container {
  width: 50px;
  height: 150px;
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
</style>
