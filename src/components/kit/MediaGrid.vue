<template>
  <div class="media-grid" :style="{ width: parentData.width + 'px', height: parentData.height + 'px' }"
    @mousedown="init" @mouseup="uninit" @mouseenter="showDetail">
    <slot name="number-badge"></slot>
    <img v-if="isImage && parentData.filePath.includes('.')" :src="'file:///' + parentData.filePath" alt="" @error="handleError" class="media-image">
    <div v-if="fileExists && (isVideo || isAudio)" @mouseover="showProgressBar = true"
      @mouseleave="showProgressBar = false" class="media-container" style="width: 100%; height: 100%;">
      <video v-if="isVideo" ref="media" :src="'file:///' + parentData.filePath" class="media"
        style="max-width: 100%; max-height: 100%; object-fit: cover;" muted @timeupdate="updateProgress"
        @error="handleError"></video>
      <audio v-if="isAudio" ref="media" :src="'file:///' + parentData.filePath" class="media"
        @timeupdate="updateProgress" @error="handleError"></audio>
      <div v-if="isAudio" class="waveform-container">
        <img v-if="!showDrawWave" :src="'file:///' + canvasPath" alt="" class="waveform-image">
        <DrawWave :parentData="{
          'canvasWidth': drawInfo.canvasWidth,
          'canvasHeight': drawInfo.canvasHeight,
          'width': parentData.width,
          'height': parentData.height,
          'increment': drawInfo.increment,
          'filePath': parentData.filePath,
          'location': Math.ceil(progress * 20)
        }" v-show="showDrawWave" @drawWaveEvent="handleDrawWaveEvent" ref="drawWave"></DrawWave>
      </div>
      <div class="controls">
        <button @click="togglePlay" v-if="parentData.showButton" class="control-button">
          <span v-if="isPlaying" class="icon pause-icon">&#x23F8;</span> <!-- Pause icon -->
          <span v-else class="icon play-icon">&#x25B6;</span> <!-- Play icon -->
        </button>
        <button @click="toggleMute" v-if="parentData.showButton" class="control-button">
          <span v-if="isMuted" class="icon mute-icon">&#x1F507;</span> <!-- Muted icon -->
          <span v-else class="icon unmute-icon">&#x1F50A;</span> <!-- Unmuted icon -->
        </button>
      </div>
      <div v-if="showProgressBar" class="progress-bar-container" @mousedown="startDrag">
        <div class="progress-bar" :style="{ left: progress + '%' }" @mousedown.stop>
          <div class="progress" @mousedown.stop>
            <div>
              {{ Number(progress).toFixed(1) }}%
            </div>
            <div>
              <span style="font-weight: bold;">{{ formattedCurrentTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!fileExists" class="fallback">
      <span style="font-weight: bold; color: red;">{{ parentData.filePath }}不存在</span>
    </div>
  </div>
</template>

<script>
import { mimeType, formatTime } from '@/js/functions/vue-functions'
import DrawWave from './DrawWave.vue'
import { handleError } from 'vue';

export default {
  props: {
    parentData: {}
  },
  components: {
    DrawWave
  },
  data() {
    return {
      isPlaying: false,
      isMuted: true,
      showProgressBar: false,
      progress: 0,
      dragging: false,
      formattedCurrentTime: '',
      drawInfo: {
        canvasWidth: 2000,
        canvasHeight: 1000,
        increment: 6,
      },
      fileExists: true,
      showDrawWave: false,
      canvasPath: '',
      timeoutId: null,
      drawable: true
    }
  },
  methods: {
    showDetail(){
      console.log('showDetail');
      
    },
    init() {
      if (this.isAudio && this.drawable) {
        this.timeoutId = setTimeout(() => {
          console.log('enter')
          this.$refs.drawWave.init()
          this.showDrawWave = true
        }, 300)
      }
    },
    uninit() {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    },
    handleDrawWaveEvent(info) {
      const { purpose, data } = info
      switch (purpose) {
        case 'hideDrawWave':
          this.showDrawWave = false
          this.canvasPath = data
          break
        case 'showDrawWave':
          this.showDrawWave = true
          break
      }
    },
    handleError(e) {
      this.fileExists = false
      this.drawable = false
    },
    togglePlay() {
      let media = this.$refs.media
      if (media) {
        if (media.paused) {
          media.play();
          this.isPlaying = true
        } else {
          media.pause();
          this.isPlaying = false
        }
      }
    },
    toggleMute() {
      let media = this.$refs.media;
      if (media) {
        media.muted = !media.muted;
        this.isMuted = media.muted;
      }
    },
    updateProgress() {
      let media = this.$refs.media;
      if (media) {
        if (isNaN(media.duration)) {
          // console.log('Waiting for media metadata to load...');
          media.addEventListener('loadedmetadata', () => {
            this.progress = (media.currentTime / media.duration) * 100;
            this.formattedCurrentTime = formatTime(Math.floor(media.currentTime));
          });
        } else {
          // console.log(`Current time: ${media.currentTime}, Duration: ${media.duration}`);
          this.progress = (media.currentTime / media.duration) * 100;
          this.formattedCurrentTime = formatTime(Math.floor(media.currentTime));
        }

        if (this.progress === 100) {
          this.isPlaying = false;
          this.progress = 0;
          this.formattedCurrentTime = '0'
        }
      }
    },
    startDrag(event) {
      this.dragging = true;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
      this.onDrag(event); // Update progress immediately on mousedown
    },
    onDrag(event) {
      if (this.dragging) {
        const ele = this.$el.querySelector('.progress-bar-container')
        if (ele === undefined || ele === null) return
        const rect = ele.getBoundingClientRect();

        const offsetX = event.clientX - rect.left;
        let percentage = (offsetX / rect.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage)); // Clamp value between 0 and 100
        this.progress = percentage;

        let media = this.$refs.media;
        if (media) {
          // console.log(media.tagName);
          media.currentTime = (media.duration * this.progress) / 100;
          // media.play();
          // this.isPlaying = true
          // if (!media.muted) {
          //   this.isMuted = false
          // }
        }
      }
    },
    stopDrag() {
      this.dragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    }
  },
  watch: {
    // progress: {
    //   handler(newValue, oldValue) {
    //     this.currentTime = formatTime(Math.floor(this.$refs.media.currentTime))        
    //   },
    // },    
  },
  unmounted() {
    this.isMuted = true
  },
  mounted() {
    // console.log(this.isMuted);
    // console.log(this.$route.href);
    this.isMuted = mimeType(this.parentData.filePath) === 'VIDEO'
  },
  watch: {
    'parentData.filePath': {
      handler(newValue, oldValue) {
        // console.log(`newValue: ${JSON.stringify(newValue)}, oldValue: ${JSON.stringify(oldValue)}`);

        try {
          this.isMuted = true
          this.progress = 0
          this.formattedCurrentTime = '0'
        } catch (error) {

        }
      },
      immediate: true
    }
  },
  beforeUnmount() {
    let media = this.$refs.media
    if (media) {
      this.$refs.media.pause();
      this.$refs.media.src = '';
      this.$refs.media.removeEventListener('timeupdate', this.updateProgress);
    }

    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  },
  computed: {
    isVideo() {
      return mimeType(this.parentData.filePath) === 'VIDEO'
    },
    isImage() {
      return mimeType(this.parentData.filePath) === 'IMAGE'
    },
    isAudio() {
      return mimeType(this.parentData.filePath) === 'AUDIO'
    }
  }


};
</script>

<style scoped>
.media-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #ddd;
  background-color: #eee;
  position: relative;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
}

.media-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.media-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.media {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.number-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
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

.controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
  z-index: 2;
}

.control-button {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 18px;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.progress-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: rgba(86, 169, 123, 0.7);
  cursor: pointer;
  transition: width 0.2s ease;
  width: 1px;
}

.progress-content {
  display: flex;
  justify-content: space-between;
  color: white;
  padding: 0 10px;
}

.waveform-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.waveform-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.fallback {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow: hidden;
}

.error-text {
  font-weight: bold;
  color: red;
}
</style>
