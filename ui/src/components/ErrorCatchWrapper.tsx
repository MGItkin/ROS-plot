import React, { Component } from "react";
import { Result } from "antd";

interface ErrorCatchWrapperProps {
  children: React.ReactNode;
}

interface ErrorCatchWrapperState {
  errorString: string;
  infoString: string;
}

export default class ErrorCatchWrapper extends Component<
  ErrorCatchWrapperProps,
  ErrorCatchWrapperState
> {
  constructor(props: ErrorCatchWrapperProps) {
    super(props);
    this.state = {
      errorString: "",
      infoString: ""
    };
  }

  componentDidCatch(error: any, info: any) {
    this.setState({
      errorString: JSON.stringify(error, null, 2),
      infoString:
        info && info.componentStack
          ? info.componentStack
          : JSON.stringify(info, null, 2)
    });
  }

  public render(): React.ReactNode {
    const { errorString, infoString } = this.state;

    if (errorString || infoString) {
      return (
        <Result
          status="error"
          title="An Unexpected Error Ocurred!"
          subTitle={
            "Please refresh the page or try clearing App State from the settings panel"
          }
        >
          <>
            <b>Error:</b>
            <pre>{errorString}</pre>
            <b>Info:</b>
            <pre style={{ whiteSpace: "pre-wrap" }}>{infoString}</pre>
          </>
        </Result>
      );
    }
    return this.props.children;
  }
}
