import React, { useEffect } from "react";
import RGL, { WidthProvider, Layout } from "react-grid-layout";
import { Spin, Result, notification } from "antd";
import ElementFrame from "../ElementFrame";
import Monitor from "../Monitor";
import useGlobal from "../../store";
import { RouteComponentProps } from "react-router-dom";
import { ArgsProps } from "antd/lib/notification";

const ReactGridLayout = WidthProvider(RGL);

const notificationKey = "DASH_NOTIFICATION_KEY";
const defaultNotificationProps: Partial<ArgsProps> = {
  duration: null,
  key: notificationKey,
  placement: "topLeft",
};

const DashboardView: React.FC<RouteComponentProps> = () => {
  const [globalState, globalActions] = useGlobal();
  const {
    isConnected,
    isOfflineMode,
    isLoading,
    isLayoutDraggable,
    isMonitoringEnabled,
    dashboard,
    layouts,
    player,
  } = globalState;
  const connectionReady = isConnected || (isOfflineMode && player.isReady());
  const elements = Object.values(dashboard);
  /**
   * wrapper used to set timeouts on Notification calls
   * This is used because the notifications api has a bug with rapidly set requests
   * @param callback notification call
   */
  const timeoutWrapper = (callback: () => void) => setTimeout(callback, 1);

  useEffect(() => {
    if (!isOfflineMode) {
      globalActions.rosApi.connect();
    }
  }, [globalActions.rosApi, isOfflineMode]);

  // Manage notification display
  useEffect(() => {
    if (isLoading) {
      timeoutWrapper(() =>
        notification.open({
          ...defaultNotificationProps,
          type: "info",
          icon: <Spin />,
          message: isOfflineMode ? "Loading..." : "Connecting...",
        })
      );
    } else if (!connectionReady && isOfflineMode) {
      timeoutWrapper(() =>
        notification.open({
          ...defaultNotificationProps,
          type: "info",
          message: "No Bag file found!",
          description:
            "Upload a .bag file in the settings panel or switch to Online mode",
        })
      );
    } else if (!connectionReady) {
      timeoutWrapper(() =>
        notification.open({
          ...defaultNotificationProps,
          type: "error",
          message: "Websocket Connection Failed!",
          description:
            "Change your hostname in the settings panel to retry connection",
        })
      );
    } else {
      timeoutWrapper(() => notification.close(notificationKey));
    }
  }, [connectionReady, isLoading, isOfflineMode]);

  return (
    <>
      {isMonitoringEnabled && <Monitor />}
      {connectionReady && elements.length === 0 ? (
        <Result
          status="info"
          title="No Saved Graphs Found"
          subTitle="Create a Graph using the button on the top right to get started."
        />
      ) : (
        <ReactGridLayout
          className="layout"
          rowHeight={30}
          cols={24}
          onLayoutChange={(layouts: Layout[]) =>
            globalActions.prefs.setLayouts(layouts)
          }
          layout={layouts}
          isDraggable={isLayoutDraggable}
          verticalCompact={false}
        >
          {elements.map((element) => (
            <div
              key={element.name}
              className={isLayoutDraggable ? "unlocked-grid-item" : undefined}
            >
              <ElementFrame element={element} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </>
  );
};

export default DashboardView;
