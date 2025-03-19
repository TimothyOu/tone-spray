import {
  analyser,
  audio,
  connectAudioCaptureSource,
  connectElementSource,
  connectStreamSource,
  isAudioPaused,
  isStream,
} from "../analyser";
import { audioInfo } from "./audioInfo";
import {
  getFreqArea,
  getFreqX,
  calculateFundamentalFrequency,
  calculateHarmonicRatio,
  calculateSpectralCentroid,
  calculateHarmonic2Ratio,
  detectFormants,
  FrequencyDetector,
} from "../utils";
import { PitchDetector } from "pitchy";

/** 瞬时频率分布数据 */
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
const timeDomainData = new Float32Array(analyser.fftSize);
let pauseFreeze = true;

const canvas = document.getElementById("audio-freqmap") as HTMLCanvasElement;
const canvasCtx = canvas.getContext("2d")!;

const buttonActionElement = document.getElementById(
  "button-action-element"
) as HTMLButtonElement;
const buttonActionStream = document.getElementById(
  "button-action-stream"
) as HTMLButtonElement;
const buttonActionAudioCapture = document.getElementById(
  "button-action-audiocapture"
) as HTMLButtonElement;
const audioElementWrap = document.getElementById(
  "audio-element-wrap"
) as HTMLButtonElement;
const inputAudioFile = document.getElementById(
  "input-audio-file"
) as HTMLInputElement;

const frequencyDetector = new FrequencyDetector();
frequencyDetector.init(frequencyData);

buttonActionElement.onclick = () => {
  connectElementSource();
  audioElementWrap.style.display = "";
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  frequencyDetector.clear();
};
buttonActionStream.onclick = () => {
  connectStreamSource();
  audioElementWrap.style.display = "none";
  audio.pause();
  frequencyDetector.clear();
};
buttonActionAudioCapture.onclick = () => {
  connectAudioCaptureSource();
  audioElementWrap.style.display = "none";
  audio.pause();
  frequencyDetector.clear();
};

document.addEventListener("keydown", (k) => {
  if ((k.key == "p" || k.key == " ") && !isStream()) {
    audio.paused ? audio.play() : audio.pause();
    k.preventDefault();
  }
});

inputAudioFile.addEventListener("change", () => {
  const file = inputAudioFile.files?.[0];
  if (!file) return;
  audio.src = URL.createObjectURL(file);
});

let drawRandom = true;
let drawSpeed = true;

const update = () => {
  if (isAudioPaused() && !isStream() && pauseFreeze) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const bw = cw / frequencyData.length;
  analyser.getByteFrequencyData(frequencyData);
  analyser.getFloatTimeDomainData(timeDomainData);
  const sampleRate = analyser.context.sampleRate;
  const fftSize = analyser.fftSize;
  canvasCtx.clearRect(0, 0, cw, ch);
  const area = getFreqArea(frequencyData);
  if (drawRandom) {
    for (let i = 0; i < 400; i++) {
      const xi = getFreqX(frequencyData, Math.random(), area);
      const bh = frequencyData[Math.floor(xi)];
      canvasCtx.fillStyle = "#FFFF0088";
      canvasCtx.fillRect(bw * xi, 0, 1, ch - bh);
    }
  }
  for (let i = 0; i < frequencyData.length; i++) {
    const bh = frequencyData[i];
    canvasCtx.fillStyle = "#FF0000";
    canvasCtx.fillRect(bw * i, ch - bh, bw, bh);
  }
  if (drawSpeed) {
    frequencyDetector.push(
      frequencyData,
      isStream() ? audio.currentTime : Date.now()
    );
    for (let i = 0; i < frequencyData.length; i++) {
      // const standardDeviation = frequencyDetector.getStandardDeviation(i);
      const speed = frequencyDetector.getSpeed(i);
      const bh = speed * 100;

      canvasCtx.fillStyle = "#0000FF44";
      canvasCtx.fillRect(bw * i, ch - bh, bw, bh);
    }
  }
  const pitchDetector = PitchDetector.forFloat32Array(timeDomainData.length);
  const [fundamentalFrequency, fundamentalFrequencyAccuracy] =
    pitchDetector.findPitch(timeDomainData, sampleRate);
  const spectralCentroid = calculateSpectralCentroid(
    frequencyData,
    sampleRate,
    fftSize
  );
  const harmonicRatio = calculateHarmonicRatio(
    frequencyData,
    fundamentalFrequency,
    sampleRate,
    fftSize
  );
  const harmonic2Ratio = calculateHarmonic2Ratio(
    frequencyData,
    fundamentalFrequency,
    sampleRate
  );
  const [formant1, formant2, formant3] = detectFormants(
    timeDomainData,
    sampleRate
  );
  audioInfo.spectralCentroid.setValue(spectralCentroid, 0.01);
  audioInfo.fundamentalFrequency.setValue(
    fundamentalFrequencyAccuracy > 0.5 ? fundamentalFrequency : 0,
    0.5
  );
  audioInfo.fundamentalFrequencyAccuracy.setValue(
    fundamentalFrequencyAccuracy,
    100
  );
  audioInfo.harmonicRatio.setValue(harmonicRatio, 100, 1);
  audioInfo.harmonic2Ratio.setValue(harmonic2Ratio, 2, 50);
  audioInfo.formant1.setValue(formant1?.frequency || 0, 0.01);
  audioInfo.formant2.setValue(formant2?.frequency || 0, 0.01);
  audioInfo.formant3.setValue(formant3?.frequency || 0, 0.01);
};
function animationFrameLoop(func: () => void) {
  let stop = false;
  const loop = () =>
    requestAnimationFrame(() => {
      if (stop) return;
      func();
      loop();
    });
  loop.abort = () => {
    stop = true;
  };
  return loop;
}

export const updateLoop = animationFrameLoop(update);
