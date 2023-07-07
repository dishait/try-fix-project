const { version } = require("process");

const [major] = version.slice(1).split(".");

function nodeIsLts() {
  return Number(major) >= 18;
}

module.exports = {
  nodeIsLts,
  nodeMajorVersion: Number(major),
};
