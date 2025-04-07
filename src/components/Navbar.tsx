
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, PlusSquare, LogOut, User } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isInstallable, installApp } = usePwaInstall();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and app name */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">SnapNote</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/notes">
                  <Button variant="ghost">My Notes</Button>
                </Link>
                <Link to="/notes/new">
                  <Button>
                    <PlusSquare className="mr-2 h-4 w-4" />
                    New Note
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
            
            {isInstallable && (
              <Button onClick={installApp} variant="outline" className="ml-2">
                Add to Home Screen
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" onClick={toggleMenu}>
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 animate-fade-in">
            {user ? (
              <>
                <Link to="/notes" onClick={toggleMenu}>
                  <Button variant="ghost" className="w-full justify-start">
                    My Notes
                  </Button>
                </Link>
                <Link to="/notes/new" onClick={toggleMenu}>
                  <Button className="w-full justify-start">
                    <PlusSquare className="mr-2 h-4 w-4" />
                    New Note
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => { signOut(); toggleMenu(); }} className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={toggleMenu}>
                  <Button variant="ghost" className="w-full justify-start">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={toggleMenu}>
                  <Button className="w-full justify-start">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
            
            {isInstallable && (
              <Button 
                onClick={() => { installApp(); toggleMenu(); }} 
                variant="outline" 
                className="w-full justify-start"
              >
                Add to Home Screen
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
