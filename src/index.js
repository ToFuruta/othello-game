import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// （Bootstrap を使う場合は下の1行を有効化）
// import "bootstrap/dist/css/bootstrap.min.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
