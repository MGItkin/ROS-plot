import React, { useEffect, ReactElement, useState } from "react";
import { Icon, Descriptions, Collapse, Button } from "antd";
import useGlobal from "../store";
import { Topic } from "roslib";
import { base64ToUint8Array } from "../utils/misc-utils";

interface MonitorState {
  bitArrayByte0: number[]; // flipped bit array for byte 0 of the provided heartbeat data number such that bitArrayByte0[0] is the first bit.
  bitArrayByte1: number[]; // flipped bit array for byte 1 of the provided heartbeat data number such that bitArrayByte1[0] is the first bit.
  errorElement: null | ReactElement;
}

const HEARTBEAT_TOPIC_NAME = "/heartbeat";
const DEFAULT_BIT_ARR = [...Array(16)].map((v, i) => (0 >> i) & 1); // 0'd out bit array for 1 byte

const Monitor: React.FC<{}> = () => {
  const [globalState, globalActions] = useGlobal();
  const [state, setState] = useState<MonitorState>({
    bitArrayByte0: DEFAULT_BIT_ARR,
    bitArrayByte1: DEFAULT_BIT_ARR,
    errorElement: null
  });
  const generalCount = state.bitArrayByte0[0];
  let canBusCount = 0;
  for (let i = 4; i < 8; i++) {
    canBusCount += state.bitArrayByte0[i];
    canBusCount += state.bitArrayByte1[i];
  }

  // Component did mount establish Topic listeners and graph publishing interval
  useEffect(() => {
    console.log("useEffect Monitor Heartbeat");

    // Topic doesn't exist on ROS bus
    if (!(HEARTBEAT_TOPIC_NAME in globalState.topicMessageTypeMap)) {
      setState(prevState => ({
        ...prevState,
        errorElement: (
          <>
            <span>Topic {HEARTBEAT_TOPIC_NAME} not found!</span>
            <Button onClick={globalActions.rosApi.getTopics}>
              Refresh Topics
            </Button>
          </>
        )
      }));
      return;
    } else {
      // Clear error state from previous useEffect calls
      setState(prevState => ({ ...prevState, errorElement: null }));
    }

    const callback = (message?: any) => {
      try {
        if (message === undefined) {
          setState(prevState => ({
            ...prevState,
            errorElement: null,
            bitArrayByte0: DEFAULT_BIT_ARR
          }));
          return;
        }
        // accept messages with format /data and /data/0
        if (!message || !message.data) {
          throw new Error(
            `Field: "/data" does not exist on ${HEARTBEAT_TOPIC_NAME}`
          );
        }

        let value: Uint8Array;
        if (typeof message.data === "string") {
          value = base64ToUint8Array(message.data);
        } else if (message.data.constructor === Uint8Array) {
          value = message.data;
        } else {
          throw new Error(
            `Field: "/data" is not of type Uint8Array | base64 string`
          );
        }

        setState(prevState => ({
          ...prevState,
          errorElement: null,
          bitArrayByte0: [...Array(16)].map((x, i) => (value[0] >> i) & 1),
          bitArrayByte1: [...Array(16)].map((x, i) => (value[1] >> i) & 1)
        }));
      } catch (err) {
        setState(prevState => ({
          ...prevState,
          errorElement: (
            <span>
              {err.message} Received: "{message ? message.data : message}"
            </span>
          )
        }));
      }
    };

    if (globalState.isOfflineMode) {
      const player = globalState.player;
      player.subscribe(HEARTBEAT_TOPIC_NAME, callback);

      return function cleanup() {
        player.unSubscribe(callback);
      };
    } else {
      // create topic listeners
      const topic = new Topic({
        ros: globalState.rosClient,
        name: HEARTBEAT_TOPIC_NAME,
        messageType: globalState.topicMessageTypeMap[HEARTBEAT_TOPIC_NAME]
      });
      topic.subscribe(callback);

      // Cleanup function called on every useEffect dep change of on component dismount
      return function cleanup() {
        console.log(`cleanup useEffect Monitoring`);
        topic.unsubscribe(callback);
        setState((prevState: MonitorState) => ({
          ...prevState,
          bitArrayByte0: DEFAULT_BIT_ARR
        }));
      };
    }
  }, [
    globalState.rosClient,
    globalState.topicMessageTypeMap,
    globalState.isOfflineMode,
    globalState.player,
    globalActions.rosApi
  ]);

  const headerContent = (
    <>
      <span> General {generalCount}/1</span>
      {getStatusFromBit(Number(generalCount === 1))}
      <span>CAN Bus {canBusCount}/8</span>
      {getStatus(
        canBusCount !== 8 ? (canBusCount > 0 ? "warn" : "error") : "ok"
      )}
    </>
  );

  return (
    <Collapse className="monitor">
      <Collapse.Panel
        key="1"
        disabled={state.errorElement !== null}
        header={
          <div className="monitor-header">
            <span>
              <b>Health Monitoring:</b>
            </span>
            {state.errorElement ? state.errorElement : headerContent}
          </div>
        }
      >
        <div className="collapse-detail">
          {getComponentDetail(state.bitArrayByte0, state.bitArrayByte1)}
        </div>
      </Collapse.Panel>
    </Collapse>
  );
};

function getStatusFromBit(bit: number): React.ReactNode {
  return getStatus(bit ? "ok" : "error");
}

function getStatus(
  status: "ok" | "warn" | "error",
  showText = false
): React.ReactNode {
  if (status === "ok") {
    return (
      <>
        <Icon type="check-circle" theme="filled" twoToneColor="green" />
        {showText && <span>OK</span>}
      </>
    );
  }
  if (status === "warn") {
    return (
      <>
        <Icon type="warning" theme="filled" twoToneColor="yellow" />
        {showText && <span>WARNING</span>}
      </>
    );
  }
  return (
    <>
      <Icon type="close-circle" theme="filled" />
      {showText && <span>ERROR</span>}
    </>
  );
}

function getComponentDetail(
  bitArray0: number[],
  bitArray1: number[]
): React.ReactNode {
  const canStatusBits = [4, 5, 6, 7]; // from Byte 0 Array
  const canLoggingBits = [4, 5, 6, 7]; // from Byte 1 Array

  return (
    <>
      <Descriptions title="General" size="small" bordered={false}>
        <Descriptions.Item label="IPC Started Properly">
          {getStatusFromBit(bitArray0[0])}
        </Descriptions.Item>
      </Descriptions>
      <Descriptions title="Status" size="small" bordered={false}>
        {canStatusBits.map((v, i) => (
          <Descriptions.Item key={i} label={`CAN_${i}`}>
            {getStatusFromBit(bitArray0[v])}
          </Descriptions.Item>
        ))}
      </Descriptions>
      <Descriptions title="Logging" size="small" bordered={false}>
        {canLoggingBits.map((v, i) => (
          <Descriptions.Item key={i} label={`CAN_${i}`}>
            {getStatusFromBit(bitArray1[v])}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </>
  );
}

export default Monitor;
