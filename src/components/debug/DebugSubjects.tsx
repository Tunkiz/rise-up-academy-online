import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  class_time?: string;
  teams_link?: string;
  tenant_id: string;
}

export const DebugSubjects = () => {
  const [logs, setLogs] = useState<Array<{id: string, message: string}>>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, {id: Date.now().toString(), message: `${new Date().toISOString()}: ${message}`}]);
  };

  useEffect(() => {
    const testSubjects = async () => {
      try {
        addLog('Starting subject test...');
        
        // Check auth state
        const { data: { user } } = await supabase.auth.getUser();
        addLog(`Current user: ${user ? user.email : 'Not authenticated'}`);
        
        // Try direct query first
        addLog('Trying direct query...');
        const { data, error } = await supabase.from('subjects').select('*').order('name');
        addLog(`Direct query result: ${JSON.stringify({ data, error })}`);
        
        if (error) {
          addLog(`Error: ${error.message}`);
          addLog(`Error code: ${error.code}`);
          addLog(`Error details: ${error.details}`);
          setError(error.message);
        } else {
          addLog('Direct query succeeded!');
          setSubjects(data || []);
        }
      } catch (err) {
        addLog(`Exception: ${err}`);
        setError(String(err));
      }
    };

    testSubjects();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Subjects</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Logs:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="text-sm font-mono">{log.message}</div>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-red-600">Error:</h2>
          <div className="bg-red-100 p-4 rounded text-red-800">{error}</div>
        </div>
      )}
      
      <div>
        <h2 className="text-lg font-semibold mb-2">Subjects ({subjects.length}):</h2>
        <div className="bg-blue-100 p-4 rounded">
          {subjects.length > 0 ? (
            <ul>
              {subjects.map((subject) => (
                <li key={subject.id} className="mb-2">
                  <strong>{subject.name}</strong> (ID: {subject.id})
                </li>
              ))}
            </ul>
          ) : (
            <p>No subjects found</p>
          )}
        </div>
      </div>
    </div>
  );
};
