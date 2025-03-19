import { getNote } from "./audio";

export function freqAngleA0(frequency: number, ff: number, ffa: number) {
  return ((getNote(ff) % 12) / 12 + 1 / (frequency % ff)) * 2 * Math.PI;
}

export function freqAngleA(frequency: number, ff: number, ffa: number) {
  return (
    ((getNote(ff) % 12) / 12 + 1 / (frequency % ff)) * 2 * Math.PI * ffa +
    ((2 * (frequency % ff)) / ff) * (1 - ffa) * Math.PI
  );
}
export function freqAngleB(frequency: number, ff: number, ffa: number) {
  const fo = (frequency % ff) - ff / 2;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI + (ff / (2 * fo) - 1) * Math.PI
  );
}

export function freqAngleSin(frequency: number, ff: number, ffa: number) {
  const fo = (frequency % ff) - ff / 2;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    Math.PI +
    (Math.sin((fo * Math.PI) / ff) * ffa + ((2 * fo) / ff) * (1 - ffa)) *
      Math.PI
  );
}

export function freqAngle2(frequency: number, ff: number, ffa: number) {
  const fo0 = frequency % ff;
  const fo = fo0 < ff / 2 ? fo0 : fo0 - ff;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    (Math.sign(fo) * ((2 * fo) / ff) ** 2 * ffa + ((2 * fo) / ff) * (1 - ffa)) *
      Math.PI
  );
}

export function freqAngle3(frequency: number, ff: number, ffa: number) {
  const fo0 = frequency % ff;
  const fo = fo0 < ff / 2 ? fo0 : fo0 - ff;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    (((2 * fo) / ff) ** 3 * ffa + ((2 * fo) / ff) * (1 - ffa)) * Math.PI
  );
}

export function freqAngle9(frequency: number, ff: number, ffa: number) {
  const fo0 = frequency % ff;
  const fo = fo0 < ff / 2 ? fo0 : fo0 - ff;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    (((2 * fo) / ff) ** 9 * ffa + ((2 * fo) / ff) * (1 - ffa)) * Math.PI
  );
}
export function freqAngle27(frequency: number, ff: number, ffa: number) {
  const fo0 = frequency % ff;
  const fo = fo0 < ff / 2 ? fo0 : fo0 - ff;
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    (((2 * fo) / ff) ** 27 * ffa + ((2 * fo) / ff) * (1 - ffa)) * Math.PI
  );
}
export function freqAngleR3(frequency: number, ff: number, ffa: number) {
  const freqOffset = (frequency % ff) - ff / 2;
  const sign = Math.sign(freqOffset);
  const fo = Math.abs(freqOffset);
  return (
    ((getNote(ff) % 12) / 12) * 2 * Math.PI +
    Math.PI +
    sign *
      (((2 * fo) / ff) ** (1 / 3) * ffa + ((2 * fo) / ff) * (1 - ffa)) *
      Math.PI
  );
}

export const defaultAngleFunction = freqAngle3;
