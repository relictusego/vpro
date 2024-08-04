<template>
  <div 
    class="file-drop-area" 
    @dragover.prevent="handleDragOver" 
    @dragleave="handleDragLeave" 
    @drop.prevent="handleDrop"
    :class="{ 'dragging': isDragging }"
  >
    <input type="file" ref="fileInput" @change="handleFileChange" style="display: none;" />
    <p v-if="fileName">{{ fileName }}</p>
    <p v-else>Drag & drop a file here or click to select</p>
    <button @click="test">test</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fileName: '',
      isDragging: false,
      file: {}
    };
  },
  methods: {
    test(){
      console.log(this.file);
    },
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.fileName = file.name;
        this.file = file
      }
    },
    handleDragOver(event) {
      this.isDragging = true;
    },
    handleDragLeave(event) {
      this.isDragging = false;
    },
    handleDrop(event) {
      const file = event.dataTransfer.files[0];
      if (file) {
        this.$refs.fileInput.files = event.dataTransfer.files;
        this.handleFileChange({ target: { files: event.dataTransfer.files } });
      }
      this.isDragging = false;
    }
  }
};
</script>

<style>
.file-drop-area {
  width: 300px;
  height: 200px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  transition: box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out;
}

.file-drop-area.dragging {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border-color: #333;
}

.file-drop-area p {
  margin-top: 20px;
}
</style>
