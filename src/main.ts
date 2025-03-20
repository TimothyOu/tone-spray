import "./style.css";
import "./setup/audioPanel";
import "./setup/audioInfo";
import { sketchPaint } from "./sketch/sketchPaint";
import { sketchAnimate } from "./sketch/sketchAnimate";
import { Painter } from "./Painter";
import { sketchAnimatePaint } from "./sketch/sketchAnimatePaint";
import { sketchCapturePaint } from "./sketch/sketchCapturePaint";
import { sketchCapture2 } from "./sketch/sketchCapture2";
import { updateLoop } from "./setup/audioPanel";
import { sketchShow } from "./sketch/sketchShow";
import { sketchAnimateShow } from "./sketch/sketchAnimateShow";
import {
  connectAudioCaptureSource,
  connectElementSource,
  connectStreamSource,
} from "./analyser";

const defaultSketchType = "capture2";
const defaultAudioSourceType = "element";
const frameClear = false;

const palette = document.getElementById("palette")!;
const buttonActionClear = document.getElementById(
  "button-action-clear"
) as HTMLButtonElement;

buttonActionClear.onclick = () => {
  p5VoicePainter.clear();
};

let p5VoicePainter: Painter;

document.addEventListener("keydown", (e) => {
  if (e.key == "Delete" || e.key == "Backspace") {
    p5VoicePainter.clear();
  }
});

const search = new URLSearchParams(document.location.search);
if (search.get("analyzer") == "1") {
  document.body.dataset.showAnalyzer = "";
  updateLoop();
}

const audioType = search.get("type");
if (audioType == "microphone") {
  document.body.dataset.audio = "microphone";
} else if (audioType == "system") {
  document.body.dataset.audio = "system";
} else if (audioType == "file") {
  document.body.dataset.audio = "file";
}

const sketchType = search.get("sketch") || defaultSketchType;
if (sketchType == "animatePaint") {
  p5VoicePainter = new Painter(sketchAnimatePaint, palette);
} else if (sketchType == "animateShow") {
  p5VoicePainter = new Painter(sketchAnimateShow, palette);
} else if (sketchType == "animate") {
  p5VoicePainter = new Painter(sketchAnimate, palette);
} else if (sketchType == "capture") {
  p5VoicePainter = new Painter(sketchCapturePaint, palette);
} else if (sketchType == "capture2") {
  p5VoicePainter = new Painter(sketchCapture2, palette);
} else if (sketchType == "paint") {
  p5VoicePainter = new Painter(sketchPaint, palette);
} else {
  p5VoicePainter = new Painter(sketchShow, palette);
}

const audioSourceType = search.get("audio") || defaultAudioSourceType;
if (audioSourceType == "capture") {
  connectAudioCaptureSource();
} else if (audioSourceType == "element") {
  connectElementSource();
} else if (audioSourceType == "stream") {
  connectStreamSource();
} else {
  connectElementSource();
}

p5VoicePainter.frameClear = frameClear;
console.log(p5VoicePainter);
