import type { FC } from "react";
import { Outlet } from "react-router-dom";

export const AuthLayout: FC = () => {
  return (
    <div className="auth-shell">
      {/* Khu vực nội dung trung tâm (Centered Card Layout với Lưới nền tinh tế) */}
      <main className="auth-main-area bg-grid-subtle">
        <div className="auth-card-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
