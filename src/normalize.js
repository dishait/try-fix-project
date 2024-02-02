import { isObject } from "m-type-tools";
import { nodeMajorVersion } from "./check";
import { createDefu } from "defu";

function normalizeNodeSassVersion() {
  switch (nodeMajorVersion) {
    case 20:
      return "^9.0.0";
    case 19:
    case 18:
      return "^8.0.0";
    case 17:
      return "^7.0.3";
    case 16:
    case 15:
      return "^6.0.1";
    case 14:
      return "^4.14.1";
    default:
      break;
  }
}

export const defu = createDefu((defaultObject, key, value) => {
  // node-sass 需要自动
  if (isObject(value) && "node-sass" in value) {
    value["node-sass"] = normalizeNodeSassVersion() ?? value["node-sass"];
    return false;
  }

  if (Array.isArray(value)) {
    // 保持数组类型是唯一的
    defaultObject[key] = [...new Set([defaultObject[key], value].flat())];
    return true;
  }
  return false;
});
