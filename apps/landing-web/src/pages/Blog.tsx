import React from 'react';
import { ContentPage } from './ContentPage';

export const Blog: React.FC = () => (
  <ContentPage
    title="Blog"
    description="Read the latest updates, best practices, and industry insights for secure AI operations and agent governance."
    bulletPoints={[
      'Announcements for new product features and releases',
      'Technical deep dives on secure MCP workflows',
      'Operational guidance for AI teams and platform owners',
      'Case studies from enterprise deployments',
      'Security and compliance insights'
    ]}
    ctaLabel="Visit documentation"
    ctaHref="/documentation"
    secondaryLabel="Talk to sales"
    secondaryHref="/contact"
  />
);