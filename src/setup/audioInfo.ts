type ListItem<T extends string> = {
  name: T;
  label: string;
};

type AudioInfoElements = {
  $item: HTMLDivElement;
  setValue: (
    value: number,
    scale?: number,
    thresholdLow?: number,
    thresholdHigh?: number
  ) => void;
};

const list: ListItem<
  | "spectralCentroid"
  | "fundamentalFrequency"
  | "fundamentalFrequencyAccuracy"
  | "harmonicRatio"
  | "harmonic2Ratio"
  | "formant1"
  | "formant2"
  | "formant3"
>[] = [
  { name: "spectralCentroid", label: "谱质心" },
  { name: "fundamentalFrequency", label: "基频" },
  { name: "fundamentalFrequencyAccuracy", label: "基频准确度" },
  { name: "harmonicRatio", label: "奇偶谐波比" },
  { name: "harmonic2Ratio", label: "二次谐波比" },
  { name: "formant1", label: "共振峰1" },
  { name: "formant2", label: "共振峰2" },
  { name: "formant3", label: "共振峰3" },
];
const prefix = "audio-info";

function setupAudioInfo<T extends string>(
  el: HTMLDivElement,
  list: ListItem<T>[]
): Record<T, AudioInfoElements> {
  const frag = document.createDocumentFragment();
  const b: Record<string, AudioInfoElements> = {};
  list.forEach(({ name, label }) => {
    const $item = document.createElement("div");
    $item.className = `${prefix}-item`;
    $item.id = `${prefix}-${name}`;
    const $name = $item.appendChild(document.createElement("div"));
    $name.className = `${prefix}-name`;
    $name.innerText = name;
    const $label = $item.appendChild(document.createElement("div"));
    $label.className = `${prefix}-label`;
    $label.innerText = label;
    const $value = $item.appendChild(document.createElement("div"));
    $value.className = `${prefix}-value`;
    $value.innerText = "--";
    const $bar = $item.appendChild(document.createElement("div"));
    $bar.className = `${prefix}-bar`;
    const $progress = $bar.appendChild(document.createElement("div"));
    $progress.className = `${prefix}-bar-progress`;
    const setValue = (
      value: number,
      scale: number = 1,
      thresholdLow = 0,
      thresholdHigh = Infinity
    ) => {
      $value.innerText = value.toString();
      $progress.style.width = `${Math.abs(value * scale) || 0}px`;
      $progress.classList.toggle("is-negative", value < 0);
      $progress.classList.toggle("is-low", value < thresholdLow);
      $progress.classList.toggle("is-high", value > thresholdHigh);
    };
    b[name] = { $item, setValue };
    frag.append($item);
  });
  el.append(frag);
  return b;
}

const $audioInfo = document.getElementById("audio-info") as HTMLDivElement;

export const audioInfo = setupAudioInfo($audioInfo, list);
