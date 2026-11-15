import { Navigate, useParams } from 'react-router-dom';

export const SubscriptionPlanEditPage = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/admin/subscriptions/${id}` : '/admin/subscriptions'} replace />;
};

export default SubscriptionPlanEditPage;
