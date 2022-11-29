import React, { useState, useEffect } from "react";

import { Menu, Button, Dropdown, Icon } from "antd";

import useGlobal, { CeresGraph, FieldView } from "../store";
import SettingsPanel from "./SettingsPanel";
import GraphSettingsModal from "./GraphSettingsModal";
import FieldViewSettingsModal from "./FieldViewSettingsModal";
import { ClickParam } from "antd/lib/menu";
import BagpiperControls from "./BagpiperControls";
import { useLocation } from "react-router-dom";

export enum CeresQueryParams {
  KioskMode = "kioskMode",
  DashboardName = "dashboardName",
}

const LOCAL_DASH_NAME = "Local Dashboard File";

const Navigation: React.FC = () => {
  const [globalState, globalActions] = useGlobal();
  const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false);
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const isKioskMode = Boolean(params.get("kioskMode"));
  const dashName = params.get("dashboardName");

  useEffect(() => {
    if (!dashName) {
      return;
    }
    document.title = dashName;
    if (globalState.layouts.length === 0) {
      globalActions.rosApi.loadDashboardFile(dashName);
    }
  }, [dashName, globalState.layouts, globalActions.rosApi]);

  const onSettingSave = (element?: CeresGraph | FieldView) => {
    if (element) {
      globalActions.rosApi.addDashboardElement(element);
    }
    setSelectedModal(null);
  };

  const handleMenuClick = (e: ClickParam) => setSelectedModal(e.key || null);

  const createMenu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="0">
        <Icon type="line-chart" />
        Graph
      </Menu.Item>
      <Menu.Item key="1">
        <Icon type="picture" />
        Field View
      </Menu.Item>
    </Menu>
  );

  return (
    <div
      className="navigation"
      style={globalState.isAppNavSticky ? { position: "sticky" } : undefined}
    >
      <Menu selectedKeys={["dashboard"]} mode="horizontal">
        <Menu.Item key="dashboard">ROS Plot</Menu.Item>
      </Menu>
      <span style={{ marginLeft: 15 }}>
        {dashName || <i>{LOCAL_DASH_NAME}</i>}
      </span>
      <span style={{ flex: 1 }} />
      {globalState.isOfflineMode && <BagpiperControls />}
      <div className="button-bar">
        <Button
          disabled={isKioskMode}
          className={
            globalState.isLayoutDraggable ? "unlocked-grid-button" : undefined
          }
          icon={!globalState.isLayoutDraggable ? "unlock" : "lock"}
          onClick={globalActions.prefs.toggleLayoutDraggable}
        >
          {!globalState.isLayoutDraggable ? "Unlock" : "Lock"}
        </Button>
        <Button
          type="dashed"
          icon="flag"
          onClick={() =>
            globalActions.prefs.createMarker(dashName || LOCAL_DASH_NAME)
          }
        >
          Marker
        </Button>
        <Dropdown disabled={isKioskMode} overlay={createMenu}>
          <Button type="primary" icon="plus">
            Create
          </Button>
        </Dropdown>

        <Button
          disabled={isKioskMode}
          icon="setting"
          onClick={() => setSettingsPanelOpen(true)}
        />
      </div>
      <GraphSettingsModal open={selectedModal === "0"} onSave={onSettingSave} />
      <FieldViewSettingsModal
        open={selectedModal === "1"}
        onSave={onSettingSave}
      />
      <SettingsPanel
        visible={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
      />
    </div>
  );
};

export default Navigation;
