import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { storeApi, type TrialStatus } from '../../pages/store/api/storeApi';
import { SubscriptionLockOverlay } from './SubscriptionLockOverlay';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

type SubscriptionGateMode = 'NONE' | 'NO_PLAN_LOCK' | 'EXPIRED_LOCK';

function resolveGateMode(status: TrialStatus): SubscriptionGateMode {
  if (status.state === 'EXPIRED' || status.isExpired) {
    return 'EXPIRED_LOCK';
  }
  if (
    status.state === 'ELIGIBLE' ||
    status.state === 'REVIEW_REQUIRED' ||
    status.isNoPlan ||
    status.destination === 'CONFIRM' ||
    status.destination === 'SUBSCRIPTIONS'
  ) {
    return 'NO_PLAN_LOCK';
  }
  return 'NONE';
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [subscriptionCheck, setSubscriptionCheck] = useState<{ path: string; mode: SubscriptionGateMode } | null>(null);
  const [runtimeLock, setRuntimeLock] = useState<{ path: string; message?: string | null } | null>(null);

  const rawRole = (user?.role || '').toUpperCase();
  const hasRoleAccess =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    allowedRoles
      .map((r) => r.toUpperCase())
      .some((r) => r === rawRole || (Boolean(user?.isAdmin) && r === 'ADMIN'));

  const isSuperAdmin = rawRole === 'SUPER_ADMIN' || rawRole === 'SUPERADMIN';
  const isTenantDefault = user?.tenantId === 'DEFAULT';
  const isOwnerRole = !isSuperAdmin && !isTenantDefault && ['STORE_OWNER', 'STOREOWNER', 'ADMIN'].includes(rawRole);
  const isEmployeeRole = !isSuperAdmin && !isTenantDefault && ['EMPLOYEE', 'CASHIER', 'STAFF'].includes(rawRole);

  const isSubscriptionGuardedArea = !location.pathname.startsWith('/admin');
  const isSubscriptionAllowedPath =
    location.pathname.startsWith('/store-owner/subscriptions') ||
    location.pathname.startsWith('/store-owner/account') ||
    location.pathname.startsWith('/store-owner/settings');

  const shouldCheckSubscription = Boolean(
    isAuthenticated &&
    user &&
    hasRoleAccess &&
    isSubscriptionGuardedArea &&
    !isSubscriptionAllowedPath &&
    (isOwnerRole || isEmployeeRole)
  );

  useEffect(() => {
    let active = true;
    if (!shouldCheckSubscription) {
      return () => { active = false; };
    }

    const targetPath = location.pathname;
    const statusPromise = isOwnerRole
      ? storeApi.getTrialStatus()
      : storeApi.getSubscriptionAccessStatus();

    statusPromise
      .then((response) => {
        if (active) {
          setSubscriptionCheck({
            path: targetPath,
            mode: resolveGateMode(response.data),
          });
        }
      })
      .catch((err: any) => {
        if (!active) return;
        const code = String(err?.response?.data?.code || err?.response?.data?.errorCode || '').toUpperCase();
        setSubscriptionCheck({
          path: targetPath,
          mode: code === 'SUBSCRIPTION_REQUIRED' ? 'EXPIRED_LOCK' : 'NONE',
        });
      });

    return () => { active = false; };
  }, [shouldCheckSubscription, location.pathname, isOwnerRole]);

  useEffect(() => {
    if (!shouldCheckSubscription) return;

    const handleSubscriptionRequired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setRuntimeLock({
        path: location.pathname,
        message: customEvent.detail?.message ?? null,
      });
    };

    window.addEventListener('subscription-required', handleSubscriptionRequired);
    return () => {
      window.removeEventListener('subscription-required', handleSubscriptionRequired);
    };
  }, [shouldCheckSubscription, location.pathname]);

  if (!isAuthenticated || !user) {
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(currentPath)}`} state={{ from: location }} replace />;
  }

  if (!hasRoleAccess) {
    if (rawRole === 'EMPLOYEE' || rawRole === 'CASHIER' || rawRole === 'STAFF') {
      return <Navigate to="/employee/pos" replace />;
    }
    return <Navigate to="/store-owner/dashboard" replace />;
  }

  const isCheckingSubscription = shouldCheckSubscription && subscriptionCheck?.path !== location.pathname;
  const gateMode: SubscriptionGateMode =
    subscriptionCheck?.path === location.pathname ? subscriptionCheck.mode : 'NONE';
  const hasRuntimeLock = runtimeLock?.path === location.pathname;

  if (isCheckingSubscription && !hasRuntimeLock) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          color: '#475569',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Đang kiểm tra trạng thái gói dịch vụ...
      </div>
    );
  }

  const shouldShowSubscriptionOverlay =
    isSubscriptionGuardedArea &&
    !isSubscriptionAllowedPath &&
    (gateMode === 'NO_PLAN_LOCK' || gateMode === 'EXPIRED_LOCK' || hasRuntimeLock);
  const resolvedLockReason: 'NO_PLAN' | 'EXPIRED' =
    gateMode === 'NO_PLAN_LOCK' ? 'NO_PLAN' : 'EXPIRED';

  return (
    <>
      {children}
      {shouldShowSubscriptionOverlay && (
        <SubscriptionLockOverlay
          isOwner={isOwnerRole}
          lockReason={resolvedLockReason}
          reasonMessage={hasRuntimeLock ? runtimeLock?.message : null}
          onGoToBilling={() =>
            navigate(
              resolvedLockReason === 'NO_PLAN'
                ? '/store-owner/subscriptions?tab=subscriptions&onboarding=1'
                : '/store-owner/subscriptions?tab=subscriptions',
            )
          }
          onLogout={() => {
            if (typeof logout === 'function') {
              void logout().finally(() => navigate('/auth/login', { replace: true }));
            }
          }}
        />
      )}
    </>
  );
};

export default ProtectedRoute;
