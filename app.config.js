const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    buildNumber: "14",
  },
};
