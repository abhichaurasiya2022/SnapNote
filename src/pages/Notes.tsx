
import { useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import NoteCard from '@/components/NoteCard';
import OfflineIndicator from '@/components/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/context/NotesContext';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Notes = () => {
  const { notes, loading, error, fetchNotes, deleteNote } = useNotes();

  const hasFetched = useRef(false);

  useEffect(() => {

    const loadNotes = async (hasFetched) => {
      if (!hasFetched) {
        await fetchNotes();
      }
    };

    loadNotes(hasFetched.current).then(() => {
      hasFetched.current = true;
    });
  }, []);
  
  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Notes</h1>
        <Link to="/notes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </Link>
      </div>
      
      <OfflineIndicator />
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          {error}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-4">No notes yet</h3>
          <p className="text-gray-600 mb-6">Create your first note to get started</p>
          <Link to="/notes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Note
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onDelete={handleDeleteNote} 
            />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Notes;
