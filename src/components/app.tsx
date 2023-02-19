import { h } from "preact";
import { Route, Router, CustomHistory } from "preact-router";
import { createHashHistory } from "history";
import Header from "./header/Header";

// Code-splitting is automated for `routes` directory
import Home from "../routes/home";
import APIDocs from "../routes/api-docs";

const App = () => (
  <div id="app">
    <Header />
    <Router history={(createHashHistory() as unknown) as CustomHistory}>
      <Route path="/" component={Home} />
      <Route path="/api/" component={APIDocs} />
    </Router>
  </div>
);

export default App;
