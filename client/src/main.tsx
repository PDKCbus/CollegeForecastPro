import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
