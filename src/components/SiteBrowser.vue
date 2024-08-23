<template>
  <div>
    <input type="text" v-model="iframeSrc" style="width: 100%;">
    <div style="height: 1000px; width: 100%; border: 1px solid black;">
      <iframe ref="iframe" :src="iframeSrc" frameborder="0" style="height: 1000px; width: 100%;"></iframe>
    </div>
    <MediaCollector v-if="showMediaCollector" @mediaControllerEvent="handleMediaControllerEvent" @mousedown="startDrag"
      :style="{ top: componentTop + 'px', left: componentLeft + 'px', position: 'absolute' }"></MediaCollector>
  </div>
</template>

<script>
import MediaCollector from './kit/MediaCollector.vue';
import { SPEC } from '@/js/constants';
import { newDataWithinVues } from '@/js/functions/vue-functions';

export default {
  components: {
    MediaCollector,

  },
  data() {
    return {
      iframeSrc: 'https://www.baidu.com/',
      showMediaCollector: false,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      componentTop: 0,
      componentLeft: 0,
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
    handleMediaControllerEvent(info) {
      const { purpose, data } = info
      switch (purpose) {
        case 'saveMedia':
          this.showMediaCollector = false
          const mediaData = newDataWithinVues(SPEC.vueNames.SITE_BROWSER,
            SPEC.vueNames.FILE_EXPLORER, SPEC.type.PASS_MEDIA_INFO_TO_MAIN_PROCESS,
            data
          )
          window.electronAPI.updateDataWithinVues(mediaData)
          break
        case 'close':
          this.showMediaCollector = false
      }
    },
    saveMedia() {
      this.showMediaCollector = false
      console.log('000000');

    }
  },
  mounted() {
    setTimeout(() => {
      this.isErrorVisible = true
    }, 100);

    window.electronAPI.onDataFromMainProcess((event, info) => {
      const { purpose, data } = info
      switch (purpose) {
        case 'refreshUrl':
          console.log(data);
          this.iframeSrc = data
          break
        case 'showMediaCollector':
          const { x, y } = data
          this.componentLeft = x
          this.componentTop = y
          this.showMediaCollector = true
          break
      }
    })

  }
};
</script>

<style scoped></style>