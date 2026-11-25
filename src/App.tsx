import { useEffect, useState } from 'react';
import { AppRoute, MobileBottomNav, Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StoreProvider } from './context/StoreContext';
import { HomePage } from './pages/HomePage';
import { BookingPage } from './pages/BookingPage';
import { ClubPage } from './pages/ClubPage';
import { MusicEpkPage } from './pages/MusicEpkPage';
import { ShopPage } from './pages/ShopPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);
  const [initialReferralCode, setInitialReferralCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setInitialReferralCode(ref.toUpperCase());
      setRoute('book');
    }
  }, []);

  const handleNavigate = (nextRoute: AppRoute, serviceId?: string) => {
    if (serviceId) {
      setPreselectedServiceId(serviceId);
    } else if (nextRoute !== 'book') {
      setPreselectedServiceId(undefined);
    }
    setRoute(nextRoute);
  };

  return (
    <ErrorBoundary>
      <StoreProvider>
        <div className="min-h-screen flex flex-col bg-[#F9F8F5] text-[#18191B]">
          <Navbar activeRoute={route} onNavigate={(r) => handleNavigate(r)} />
          <main className="flex-1">
            {route === 'home' && <HomePage onNavigate={handleNavigate} />}
            {route === 'book' && (
              <BookingPage
                preselectedServiceId={preselectedServiceId}
                initialReferralCode={initialReferralCode}
                onNavigate={(r) => handleNavigate(r)}
              />
            )}
            {route === 'club' && <ClubPage onNavigate={(r) => handleNavigate(r)} />}
            {route === 'music' && <MusicEpkPage onNavigate={handleNavigate} />}
            {route === 'shop' && <ShopPage />}
            {route === 'admin' && <AdminPage />}
          </main>
          <Footer onNavigate={(r) => handleNavigate(r)} />
          <MobileBottomNav activeRoute={route} onNavigate={(r) => handleNavigate(r)} />
        </div>
      </StoreProvider>
    </ErrorBoundary>
  );
}
