<template>
  <div>
    <div class="left-side">
      <div class="path-selector" @click="change()">
        <span style="user-select: none;">{{ curPath }}</span>
        <input type="file" style="display: none;" ref="fileInput" @change="handleFileChange($event)" webkitdirectory
          directory>
      </div>
      <div class="path-displayer">
        <div v-for="(file, index) in fileList" :key="index">
          <div class="file-tab" @dblclick="diveIntoDir(index)" :class="{ selected: selectedIndex === index }" @click="selectFile(index)">
            {{ file.name }}
          </div>
        </div>
      </div>
    </div>
    <div class="right-side">
      <div v-for="(subFilePath, index) in subFilePaths" :key="index">
        <div class="pic-grid" @contextmenu.prevent="showContextMenu($event, index, subFilePath)">
          <img v-if="subFilePath.indexOf('.') > 0" :src="'file:///' + subFilePath" alt="">
          <div v-if="subFilePath.indexOf('.') <= 0">{{ subFilePath.substring(subFilePath.lastIndexOf("\\") + 1) }}</div>
        </div>
      </div>
    </div>
    <!-- Context Menu element -->
    <ul v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <li @mouseenter="scriptOptions">移动到<span style="color: blue; font-family: '黑体', sans-serif;">{{ curVideoInfo.videoName }}</span></li>
      <li @click="copyFilePath" @mouseenter="hideScriptNumMenu">复制路径</li>
      <li @click="locateFile" @mouseenter="hideScriptNumMenu">定位文件</li>
    </ul>
    
    <ul v-if="scriptNumMenu.visible" class="context-menu" :style="{ top: scriptNumMenu.y + 'px', left: scriptNumMenu.x + 'px' }">
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

  </div>
</template>

<script>
import { SPEC } from '@/js/constants';
import { newDataWithinVues } from '@/js/functions';

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
      curPath: 'E:\\multi-media\\image\\情绪表情包',
      fileList: [],
      selectedIndex: 0,
      forwardIndices:[],
      backwardIndices:[],
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
      selectedSubfilePath: ''
    }
  },
  methods: {
    copyFilePath(){
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
    locateFile(){
      const path = this.subFilePaths[this.contextMenu.index]
      console.log('this.contextMenu.index======>', this.contextMenu.index);
      console.log('path======>', path);
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
    sendFilePath(idx){
      const data = newDataWithinVues(SPEC.vueNames.FILE_EXPLORER,
        SPEC.vueNames.SCRIPT_CREATION, SPEC.type.FILE_SHARE,
        {
          index: idx,
          filePath: this.selectedSubfilePath
        }
      )
      window.electronAPI.updateDataWithinVues(data)
    },
    scriptOptions(){
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
    getFileList(){
      // console.log(JSON.stringify(this.fileList));
      // console.log(JSON.stringify(this.selectedIndex));
      console.log(JSON.stringify(this.contextMenu));
    },
    change() {
      const fileInput = this.$refs.fileInput;
      if (fileInput) {
        fileInput.click();
      }
    },
    async selectFile(index) {
      this.selectedIndex = index;
      const path = this.fileList[index].path
      // do not dive if the path isn't a folder
      if (path.indexOf('.') > 0) return

      let subFilePaths = await window.electronAPI.subfilesInDir(path)
      this.subFilePaths = subFilePaths
    },
    async backToParentPath() {
      let lastIdx = this.curPath.lastIndexOf('\\')
      let firstIdx = this.curPath.indexOf('\\')
      // forbidden backing to root, must be in folder
      if (lastIdx === firstIdx) return
      let lastPath = this.curPath
      this.curPath = this.curPath.substring(0, this.curPath.lastIndexOf('\\'))
      await this.updateFileList(this.curPath)

      let subFilePaths = await window.electronAPI.subfilesInDir(this.curPath)
      this.subFilePaths = subFilePaths

      this.forwardIndices.unshift(this.selectedIndex)
      let nextIndex = this.backwardIndices.shift()
      if (nextIndex) this.selectedIndex = nextIndex
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
    },
    async diveIntoDir(index) {
      let path = this.fileList[index].path
      // do not dive if is file instead of folder
      if (path.indexOf('.') > 0) return
      // do not dive if there is no subfolder
      let filePaths = await window.electronAPI.subfilesInDir(path)
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
          path: filePath
        })
      }
    },
    async handleFileChange(event) {
      const targetFiles = event.target.files;
      if (targetFiles.length) {
        let absoluteFilePath = targetFiles[0].path
        let webkitRelativePath = targetFiles[0].webkitRelativePath
        let arr1 = splitWithSlashOrBackSlash(absoluteFilePath)
        let arr2 = splitWithSlashOrBackSlash(webkitRelativePath)
        arr1.splice(arr1.indexOf(arr2[0]) + 1)
        this.curPath = arr1.join('\\')
        console.log(typeof (this.curPath));
        await this.updateFileList()
      }
    },
    async updateFileList() {
      let filePaths = await window.electronAPI.subfilesInDir(this.curPath)
      // reset fileList
      this.fileList = []
      for (const filePath of filePaths) {
        this.fileList.push({
          name: filePath.substring(filePath.lastIndexOf('\\') + 1),
          path: filePath
        })
      }
    },
    async handleKeyDown(){
      console.log(`按下的键: ${event.key}`);
      if (event.key === 'w') {
        if (this.selectedIndex > 0) this.selectedIndex--;
        this.forwardIndices = []
      } else if (event.key === 's') {
        if (this.selectedIndex < this.fileList.length - 1) this.selectedIndex++;
        this.forwardIndices = []
      } else if (event.key === 'a') {
        await this.backToParentPath();
        // console.log("<-", JSON.stringify(this.backwardIndices));
        // console.log("->", JSON.stringify(this.forwardIndices));
      } else if (event.key === 'd') {
        if (this.fileList.length) { // avoid the exception once app mounted
          await this.diveIntoDir(this.selectedIndex);
          // console.log("<-", JSON.stringify(this.backwardIndices));
          // console.log("->", JSON.stringify(this.forwardIndices));
        }
      } else if (event.key === 'e') {
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
      }
    }
  },
  mounted(){
    this.updateFileList()
    window.addEventListener('keydown', this.handleKeyDown); 

    window.electronAPI.onDataWhtinVues((event, data) => {
      if (data.to === SPEC.vueNames.FILE_EXPLORER) {
        switch(data.from) {
          case SPEC.vueNames.SCRIPT_CREATION: 
            switch(data.type) {
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
  unmounted(){
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  watch: {
    selectedIndex: {
      async handler(newValue, oldValue) {
        console.log(`selectedIndex changed from ${oldValue} to ${newValue}`);
        // let file = this.fileList[newValue]
        try {
          const path = this.fileList[newValue].path
          // do not dive if the path isn't a folder
          if (path.indexOf('.') > 0) return

          let subFilePaths = await window.electronAPI.subfilesInDir(path)
          this.subFilePaths = subFilePaths

          // Ensure DOM is updated before scrolling
          this.$nextTick(() => {
            const selectedElement = this.$el.querySelector('.file-tab.selected');
            if (selectedElement) {
              selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        } catch (error) {
          
        }
      },
      deep: true,
      immediate: true
    }
  },


};
</script>

<style scoped>
.left-side {
  width: 250px;
  height: 900px;
  border: 1px solid black;
  margin-left: 1%;
  float: left;
}

.right-side {
  width: 1200px;
  height: 900px;
  border: 1px solid black;
  margin-left: 1%;
  float: left;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  transition: background-color 0.2s;  /* 增加平滑过渡 */
}

.file-tab:hover {
  background-color: #f0f0f0;  /* 背景底色 */
}

.file-tab.selected {
  background-color: #d0d0d0;  /* 选中时的背景色 */
}

.file-tab.selected:hover {
  background-color: #d0d0d0;  /* 鼠标悬停时选中状态保持选中背景色 */
}

.pic-grid {
  width: 200px;
  height: 200px;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid red;
  margin: 0;  /* 移除默认的margin */
  padding: 0;  /* 移除默认的padding */
  background-color: #eee;
}

.pic-grid img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;  /* 保持图片比例 */
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
  min-width: 150px; /* 设置最小宽度 */
}

.context-menu li {
  padding: 8px 12px;
  cursor: pointer;
}

.context-menu li:hover {
  background-color: #eee;
}
</style>