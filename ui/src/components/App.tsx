import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Navigation from "./Navigation";
import DashboardView from "./views/DashboardView";

const App: React.FC<{}> = () => {
  return (
    <Router>
      <Switch>
        <div className="App">
          <Navigation />
          <Route path="/" exact={true} component={DashboardView} />
        </div>
      </Switch>
    </Router>
  );
};

export default App;
