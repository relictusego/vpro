// const { defineConfig } = require('@vue/cli-service')
// module.exports = defineConfig({
//   transpileDependencies: true
// })

module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
    }
  },
  lintOnSave: false,
  // productionSourceMap: false,
}