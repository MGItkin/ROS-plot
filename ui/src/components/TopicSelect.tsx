import React, { useState, useEffect } from "react";
import useGlobal from "../store";
import { TreeSelect, Tooltip } from "antd";
import { TreeNode } from "antd/lib/tree-select";

interface TopicSelectProps {
  value: string;
  onChange: (topicName: string) => void;
  disabled?: boolean;
}

const MAX_RENDER_LEN = 800;

const TopicSelect: React.FC<TopicSelectProps> = props => {
  const globalState = useGlobal()[0];
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    const topics = Object.keys(globalState.topicMessageTypeMap);
    setTreeData(getNodesFromTopicsList(topics));
  }, [globalState.topicMessageTypeMap, setTreeData]);

  return (
    <Tooltip
      title={props.value && `Full Topic: ${props.value}`}
      trigger="hover"
    >
      <div>
        <TreeSelect
          style={{ width: "100%" }}
          dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
          disabled={props.disabled}
          allowClear={true}
          showSearch={true}
          maxTagCount={MAX_RENDER_LEN}
          value={props.value || undefined}
          treeData={treeData}
          placeholder="Select ROS Topic"
          searchPlaceholder="Search partial Topic name"
          onChange={(val?: string) => props.onChange(val || "")}
        />
      </div>
    </Tooltip>
  );
};

function getNodesFromTopicsList(topics: string[]): TreeNode[] {
  const rootMap: Record<string, TreeNode> = {};
  for (const t of topics.sort()) {
    const tSplit = t.split("/");
    if (tSplit[0] === "") {
      tSplit.shift();
    }
    const pathRoot = tSplit[0];
    if (!(pathRoot in rootMap)) {
      rootMap[pathRoot] = getTreeNode(pathRoot);
    }
    // Place each path part into tree
    let lastNode = rootMap[pathRoot];
    for (let i = 1; i < tSplit.length; i++) {
      const part = tSplit[i];
      const lastChildren = lastNode.children as TreeNode[];
      let matchingNode: TreeNode | null = null;
      for (let j = 0; j < lastChildren.length; j++) {
        const c = lastChildren[j];
        if (part === c.title) {
          matchingNode = c;
        }
      }
      if (!matchingNode) {
        const newNode = getTreeNode(tSplit.slice(0, i + 1).join("/"));
        (lastNode.children as TreeNode[]).push(newNode);
        lastNode.selectable = false;
        lastNode = newNode;
      } else {
        lastNode = matchingNode;
      }
    }
  }

  return Object.values(rootMap);
}

function getTreeNode(partialTopic: string): TreeNode {
  const value = `/${partialTopic}`;
  return {
    title: partialTopic.split("/").pop(),
    value,
    key: value,
    children: []
  };
}

export default TopicSelect;
