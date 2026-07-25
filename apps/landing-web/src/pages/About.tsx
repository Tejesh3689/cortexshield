import React from 'react';
import { ContentPage } from './ContentPage';

export const About: React.FC = () => (
  <ContentPage
    title="About AgentOS"
    description="AgentOS was built to help teams secure AI agents, integrations, and memory with enterprise governance and everyday workflow clarity."
    bulletPoints={[
      'Founded by security and AI infrastructure experts',
      'Focused on trust, observability, and safe automation',
      'Built for distributed teams and modern cloud architectures',
      'Optimized for MCP-enabled systems and agent ecosystems',
      'Backed by a user-centered product approach'
    ]}
    ctaLabel="See security"
    ctaHref="/security"
    secondaryLabel="Contact us"
    secondaryHref="/contact"
  />
);