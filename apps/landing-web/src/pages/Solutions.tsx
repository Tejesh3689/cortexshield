import React from 'react';
import { ContentPage } from './ContentPage';

export const Solutions: React.FC = () => (
  <ContentPage
    title="Solutions"
    description="Deploy secure AI workflows and user experiences across teams, integrations, and private models without sacrificing compliance."
    bulletPoints={[
      'Secure AI agent orchestration for product teams',
      'Prebuilt integrations with MCP, database, and SaaS systems',
      'Tenant-aware controls and workflow governance',
      'Flexible API key management and usage monitoring',
      'Customer success resources for enterprise rollout'
    ]}
    ctaLabel="Start your trial"
    ctaHref="/signin"
    secondaryLabel="Contact sales"
    secondaryHref="/contact"
  />
);
