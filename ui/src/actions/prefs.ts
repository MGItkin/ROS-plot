import { saveStateToStorage } from "../utils/local-storage-utils";
import { Store } from "use-global-hook";
import { message, notification } from "antd";
import { Layout } from "react-grid-layout";
import { BagpiperOptions } from "../Bagpiper";
import { InfluxDB, FieldType } from "influx";
import { GlobalState, GlobalActions } from "../store";

export const toggleAppNavSticky = (
  store: Store<GlobalState, GlobalActions>
) => {
  const newState = { isAppNavSticky: !store.state.isAppNavSticky };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState });
};

export const toggleLayoutDraggable = (
  store: Store<GlobalState, GlobalActions>
) => {
  store.setState({
    ...store.state,
    isLayoutDraggable: !store.state.isLayoutDraggable,
  });
};

export const toggleOffline = (store: Store<GlobalState, GlobalActions>) => {
  const newState = { isOfflineMode: !store.state.isOfflineMode };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState });
  if (newState.isOfflineMode) {
    // switching to offline mode
    store.state.rosClient.close();
  } else {
    // switching to online mode
    store.state.player.stop();
  }
};

export const setLayouts = (
  store: Store<GlobalState, GlobalActions>,
  layouts: Layout[]
) => {
  store.setState({ ...store.state, layouts });
};

export const setPlayerOptions = (
  store: Store<GlobalState, GlobalActions>,
  playerOptions: Partial<BagpiperOptions>
) => {
  store.state.player.setOptions(playerOptions);
  const newState = {
    playerOptions: { ...store.state.playerOptions, ...playerOptions },
  };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState });
};

export const toggleMonitoring = (store: Store<GlobalState, GlobalActions>) => {
  const newState = { isMonitoringEnabled: !store.state.isMonitoringEnabled };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState });
};

export const setInfluxHost = (
  store: Store<GlobalState, GlobalActions>,
  host: string
) => {
  const newState = { influxHost: host };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState, influxDbClient: null });
  message.success("Influx DB host set!");
};

export const setInfluxDb = (
  store: Store<GlobalState, GlobalActions>,
  dbName: string
) => {
  const newState = { influxDb: dbName };
  saveStateToStorage(newState);
  store.setState({ ...store.state, ...newState, influxDbClient: null });
  message.success("Influx DB name set!");
};

export const createMarker = async (
  store: Store<GlobalState, GlobalActions>,
  dashboardName: string
) => {
  const { influxDb, influxHost } = store.state;
  const [host, port] = influxHost.split(":");
  let client = store.state.influxDbClient;

  try {
    // init InfluxDB if it doesn't exist
    if (!client) {
      client = new InfluxDB({
        host,
        port: port ? parseInt(port, 10) : undefined,
        database: influxDb,
        schema: [
          {
            measurement: "event_marker",
            fields: { placeholder: FieldType.STRING },
            tags: ["dashboard_name"],
          },
        ],
      });
    }

    const ts = new Date();
    await client.writePoints([
      {
        measurement: "event_marker",
        timestamp: ts,
        fields: { placeholder: "" },
        tags: { dashboard_name: dashboardName },
      },
    ]);
    message.success(`Successfully saved marker at ${ts.toISOString()}`);
  } catch (err) {
    if (err.message === "Failed to fetch") {
      err.message = `${err.message}: Check your Influx DB Host`;
    }
    notification.error({
      message: `Failed to write marker to InfluxDB`,
      description: err.message,
    });
  }
};
