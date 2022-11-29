import React, { useEffect, useState, ReactElement } from "react";
import useGlobal, { FieldView, ViewCondition, ConditionOp } from "../store";
import { Topic } from "roslib";
import {
  getTopicErrorElement,
  getFieldValue,
  getFieldErrorElement,
  getNoDataErrorElement
} from "../utils/data-view-utils";
import Title from "antd/lib/typography/Title";
import { Progress } from "antd";

interface FieldViewProps {
  fView: FieldView;
  value?: number | string; // manually control value
}

interface FieldViewState {
  data: null | string | number;
  errorElement: null | ReactElement;
}

const FieldViewDisplay: React.FC<FieldViewProps> = ({ fView, value }) => {
  const [globalState, globalActions] = useGlobal();
  const [state, setState] = useState<FieldViewState>({
    data: value !== undefined ? value : null,
    errorElement: null
  });

  const conditionColor = computeConditionColor(
    state.data,
    fView.colorConditions || []
  );

  useEffect(() => {
    if (value !== undefined)
      setState((fState: FieldViewState) => ({ ...fState, data: value }));
  }, [value]);

  // Component did mount establish Topic listeners and graph publishing interval
  useEffect(() => {
    // Run in controlled mode where the given value is used
    if (value !== undefined) {
      return;
    }
    console.log(`useEffect field view: "${fView.name}"`);

    // Topic doesn't exist on ROS bus
    if (!(fView.topicName in globalState.topicMessageTypeMap)) {
      setState(prevState => ({
        ...prevState,
        errorElement: getTopicErrorElement(
          fView.topicName,
          null,
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

    let lastURL: null | string = null;
    const callback = (message?: any) => {
      if (message === undefined) {
        setState(prevState => ({
          ...prevState,
          errorElement: null,
          data: null
        }));
        return;
      }
      try {
        const value = getFieldValue(fView.fieldPath, message);
        let stateData: string | number;
        if (
          typeof value === "object" &&
          value.constructor === Uint8Array &&
          value.length > 2
        ) {
          const blob = new Blob([value], { type: "image/png" });
          if (lastURL !== null) {
            URL.revokeObjectURL(lastURL);
          }
          stateData = URL.createObjectURL(blob);
          lastURL = stateData;
        } else if (ArrayBuffer.isView(value) || Array.isArray(value)) {
          stateData = `[${value.toString()}]`;
        } else {
          stateData = value as string | number;
        }
        setState(prevState => ({
          ...prevState,
          errorElement: null,
          data: stateData
        }));
      } catch (err) {
        setState(prevState => ({
          ...prevState,
          errorElement: getFieldErrorElement(fView.topicName, fView.fieldPath)
        }));
      }
    };

    if (globalState.isOfflineMode) {
      const player = globalState.player;
      player.subscribe(fView.topicName, callback);

      return function cleanup() {
        player.unSubscribe(callback);
      };
    } else {
      // create topic listeners
      const topic = new Topic({
        ros: globalState.rosClient,
        name: fView.topicName,
        messageType: globalState.topicMessageTypeMap[fView.topicName],
        throttle_rate: fView.rosThrottleMs
      });
      topic.subscribe(callback);

      // Cleanup function called on every useEffect dep change of on component dismount
      return function cleanup() {
        console.log(`cleanup useEffect fieldView: "${fView.name}"`);
        topic.unsubscribe(callback);
        setState((prevState: FieldViewState) => ({ ...prevState, data: "" }));
      };
    }
  }, [
    fView,
    value,
    globalState.rosClient,
    globalState.topicMessageTypeMap,
    globalState.isOfflineMode,
    globalState.player,
    globalActions.rosApi
  ]);

  const scalar = fView.scalar || 1;
  let element = (
    <Title level={3} className="truncated">
      {state.data}
    </Title>
  );
  if (state.errorElement) {
    element = state.errorElement;
  } else if (state.data === null) {
    element = getNoDataErrorElement();
  } else if (
    typeof state.data === "string" &&
    state.data.length % 4 === 0 &&
    state.data.length > 50
  ) {
    // base64 string image
    element = (
      <img
        alt={`${fView.topicName}/${fView.fieldPath}`}
        src={`data:image/jpeg;base64,${state.data}`}
      />
    );
  } else if (typeof state.data === "string" && state.data.includes("blob")) {
    // URL object image
    element = (
      <img alt={`${fView.topicName}/${fView.fieldPath}`} src={state.data} />
    );
  } else if (
    typeof state.data === "number" ||
    (typeof state.data === "string" && !isNaN(parseFloat(state.data)))
  ) {
    let numVal =
      typeof state.data === "string" ? parseFloat(state.data) : state.data;
    numVal *= scalar;
    const printValue = numVal.toFixed(2).replace(/[.,]00$/, "");
    const displayUnit = fView.displayUnit || "";

    if (fView.minMax) {
      const minMaxDelta = fView.minMax[1] - fView.minMax[0];
      const percent = (numVal / minMaxDelta) * 100;
      element = (
        <Progress
          strokeColor={conditionColor || undefined}
          status="normal"
          type="dashboard"
          gapDegree={90}
          percent={Number(percent.toFixed())}
          format={
            !fView.displayPercentage
              ? () => `${numVal.toFixed(2)} ${displayUnit}`
              : undefined
          }
        />
      );
    } else {
      element = (
        <Title level={3} className="truncated">
          {`${printValue} ${displayUnit || ""}`}
        </Title>
      );
    }
  }

  return (
    <div
      className="field-view"
      style={
        !fView.minMax && conditionColor
          ? { backgroundColor: conditionColor }
          : undefined
      }
    >
      {element}
    </div>
  );
};

function computeConditionColor(
  value: number | string | null,
  conditions: ViewCondition[]
): string | null {
  if (value === null) return null;
  const parsedVal = typeof value === "string" ? parseFloat(value) : value;
  let lastMatched: ViewCondition | null = null;
  for (const c of conditions) {
    if (evalCondition(parsedVal, c.threshold, c.condition)) {
      lastMatched = c;
    }
  }
  return lastMatched ? lastMatched.color : null;
}

function evalCondition(a: number, b: number, op: ConditionOp): boolean {
  switch (op) {
    case ConditionOp.EQ:
      return a === b;

    case ConditionOp.GT:
      return a > b;

    case ConditionOp.GTE:
      return a >= b;

    case ConditionOp.LT:
      return a < b;

    case ConditionOp.LTE:
      return a <= b;

    default:
      return false;
  }
}

export default FieldViewDisplay;
