import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Welcome } from './pages/Welcome';
import { SetupWizard } from './pages/SetupWizard';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { AddTest } from './pages/AddTest';
import { ReviewTest } from './pages/ReviewTest';
import { Calendar } from './pages/Calendar';
import { Bookmarks } from './pages/Bookmarks';
import { Practice } from './pages/Practice';
import { PracticeTest } from './pages/PracticeTest';
import { Performance } from './pages/Performance';
import { useLocalStorage } from './hooks/useLocalStorage';
import { db } from './services/db';

// Guard for authenticated/setup routes
const RequireSetup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile] = useLocalStorage('userProfile', { name: '', isFirstTime: true, hasCompletedSetup: false });
  const [hasDbData, setHasDbData] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const testsCount = await db.tests.count();
        const subjectsCount = await db.subjects.count();
        
        // --- Migration: Remove 'Left Out' status from all questions ---
        const leftOutStatus = await db.statuses.where('name').equals('Left Out').first();
        if (leftOutStatus && leftOutStatus.id) {
          const qs = await db.questions.toArray();
          const qsToUpdate = qs.filter(q => q.statusIds?.includes(leftOutStatus.id!));
          if (qsToUpdate.length > 0) {
            qsToUpdate.forEach(q => {
              q.statusIds = q.statusIds.filter(id => id !== leftOutStatus.id!);
            });
            await db.questions.bulkPut(qsToUpdate);
          }
        }
        // ----------------------------------------------------------------

        setHasDbData(testsCount > 0 || subjectsCount > 0);
      } catch (error) {
        console.error("Failed to check DB:", error);
        setHasDbData(false);
      }
    };
    checkDb();
  }, []);

  if (hasDbData === null) {
    return <div className="flex h-screen items-center justify-center bg-surface-900 text-primary-500">Loading...</div>;
  }

  // If there's data in the DB, we consider the setup complete regardless of localStorage
  if (hasDbData) {
    return <>{children}</>;
  }

  if (userProfile.isFirstTime) {
    return <Navigate to="/" replace />;
  }
  if (!userProfile.hasCompletedSetup) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [userProfile] = useLocalStorage('userProfile', { name: '', isFirstTime: true, hasCompletedSetup: false });
  const [hasDbData, setHasDbData] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const testsCount = await db.tests.count();
        const subjectsCount = await db.subjects.count();
        setHasDbData(testsCount > 0 || subjectsCount > 0);
      } catch (error) {
        console.error("Failed to check DB:", error);
        setHasDbData(false);
      }
    };
    checkDb();
  }, []);

  if (hasDbData === null) {
    return <div className="flex h-screen items-center justify-center bg-surface-900 text-primary-500">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={hasDbData || !userProfile.isFirstTime ? <Navigate to="/app" replace /> : <Welcome />} 
        />
        <Route 
          path="/setup" 
          element={hasDbData || userProfile.hasCompletedSetup ? <Navigate to="/app" replace /> : <SetupWizard />} 
        />
        <Route 
          path="/practice-test/:sessionId" 
          element={
            <RequireSetup>
              <PracticeTest />
            </RequireSetup>
          } 
        />
        <Route 
          path="/app" 
          element={
            <RequireSetup>
              <AppLayout />
            </RequireSetup>
          } 
        >
          <Route index element={<Dashboard />} />
          <Route path="add-test" element={<AddTest />} />
          <Route path="test-dashboard" element={<ReviewTest />} />
          <Route path="practice" element={<Practice />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="performance" element={<Performance />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
