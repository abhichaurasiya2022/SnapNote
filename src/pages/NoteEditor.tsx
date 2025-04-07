
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from '@/context/NotesContext';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const noteColors = [
  { name: 'Yellow', value: '#FFF9C4' },
  { name: 'Blue', value: '#BBDEFB' },
  { name: 'Green', value: '#C8E6C9' },
  { name: 'Pink', value: '#F8BBD0' },
  { name: 'Purple', value: '#E1BEE7' },
  { name: 'Orange', value: '#FFE0B2' },
  { name: 'White', value: '#FFFFFF' },
];

const NoteEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isNewNote = id === 'new';
  const navigate = useNavigate();
  const { notes, createNote, updateNote } = useNotes();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(noteColors[0].value);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (!isNewNote && id) {
      const note = notes.find(n => n.id === id);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setColor(note.color || noteColors[0].value);
      } else {
        toast.error('Note not found');
        navigate('/notes');
      }
    }
  }, [id, isNewNote, notes, navigate]);
  
  const handleSave = async () => {
    if (isSaving) return;
    
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isNewNote) {
        await createNote({
          title: title.trim(),
          content,
          color,
        });
        toast.success('Note created');
        navigate('/notes');
      } else if (id) {
        await updateNote(id, {
          title: title.trim(),
          content,
          color,
        });
        toast.success('Note updated');
        navigate('/notes');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Layout>
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notes')}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isNewNote ? 'New Note' : 'Edit Note'}
        </h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ backgroundColor: color }}>
        <div className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-medium border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            />
          </div>
          
          <Textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
          />
        </div>
      </div>
      
      <div className="mt-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Note Color</h3>
          <div className="flex flex-wrap gap-2">
            {noteColors.map((noteColor) => (
              <button
                key={noteColor.value}
                className={`w-8 h-8 rounded-full border-2 ${
                  color === noteColor.value ? 'border-blue-500' : 'border-gray-200'
                }`}
                style={{ backgroundColor: noteColor.value }}
                onClick={() => setColor(noteColor.value)}
                aria-label={`Set color to ${noteColor.name}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NoteEditor;
