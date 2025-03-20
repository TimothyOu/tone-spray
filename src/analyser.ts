const audio = document.getElementById("audio") as HTMLAudioElement;

const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 8192;
const elementSource = audioCtx.createMediaElementSource(audio);
let streamSource: MediaStreamAudioSourceNode | null = null;
let audioCaptureSource: MediaStreamAudioSourceNode | null = null;
let stream = false;
let streamAllowed = false;
let audioCaptureAllowed = false;

let paused = false;

export function isAudioPaused() {
  return paused;
}
export function isStream() {
  return stream;
}

audio.addEventListener("pause", () => {
  paused = true;
});
audio.addEventListener("ended", () => {
  paused = false;
});

audio.addEventListener("play", () => {
  paused = false;
});

function connectElementSource() {
  stream = false;
  streamSource?.disconnect();
  audioCaptureSource?.disconnect();
  elementSource.connect(analyser);
  console.log("source");
  console.log(elementSource);
}
function connectStreamSource() {
  if (streamAllowed) {
    stream = true;
    elementSource.disconnect();
    audioCaptureSource?.disconnect();
    streamSource?.connect(analyser);
    console.log("source");
    console.log(streamSource);
  } else {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // 创建音频源
      streamSource = audioCtx.createMediaStreamSource(stream);
      streamAllowed = true;
      connectStreamSource();
    });
  }
}
function connectAudioCaptureSource() {
  navigator.mediaDevices.getDisplayMedia({ audio: true }).then((s) => {
    stream = true;
    let audioStream = s;
    // 创建音频源
    audioCaptureSource = audioCtx.createMediaStreamSource(audioStream);
    streamSource?.disconnect();
    elementSource.disconnect();
    audioCaptureSource?.connect(analyser);
    console.log("source");
    console.log(audioCaptureSource);
  });
}

connectElementSource();
elementSource.connect(audioCtx.destination);
analyser.fftSize = 4096;

window.addEventListener("click", () => {
  audioCtx.resume();
});

export {
  audio,
  analyser,
  connectElementSource,
  connectStreamSource,
  connectAudioCaptureSource,
};
