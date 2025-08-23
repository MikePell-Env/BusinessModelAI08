import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/debug/GlobalDebugInterface";

createRoot(document.getElementById("root")!).render(<App />);