import React from "react";
import globalHook from "use-global-hook";
import { InfluxDB } from "influx";

import * as actions from "../actions";
import { Ros } from "roslib";

import { readStateFromStorage } from "../utils/local-storage-utils";
import { Layout } from "react-grid-layout";
import Bagpiper, { BagpiperOptions } from "../Bagpiper";
import { Dashboard, DashboardInfo } from "../utils/misc-utils";

export interface GlobalActions {
  prefs: {
    toggleAppNavSticky: () => void;
    toggleLayoutDraggable: () => void;
    toggleOffline: () => void;
    toggleMonitoring: () => void;
    setLayouts: (layouts: Layout[]) => void;
    setPlayerOptions: (playerOptions: Partial<BagpiperOptions>) => void;
    setInfluxHost: (host: string) => void;
    setInfluxDb: (dbName: string) => void;
    createMarker: (dashboardName: string) => void;
  };
  rosApi: {
    connect: () => void;
    getTopics: () => void;
    setRosAddress: (address: string) => void;
    addDashboardElement: (element: CeresGraph | FieldView) => void;
    removeDashboardElement: (name: string) => void;
    renameDashboardElement: (
      oldName: string,
      element: CeresGraph | FieldView
    ) => void;
    importDashboardInfo: (dashboardInfo: DashboardInfo) => void;
    loadDashboardFile: (id: string) => void;
    readBagFile: (file: File) => void;
  };
}

export enum CeresElementType {
  GRAPH,
  FIELD_VIEW,
}

export interface CeresDashboardElement {
  elementType: CeresElementType;
  name: string;
  showDebugInfo?: boolean;
}

export interface CeresGraph extends CeresDashboardElement {
  type: CeresGraphType;
  xTopicName: string;
  xFieldPath: string;
  yAxes: CeresYAxis[];
  updateIntervalMs: number;
  graphBufferSize: number;
  rosThrottleMs: number;
  xAxisDurationS?: number;
  xAxisDomain?: [number, number];
  yAxisDomain?: [number, number];
  leftMargin?: number;
}

export interface CeresYAxis {
  topicName: string;
  fieldPath: string;
  color: string;
}

export enum CeresGraphType {
  PLOT,
}

export interface FieldView extends CeresDashboardElement {
  topicName: string;
  fieldPath: string;
  rosThrottleMs: number;
  scalar?: number;
  minMax?: [number, number];
  colorConditions?: ViewCondition[];
  displayPercentage?: boolean;
  displayUnit?: string;
}

export enum ConditionOp {
  GT = ">",
  GTE = ">=",
  LT = "<",
  LTE = "<=",
  EQ = "==",
}

export interface ViewCondition {
  condition: ConditionOp;
  threshold: number;
  color: string;
}

export enum MonitorComponent {
  CONNECTION_STATUS,
  CAN_HEART_BEAT,
  CAN_TRAFFIC,
}

export interface GlobalState {
  // rosApi
  isLoading: boolean;
  isConnected: boolean;
  rosAddress: string;
  rosClient: Ros;
  topicMessageTypeMap: Record<string, string>;
  dashboard: Dashboard;
  player: Bagpiper;
  // prefs
  playerOptions: Partial<BagpiperOptions>;
  layouts: Layout[];
  isAppNavSticky: boolean;
  isLayoutDraggable: boolean;
  isOfflineMode: boolean;
  isMonitoringEnabled: boolean;
  influxDbClient: InfluxDB | null;
  influxDb: string;
  influxHost: string;
}

const storedState = readStateFromStorage();
const initialState: GlobalState = {
  //rosApi
  isLoading: false,
  isConnected: false,
  rosAddress: `ws://${window.location.hostname}:9090`,
  rosClient: new Ros({}),
  topicMessageTypeMap: {},
  dashboard: {},
  player: new Bagpiper(storedState.playerOptions),
  // prefs
  playerOptions: {},
  layouts: [],
  isAppNavSticky: true,
  isLayoutDraggable: false,
  isOfflineMode: false,
  isMonitoringEnabled: true,
  influxDbClient: null,
  influxDb: "test_A3_9",
  influxHost: "localhost",

  ...storedState,
};

const useGlobal = globalHook<GlobalState, GlobalActions>(
  React,
  initialState,
  actions
);

export default useGlobal;
