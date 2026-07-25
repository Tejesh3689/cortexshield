import React from 'react';
import { ContentPage } from './ContentPage';

export const Careers: React.FC = () => (
  <ContentPage
    title="Careers"
    description="Join a team building the next generation of secure AI infrastructure and operations tooling."
    bulletPoints={[
      'Engineering roles focused on security and AI systems',
      'Design and product roles shaping enterprise workflows',
      'Customer success for modern AI teams',
      'Remote-friendly culture with distributed collaboration',
      'Competitive compensation and learning opportunities'
    ]}
    ctaLabel="Apply now"
    ctaHref="/contact"
    secondaryLabel="Learn about our mission"
    secondaryHref="/about"
  />
);