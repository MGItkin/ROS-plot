export interface RosPlotEnv {
  rosTopicIgnore: string[];
}

export const ROS_PLOT_ENV: RosPlotEnv = {
  rosTopicIgnore: [],
  ...window.ROS_PLOT_ENV,
};

const regexPartArr = [];
for (const val of ROS_PLOT_ENV.rosTopicIgnore) {
  // escape forward slashes
  let regexPart = val.replace(/\//, "$&");
  // replace * with .*
  regexPart = regexPart.replace(/\*/, ".$&");
  regexPartArr.push(`(^${regexPart})`);
}

export const TOPIC_IGNORE_REGEX = regexPartArr.join("|");
