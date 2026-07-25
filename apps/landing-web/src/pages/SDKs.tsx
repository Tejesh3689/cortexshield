import React from 'react';
import { ContentPage } from './ContentPage';

export const SDKs: React.FC = () => (
  <ContentPage
    title="SDKs"
    description="Access SDK libraries and examples for integrating AgentOS with your applications." 
    bulletPoints={['JavaScript and Python SDKs', 'Client libraries for secure API calls', 'Sample code for agent workflows']} 
    ctaLabel="View download options"
    ctaHref="/downloads"
    secondaryLabel="Open docs"
    secondaryHref="/documentation"
  />
);