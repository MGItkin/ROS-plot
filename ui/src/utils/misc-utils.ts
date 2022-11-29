import {
  CeresGraph,
  CeresGraphType,
  CeresElementType,
  FieldView,
} from "../store";
import moment from "moment";
import { DATE_FORMAT } from "../globals";
import { Layout } from "react-grid-layout";
import { GRAPH_LINE_COLORS } from "./constants";

/** Creates a download link, clicks it, and removes it */
export function downloadObject(fileName: string, dataUri: string): void {
  const a = document.createElement("a");
  a.setAttribute("href", dataUri);
  a.setAttribute("download", fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export type Dashboard = Record<string, CeresGraph | FieldView>;

export interface DashboardInfo {
  dashboard: Dashboard;
  layouts: Layout[];
}

/** Export Dashboard to JSON file */
export function exportDashboard(dashboardInfo: DashboardInfo): void {
  const blob = new Blob([JSON.stringify(dashboardInfo)], {
    type: "application/json",
  });
  const objectURL = URL.createObjectURL(blob);
  const fileName = `${getDefaultDashboardName()}.json`;
  downloadObject(fileName, objectURL);
  URL.revokeObjectURL(objectURL);
}

/** Default CeresGraph object */
export function getDefaultGraph(): CeresGraph {
  return {
    name: `graph-${moment().format(DATE_FORMAT)}`,
    elementType: CeresElementType.GRAPH,
    type: CeresGraphType.PLOT,
    xTopicName: "/clock",
    xFieldPath: "/clock/combined_time",
    yAxes: [{ topicName: "", fieldPath: "", color: GRAPH_LINE_COLORS[0] }],
    updateIntervalMs: 100,
    graphBufferSize: 500,
    rosThrottleMs: 0,
    xAxisDurationS: 60,
    leftMargin: 50,
  };
}

export function getDefaultDashboardName(): string {
  return `ros-plot-dashboard-${moment().format(DATE_FORMAT)}`;
}

/** Default ReactGridLayout Layout object */
export function getDefaultLayout(name: string): Layout {
  return { i: name, x: 0, y: 0, w: 5, h: 10, minH: 2, minW: 1 };
}

/** Default fieldView object */
export function getDefaultFieldView(): FieldView {
  return {
    name: `field-view-${moment().format(DATE_FORMAT)}`,
    elementType: CeresElementType.FIELD_VIEW,
    topicName: "",
    fieldPath: "",
    rosThrottleMs: 0,
  };
}

/** Decode a base64 string back into uint8[] */
export function base64ToUint8Array(base64: string): Uint8Array {
  const raw = atob(base64);
  var rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}
