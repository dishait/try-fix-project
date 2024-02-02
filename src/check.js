import { version } from "process";

const [major] = version.slice(1).split(".");

export function isModernNode() {
  return Number(major) >= 18;
}

export const nodeMajorVersion = Number(major);
