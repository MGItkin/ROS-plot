import React, { useState } from "react";
import useGlobal, {
  CeresGraph,
  CeresYAxis,
  CeresElementType,
  FieldView
} from "../store";
import Title from "antd/lib/typography/Title";
import { Card, Button, Popover, Menu, Dropdown, Icon } from "antd";
import Graph from "./Graph";
import downloadSVG from "export-svg-with-styles";
import { DiscreteColorLegend } from "react-vis";
import FieldViewSettingsModal from "./FieldViewSettingsModal";
import GraphSettingsModal from "./GraphSettingsModal";
import FieldViewDisplay from "./FieldViewDisplay";

interface ElementFrameProps {
  element: CeresGraph | FieldView;
}

interface ElementFrameState {
  isSettingOpen: boolean;
}

const ElementFrame: React.FC<ElementFrameProps> = props => {
  const globalActions = useGlobal()[1];
  const [headerMenuOpen, setHeaderMenuOpen] = useState<boolean>(false);
  const [state, setState] = useState<ElementFrameState>({
    isSettingOpen: false
  });

  const toggleSettingOpen = () =>
    setState((prevState: ElementFrameState) => ({
      ...prevState,
      isSettingOpen: !prevState.isSettingOpen
    }));

  const onSettingSave = (element?: CeresGraph | FieldView) => {
    if (element) {
      if (element.name !== props.element.name) {
        globalActions.rosApi.renameDashboardElement(
          props.element.name,
          element
        );
      }
      globalActions.rosApi.addDashboardElement(element);
    }
    toggleSettingOpen();
  };

  const onDebugToggle = () => {
    const newElement: CeresGraph | FieldView = {
      ...props.element,
      showDebugInfo: !props.element.showDebugInfo
    };
    globalActions.rosApi.addDashboardElement(newElement);
  };

  /** Ref used to locate the inner svg element */
  const onSavePng = () => {
    const baseElement = document.getElementById(props.element.name);
    if (baseElement === null) throw new Error("unable to locate base element");
    const element = baseElement.querySelector("svg.rv-xy-plot__inner");
    if (element === null) throw new Error("unable to locate svg");

    const rect = element.getBoundingClientRect();
    const options = {
      width: rect.width,
      height: rect.height,
      svg: element,
      filename: props.element.name
    };
    downloadSVG(options);
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={onSavePng}>
        <Icon type="camera" />
        Save image (.png)
      </Menu.Item>
      <Menu.Item onClick={onDebugToggle}>
        <Icon type="bug" />
        {props.element.showDebugInfo ? "Hide" : "Show"} Debug Info
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Card
        size="small"
        id={props.element.name}
        className="element-frame"
        title={
          <div className="card-title-bar">
            <Title level={4} className="truncated">
              {props.element.name}
            </Title>
            <span style={{ flex: 1 }} />
            <div className={!headerMenuOpen ? "hover-only" : undefined}>
              <Button icon="setting" onClick={toggleSettingOpen} />
              <Popover
                trigger="click"
                content={
                  <Button
                    type="danger"
                    icon="delete"
                    onClick={() =>
                      globalActions.rosApi.removeDashboardElement(
                        props.element.name
                      )
                    }
                  >
                    Confirm Delete
                  </Button>
                }
              >
                <Button icon="delete" />
              </Popover>
              {props.element.elementType === CeresElementType.GRAPH && (
                <Dropdown
                  overlay={menu}
                  trigger={["click"]}
                  placement="bottomRight"
                  onVisibleChange={visible => setHeaderMenuOpen(visible)}
                >
                  <Button icon="more" />
                </Dropdown>
              )}
            </div>
          </div>
        }
      >
        {props.element.elementType === CeresElementType.GRAPH ? (
          <div className="card-body-wrapper">
            <Graph graph={props.element as CeresGraph} />
            <DiscreteColorLegend
              items={(props.element as CeresGraph).yAxes.map(
                (axis: CeresYAxis) => ({
                  title: `${axis.topicName}${axis.fieldPath}` || "N/A", // component throws on empty string
                  color: axis.color
                })
              )}
            />
          </div>
        ) : (
          <FieldViewDisplay fView={props.element as FieldView} />
        )}
      </Card>
      {props.element.elementType === CeresElementType.GRAPH ? (
        <GraphSettingsModal
          graph={props.element as CeresGraph}
          onSave={onSettingSave}
          open={state.isSettingOpen}
        />
      ) : (
        <FieldViewSettingsModal
          fView={props.element as FieldView}
          onSave={onSettingSave}
          open={state.isSettingOpen}
        />
      )}
    </>
  );
};

export default ElementFrame;
