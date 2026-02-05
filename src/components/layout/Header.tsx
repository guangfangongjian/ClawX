/**
 * Header Component
 * Top navigation bar with search and actions
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings';

// Page titles mapping
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/chat': 'Chat',
  '/channels': 'Channels',
  '/skills': 'Skills',
  '/cron': 'Cron Tasks',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get current page title
  const currentTitle = pageTitles[location.pathname] || 'ClawX';
  
  // Cycle through themes
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };
  
  // Get theme icon
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      {/* Page Title */}
      <h2 className="text-lg font-semibold">{currentTitle}</h2>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={cycleTheme}>
          <ThemeIcon className="h-5 w-5" />
        </Button>
        
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
