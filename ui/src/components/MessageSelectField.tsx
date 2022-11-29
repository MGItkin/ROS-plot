import React, { useState, useEffect, useRef } from "react";
import { AutoComplete, Tooltip } from "antd";
import { SelectValue } from "antd/lib/select";
import {
  readFieldPathsFromStorage,
  saveFieldPathsToCache
} from "../utils/local-storage-utils";
import useGlobal from "../store";
import { Topic } from "roslib";
import { COMBINED_TIME_KEY } from "../globals";

interface MessageSelectFieldsProps {
  topicName: string;
  messageType: string;
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

const MAX_RENDER_LEN = 200;
const DEFAULT_PATH = "/data";

const MessageSelectField: React.FC<MessageSelectFieldsProps> = props => {
  const globalState = useGlobal()[0];
  const [fieldPaths, setFieldPaths] = useState<string[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);

  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    if (!props.messageType || !props.topicName) {
      return;
    }
    setFieldPaths([]);
    // Cleanup previous topic listeners
    if (cleanupRef.current !== undefined) {
      cleanupRef.current();
    }

    // check cache for message type mapping
    const cachedPaths = readFieldPathsFromStorage(props.messageType);
    if (cachedPaths) {
      setFieldPaths(cachedPaths);
      return;
    }

    if (globalState.isOfflineMode) {
      const message = globalState.player.getFirstTopicMessage(props.topicName);
      const paths = getPathsFromMessage(message);
      saveFieldPathsToCache(props.messageType, paths);
      setFieldPaths(paths);
      return;
    }

    // read 1 message from topic to create path array
    const topic = new Topic({
      ros: globalState.rosClient,
      name: props.topicName,
      messageType: props.messageType
    });
    const messageHandler = (message: any) => {
      const paths = getPathsFromMessage(message);

      topic.unsubscribe(messageHandler);
      saveFieldPathsToCache(props.messageType, paths);
      setFieldPaths(paths);
      setLoading(false);
    };
    setLoading(true);
    topic.subscribe(messageHandler);

    cleanupRef.current = () => {
      topic.unsubscribe(messageHandler);
      setLoading(false);
    };
    return cleanupRef.current;
  }, [
    props.messageType,
    props.topicName,
    globalState.rosClient,
    globalState.isOfflineMode,
    globalState.player
  ]);

  const onChange = (value: SelectValue) => {
    if (typeof value === "string") props.onChange(value);
  };

  // Ref for tracking if attempting to apply a default has fired
  // One attempt should be made every time the topic name changes or paths change
  const defaultHasFired = useRef<boolean>(false);
  useEffect(() => {
    defaultHasFired.current = false;
  }, [props.topicName, fieldPaths]);
  if (
    !defaultHasFired.current &&
    !props.value &&
    fieldPaths.includes(DEFAULT_PATH)
  ) {
    props.onChange(DEFAULT_PATH);
  }
  defaultHasFired.current = true;

  const formField = (
    <AutoComplete
      style={{ width: "100%" }}
      value={props.value}
      disabled={props.disabled}
      dataSource={
        fieldPaths.length > MAX_RENDER_LEN
          ? fieldPaths.slice(0, MAX_RENDER_LEN)
          : fieldPaths
      }
      onSelect={onChange}
      onSearch={onChange}
      placeholder={isLoading ? "loading paths..." : "enter path"}
      filterOption={true}
    />
  );
  const showCombinedTimeTip = props.value.includes(COMBINED_TIME_KEY);
  if (
    !isLoading &&
    fieldPaths.length <= MAX_RENDER_LEN &&
    !showCombinedTimeTip
  ) {
    return formField;
  }
  let title = `Waiting to recieve message on the selected topic: "${props.topicName}" to generate schema. The Field path can still be entered manually.`;
  if (fieldPaths.length > MAX_RENDER_LEN) {
    title = `Autocomplete results truncated from ${fieldPaths.length} to ${MAX_RENDER_LEN}`;
  }
  if (showCombinedTimeTip) {
    title =
      "The field path '/header/stamp/combined_time' is a UI only path that will combine both stamp fields as (seconds + nanoseconds).";
  }
  return (
    <Tooltip placement="topRight" title={title}>
      {formField}
    </Tooltip>
  );
};

function getPathsFromMessage(message: any): string[] {
  const paths: string[] = [];
  const objStack: Array<[object, string]> = [[message, ""]];
  const hasTime: [boolean, boolean] = [false, false];
  while (objStack.length > 0) {
    // Assertion guaranteed by above while condition
    const [currentObj, currentPath] = objStack.pop() as Array<[object, string]>;

    for (const [key, val] of Object.entries(currentObj)) {
      const newPath = `${currentPath}/${key}`;
      if (typeof val === "object") {
        objStack.push([val, newPath]);
      } else {
        paths.push(newPath);
      }
      // check for timestamps and conditionally append combined time path
      if (key === "secs" || key === "sec") hasTime[0] = true;
      if (key === "nsecs" || key === "nsec") hasTime[1] = true;
      if (hasTime[0] && hasTime[1]) {
        paths.push(`${currentPath}/${COMBINED_TIME_KEY}`);
      }
    }
  }

  return paths;
}

export default MessageSelectField;
