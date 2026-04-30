import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function Layout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      {!isLoginPage && <Navbar />}
      
      <div className="flex">
        {!isLoginPage && (
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>
        )}
        
        <main className={`flex-1 ${!isLoginPage ? 'pb-20 lg:pb-6' : ''}`}>
          <Outlet />
        </main>
      </div>
      
      {!isLoginPage && <BottomNav />}
    </div>
  );
}
