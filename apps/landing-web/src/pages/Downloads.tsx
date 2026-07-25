import React from 'react';
import { ContentPage } from './ContentPage';

export const Downloads: React.FC = () => (
  <ContentPage
    title="Downloads"
    description="Download SDKs, CLI tools, and integration assets for your AgentOS deployment." 
    bulletPoints={['SDK packages for JavaScript and Python', 'CLI setup tools and installers', 'Sample configuration templates']} 
    ctaLabel="Browse SDKs"
    ctaHref="/sdks"
    secondaryLabel="View docs"
    secondaryHref="/documentation"
  />
);