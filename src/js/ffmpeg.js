const { exec } = require('child_process');
const path = require('path');

function captureScreenshots(videoPath) {
  const command = `ffmpeg -i E:/multi-media/video/${videoPath} -vf "fps=1,crop=1280:80:0:590" E:/multi-media/video/img/output%d.png`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}

// 示例调用
captureScreenshots('bili.mp4');
