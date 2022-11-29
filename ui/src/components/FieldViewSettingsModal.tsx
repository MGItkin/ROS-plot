import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Select,
  Slider,
  Row,
  Col,
  InputNumber,
  Button,
  Form,
  Switch,
  Icon,
  Tooltip
} from "antd";
import useGlobal, { FieldView, ConditionOp, ViewCondition } from "../store";
import { SliderValue } from "antd/lib/slider";
import MessageSelectField from "./MessageSelectField";
import { getDefaultFieldView } from "../utils/misc-utils";
import {
  FIELD_CONDITION_COLORS,
  conditionColorOptions
} from "../utils/constants";
import FieldViewDisplay from "./FieldViewDisplay";
import TopicSelect from "./TopicSelect";
import TextArea from "antd/lib/input/TextArea";

interface FieldViewSettingsModalProps {
  open: boolean;
  fView?: FieldView; // indicates that this is a settings edit instead of a new field view
  onSave: (fieldView?: FieldView) => void;
}

const conditionOptions = Object.values(ConditionOp).map((val: string) => (
  <Select.Option key={val} value={val}>
    {val}
  </Select.Option>
));

const FieldViewSettingsModal: React.FC<FieldViewSettingsModalProps> = props => {
  const [globalState, globalActions] = useGlobal();

  const defaultView: FieldView = getDefaultFieldView();
  const [view, setView] = useState<FieldView>(props.fView || defaultView);
  const [demoVal, setDemoVal] = useState<number | string>(0);

  useEffect(() => {
    // Refresh topic list on settings panel open
    globalActions.rosApi.getTopics();
    if (props.fView !== undefined) {
      setView({ ...props.fView });
    } else if (props.open) {
      setView(getDefaultFieldView());
    }
  }, [props.open, props.fView, globalActions.rosApi]);

  const onSave = () => {
    props.onSave(view);
    if (props.fView) {
      setView(props.fView);
    }
  };

  const onCancel = () => {
    props.onSave();
  };

  const onChangeConditionOp = (index: number, value: ConditionOp) =>
    setView((v: FieldView) => {
      const colorConditions = (v.colorConditions || []).slice();
      colorConditions[index].condition = value;
      return { ...v, colorConditions };
    });

  const onChangeConditionThreshold = (index: number, value: number) =>
    setView((v: FieldView) => {
      const colorConditions = (v.colorConditions || []).slice();
      colorConditions[index].threshold = value;
      return { ...v, colorConditions };
    });
  const onChangeConditionColor = (index: number, value: string) =>
    setView((v: FieldView) => {
      const colorConditions = (v.colorConditions || []).slice();
      colorConditions[index].color = value;
      return { ...v, colorConditions };
    });

  const onAddCondition = () =>
    setView((v: FieldView) => ({
      ...v,
      colorConditions: [
        ...(v.colorConditions || []),
        {
          condition: ConditionOp.GT,
          threshold: 0,
          color: FIELD_CONDITION_COLORS[(v.colorConditions || []).length]
        }
      ]
    }));

  const onRemoveCondition = (i: number) =>
    setView((v: FieldView) => {
      if (!v.colorConditions) {
        return v;
      }
      const newConditions = v.colorConditions.slice();
      newConditions.splice(i, 1);
      return { ...v, colorConditions: newConditions };
    });

  const toggleIsGauge = (enabled: boolean) =>
    setView((v: FieldView) => ({ ...v, minMax: enabled ? [0, 0] : undefined }));

  const toggleDisplayPercentage = (enabled: boolean) =>
    setView((v: FieldView) => ({ ...v, displayPercentage: enabled }));

  const isFormValid = view.topicName && view.fieldPath;

  return (
    <Modal
      width={900}
      title={!props.fView ? "Create Field View" : "Edit Field View"}
      visible={props.open}
      onCancel={onCancel}
      onOk={onSave}
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
      <p>
        Field views display a single topic message field in real-time. Currently
        text (String, Number, Boolean) and image fields are supported for
        display. Number fields are supported for conditional color mapping and
        gauge display
      </p>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Name">
            <Input
              value={view.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const val = event.target.value;
                setView(v => ({ ...v, name: val }));
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Topic">
            <TopicSelect
              value={view.topicName}
              onChange={(val: string) =>
                setView(v => ({ ...v, topicName: val, fieldPath: "" }))
              }
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Message Field Path">
            <MessageSelectField
              value={view.fieldPath}
              topicName={view.topicName}
              messageType={globalState.topicMessageTypeMap[view.topicName]}
              onChange={(path: string) =>
                setView(v => ({ ...v, fieldPath: path }))
              }
            />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="Scalar Value">
            <InputNumber
              style={{ width: "100%" }}
              value={view.scalar || 1}
              onChange={(val?: number) => setView(v => ({ ...v, scalar: val }))}
            />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="Display Unit">
            <Input
              style={{ width: "100%" }}
              disabled={view.displayPercentage}
              value={view.displayPercentage ? "%" : view.displayUnit || ""}
              onChange={e => {
                const val = e.target.value;
                setView((v: FieldView) => ({
                  ...v,
                  displayUnit: val
                }));
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label={
              <Tooltip
                title="Colors are applied based on the last conditional match when looping from 0 through n conditions. Test your logic in the Demo section below."
                trigger="hover"
              >
                Color Conditions <Icon type="info-circle" />
              </Tooltip>
            }
          >
            {(view.colorConditions || []).map((c: ViewCondition, i: number) => (
              <Row gutter={12} key={i}>
                <Col span={6}>
                  <Select
                    key={i}
                    style={{ width: "100%" }}
                    value={c.condition}
                    onChange={(val: ConditionOp) => onChangeConditionOp(i, val)}
                  >
                    {conditionOptions}
                  </Select>
                </Col>
                <Col span={8}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={c.threshold}
                    onChange={(val?: number) =>
                      onChangeConditionThreshold(i, val || 0)
                    }
                  />
                </Col>
                <Col span={2}>
                  <Icon type="arrow-right" />
                </Col>
                <Col span={4}>
                  <Select
                    key={i}
                    style={{ width: "100%" }}
                    value={c.color}
                    onChange={(val: string) => onChangeConditionColor(i, val)}
                  >
                    {conditionColorOptions}
                  </Select>
                </Col>
                <Col span={4}>
                  <Button
                    key={i}
                    icon="close-circle"
                    type="ghost"
                    onClick={() => onRemoveCondition(i)}
                  />
                </Col>
              </Row>
            ))}
            <Button
              disabled={
                (view.colorConditions || []).length ===
                FIELD_CONDITION_COLORS.length
              }
              icon="plus"
              type="dashed"
              onClick={onAddCondition}
            >
              Add Condition
            </Button>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Enable Gauge">
                <Switch
                  checked={view.minMax !== undefined}
                  onChange={(checked: boolean) => toggleIsGauge(checked)}
                />
              </Form.Item>
            </Col>
            {view.minMax && (
              <Col span={6}>
                <Form.Item label="Min">
                  <InputNumber
                    style={{ width: "100%" }}
                    value={view.minMax[0]}
                    onChange={(val?: number) =>
                      setView((v: FieldView) => ({
                        ...v,
                        minMax: [val || 0, (v.minMax || [0, 0])[1]]
                      }))
                    }
                  />
                </Form.Item>
              </Col>
            )}
            {view.minMax && (
              <Col span={6}>
                <Form.Item label="Max">
                  <InputNumber
                    style={{ width: "100%" }}
                    value={view.minMax[1]}
                    onChange={(val?: number) =>
                      setView((v: FieldView) => ({
                        ...v,
                        minMax: [(v.minMax || [0, 0])[0], val || 0]
                      }))
                    }
                  />
                </Form.Item>
              </Col>
            )}
            {view.minMax && (
              <Col span={6}>
                <Form.Item label="Display %">
                  <Switch
                    checked={view.displayPercentage}
                    onChange={(checked: boolean) =>
                      toggleDisplayPercentage(checked)
                    }
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
      <Form.Item label="ROS Message Throttle Rate: (ms)">
        <Row gutter={12}>
          <Col span={20}>
            <Slider
              value={view.rosThrottleMs}
              min={0}
              max={5000}
              step={10}
              marks={{ 0: "none", 1000: "1s", 2500: "2.5s", 3000: "3s" }}
              onChange={(val: SliderValue) =>
                setView(v => ({ ...v, rosThrottleMs: val as number }))
              }
            />
          </Col>
          <Col span={4}>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={5000}
              step={10}
              value={view.rosThrottleMs}
              onChange={(val: number | undefined) => {
                if (val !== undefined)
                  setView(v => ({ ...v, rosThrottleMs: val }));
              }}
            />
          </Col>
        </Row>
      </Form.Item>
      <Row gutter={12}>
        <Col span={6}>
          <Form.Item label="Demo Input">
            <TextArea
              style={{ width: "100%" }}
              value={demoVal}
              onChange={e => setDemoVal(e.target.value || 0)}
            />
          </Form.Item>
        </Col>
        <Col span={18}>
          <Form.Item label="Demo Display">
            <FieldViewDisplay fView={view} value={demoVal} />
          </Form.Item>
        </Col>
      </Row>
    </Modal>
  );
};

export default FieldViewSettingsModal;
