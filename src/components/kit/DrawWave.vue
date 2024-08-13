<template>
  <div>
    <audio ref="audio" :src="'file:///' + parentData.filePath"></audio>
    <canvas ref="canvas" :width="parentData.canvasWidth" :height="parentData.canvasHeight"
      :style="{ width: parentData.width + 'px', height: parentData.height + 'px' }"></canvas>
  </div>
</template>

<script>
import { drawLine } from '@/js/functions/vue-functions'
import { tableNameMap, OPERATION_TYPE } from '@/js/constants'
const SYNC = 1
const ASYNC = 2

export default {
  data() {
    return {
      audioDataInfo: {},
      lastFilePath: '',
      computionForDrawInterrupted: false,
      alreadyInitialized: false,
      noDataFromVues: true
    }
  },
  props: {
    parentData: {}
  },
  mounted() {
    const info = {
      tableName: tableNameMap.audioWaveCanvas,
      operation: OPERATION_TYPE.SELECTION,
      funcName: 'SELECT_BY_FILE_PATH',
      data: this.parentData.filePath
    }
    window.electronAPI.executeSql(JSON.stringify(info)).then(audioWaveCanvas => {
      const canvasPath = audioWaveCanvas['canvasFilePath']
      console.log(`canvasPath==${JSON.stringify(canvasPath)}`);
      if (canvasPath === undefined || canvasPath === null) {
        this.initWave(ASYNC)
      } else {
        const info = {
          'purpose': 'hideDrawWave',
          'data': canvasPath
        }
        this.$emit('drawWaveEvent', info)
      }
    }).catch(e => {
    })

  },
  unmounted() {
    this.computionForDrawInterrupted = true
    this.noDataFromVues = false
  },
  methods: {
    init() {
      if (!this.alreadyInitialized) {
        this.initWave(SYNC)
      }
    },
    initWave(type) {
      fetch(this.parentData.filePath)
        .then(response => response.blob())
        .then(blob => {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const reader = new FileReader();

          reader.onload = (e) => {
            audioContext.decodeAudioData(e.target.result, (buffer) => {
              this.drawWaveform(buffer, type);
            });
          };

          reader.readAsArrayBuffer(blob);
        })
        .catch(error => console.error('Error loading audio file:', error));
    },
    drawWaveform(audioBuffer, type) {
      if (this.alreadyInitialized) return
      // Get the canvas and its drawing context
      const canvas = this.$refs.canvas;
      if (canvas === undefined || canvas === null) return
      const canvasContext = canvas.getContext("2d");
      const { width, height } = canvas; // Get canvas width and height
      canvasContext.clearRect(0, 0, width, height);

      // Get the audio data from the first channel
      const data = audioBuffer.getChannelData(0);

      // Calculate the step size based on the canvas width and data length
      const step = Math.ceil(data.length / width);
      // Calculate the amplitude to center the waveform vertically
      const amp = height / 2;

      // Set the fill style for the canvas background
      canvasContext.fillStyle = "rgba(255, 255, 255, 0.5)";
      // Fill the entire canvas with the background color
      canvasContext.fillRect(0, 0, width, height);

      // Set the stroke style and line width for the waveform
      canvasContext.lineWidth = 1;

      if (type === ASYNC) {
        this.computeForDrawAsync(width, step, amp, data, canvasContext)
        const info = {
          'purpose': 'showDrawWave',
        }
        this.$emit('drawWaveEvent', info)
      } else if (type === SYNC) {
        this.computeForDrawSync(width, step, amp, data, canvasContext)
      }
      this.alreadyInitialized = true
    },
    computeForDrawAsync(width, step, amp, data, canvasContext) {
      if (this.alreadyInitialized) return
      let i = 0;
      const intervalId = setInterval(() => {
        if (this.computionForDrawInterrupted) {
          console.log('compution interrupted!!!    i=', i);
          clearInterval(intervalId);
          return;
        }

        const start = Math.floor(i * step);
        const end = Math.min(data.length, Math.floor((i + this.parentData.increment) * step));
        const slice = data.slice(start, end);
        const min = Math.min(...slice);
        const max = Math.max(...slice);

        drawLine(canvasContext, i, (1 + min) * amp, i, (1 + max) * amp, "#00ff00");
        this.audioDataInfo[`idx${i}`] = [i, (1 + min) * amp, i, (1 + max) * amp];

        i += this.parentData.increment;

        // Stop the interval if we've reached the end
        if (i >= width) {
          clearInterval(intervalId);
          this.saveBlobToDisk()
        }
      }, 0); // Set a 0ms delay to mimic the loop behavior as closely as possible
    },
    computeForDrawSync(width, step, amp, data, canvasContext) {
      if (this.alreadyInitialized) return
      for (let i = 0; i < width; i += this.parentData.increment) {
        const start = Math.floor(i * step);
        const end = Math.min(data.length, Math.floor((i + this.parentData.increment) * step));
        const slice = data.slice(start, end);
        const min = Math.min(...slice);
        const max = Math.max(...slice);

        drawLine(canvasContext, i, (1 + min) * amp, i, (1 + max) * amp, "#00ff00");
        this.audioDataInfo[`idx${i}`] = [i, (1 + min) * amp, i, (1 + max) * amp];
      }
    },
    saveBlobToDisk() {
      console.log('----saveBlobToDisk----', this.parentData.filePath);

      const canvas = this.$refs.canvas;
      if (!canvas) return;
      // Step 1: Get the canvas data URL
      const dataURL = canvas.toDataURL('image/png');
      // Step 2: Convert data URL to Blob
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: mimeString });
      // Step 3: Save the Blob to the local disk
      const reader = new FileReader();

      reader.onload = (e) => {
        window.electronAPI.updateCanvas({
          filePath: this.parentData.filePath,
          blob: e.target.result
        });
      };

      reader.readAsArrayBuffer(blob);
    },
    redrawDiff(newIndex, oldIndex) {
      // if (Math.abs(newIndex - oldIndex) < 50) return
      const canvas = this.$refs.canvas;
      if (canvas === undefined || canvas === null) return
      const canvasContext = canvas.getContext("2d");
      const { width, height } = canvas; // Get canvas width and height
      let that = this
      let dataLen = Object.keys(this.audioDataInfo).map(key => +key.replace('idx', '')).sort((x, y) => y - x)[0]

      function nearestValidIndex(index) {
        // find the nearest index that could be divided completely by this.parentData.increment
        let l = index, r = index, i = that.parentData.increment
        while (i-- > 0) {
          if (--l % that.parentData.increment === 0) {
            return l
          }
          else if (++r % that.parentData.increment === 0) {
            return r
          }
          else if (l < 0) return 0
          else if (r >= dataLen) return dataLen - 1
        }
        console.log(`l=${l}, r=${r}`);

        return -1
      }

      const draw = (head, tail, style) => {
        for (let i = head; i < tail; i += this.parentData.increment) {
          let pos = this.audioDataInfo[`idx${i}`]
          if (pos === undefined || pos === null) continue
          // console.log(`${i}-->${JSON.stringify(pos)}`);

          drawLine(canvasContext, pos[0], pos[1], pos[2], pos[3], style)
        }
      }
      const refillRect = (i1, i2) => {
        let x1 = this.audioDataInfo[`idx${i1}`][0]
        let x2 = this.audioDataInfo[`idx${i2}`][0]
        canvasContext.clearRect(x1, 0, x2 - x1, height);
        canvasContext.fillStyle = "rgba(255, 255, 255, 0.5)";
        canvasContext.fillRect(x1, 0, x2 - x1, height);
      }

      let oI = nearestValidIndex(oldIndex)
      let nI = nearestValidIndex(newIndex)
      // console.log(`redraw: ${newIndex}-${oldIndex}`);
      // console.log(`on---->: ${oI}-${nI}`);
      if (newIndex > oldIndex) {
        refillRect(oI, nI)
        draw(oI, nI, "gray")
      } else {
        refillRect(nI, oI)
        draw(nI, oI, "#00ff00")
      }

    },
  },
  watch: {
    'parentData.location': {
      handler(newValue, oldValue) {
        try {
          if (oldValue === undefined || oldValue === null) return
          console.log(`location new,old  -- ${newValue}, ${oldValue}`);
          this.computionForDrawInterrupted = true
          this.redrawDiff(newValue, oldValue)

        } catch (error) {

        }
      },
      immediate: true
    },
    'parentData.filePath': {
      handler(newValue, oldValue) {
        try {
          if (oldValue === undefined || oldValue === null) return
          console.log(`newValue: ${JSON.stringify(newValue)}, oldValue: ${JSON.stringify(oldValue)}`);
          if (newValue !== this.lastFilePath) {
            this.initWave()
            this.lastFilePath = newValue
          }
        } catch (error) {

        }
      },
      immediate: true
    }
  }
};
</script>

<style></style>
