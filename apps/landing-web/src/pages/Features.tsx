import React from 'react';
import { ContentPage } from './ContentPage';

export const Features: React.FC = () => (
  <ContentPage
    title="Features"
    description="AgentOS brings secure agent operations, seamless MCP integration, and enterprise-ready monitoring into a single product experience."
    bulletPoints={[
      'AI agent protection with policy-aware controls',
      'Secure MCP routing for model context workflows',
      'Memory integrity validation and prompt safety',
      'Encrypted integrations and tenant separation',
      'Premium onboarding and support options'
    ]}
    ctaLabel="Explore pricing"
    ctaHref="/pricing"
    secondaryLabel="Request a demo"
    secondaryHref="/contact"
  />
);
