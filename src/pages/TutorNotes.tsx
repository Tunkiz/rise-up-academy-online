
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Bot, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Link } from 'react-router-dom';

type TutorNote = {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
};

const TutorNotes = () => {
  const [notes, setNotes] = useState<TutorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('tutor_notes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch your saved notes.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase.from('tutor_notes').delete().eq('id', noteId);
      if (error) throw error;
      setNotes(notes.filter((note) => note.id !== noteId));
      toast({
        title: 'Success',
        description: 'Note deleted.',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Could not delete the note.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-4xl font-bold">My Saved Notes</h1>
            <p className="mt-2 text-muted-foreground">
            Review your saved responses from the AI Tutor.
            </p>
        </div>
        <Button asChild>
            <Link to="/exam-assistance">Back to AI Tutor</Link>
        </Button>
      </div>

      {!user ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">Please <Link to="/login" className="underline">log in</Link> to see your notes.</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">You haven't saved any notes yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Conversation on {new Date(note.created_at).toLocaleDateString()}</CardTitle>
                  <CardDescription>
                    Saved at {new Date(note.created_at).toLocaleTimeString()}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 justify-end">
                      <div className="rounded-lg p-3 max-w-lg bg-primary text-primary-foreground">
                        {note.prompt}
                      </div>
                      <User className="w-6 h-6 flex-shrink-0" />
                  </div>
                  <div className="flex items-start gap-3">
                      <Bot className="w-6 h-6 flex-shrink-0" />
                      <div className="rounded-lg p-3 max-w-lg bg-muted">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            }}
                        >{note.response}</ReactMarkdown>
                      </div>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorNotes;
