import { Store } from "use-global-hook";
import { CeresGraph, FieldView, GlobalState, GlobalActions } from "../store";
import { saveStateToStorage } from "../utils/local-storage-utils";
import { Ros } from "roslib";
import { Layout } from "react-grid-layout";
import { getDefaultLayout, DashboardInfo } from "../utils/misc-utils";
import { message } from "antd";
import { getDashboard } from "../clients/dashboardClient";
import { TOPIC_IGNORE_REGEX } from "../env";

const handleError = (store: Store<GlobalState, GlobalActions>, err?: Error) => {
  if (err) {
    console.error(err);
  } else {
    console.error("ROS connection error (no error object provided)");
  }
};

export const connect = (store: Store<GlobalState, GlobalActions>) => {
  store.setState({ ...store.state, isLoading: true });
  const ros = store.state.rosClient;

  ros.on("connection", () => {
    // initial call to getTopics will set the state to connected and loading to false.
    // this is done to prevent the dashboard graphs from connecting before topic info is available
    getTopics(store);
  });
  ros.on("error", (err) => handleError(err));
  ros.on("close", () => {
    store.setState({ ...store.state, isConnected: false, isLoading: false });
  });
  ros.connect(store.state.rosAddress);
};

export const getTopics = (store: Store<GlobalState, GlobalActions>) => {
  if (store.state.isOfflineMode) {
    // topics are known when loading .bag file and all components will re-render when a new file is loaded
    return;
  }
  store.state.rosClient.getTopics(
    (response: any) => {
      const map: Record<string, string> = {};

      const filteredTopics = response.topics.filter((topic: string) => {
        const matchArr = topic.match(TOPIC_IGNORE_REGEX);
        if (TOPIC_IGNORE_REGEX && matchArr !== null && matchArr[0] === topic) {
          return false;
        }
        return true;
      });
      filteredTopics.forEach(
        (v: string, i: number) => (map[v] = response.types[i])
      );

      // compare new map with old map to decide if state should be updated.
      if (
        JSON.stringify(map) !== JSON.stringify(store.state.topicMessageTypeMap)
      ) {
        store.setState({
          ...store.state,
          topicMessageTypeMap: map,
          isConnected: true,
          isLoading: false,
        });
      } else {
        store.setState({
          ...store.state,
          isConnected: true,
          isLoading: false,
        });
      }
    },
    (err) => handleError(store, err)
  );
};

export const setRosAddress = (
  store: Store<GlobalState, GlobalActions>,
  address: string
) => {
  store.state.rosClient.close();
  store.setState({
    ...store.state,
    rosClient: new Ros({}),
    rosAddress: address,
    isConnected: false,
  });
  saveStateToStorage({ rosAddress: address });
  connect(store);
};

export const addDashboardElement = (
  store: Store<GlobalState, GlobalActions>,
  element: CeresGraph | FieldView
) => {
  const newDashboard = { ...store.state.dashboard, [element.name]: element };
  const newLayouts: Layout[] = [
    ...store.state.layouts,
    getDefaultLayout(element.name),
  ];
  store.setState({
    ...store.state,
    dashboard: newDashboard,
    layouts: newLayouts,
  });
};

export const removeDashboardElement = (
  store: Store<GlobalState, GlobalActions>,
  name: string
) => {
  const newDashboard = { ...store.state.dashboard };
  delete newDashboard[name];
  const newLayouts = [...store.state.layouts];
  const index = newLayouts.findIndex((layout) => layout.i === name);
  if (index > -1) {
    newLayouts.splice(index, 1);
  }
  store.setState({
    ...store.state,
    dashboard: newDashboard,
    layouts: newLayouts,
  });
};

export const renameDashboardElement = (
  store: Store<GlobalState, GlobalActions>,
  oldName: string,
  element: CeresGraph | FieldView
) => {
  const newDashboard = { ...store.state.dashboard };
  newDashboard[element.name] = element;
  delete newDashboard[oldName];
  const newLayouts = [...store.state.layouts];
  const index = newLayouts.findIndex((layout) => layout.i === oldName);
  if (index > -1) {
    newLayouts[index].i = element.name;
  }
  store.setState({
    ...store.state,
    dashboard: newDashboard,
    layouts: newLayouts,
  });
};

export const importDashboardInfo = (
  store: Store<GlobalState, GlobalActions>,
  dashboardInfo: DashboardInfo
) => {
  store.setState({ ...store.state, ...dashboardInfo });
};

export const loadDashboardFile = async (
  store: Store<GlobalState, GlobalActions>,
  id: string
) => {
  try {
    const dashInfo = await getDashboard(id);
    store.setState({ ...store.state, ...dashInfo });
  } catch (err) {
    message.error(`Failed to load dashboard '${id}': ${err.message}`);
  }
};

export const readBagFile = async (
  store: Store<GlobalState, GlobalActions>,
  file: File
) => {
  store.setState({ ...store.state, isLoading: true });
  try {
    const result = await store.state.player.open(file);
    for (const topic of Object.keys(result)) {
      const matchArr = topic.match(TOPIC_IGNORE_REGEX);
      if (TOPIC_IGNORE_REGEX && matchArr !== null && matchArr[0] === topic) {
        delete result[topic];
      }
    }
    store.setState({
      ...store.state,
      topicMessageTypeMap: result,
      isLoading: false,
    });
  } catch (err) {
    const errMessage = `Error decoding Bag file: ${err.message}`;
    message.error(errMessage);
    store.setState({ ...store.state, isLoading: false });
  }
};
