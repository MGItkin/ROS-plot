import React, { ReactElement } from "react";
import { COMBINED_TIME_KEY } from "../globals";
import { CeresYAxis } from "../store";
import { Result, Empty } from "antd";
import { Button } from "antd/lib/radio";

export function getAxisId(axis: CeresYAxis): string {
  return axis.topicName + axis.fieldPath;
}

export function getFieldValue(
  path: string,
  message: any
): string | number | Uint8Array {
  const keyList = path.split("/");
  let value = message;

  for (const key of keyList) {
    if (key === COMBINED_TIME_KEY) {
      if ("secs" in value) {
        // ROS Bridge message headers have secs, nsecs
        return value.secs + value.nsecs / Math.pow(10, 9);
      }
      // rosbag.js decodes as sec, nsec
      return value.sec + value.nsec / Math.pow(10, 9);
    }
    if (key.length) {
      value = value[key];
    }
  }
  if (value === undefined || value === null) {
    throw new Error(`Message data is undefined or null for ${path}`);
  }
  return value;
}

export function getTopicErrorElement(
  xTopic: string,
  yTopic: string | null,
  retryFunc?: () => void
): ReactElement {
  let text = `topic: "${xTopic}" does not exist on the ROS bus.`;
  if (yTopic) {
    text = `Both X-axis topic: "${xTopic}" and Y-axis topic: "${yTopic}" should exist in ROS to graph.`;
  }
  return (
    <Result
      status="warning"
      title="Topic Not Found!"
      subTitle={text}
      extra={
        retryFunc ? (
          <Button onClick={retryFunc}>Refresh Topics</Button>
        ) : (
          undefined
        )
      }
    />
  );
}

export function getFieldErrorElement(
  topicName: string,
  fieldName: string
): ReactElement {
  return (
    <Result
      status="warning"
      title="Unable to Parse Field!"
      subTitle={`Field name: "${fieldName}" does not exist on topic: "${topicName}".`}
    />
  );
}

export function getEmptyBufferErrorElement(): ReactElement {
  return (
    <Empty description="No data received from X-axis topic/path or any Y-axis topic/field." />
  );
}

export function getNoDataErrorElement(): ReactElement {
  return (
    <Empty description="No data received from the selected topic/field." />
  );
}
