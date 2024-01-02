const { version } = require("process");

const [major] = version.slice(1).split(".");

function isModernNode() {
  return Number(major) >= 18;
}

module.exports = {
  isModernNode,
  nodeMajorVersion: Number(major),
};
