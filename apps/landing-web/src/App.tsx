import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { PublicLayout } from './components/PublicLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Features } from './pages/Features';
import { Solutions } from './pages/Solutions';
import { Security } from './pages/Security';
import { Pricing } from './pages/Pricing';
import { Documentation } from './pages/Documentation';
import { Contact } from './pages/Contact';
import { Blog } from './pages/Blog';
import { About } from './pages/About';
import { Careers } from './pages/Careers';
import { Faq } from './pages/Faq';
import { Profile } from './pages/Profile';
import { Billing } from './pages/Billing';
import { ApiKeys } from './pages/ApiKeys';
import { Downloads } from './pages/Downloads';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { WorkspaceDocs } from './pages/WorkspaceDocs';
import { ContentPage } from './pages/ContentPage';
import { Graph } from './pages/Graph';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { isAuthenticated, userEmail, signOut } = useAuth();

  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout isAuthenticated={isAuthenticated} onSignOut={signOut} userEmail={userEmail} />}>
          <Route index element={<Landing />} />
          <Route path="features" element={<Features />} />
          <Route path="solutions" element={<Solutions />} />
          <Route path="security" element={<Security />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="documentation" element={<Documentation />} />
          <Route path="contact" element={<Contact />} />
          <Route path="blog" element={<Blog />} />
          <Route path="about" element={<About />} />
          <Route path="careers" element={<Careers />} />
          <Route path="faq" element={<Faq />} />
          <Route path="privacy" element={<ContentPage title="Privacy Policy" description="CortexShield AI is committed to protecting your data while you secure AI workflows and policy operations." bulletPoints={['Minimal data collection', 'Strong encryption in transit and at rest', 'Privacy controls for tenant data']} ctaLabel="Return home" ctaHref="/" secondaryLabel="View terms" secondaryHref="/terms" />} />
          <Route path="terms" element={<ContentPage title="Terms & Conditions" description="Review the usage terms for CortexShield AI, including access policies, support commitments, and workspace expectations." bulletPoints={['Acceptable use policy', 'Support and service levels', 'Data handling and privacy obligations']} ctaLabel="Return home" ctaHref="/" secondaryLabel="Contact support" secondaryHref="/contact" />} />

          <Route path="signin" element={<Login />} />
          <Route path="login" element={<Navigate to="/signin" replace />} />
          <Route path="get-started" element={<Navigate to="/signin" replace />} />

          <Route path="overview" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Dashboard /></ProtectedRoute>} />
          <Route path="connectors" element={<Navigate to="/overview" replace />} />
          <Route path="agents" element={<Navigate to="/overview" replace />} />
          <Route path="deployments" element={<Navigate to="/overview" replace />} />
          <Route path="profile" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Profile /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Billing /></ProtectedRoute>} />
          <Route path="api-keys" element={<ProtectedRoute isAuthenticated={isAuthenticated}><ApiKeys /></ProtectedRoute>} />
          <Route path="graph" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Graph /></ProtectedRoute>} />
          <Route path="downloads" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Downloads /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Notifications /></ProtectedRoute>} />
          <Route path="workspace-docs" element={<ProtectedRoute isAuthenticated={isAuthenticated}><WorkspaceDocs /></ProtectedRoute>} />
          <Route path="support" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Support /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Settings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
