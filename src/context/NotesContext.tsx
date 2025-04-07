
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Note } from '@/types';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

interface NotesContextType {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  createNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user } = useAuth();
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (user) {
        fetchNotes(); // Refresh data when we're back online
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);
  
  // Fetch notes on user change
  useEffect(() => {
    if (user) {
      fetchNotes();
    } else {
      setNotes([]);
    }
  }, [user]);
  
  // Listen for service worker messages about synced changes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PENDING_CHANGES_STATUS') {
        // If we just synced changes, refresh the notes
        if (event.data.hasPendingChanges === false && user) {
          fetchNotes();
        }
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [user]);
  
  // Fetch notes function
  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setNotes(data || []);
    } catch (e) {
      console.error('Error fetching notes:', e);
      const errorMessage = 'Failed to load notes';
      setError(errorMessage);
      
      if (isOffline) {
        toast.error('You are offline. Showing cached notes if available.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Create note function
  const createNote = async (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Note> => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      const newNote = {
        ...noteData,
        user_id: user.id,
      };
      
      // If offline, we need to generate a temporary ID
      if (isOffline) {
        const tempNote: Note = {
          ...newNote,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user.id
        };
        
        // Update local state immediately for a better UX
        setNotes(prev => [tempNote, ...prev]);
        
        toast.warning('You are offline. This note will be synced when you reconnect.');
        return tempNote;
      }
      
      const { data, error } = await supabase
        .from('notes')
        .insert(newNote)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to create note');
      }
      
      // Update local state
      setNotes(prev => [data, ...prev]);
      
      toast.success('Note created');
      return data;
    } catch (e) {
      console.error('Error creating note:', e);
      const errorMessage = 'Failed to create note';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // Update note function
  const updateNote = async (id: string, updates: Partial<Note>): Promise<Note> => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      // If offline, optimistically update the UI first
      if (isOffline) {
        const currentNote = notes.find(n => n.id === id);
        if (!currentNote) {
          throw new Error('Note not found');
        }
        
        const updatedNote = {
          ...currentNote,
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        // Update local state immediately for a better UX
        setNotes(prev => prev.map(note => note.id === id ? updatedNote : note));
        
        toast.warning('You are offline. This update will be synced when you reconnect.');
        return updatedNote;
      }
      
      const { data, error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to update note');
      }
      
      // Update local state
      setNotes(prev => prev.map(note => note.id === id ? data : note));
      
      toast.success('Note updated');
      return data;
    } catch (e) {
      console.error('Error updating note:', e);
      const errorMessage = 'Failed to update note';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // Delete note function
  const deleteNote = async (id: string): Promise<void> => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      // If offline, optimistically update the UI first
      if (isOffline) {
        // Update local state immediately
        setNotes(prev => prev.filter(note => note.id !== id));
        
        toast.warning('You are offline. This deletion will be synced when you reconnect.');
        return;
      }
      
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== id));
      
      toast.success('Note deleted');
    } catch (e) {
      console.error('Error deleting note:', e);
      const errorMessage = 'Failed to delete note';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  return (
    <NotesContext.Provider value={{
      notes,
      loading,
      error,
      fetchNotes,
      createNote,
      updateNote,
      deleteNote
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
