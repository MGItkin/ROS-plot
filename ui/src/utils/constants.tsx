import React from "react";
import { Select, Icon } from "antd";

export const monitoringComponentsNames = [
  "General Status",
  "CAN Status",
  "CAN Logging Status"
];

export const GRAPH_LINE_COLORS = [
  "red",
  "blue",
  "purple",
  "green",
  "orange",
  "brown",
  "#2196f3",
  "#9ccc65"
];

export const FIELD_CONDITION_COLORS = [
  "#87d068",
  "#f5222d",
  "orange",
  "#fdd835"
];

function getColorIcon(color: string): React.ReactNode {
  return (
    <Icon>
      <svg
        style={{ width: "1em", height: "1em", fill: color }}
        viewBox="0 0 1024 1024"
      >
        <path d="M864 64H160C107 64 64 107 64 160v704c0 53 43 96 96 96h704c53 0 96-43 96-96V160c0-53-43-96-96-96z" />
      </svg>
    </Icon>
  );
}

export const graphColorOptions = GRAPH_LINE_COLORS.map((color: string) => (
  <Select.Option key={color} value={color}>
    {getColorIcon(color)}
  </Select.Option>
));

export const conditionColorOptions = FIELD_CONDITION_COLORS.map(
  (color: string) => (
    <Select.Option key={color} value={color}>
      {getColorIcon(color)}
    </Select.Option>
  )
);
