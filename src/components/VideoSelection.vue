<template>
  <div class="container">
    <div v-for="(video, index) in videos" :key="video.id" class="video-item">
      <div class="video-details">
        <a href="#" @click.prevent="goToVideo(video.id)" class="video-title">{{ video.name }}</a>
      </div>
      <div class="video-actions">
        <button @click.prevent="delVideo(video.id)" class="action-button delete-button">删除</button>
        <button @click.prevent="exportVideo(video.name, video.id)" class="action-button export-button">导出</button>
      </div>
    </div>

    <div class="create-section">
      <input type="text" placeholder="输入视频名" v-model="videoNameCreated" class="input-field"/>
      <button @click="create" class="action-button create-button">新建</button>
      <button @click="test" class="action-button test-button">test</button>
    </div>

    <ShortcutSetting :parentData="shortcutSettingData" />
  </div>
</template>

<script>
import { TITLES, tableNameMap, OPERATION_TYPE, STATUS } from '@/js/constants';
import ShortcutSetting from './kit/ShortcutSetting.vue'

export default {
  data() {
    return {
      videos: [],
      videoNameCreated: '',
      shortcutSettingData: {
        href: this.$route.href,
        showDialog: false
      },
    }
  },
  methods: {
    test() {
      this.shortcutSettingData.showDialog = !this.shortcutSettingData.showDialog
    },
    async exportVideo(name, id) {
      const videoInfo = {
        defaultPath: name
      }
      const { filePath } = await window.electronAPI.showSaveDialog(JSON.stringify(videoInfo))
      if (!filePath) return
      // console.log(filePath);

      const info = {
        tableName: tableNameMap.scriptRows,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_BY_VIDEO_ID',
        data: id
      }
      let scripts = await window.electronAPI.executeSql(JSON.stringify(info))
      const fieldNames = ['outline', 'storyBoard', 'filePath', 'subtitle', 'comment', 'createdTime', 'modifiedTime']
      try {
        let txt = '';
        txt += TITLES.join(',') + '\n'
        for (const script of scripts) {
          const line = fieldNames.map(fieldName => {
            const fieldValue = script[fieldName];
            // Escape double quotes and enclose the value in double quotes
            return fieldValue ? `"${String(fieldValue).replace(/"/g, '""')}"` : ""
          }).join(','); // Join fields with a comma
          txt += line + '\n'; // Add newline character
        }
        // Save the CSV text to the file
        await window.electronAPI.fw(JSON.stringify({
          dest: filePath,
          text: txt
        }));
      } catch (error) {
        alert(error);
      }
    },
    goToVideo(id) {
      this.$router.push({ name: 'scriptCreation', params: { 'videoId': id } });
    },
    async create() {
      const info = {
        tableName: tableNameMap.video,
        operation: OPERATION_TYPE.INSERTION,
        funcName: 'INSERT_VALUES',
        data: [{
          name: this.videoNameCreated,
          status: '0'
        }]
      }
      let insertedNum = await window.electronAPI.executeSql(JSON.stringify(info))
      // console.log(`添加了${insertedNum}条视频`);
      const anotherInfo = {
        tableName: tableNameMap.video,
        operation: OPERATION_TYPE.SELECTION,
        funcName: 'SELECT_NEWEST_ID',
        data: null
      }
      let newestId = await window.electronAPI.executeSql(JSON.stringify(anotherInfo))
      // console.log('newestId===>', newestId);
      info.data[0]['id'] = newestId
      this.videos.push(info.data[0])
      // console.log(this.videos);
    },
    async delVideo(id) {
      for (let i = 0; i < this.videos.length; i++) {
        if (this.videos[i].id === id) {
          this.videos[i].status = STATUS.DELETED
          const info = {
            tableName: tableNameMap.video,
            operation: OPERATION_TYPE.UPDATE,
            funcName: 'UPDATE',
            data: this.videos[i]
          }
          window.electronAPI.executeSql(JSON.stringify(info)).then(deletedNum => {
            // console.log(`删除了${deletedNum}条视频`);
            this.videos.splice(i, 1)
          })
          break
        }
      }
    }
  },
  mounted() {
    const info = {
      tableName: tableNameMap.video,
      operation: OPERATION_TYPE.SELECTION,
      funcName: 'SELECT_ALL_WITH_STATUS',
      data: STATUS.ORDINARY
    }
    window.electronAPI.executeSql(JSON.stringify(info)).then(videos => {
      videos.forEach(video => {
        this.videos.push(video)
      });
      // console.log(videos);
    })
  },
  components: {
    ShortcutSetting,

  }
};
</script>


<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5; /* Light grey background for the container */
  font-family: Arial, sans-serif;
}

.video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.video-details {
  flex: 1;
}

.video-title {
  color: #007bff;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
}

.video-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
  outline: none;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

.delete-button:hover {
  background-color: #c82333;
}

.export-button {
  background-color: #007bff;
  color: white;
}

.export-button:hover {
  background-color: #0056b3;
}

.create-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.input-field {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
  width: 200px;
}

.create-button {
  background-color: #28a745;
  color: white;
}

.create-button:hover {
  background-color: #218838;
}

.test-button {
  background-color: #6c757d;
  color: white;
}

.test-button:hover {
  background-color: #5a6268;
}
</style>