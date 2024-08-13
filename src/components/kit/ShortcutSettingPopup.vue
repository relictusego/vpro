<template>
  <transition name="fade">
    <div v-if="showPopup" class="error-popup" style="user-select: none;">
      <div class="error-content">
        <span class="close-btn" @click="closePopup">&times;</span>
        <h2>Error</h2>
        <p>{{ parentData.message }}</p>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ErrorPopup',
  props: {
    parentData: {}
  },
  data() {
    return {
      showPopup: true 
    };
  },
  methods: {
    closePopup() {
      this.showPopup = false;
      this.$emit('errorPopUpEvent', { purpose: 'close' });
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        this.closePopup()
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('click', this.closePopup);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.closePopup);
  }
};
</script>


<style scoped>
.error-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.error-content {
  position: relative;
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  cursor: pointer;
}

/* Transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 5s;
  /* Increase duration for testing */
}

.fade-enter,
.fade-leave-to

/* .fade-leave-active in <2.1.8 */
  {
  opacity: 0;
}
</style>
