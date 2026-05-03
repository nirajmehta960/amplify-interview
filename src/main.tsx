import { createRoot } from "react-dom/client";
import ReactGA from "react-ga4";
import App from "./App.tsx";
import "./index.css";

const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID;
if (ga4Id) {
  ReactGA.initialize(ga4Id);
}

createRoot(document.getElementById("root")!).render(<App />);
