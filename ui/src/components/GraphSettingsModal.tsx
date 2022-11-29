import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  Input,
  Select,
  Slider,
  Row,
  Col,
  InputNumber,
  Button,
  Icon,
  Switch,
  Form,
  Tooltip
} from "antd";
import useGlobal, { CeresGraph, CeresYAxis } from "../store";
import { SliderValue } from "antd/lib/slider";
import MessageSelectField from "./MessageSelectField";
import { getDefaultGraph } from "../utils/misc-utils";
import TopicSelect from "./TopicSelect";
import { graphColorOptions, GRAPH_LINE_COLORS } from "../utils/constants";

interface GraphSettingsModalProps {
  open: boolean;
  graph?: CeresGraph; // indicates that this is a settings edit instead of a new graph
  onSave: (graph?: CeresGraph) => void;
}

enum AxisScale {
  custom = "CUSTOM",
  autoscale = "AUTOSCALE"
}

const GraphSettingsModal: React.FC<GraphSettingsModalProps> = props => {
  const [globalState, globalActions] = useGlobal();

  const defaultGraph: CeresGraph = getDefaultGraph();
  const [graph, setGraph] = useState<CeresGraph>(props.graph || defaultGraph);

  useEffect(() => {
    // Refresh topic list on settings panel open
    globalActions.rosApi.getTopics();
    if (props.graph !== undefined) {
      setGraph({ ...props.graph });
    } else if (props.open) {
      setGraph(getDefaultGraph());
    }
  }, [props.open, props.graph, globalActions.rosApi]);

  function onSave() {
    props.onSave(graph);
    if (props.graph) {
      setGraph(props.graph);
    }
  }

  function onCancel() {
    props.onSave();
  }

  let yAxisValid = true;
  for (const axis of graph.yAxes) {
    if (!axis.topicName.length || !axis.fieldPath.length) {
      yAxisValid = false;
      continue;
    }
  }
  const isFormValid =
    yAxisValid && !!graph.xTopicName.length && !!graph.xFieldPath.length;

  const axisDomainOptions = Object.entries(AxisScale).map(
    (entry: [string, string]) => (
      <Select.Option key={entry[1]} value={entry[1]}>
        {entry[0]}
      </Select.Option>
    )
  );

  const onChangeMappedValue = useCallback(
    (index: number, key: "color" | "fieldPath" | "topicName", value: string) =>
      setGraph((g: CeresGraph) => {
        const yAxes = g.yAxes.slice();
        yAxes[index][key] = value;
        return { ...g, yAxes };
      }),
    []
  );

  const onAxisRemove = useCallback(
    (index: number) =>
      setGraph((g: CeresGraph) => {
        const yAxes = g.yAxes.slice();
        yAxes.splice(index, 1);
        return { ...g, yAxes };
      }),
    []
  );

  return (
    <Modal
      width={900}
      title={!props.graph ? "Create Graph" : "Edit Graph"}
      visible={props.open}
      onOk={onSave}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          onClick={onSave}
          type="primary"
          disabled={!isFormValid}
        >
          Save
        </Button>
      ]}
    >
      <Row gutter={12}>
        <Col span={21}>
          <Form.Item
            label="Graph Name: (must be unique)"
            validateStatus="validating"
          >
            <Input
              name="name"
              value={graph.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const val = event.target.value;
                setGraph(g => ({ ...g, name: val }));
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={11}>
          <Form.Item label="X-Axis Topic:">
            <TopicSelect
              value={
                graph.xAxisDurationS === undefined
                  ? graph.xTopicName
                  : "y-axis message timestamp used"
              }
              disabled={graph.xAxisDurationS !== undefined}
              onChange={(val: string) =>
                setGraph(g => ({ ...g, xTopicName: val, xFieldPath: "" }))
              }
            />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="X-Axis Message Field Path">
            <MessageSelectField
              value={graph.xAxisDurationS === undefined ? graph.xFieldPath : ""}
              topicName={graph.xTopicName}
              messageType={globalState.topicMessageTypeMap[graph.xTopicName]}
              onChange={(path: string) =>
                setGraph(g => ({ ...g, xFieldPath: path }))
              }
              disabled={graph.xAxisDurationS !== undefined}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12} className="y-axis-form-row">
        <Col span={11}>
          <Form.Item label="Y-Axis Topic">
            {graph.yAxes.map((axis: CeresYAxis, i: number) => (
              <TopicSelect
                key={i}
                value={axis.topicName}
                onChange={val => onChangeMappedValue(i, "topicName", val)}
              />
            ))}
            <Button
              disabled={graph.yAxes.length === GRAPH_LINE_COLORS.length}
              icon="plus"
              type="dashed"
              onClick={() =>
                setGraph(g => ({
                  ...g,
                  yAxes: [
                    ...g.yAxes,
                    {
                      ...defaultGraph.yAxes[0],
                      color: GRAPH_LINE_COLORS[g.yAxes.length]
                    }
                  ]
                }))
              }
            >
              Add Axis
            </Button>
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="Y-Axis Message Field Path">
            {graph.yAxes.map((axis: CeresYAxis, i: number) => (
              <MessageSelectField
                key={i}
                value={axis.fieldPath}
                topicName={axis.topicName}
                messageType={globalState.topicMessageTypeMap[axis.topicName]}
                onChange={(val: string) =>
                  onChangeMappedValue(i, "fieldPath", val)
                }
              />
            ))}
          </Form.Item>
        </Col>
        <Col span={2}>
          <Form.Item label="Color">
            {graph.yAxes.map((axis: CeresYAxis, i: number) => (
              <Select
                key={i}
                style={{ width: "100%" }}
                value={axis.color}
                onChange={(val: string) => onChangeMappedValue(i, "color", val)}
              >
                {graphColorOptions}
              </Select>
            ))}
          </Form.Item>
        </Col>
        <Col span={1} style={{ marginTop: 79 }}>
          <Form.Item>
            {graph.yAxes.map(
              (axis: CeresYAxis, i: number) =>
                i !== 0 && (
                  <Button
                    key={i}
                    icon="close-circle"
                    type="dashed"
                    onClick={() => onAxisRemove(i)}
                  />
                )
            )}
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={6}>
          <Form.Item label="Use X-axis Time Range">
            <Switch
              checked={graph.xAxisDurationS !== undefined}
              onChange={(checked: boolean) => {
                if (!checked) {
                  setGraph((g: CeresGraph) => ({
                    ...g,
                    xAxisDurationS: undefined
                  }));
                } else {
                  setGraph((g: CeresGraph) => ({
                    ...g,
                    xAxisDurationS: 60
                  }));
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="X-Axis Domain">
            <Select
              style={{ width: "100%" }}
              value={graph.xAxisDomain ? AxisScale.custom : AxisScale.autoscale}
              onChange={(val: string) =>
                setGraph(g => ({
                  ...g,
                  xAxisDomain: val === AxisScale.custom ? [0, 0] : undefined
                }))
              }
            >
              {axisDomainOptions}
            </Select>
            {graph.xAxisDomain && (
              <>
                <InputNumber
                  step={0.1}
                  value={graph.xAxisDomain[0]}
                  onChange={(val: number | undefined) => {
                    if (val !== undefined)
                      setGraph(g => ({
                        ...g,
                        xAxisDomain: [val, g.xAxisDomain ? g.xAxisDomain[1] : 0]
                      }));
                  }}
                />
                {" - "}
                <InputNumber
                  step={0.1}
                  value={graph.xAxisDomain[1]}
                  onChange={(val: number | undefined) => {
                    if (val !== undefined)
                      setGraph(g => ({
                        ...g,
                        xAxisDomain: [g.xAxisDomain ? g.xAxisDomain[0] : 0, val]
                      }));
                  }}
                />
              </>
            )}
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Y-axis Domain">
            <Select
              style={{ width: "100%" }}
              value={graph.yAxisDomain ? AxisScale.custom : AxisScale.autoscale}
              onChange={(val: string) =>
                setGraph(g => ({
                  ...g,
                  yAxisDomain: val === AxisScale.custom ? [0, 0] : undefined
                }))
              }
            >
              {axisDomainOptions}
            </Select>
            {graph.yAxisDomain && (
              <>
                <InputNumber
                  step={0.1}
                  value={graph.yAxisDomain[0]}
                  onChange={(val: number | undefined) => {
                    if (val !== undefined)
                      setGraph(g => ({
                        ...g,
                        yAxisDomain: [val, g.yAxisDomain ? g.yAxisDomain[1] : 0]
                      }));
                  }}
                />
                {" - "}
                <InputNumber
                  step={0.1}
                  value={graph.yAxisDomain[1]}
                  onChange={(val: number | undefined) => {
                    if (val !== undefined)
                      setGraph(g => ({
                        ...g,
                        yAxisDomain: [g.yAxisDomain ? g.yAxisDomain[0] : 0, val]
                      }));
                  }}
                />
              </>
            )}
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            label={
              <Tooltip
                title="Graph axis left margin (pixels). Adjust this to a larger number to prevent long axis labels from being cutoff"
                trigger="hover"
              >
                Left Margin <Icon type="info-circle" />
              </Tooltip>
            }
          >
            <InputNumber
              step={1}
              value={graph.leftMargin}
              onChange={(val: number | undefined) => {
                if (val !== undefined)
                  setGraph(g => ({ ...g, leftMargin: val }));
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      {graph.xAxisDurationS !== undefined ? (
        <Form.Item label="X Axis Duration: (latest # of seconds)">
          <Row gutter={12}>
            <Col span={20}>
              <Slider
                value={graph.xAxisDurationS}
                min={5}
                max={300}
                step={1}
                onChange={(val: SliderValue) =>
                  setGraph(g => ({ ...g, xAxisDurationS: val as number }))
                }
              />
            </Col>
            <Col span={4}>
              <InputNumber
                min={5}
                max={300}
                step={1}
                value={graph.xAxisDurationS}
                onChange={(val: number | undefined) => {
                  if (val !== undefined)
                    setGraph(g => ({ ...g, xAxisDurationS: val }));
                }}
              />
            </Col>
          </Row>
        </Form.Item>
      ) : (
        <>
          <Form.Item label="Circular Buffer Size: (# of points)">
            <Row gutter={12}>
              <Col span={20}>
                <Slider
                  value={graph.graphBufferSize}
                  min={50}
                  max={5000}
                  step={10}
                  onChange={(val: SliderValue) =>
                    setGraph(g => ({ ...g, graphBufferSize: val as number }))
                  }
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  min={50}
                  max={5000}
                  step={10}
                  value={graph.graphBufferSize}
                  onChange={(val: number | undefined) => {
                    if (val !== undefined)
                      setGraph(g => ({ ...g, graphBufferSize: val }));
                  }}
                />
              </Col>
            </Row>
          </Form.Item>
        </>
      )}
      <Form.Item label="Graph Update Interval: (ms)">
        <Row gutter={12}>
          <Col span={20}>
            <Slider
              value={graph.updateIntervalMs}
              min={0}
              max={3000}
              step={10}
              marks={{ 0: "realtime", 500: "0.5s", 1000: "1s", 2000: "2s" }}
              onChange={(val: SliderValue) =>
                setGraph(g => ({ ...g, updateIntervalMs: val as number }))
              }
            />
          </Col>
          <Col span={4}>
            <InputNumber
              min={0}
              max={5000}
              step={10}
              value={graph.updateIntervalMs}
              onChange={(val: number | undefined) => {
                if (val !== undefined)
                  setGraph(g => ({ ...g, updateIntervalMs: val }));
              }}
            />
          </Col>
        </Row>
      </Form.Item>
      <Form.Item label="ROS Message Throttle Rate: (ms)">
        <Row gutter={12}>
          <Col span={20}>
            <Slider
              value={graph.rosThrottleMs}
              min={0}
              max={5000}
              step={10}
              marks={{ 0: "none", 1000: "1s", 2500: "2.5s", 3000: "3s" }}
              onChange={(val: SliderValue) =>
                setGraph(g => ({ ...g, rosThrottleMs: val as number }))
              }
            />
          </Col>
          <Col span={4}>
            <InputNumber
              min={0}
              max={5000}
              step={10}
              value={graph.rosThrottleMs}
              onChange={(val: number | undefined) => {
                if (val !== undefined)
                  setGraph(g => ({ ...g, rosThrottleMs: val }));
              }}
            />
          </Col>
        </Row>
      </Form.Item>
    </Modal>
  );
};

export default GraphSettingsModal;
