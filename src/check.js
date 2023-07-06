const { version } = require("process");

function nodeIsLts() {
  const [major] = version.slice(1).split(".");
  return Number(major) >= 18;
}

module.exports = {
  nodeIsLts,
};
