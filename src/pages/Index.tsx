
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb, MessageSquare, Lock, CloudLightning } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="flex flex-col items-center text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Take Notes on the Go with SnapNote
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-8">
          A simple, fast, and beautiful note-taking app that works offline and syncs across your devices.
        </p>
        
        {user ? (
          <div className="space-x-4">
            <Link to="/notes">
              <Button size="lg">View My Notes</Button>
            </Link>
            <Link to="/notes/new">
              <Button size="lg" variant="outline">Create New Note</Button>
            </Link>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        )}
        
        <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-blue-100 rounded-full p-3 inline-block mb-4">
              <Lightbulb className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Capture Ideas</h3>
            <p className="text-gray-600">
              Quickly jot down your thoughts and ideas, anywhere and anytime.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-green-100 rounded-full p-3 inline-block mb-4">
              <CloudLightning className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Works Offline</h3>
            <p className="text-gray-600">
              Access and edit your notes even without an internet connection.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-purple-100 rounded-full p-3 inline-block mb-4">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
            <p className="text-gray-600">
              Your notes are securely stored and synced across all your devices.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
