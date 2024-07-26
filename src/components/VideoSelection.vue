<template>
  <div>
    <div v-for="(video, index) in videos" :key="index">
      <div class="video-container">
        <div class="video">
          <a href="#" @click.prevent="goToVideo(video.id)">{{ video.name }}</a>
        </div>
        <div class="del">
          <a href="#" @click.prevent="delVideo(video.id)">删除</a>&nbsp;&nbsp;&nbsp;
          <a href="#" @click.prevent="exportVideo(video.id)">导出</a>
        </div>
        <div style="clear: both;"></div>
      </div>
    </div>
    <input type="text" placeholder="输入视频名" v-model="videoNameCreated">
    <button @click="create">新建</button>
  </div>
</template> 

<script>
import { TITLES, tableNameMap, OPERATION_TYPE, STATUS } from '@/js/constants';  

  export default {
    data(){
      return{
        videos: [],
        videoNameCreated: ''
      }
    },
    methods:{
      async exportVideo(id) {
        const { filePath } = await window.electronAPI.showSaveDialog();
        if (!filePath) return
        console.log(filePath);
        
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
      goToVideo(id){
        this.$router.push({ name: 'scriptCreation', params: { 'videoId': id } });
      },
      async create(){
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
        console.log(`添加了${insertedNum}条视频`);
        const anotherInfo = {
          tableName: tableNameMap.video, 
          operation: OPERATION_TYPE.SELECTION, 
          funcName: 'SELECT_NEWEST_ID', 
          data: null
        } 
        let newestId = await window.electronAPI.executeSql(JSON.stringify(anotherInfo))
        console.log('newestId===>', newestId);
        info.data[0]['id'] = newestId
        this.videos.push(info.data[0])
        console.log(this.videos);
      },
      async delVideo(id){
        for(let i = 0; i < this.videos.length; i++) {
          if (this.videos[i].id === id) {
            this.videos[i].status = STATUS.DELETED
            const info = {
              tableName: tableNameMap.video, 
              operation: OPERATION_TYPE.UPDATE, 
              funcName: 'UPDATE', 
              data: this.videos[i]
            }      
            window.electronAPI.executeSql(JSON.stringify(info)).then(deletedNum => {
              console.log(`删除了${deletedNum}条视频`);
              this.videos.splice(i, 1)
            })          
            break
          }
        }
      }
    },
    async mounted() { 
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
        console.log(videos);
      })
    }
  };
</script>

<style scoped>
  .video {
    width: 300px;
  }

  .del {
    width: 120px;
  }

  div.video{
    float: left;
  }

  /* div {
    border: 1px solid black;
  } */

  div.del{
    float: left;
  }

  .video-container {
    border: 1px solid red;
    display: inline-block; /* This makes the container adjust to fit its content */
    padding: 5px;
  }

  .video-container .video,
  .video-container .del {
    display: inline-block; /* Ensure elements are inline */
  }
</style>
