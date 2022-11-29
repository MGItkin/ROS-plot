import { DashboardInfo } from "../utils/misc-utils";
import { message } from "antd";

const SERVER_HOST =
  process.env.NODE_ENV === "development"
    ? `${window.location.hostname}:5000`
    : window.location.host;

export async function getDashboard(name: string): Promise<DashboardInfo> {
  const response = await performFetch(`dashboard/${name}`);
  return await response.json();
}

export async function getDashboards(): Promise<Record<string, DashboardInfo>> {
  const response = await performFetch("dashboard/");
  return await response.json();
}

export async function setDashboard(
  name: string,
  data: DashboardInfo
): Promise<void> {
  await performFetch(
    `dashboard/${encodeURIComponent(name)}`,
    "POST",
    JSON.stringify(data)
  );
  message.success(`Successfully saved dashboard: "${name}"`);
}

export async function removeDashboard(name: string): Promise<void> {
  await performFetch(`dashboard/${name}`, "DELETE");
  message.success(`Successfully removed dashboard: "${name}"`);
}

async function performFetch(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: string
): Promise<Response> {
  const response = await fetch(`http://${SERVER_HOST}/v0/${path}`, {
    method,
    headers:
      method === "POST" ? { "content-type": "application/json" } : undefined,
    body
  });
  if (response.status !== 200) {
    const resText = await response.text();
    const message = resText ? `: ${await response.text()}` : "";
    throw new Error(`${response.status}${message}`);
  }
  return response;
}
