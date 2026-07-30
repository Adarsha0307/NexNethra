import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardPage from '../pages/DashboardPage';
import AssistantPage from '../pages/AssistantPage';
import AnalyzerPage from '../pages/AnalyzerPage';
import IncidentsPage from '../pages/IncidentsPage';
import SettingsPage from '../pages/SettingsPage';
import { FloatingAiAssistant } from '../components/ui/glowing-ai-chat-assistant';
import CyberBackground from '../components/ui/cyber-background';

function AppRoutes() {
  return (
    <div className="app-shell">
      <CyberBackground />
      <Sidebar />
      <main className="content-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/analyzer" element={<AnalyzerPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <FloatingAiAssistant />
    </div>
  );
}

export default AppRoutes;
