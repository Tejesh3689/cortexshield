import React from 'react';
import { ContentPage } from './ContentPage';

export const Organization: React.FC = () => (
  <ContentPage
    title="Organization"
    description="Configure your team, assign roles, and manage workspace-level controls for secure collaboration."
    bulletPoints={['Create and manage teams', 'Define access roles', 'Configure workspace settings']}
    ctaLabel="Return to overview"
    ctaHref="/overview"
  />
);