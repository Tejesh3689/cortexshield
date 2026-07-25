import React from 'react';
import { ContentPage } from './ContentPage';

export const Documentation: React.FC = () => (
  <ContentPage
    title="Documentation"
    description="Access guides, API references, and integration examples for securing your AI agents and MCP systems."
    bulletPoints={[
      'Quickstart guides for getting started in minutes',
      'MCP routing and access control documentation',
      'Policy configuration and memory protection best practices',
      'SDK references and integration examples',
      'Compliance and audit guidance for enterprise teams'
    ]}
    ctaLabel="Browse docs"
    ctaHref="/workspace-docs"
    secondaryLabel="Contact support"
    secondaryHref="/support"
  />
);