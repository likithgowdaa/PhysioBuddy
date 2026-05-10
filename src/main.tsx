import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { UserProvider } from "./context/UserContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <App />
  </UserProvider>
);