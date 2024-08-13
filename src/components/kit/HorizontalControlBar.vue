<template>
    <div class="volume-control" ref="volumeControl" @mousedown="startDragging">
      <div class="volume-bar"></div>
      <div class="volume-ring" :style="{ left: volume + '%' }" style="user-select: none;">&nbsp;&nbsp;&nbsp;{{ curFreq }}</div>
    </div>
</template>

<script>

export default {
  data() {
    return {
      volume: this.parentData.minVolume, 
      dragging: false,
      curFreq: this.parentData.minFreq
    };
  },
  methods: {
    startDragging(event) {
      this.dragging = true;
      this.updateVolume(event);
      document.addEventListener('mousemove', this.updateVolume);
      document.addEventListener('mouseup', this.stopDragging);
    },
    stopDragging() {
      this.dragging = false;
      document.removeEventListener('mousemove', this.updateVolume);
      document.removeEventListener('mouseup', this.stopDragging);
    },
    updateVolume(event) {
      if (!this.dragging) return;

      const volumeControl = this.$refs.volumeControl;
      const rect = volumeControl.getBoundingClientRect();
      const clientX = event.clientX;
      const offsetX = clientX - rect.left;
      const width = rect.width;
      let volume = (offsetX / width) * 100;
      
      volume = Math.max(this.parentData.minVolume, Math.min(100, volume));
      this.volume = volume;
      this.curFreq = Math.ceil(this.volume * this.parentData.maxFreq / 100)

      const info = {
        freq: this.curFreq,
      }
      this.$emit('horizontalControlBarEvent', info)
    },

  },
  props: {
    parentData: {}
  },
  mounted(){
    // console.log(this.parentData);
    
  }
};
</script>

<style>
.volume-control {
  width: 100%;
  height: 20px;
  background: transparent;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-bar {
  width: 100%;
  height: 4px;
  background: #ccc;
  position: absolute;
}

.volume-ring {
  width: 10px;
  height: 10px;
  background: #f00;
  border-radius: 50%;
  position: absolute;
  transform: translateX(-50%);
}
</style>
