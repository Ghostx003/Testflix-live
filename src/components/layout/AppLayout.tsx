import React, { useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BookOpen, Settings, LogOut, Database, Download, Upload, Activity, Menu, X, Calendar, Target, Bookmark } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { exportDatabase, importDatabase } from '../../services/backup';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC = () => {
  const [userProfile, setUserProfile] = useLocalStorage('userProfile', { name: '', isFirstTime: true, hasCompletedSetup: false });
  const navigate = useNavigate();
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigation = [
    { name: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true },
    { name: 'Add Test', to: '/app/add-test', icon: PlusCircle },
    { name: 'Test Dashboard', to: '/app/test-dashboard', icon: BookOpen },
    { name: 'Practice', to: '/app/practice', icon: Target },
    { name: 'Calendar', to: '/app/calendar', icon: Calendar },
    { name: 'Bookmarks', to: '/app/bookmarks', icon: Bookmark },
    { name: 'Performance', to: '/app/performance', icon: Activity },
    { name: 'Settings', to: '/app/settings', icon: Settings },
  ];

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset everything? This clears your setup data.")) {
      setUserProfile({ name: '', isFirstTime: true, hasCompletedSetup: false });
      navigate('/');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testflix_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowBackupMenu(false);
    } catch (error) {
      alert("Failed to export database");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowBackupMenu(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importDatabase(file);
        alert("Database imported successfully! Refreshing app...");
        window.location.reload();
      } catch (error) {
        alert("Failed to import database");
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-surface-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-surface-900/40 backdrop-blur-xl border-b border-white/5 shadow-sm">
        <div className="flex h-16 items-center px-4 md:px-6 w-full justify-between">
          
          <div className="flex shrink-0 justify-start items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 -ml-2 text-surface-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/app" className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-primary-400 tracking-tight">TestFlix</h1>
            </Link>
          </div>
            
          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-1 min-w-0 items-center justify-start gap-1 lg:gap-2 ml-4 lg:ml-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pr-4 mask-fade-right">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-white/10 text-primary-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-white/5'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name === 'Test Dashboard' ? (
                  <span className="text-[12px] leading-none mt-0.5">{item.name}</span>
                ) : (
                  item.name
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 md:gap-2 lg:gap-4 relative">
            <div className="hidden sm:flex items-center gap-2 text-sm text-surface-400 mr-2">
              <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold">
                {userProfile.name?.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-surface-300 hidden lg:inline-block">{userProfile.name}</span>
            </div>
            
            {/* Backup Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowBackupMenu(!showBackupMenu)}
                className="p-2 text-surface-400 hover:text-primary-400 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                title="Backup Options"
              >
                <Database className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showBackupMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden z-50"
                  >
                    <div className="py-1">
                      <button
                        onClick={handleExport}
                        className="flex items-center w-full px-4 py-3 text-sm text-surface-200 hover:bg-white/10 hover:text-primary-300 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-3" />
                        Export Backup
                      </button>
                      <button
                        onClick={handleImportClick}
                        className="flex items-center w-full px-4 py-3 text-sm text-surface-200 hover:bg-white/10 hover:text-primary-300 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-3" />
                        Import Backup
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Hidden file input for import */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
            </div>

            <button 
              onClick={handleReset}
              className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-surface-900 border-r border-white/10 z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="text-xl font-extrabold text-primary-400 tracking-tight">Menu</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-surface-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-300',
                        isActive
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                          : 'text-surface-300 hover:text-white hover:bg-white/5'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-sm text-surface-300">
                  <span className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-lg">
                    {userProfile.name?.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-white">{userProfile.name}</p>
                    <p className="text-xs text-surface-500">Student Profile</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>
      
    </div>
  );
};
