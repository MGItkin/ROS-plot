import React, { useState, useEffect } from "react";
import useGlobal from "../store";

export function SampleHook() {
  const [state, setState] = useState({ counter: 0, c2: 0 });
  const [globalState, globalActions] = useGlobal();

  const add1ToCounter = () => {
    const newCounterValue = state.counter + 1;
    setState({ counter: newCounterValue, c2: state.c2 });
    if (newCounterValue % 2 === 0) {
      setState({ counter: newCounterValue, c2: state.c2 + 1 });
    }
  };

  useEffect(() => {
    console.log("I will run after every render");
  }, [state.c2]);

  return (
    <div>
      <p>
        You clicked {state.counter} times {state.c2}
      </p>
      <button onClick={add1ToCounter}>Click me</button>
    </div>
  );
}
