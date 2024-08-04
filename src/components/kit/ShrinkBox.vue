<template>
  <div>
    <div ref="box" :style="shrinkBoxStyle" class="shrink-box"
      ></div>
  </div>
</template>

<script>

export default {
  data() {
    return {
      shrinkBoxStyle: ''
    }
  },
  methods: {

  },
  mounted() {
    console.log(`parentData===>${JSON.stringify(this.parentData)}`);
    setTimeout(() => {
      this.shrinkBoxStyle = {
        width:  `${this.parentData.finalWidth}px`,
        height:  `${this.parentData.finalHeight}px`,
        top:  `${this.parentData.finalTop}px`,
        left:  `${this.parentData.finalLeft}px`,
        position: 'absolute',
        background: `${this.parentData.bkColorRgba}`,        
        zIndex: 1000,
        pointerEvents: 'none',
        transition: `all ${this.parentData.aliveTime}s`
      };
    }, 1);
  },
  props: {
    parentData: {}
  }
};
</script>

<style scoped>
/* 初始框样式 */
.shrink-box {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;  /* 确保在最前面 */
  pointer-events: none;  /* 禁止交互 */
}
</style>