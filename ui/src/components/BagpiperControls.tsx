import React, { useState, useEffect } from "react";
import useGlobal from "../store";
import { Slider, Button, Upload } from "antd";
import { SliderValue } from "antd/lib/slider";
import { RcFile } from "antd/lib/upload";

interface BagpiperControlsState {
  currentTimeS: number;
  isPlaying: boolean;
}

const BagpiperControls: React.FC = () => {
  const [globalState, globalActions] = useGlobal();
  const player = globalState.player;
  const duration = player.getDuration();
  const [state, setState] = useState<BagpiperControlsState>({
    isPlaying: false,
    currentTimeS: 0
  });

  useEffect(() => {
    player.subscribeControl(msg => {
      setState(msg);
    });
  }, [player]);

  const onBagUpload = (file: RcFile): boolean => {
    globalActions.rosApi.readBagFile(file);
    return false;
  };

  return (
    <div className="bagpiper-controls">
      <Upload accept=".bag" showUploadList={false} beforeUpload={onBagUpload}>
        <Button icon="upload" disabled={globalState.isLoading} />
      </Upload>
      <Button
        disabled={!player.isReady()}
        icon={state.isPlaying ? "pause" : "caret-right"}
        onClick={player.togglePlay}
      />
      <Slider
        value={state.currentTimeS}
        min={0}
        max={duration}
        onChange={(val: SliderValue) => player.seek(val as number)}
      />
      <span>
        {state.currentTimeS}/{duration}
      </span>
    </div>
  );
};

export default BagpiperControls;
