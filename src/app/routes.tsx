import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ExerciseSearch } from "./pages/ExerciseSearch";
import { PrescriptionUpload } from "./pages/PrescriptionUpload";
import { XRayUpload } from "./pages/XRayUpload";
import { DemoVideo } from "./pages/DemoVideo";
import { ExerciseMonitoring } from "./pages/ExerciseMonitoring";
import { SessionReport } from "./pages/SessionReport";
import { ProgressDashboard } from "./pages/ProgressDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "/", Component: Login },
      { path: "/dashboard", Component: Dashboard },
      { path: "/exercise-search", Component: ExerciseSearch },
      { path: "/prescription-upload", Component: PrescriptionUpload },
      { path: "/xray-upload", Component: XRayUpload },
      { path: "/demo-video", Component: DemoVideo },
      { path: "/exercise-monitoring", Component: ExerciseMonitoring },
      { path: "/session-report", Component: SessionReport },
      { path: "/progress", Component: ProgressDashboard },
    ],
  },
]);