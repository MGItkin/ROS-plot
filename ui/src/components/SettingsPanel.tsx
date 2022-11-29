import React, { useCallback } from "react";
import {
  Drawer,
  Form,
  Switch,
  Button,
  Icon,
  Upload,
  message,
  Popover,
  Checkbox,
  Row,
  Tooltip,
} from "antd";
import useGlobal, { CeresGraph, FieldView } from "../store";
import Search from "antd/lib/input/Search";
import {
  clearFieldPathsFromStorage,
  clearStateFromStorage,
} from "../utils/local-storage-utils";
import { RcFile } from "antd/lib/upload";
import {
  exportDashboard,
  DashboardInfo,
  getDefaultLayout,
} from "../utils/misc-utils";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import { BagpiperOptions } from "../Bagpiper";
import DashboardManager from "./DashboardManager";
import { CeresQueryParams } from "./Navigation";
import { useHistory } from "react-router-dom";

export interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ visible, onClose }) => {
  const [globalState, globalActions] = useGlobal();
  const history = useHistory();

  const handleSetRosAddress = useCallback(
    (val: string) => globalActions.rosApi.setRosAddress(val),
    [globalActions.rosApi]
  );

  const handleSetInfluxHost = useCallback(
    (val: string) => globalActions.prefs.setInfluxHost(val),
    [globalActions.prefs]
  );

  const handleSetInfluxDb = useCallback(
    (val: string) => globalActions.prefs.setInfluxDb(val),
    [globalActions.prefs]
  );

  const handleStickyToggle = useCallback(
    () => globalActions.prefs.toggleAppNavSticky(),
    [globalActions.prefs]
  );

  const handleOfflineToggle = useCallback(
    () => globalActions.prefs.toggleOffline(),
    [globalActions.prefs]
  );

  const activePlayerOptions = [];
  for (const [key, val] of Object.entries(globalState.playerOptions)) {
    if (val) {
      activePlayerOptions.push(key);
    }
  }
  const handlePlayerOptionsChange = useCallback(
    (checkedValue: Array<CheckboxValueType>) => {
      const options: BagpiperOptions = {
        debugMode: checkedValue.includes("debugMode"),
        historicalSeek: checkedValue.includes("historicalSeek"),
      };
      globalActions.prefs.setPlayerOptions(options);
    },
    [globalActions.prefs]
  );

  const handleMonitoringToggle = useCallback(
    globalActions.prefs.toggleMonitoring,
    [globalActions.prefs]
  );

  const onDashboardUpload = useCallback(
    (file: RcFile): boolean => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent) => {
        try {
          if (typeof reader.result !== "string") {
            throw new Error("Unsupported reader result type");
          }
          let dashboardInfo = JSON.parse(reader.result);
          if (typeof dashboardInfo !== "object") {
            throw new Error("Unknown or malformed dashboard JSON file");
          }
          if (!dashboardInfo.dashboard || !dashboardInfo.layouts) {
            dashboardInfo = {
              dashboard: dashboardInfo as Record<
                string,
                CeresGraph | FieldView
              >,
              layouts: [],
            } as DashboardInfo;
            for (const name of Object.keys(dashboardInfo.dashboard)) {
              dashboardInfo.layouts.push(getDefaultLayout(name));
            }
          }
          globalActions.rosApi.importDashboardInfo(dashboardInfo);
          if (
            history.location.search.includes(CeresQueryParams.DashboardName)
          ) {
            history.push("");
          }
          message.success(`Dashboard imported successfully!`);
        } catch (err) {
          message.error(`Failed to read uploaded file! "${err.message}"`);
        }
      };
      reader.onerror = (e: ProgressEvent) =>
        message.error(`Failed to read uploaded file! "${reader.error}"`);
      reader.readAsText(file);

      return false;
    },
    [globalActions.rosApi, history]
  );

  const onExportDashClick = useCallback(
    () =>
      exportDashboard({
        dashboard: globalState.dashboard,
        layouts: globalState.layouts,
      }),
    [globalState.dashboard, globalState.layouts]
  );

  return (
    <Drawer
      width={500}
      title="Settings"
      placement="right"
      onClose={onClose}
      visible={visible}
    >
      <div className="settings-panel">
        <Form layout="vertical">
          <Form.Item label="Offline Mode">
            <Switch
              checked={globalState.isOfflineMode}
              onChange={handleOfflineToggle}
            />
          </Form.Item>
          <Form.Item label="Sticky App Navigation">
            <Switch
              checked={globalState.isAppNavSticky}
              onChange={handleStickyToggle}
            />
          </Form.Item>
          <Form.Item label="Cached App State">
            <Popover
              trigger="click"
              content={
                <>
                  <p style={{ width: 200 }}>
                    This will delete the current dashboard, export your
                    dashboard if you would like to save it.
                  </p>
                  <Button
                    type="primary"
                    icon="check"
                    onClick={() => clearStateFromStorage()}
                  >
                    Confirm
                  </Button>
                </>
              }
            >
              <Button type="danger" icon="delete">
                Clear
              </Button>
            </Popover>
          </Form.Item>
          <Form.Item label="Cached Message Schema">
            <Button
              type="danger"
              icon="delete"
              onClick={clearFieldPathsFromStorage}
            >
              Clear
            </Button>
          </Form.Item>
        </Form>
        <Form layout="vertical">
          {globalState.isOfflineMode ? (
            <>
              <Form.Item label="Bag Player Options">
                <Checkbox.Group
                  value={activePlayerOptions}
                  onChange={handlePlayerOptionsChange}
                >
                  <Row>
                    <Tooltip
                      title="This option will replay the message history up to the seek point, yielding a more complete looking graph. Note, this option will negatively affect seeking performance."
                      trigger="hover"
                    >
                      <Checkbox
                        checked={globalState.playerOptions.debugMode}
                        value="historicalSeek"
                      >
                        Historical Seek
                      </Checkbox>
                    </Tooltip>
                  </Row>
                  <Row>
                    <Checkbox
                      checked={globalState.playerOptions.historicalSeek}
                      value="debugMode"
                    >
                      Debug Mode
                    </Checkbox>
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </>
          ) : (
            <Form.Item label="ROS Bridge URL">
              <Search
                placeholder="ws://localhost:9090"
                defaultValue={globalState.rosAddress}
                onSearch={handleSetRosAddress}
                enterButton="Set"
              />
            </Form.Item>
          )}
          <Form.Item label="Influx Host">
            <Search
              placeholder="localhost:8086"
              defaultValue={globalState.influxHost}
              onSearch={handleSetInfluxHost}
              enterButton="Set"
            />
          </Form.Item>
          <Form.Item label="Influx DB Name">
            <Search
              placeholder="my_db"
              defaultValue={globalState.influxDb}
              onSearch={handleSetInfluxDb}
              enterButton="Set"
            />
          </Form.Item>
          <Form.Item label="Health Monitoring">
            <Switch
              checked={globalState.isMonitoringEnabled}
              onChange={handleMonitoringToggle}
            />
          </Form.Item>
          <Form.Item label="Kiosk Mode">
            <Button
              icon="desktop"
              onClick={() =>
                history.push(`?${CeresQueryParams.KioskMode}=true`)
              }
            >
              Enable
            </Button>
          </Form.Item>
        </Form>
      </div>
      <Form>
        <Form.Item label="Import/Export Local Dashboard File">
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={onDashboardUpload}
          >
            <Button>
              <Icon type="upload" /> Import
            </Button>
          </Upload>
          <Button onClick={onExportDashClick} style={{ marginLeft: 10 }}>
            <Icon type="download" /> Export
          </Button>
        </Form.Item>
        <Form.Item label="Dashboard Manager (API)">
          <DashboardManager />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default SettingsPanel;
