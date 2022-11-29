import React, { useEffect } from "react";
import {
  Select,
  message,
  Button,
  Popover,
  Input,
  Popconfirm,
  Spin,
} from "antd";
import {
  getDashboards,
  removeDashboard,
  setDashboard,
} from "../clients/dashboardClient";
import { DashboardInfo, getDefaultDashboardName } from "../utils/misc-utils";
import useGlobal from "../store";
import { useHistory } from "react-router-dom";

/**
 * Save and load Dashboards from the server
 */
const DashboardManager: React.FC = () => {
  const [globalState, globalActions] = useGlobal();
  const history = useHistory();
  const [items, setItems] = React.useState<Record<string, DashboardInfo>>({});
  const [loading, setLoading] = React.useState<boolean>();
  const [selected, setSelected] = React.useState<string | null>(null); // dashboard name
  const [newName, setNewName] = React.useState<string>(
    getDefaultDashboardName()
  );

  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const dashName = params.get("dashboardName");
    setSelected(dashName);
  }, [history.location.search]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setItems(await getDashboards());
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.warn(`Failed to load dashboards. error: ${err.message}`);
    }
  };

  const handleDropdownOpen = (open: boolean) => {
    if (!open || Object.keys(items).length !== 0) {
      return;
    }
    loadItems();
  };

  const handleSelect = (value: string | null) => {
    if (value) {
      history.push(`?dashboardName=${value}`);
      globalActions.rosApi.importDashboardInfo(items[value]);
      message.success(`Successfully loaded dashboard: "${value}"`);
    } else {
      history.push("");
      globalActions.rosApi.importDashboardInfo({ dashboard: {}, layouts: [] });
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }
    try {
      setLoading(true);
      await removeDashboard(selected);
      setSelected(null);
      setItems(await getDashboards());
      history.push("");
      globalActions.rosApi.importDashboardInfo({ dashboard: {}, layouts: [] });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.warn(
        `Failed to remove dashboard: ${selected}. error: ${err.message}`
      );
    }
  };

  const handleSave = async () => {
    if (!selected) {
      return;
    }
    try {
      setLoading(true);
      const newItem: DashboardInfo = {
        dashboard: globalState.dashboard,
        layouts: globalState.layouts,
      };
      await setDashboard(selected, newItem);
      setItems(await getDashboards());
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.warn(
        `Failed to create dashboard: ${newName}. error: ${err.message}`
      );
    }
  };

  const handleCreate = async () => {
    if (!newName) {
      return;
    }
    try {
      setLoading(true);
      const newItem: DashboardInfo = {
        dashboard: globalState.dashboard,
        layouts: globalState.layouts,
      };
      await setDashboard(newName, newItem);
      setSelected(newName);
      history.push(`?dashboardName=${newName}`);
      setItems(await getDashboards());
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.warn(
        `Failed to create dashboard: ${newName}. error: ${err.message}`
      );
    }
  };

  const handleVisChange = (visible: boolean) => {
    if (visible) {
      setNewName(selected || getDefaultDashboardName());
    }
  };

  return (
    <div className="dashboard-manager">
      <div className="item-selection">
        <Select
          value={selected}
          loading={loading}
          onSelect={handleSelect}
          onDropdownVisibleChange={handleDropdownOpen}
          notFoundContent={loading ? <Spin size="small" /> : null}
        >
          {Object.keys(items).map((v) => (
            <Select.Option key={v} value={v}>
              {v}
            </Select.Option>
          ))}
        </Select>
        <Button icon="reload" onClick={loadItems} />
        <Popconfirm
          overlayStyle={{ width: 350 }}
          title={`Are you sure you want to delete "${selected}"? The file will persist in the server's "/data" directory with the prefix "deleted_"`}
          onConfirm={handleDelete}
        >
          <Button disabled={!selected} icon="delete" type="danger" />
        </Popconfirm>
      </div>
      <Button
        style={{ marginRight: 5 }}
        type="primary"
        icon="cloud-upload"
        onClick={handleSave}
        disabled={!selected}
      >
        Save
      </Button>
      <Popover
        overlayStyle={{ width: 350 }}
        trigger="click"
        title="Save Current Dashboard Server"
        onVisibleChange={handleVisChange}
        content={
          <div className="dashboard-save-form">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              onClick={handleCreate}
              icon="check"
              type="primary"
              loading={loading}
            />
          </div>
        }
      >
        <Button icon="cloud-upload">Save as...</Button>
      </Popover>
    </div>
  );
};

export default DashboardManager;
