<template>
  <div>
    <div class="container">
      <button class="close-btn" @click="close">×</button>
      <input type="text" v-model="filename" class="input" placeholder="输入文件名" ref="filenameInput">

      <!-- 一级选择器 -->
      <select v-model="selectedType" class="select" @change="updateSuffixes">
        <option value="IMAGE">图片</option>
        <option value="VIDEO">视频</option>
        <option value="AUDIO">音频</option>
      </select>

      <!-- 二级选择器 -->
      <select v-model="selectedSuffix" class="select">
        <option v-for="suffix in suffixes" :key="suffix" :value="suffix">
          {{ suffix }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
import { DEFAULT_CONFIG_DEST, CONFIG_FIELD_NAMES } from '@/js/constants';

export default {
  data() {
    return {
      filename: '',
      selectedType: 'IMAGE',
      selectedSuffix: '',
      suffixes: [],
      suffixMap: {
        AUDIO: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"],
        VIDEO: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v"],
        IMAGE: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "webp", "svg", "ico"]
      }
    };
  },
  methods: {
    saveMedia() {
      if (!this.filename) return
      const info = {
        purpose: 'saveMedia',
        data: {
          'filename': this.filename,
          'suffix': this.selectedSuffix
        }
      }
      this.$emit('mediaControllerEvent', info)
    },
    updateSuffixes() {
      this.suffixes = this.suffixMap[this.selectedType];
      this.selectedSuffix = this.suffixes[0];
    },
    close() {
      this.$emit('mediaControllerEvent', {
        purpose: 'close',
        data: {}
      })
    },
    handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (this.$refs.filenameInput === document.activeElement) {
          if (!this.filename) this.close()
          else this.$refs.filenameInput.blur()
        } else {
          this.close()
        }
      } else if (event.key === 'Enter') {
        if (this.$refs.filenameInput === document.activeElement) {
          this.saveMedia()
        }
      }
    }
  },
  mounted() {
    this.$refs.filenameInput.focus()
    window.addEventListener('keydown', this.handleKeyDown)
    window.electronAPI.fr(DEFAULT_CONFIG_DEST).then(txt => {
      const { lastMediaType } = JSON.parse(txt)
      console.log(`lastMediaType=${lastMediaType}`);
      if (lastMediaType) {
        const [type, suffix] = lastMediaType.split('/');
        this.selectedType = type;
        this.selectedSuffix = suffix;
        this.suffixes = this.suffixMap[this.selectedType];
      }
    })
  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown)
    // log the last used media type
    window.electronAPI.addRowsInJsonFile(JSON.stringify({
      rows: [
        {
          fieldName: CONFIG_FIELD_NAMES.LAST_MEDIA_TYPE,
          fieldValue: `${this.selectedType}/${this.selectedSuffix}`,
        }
      ],
      dest: DEFAULT_CONFIG_DEST
    }))
  }
};
</script>

<style scoped>
.container {
  width: 220px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
}

.input {
  width: calc(100% - 20px);
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
  box-sizing: border-box;
}

.select {
  width: calc(50% - 10px);
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: #fff;
  appearance: none;
  cursor: pointer;
}

select:focus,
.input:focus {
  border-color: #007BFF;
  outline: none;
  box-shadow: 0 0 3px #007BFF;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #777;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: #ff0000;
}
</style>
