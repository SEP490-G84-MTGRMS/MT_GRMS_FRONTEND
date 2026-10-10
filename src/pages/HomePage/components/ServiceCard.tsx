import type { FC, ReactNode } from 'react';

export interface ServiceCardProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export const ServiceCard: FC<ServiceCardProps> = ({ title, description, icon }) => {
  return (
    <div className="service-card">
      <div className="service-icon-wrap">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};
