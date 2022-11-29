import {
  FlexibleXYPlot,
  LineSeries,
  HorizontalGridLines,
  VerticalGridLines,
  XAxis,
  YAxis,
  Highlight,
  Borders
} from "react-vis";
import React, { useEffect, useState, ReactElement } from "react";
import useGlobal, { CeresGraph, CeresYAxis } from "../store";
import { Topic } from "roslib";
import { Button } from "antd";
import {
  getAxisId,
  getTopicErrorElement,
  getFieldValue,
  getFieldErrorElement,
  getEmptyBufferErrorElement
} from "../utils/data-view-utils";
import { getDefaultGraph } from "../utils/misc-utils";
import moment from "moment";

interface Area {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface GraphProps {
  graph: CeresGraph;
}

interface GraphState {
  dataMap: Map<string, Array<{ x: number; y: number }>>;
  errorElement: null | ReactElement;
  lastDrawLocation?: Area;
}

const Graph: React.FC<GraphProps> = props => {
  const [globalState, globalActions] = useGlobal();
  const [state, setState] = useState<GraphState>({
    dataMap: new Map(),
    errorElement: null
  });

  // Component did mount establish Topic listeners and graph publishing interval
  useEffect(() => {
    let bufferMap: Map<string, { x: number; y: number }[]> = new Map(
      // Create empty buffers for all y axes
      props.graph.yAxes.map((axis: CeresYAxis) => [getAxisId(axis), []])
    ); // keys are y-axis paths
    let latestPointX: null | number = null;
    let latestPointYMap: Map<string, null | number> = new Map(); // keys are y-axis paths
    let lastUpdateTimeMs = Date.now();
    const useMessageTime = props.graph.xAxisDurationS !== undefined;
    console.log(`useEffect graph: "${props.graph.name}"`);

    // Topic doesn't exist on ROS
    let yAxesMissingTopic: null | string = null;
    for (const axis of props.graph.yAxes) {
      if (!(axis.topicName in globalState.topicMessageTypeMap)) {
        yAxesMissingTopic = axis.topicName;
        break;
      }
    }
    if (
      (!useMessageTime &&
        !(props.graph.xTopicName in globalState.topicMessageTypeMap)) ||
      yAxesMissingTopic
    ) {
      setState(prevState => ({
        ...prevState,
        errorElement: getTopicErrorElement(
          props.graph.xTopicName,
          String(yAxesMissingTopic),
          !globalState.isOfflineMode
            ? () => globalActions.rosApi.getTopics()
            : undefined
        )
      }));
      return;
    } else {
      // Clear error state from previous useEffect calls
      setState(prevState => ({ ...prevState, errorElement: null }));
    }

    /**
     * try to push new point to state to be displayed (called on message or at an interval)
     * @param axisId axis buffer to push to
     * @param point
     */
    const tryPointCreation = (
      axisId: string,
      point?: { x: number; y: number }
    ) => {
      const latestPointY = latestPointYMap.get(axisId);
      const buffer = bufferMap.get(axisId) || [];

      if (point) {
        buffer.push(point);
      } else if (
        latestPointX !== null &&
        latestPointY !== undefined &&
        latestPointY !== null
      ) {
        buffer.push({ x: latestPointX, y: latestPointY });
        latestPointYMap.delete(axisId);
      } else {
        return;
      }

      // Use xAxis Duration if it exists
      if (props.graph.xAxisDurationS !== undefined) {
        if (
          buffer[buffer.length - 1].x - buffer[0].x >
          props.graph.xAxisDurationS
        ) {
          buffer.shift();
        }
      } else {
        // fallback to using buffer size
        if (buffer.length > props.graph.graphBufferSize) {
          buffer.shift();
        }
      }

      if (Date.now() - lastUpdateTimeMs > props.graph.updateIntervalMs) {
        setState((prevState: GraphState) => {
          return {
            ...prevState,
            dataMap: bufferMap,
            errorElement: null
          };
        });
        lastUpdateTimeMs = Date.now();
      }
    };

    const xCallback = (message?: any) => {
      if (!message) {
        // seek event has occurred, clear buffer
        latestPointX = null;
        return;
      }
      try {
        const data = getFieldValue(props.graph.xFieldPath, message);
        if (typeof data === "number") {
          // write value to all points
          latestPointX = data;
        }
      } catch (err) {
        setState(prevState => ({
          ...prevState,
          errorElement: getFieldErrorElement(
            props.graph.xTopicName,
            props.graph.xFieldPath
          )
        }));
      }
    };
    const yCallbacks = props.graph.yAxes.map(
      (axis: CeresYAxis) => (message?: any) => {
        const axisId = getAxisId(axis);
        if (!message) {
          // seek event has occurred, clear buffer
          latestPointYMap.set(axisId, null);
          bufferMap.set(axisId, []);
          return;
        }
        try {
          const data = getFieldValue(axis.fieldPath, message);
          if (typeof data === "number") {
            latestPointYMap.set(axisId, data);
            if (useMessageTime) {
              const combinedTime = getFieldValue(
                "/header/stamp/combined_time",
                message
              );
              tryPointCreation(axisId, { x: combinedTime as number, y: data });
            } else {
              tryPointCreation(axisId);
            }
          }
        } catch (err) {
          setState(prevState => ({
            ...prevState,
            errorElement: getFieldErrorElement(
              axis.topicName,
              `${axis.fieldPath}${
                useMessageTime ? "or /header/stamp/combined_time" : ""
              }`
            )
          }));
        }
      }
    );

    if (globalState.isOfflineMode) {
      const player = globalState.player;
      if (!useMessageTime) {
        player.subscribe(props.graph.xTopicName, xCallback);
      }
      for (let i = 0; i < yCallbacks.length; i++) {
        const callback = yCallbacks[i];
        const topic = props.graph.yAxes[i].topicName;
        player.subscribe(topic, callback);
      }
      return function cleanup() {
        if (!useMessageTime) {
          player.unSubscribe(xCallback);
        }
        for (const c of yCallbacks) {
          player.unSubscribe(c);
        }
      };
    } else {
      // create topic listeners
      const xTopic = new Topic({
        ros: globalState.rosClient,
        name: props.graph.xTopicName,
        messageType: globalState.topicMessageTypeMap[props.graph.xTopicName],
        throttle_rate: props.graph.rosThrottleMs
      });
      const yTopics = props.graph.yAxes.map(
        (axis: CeresYAxis) =>
          new Topic({
            ros: globalState.rosClient,
            name: axis.topicName,
            messageType: globalState.topicMessageTypeMap[axis.topicName],
            throttle_rate: props.graph.rosThrottleMs
          })
      );

      if (!useMessageTime) {
        xTopic.subscribe(xCallback);
      }
      for (let i = 0; i < yCallbacks.length; i++) {
        const callback = yCallbacks[i];
        const topic = yTopics[i];
        topic.subscribe(callback);
      }

      // Cleanup function called on every useEffect dep change of on component dismount
      return function cleanup() {
        console.log(`cleanup useEffect graph: "${props.graph.name}"`);
        if (!useMessageTime) {
          xTopic.unsubscribe(xCallback);
        }
        for (let i = 0; i < yCallbacks.length; i++) {
          const callback = yCallbacks[i];
          const topic = yTopics[i];
          topic.unsubscribe(callback);
        }
        setState((prevState: GraphState) => ({
          ...prevState,
          data: new Map()
        }));
      };
    }
  }, [
    globalState.rosClient,
    globalState.topicMessageTypeMap,
    globalState.isOfflineMode,
    globalState.player,
    props.graph.name,
    props.graph.rosThrottleMs,
    props.graph.updateIntervalMs,
    props.graph.xTopicName,
    props.graph.xFieldPath,
    props.graph.xAxisDurationS,
    props.graph.yAxes,
    props.graph.graphBufferSize,
    globalActions.rosApi
  ]);

  if (state.errorElement) {
    return state.errorElement;
  }

  let emptyCount = 0;
  const lineSeriesElements = props.graph.yAxes.map(
    (axis: CeresYAxis, i: number) => {
      const data = state.dataMap.get(getAxisId(axis)) || [];
      if (data.length === 0) emptyCount++;
      return (
        <LineSeries
          key={i}
          orientation="horizontal"
          color={axis.color}
          data={data}
        />
      );
    }
  );

  if (emptyCount === props.graph.yAxes.length) {
    return getEmptyBufferErrorElement();
  }

  return (
    <div className="graph">
      <FlexibleXYPlot
        animation={false}
        xDomain={
          state.lastDrawLocation
            ? [state.lastDrawLocation.left, state.lastDrawLocation.right]
            : props.graph.xAxisDomain
        }
        yDomain={
          state.lastDrawLocation
            ? [state.lastDrawLocation.bottom, state.lastDrawLocation.top]
            : props.graph.yAxisDomain
        }
        margin={{
          left: props.graph.leftMargin || getDefaultGraph().leftMargin
        }}
      >
        <HorizontalGridLines />
        <VerticalGridLines />
        {lineSeriesElements}
        <Borders className="graph-border" />
        <XAxis
          title={`${props.graph.xTopicName}${
            props.graph.xFieldPath
          } (~${moment
            .duration(props.graph.xAxisDurationS, "seconds")
            .humanize()})`}
          tickFormat={(tickS: number) => moment.unix(tickS).format("mm:ss")}
          tickTotal={5}
        />
        <YAxis />
        <Highlight
          onBrushEnd={(area: Area) =>
            setState((g: GraphState) => ({ ...g, lastDrawLocation: area }))
          }
          onDrag={(area: Area) =>
            setState((g: GraphState) => {
              if (state.lastDrawLocation === undefined)
                return { ...g, lastDrawLocation: area };
              return {
                ...g,
                lastDrawLocation: {
                  bottom:
                    state.lastDrawLocation.bottom + (area.top - area.bottom),
                  left: state.lastDrawLocation.left - (area.right - area.left),
                  right:
                    state.lastDrawLocation.right - (area.right - area.left),
                  top: state.lastDrawLocation.top + (area.top - area.bottom)
                }
              };
            })
          }
        />
      </FlexibleXYPlot>
      <div className="graph-overlay">
        {props.graph.showDebugInfo && (
          <div className="debug-info">
            point count:{" "}
            {props.graph.yAxes.map((axis: CeresYAxis, i: number) => (
              <span key={i}>
                {" "}
                - {axis.fieldPath}: (
                {(state.dataMap.get(getAxisId(axis)) || []).length})
              </span>
            ))}
          </div>
        )}
        {state.lastDrawLocation && (
          <Button
            icon="zoom-out"
            onClick={() =>
              setState((g: GraphState) => ({
                ...g,
                lastDrawLocation: undefined
              }))
            }
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default Graph;
