// This is a diagnostic component to help troubleshoot the user subjects issue

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from 'lucide-react';

type Subject = Tables<'subjects'>;
type UserSubject = { subject_id: string };

const DiagnosticSubjectPanel: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [operationLog, setOperationLog] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<{
        directInsert: 'not_tested' | 'success' | 'failed',
        directDelete: 'not_tested' | 'success' | 'failed',
        adminRpc: 'not_tested' | 'success' | 'failed'
    }>({
        directInsert: 'not_tested',
        directDelete: 'not_tested',
        adminRpc: 'not_tested'
    });

    // Check if the user is an admin
    const { data: isAdmin, isLoading: isLoadingRole } = useQuery({
        queryKey: ['is-admin', user?.id],
        queryFn: async () => {
            if (!user) return false;
            const { data, error } = await supabase.rpc('is_admin');
            if (error) {
                console.error("Error checking admin role:", error);
                return false;
            }
            return data || false;
        },
        enabled: !!user,
    });

    const { data: allSubjects, isLoading: isLoadingAllSubjects } = useQuery<Subject[]>({
        queryKey: ['subjects'],
        queryFn: async () => {
            const { data, error } = await supabase.from('subjects').select('*').order('name').limit(5);
            if (error) throw new Error(error.message);
            return data || [];
        },
    });

    const { data: userSubjects, isLoading: isLoadingUserSubjects } = useQuery<UserSubject[]>({
        queryKey: ['user_subjects', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('user_subjects').select('subject_id').eq('user_id', user.id);
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!user,
    });
    
    const userSubjectIds = React.useMemo(() => new Set(userSubjects?.map(us => us.subject_id)), [userSubjects]);

    const addSubjectManually = async () => {
        if (!user || !selectedSubject) {
            setError("No user or subject selected");
            return;
        }
        setError(null);
        setOperationLog(prev => [...prev, `Attempting to add subject ${selectedSubject}...`]);

        try {
            // Get current user's tenant_id
            setOperationLog(prev => [...prev, "Fetching user's tenant ID..."]);
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('tenant_id')
              .eq('id', user.id)
              .single();

            if (profileError) {
                setError(`Profile error: ${profileError.message}`);
                setOperationLog(prev => [...prev, `Error getting profile: ${profileError.message}`]);
                setTestResults(prev => ({ ...prev, directInsert: 'failed' }));
                return;
            }

            if (!profile?.tenant_id) {
              setError('User tenant not found');
              setOperationLog(prev => [...prev, "Error: User tenant not found"]);
              setTestResults(prev => ({ ...prev, directInsert: 'failed' }));
              return;
            }

            setOperationLog(prev => [...prev, `Got tenant ID: ${profile.tenant_id}`]);
            
            // Attempt direct insert
            setOperationLog(prev => [...prev, "Inserting into user_subjects..."]);
            const { error: insertError } = await supabase.from('user_subjects').insert({ 
              user_id: user.id, 
              subject_id: selectedSubject,
              tenant_id: profile.tenant_id
            });
            
            if (insertError) {
                setError(`Insert error: ${insertError.message}`);
                setOperationLog(prev => [...prev, `Error inserting: ${insertError.message}`]);
                setTestResults(prev => ({ ...prev, directInsert: 'failed' }));
                return;
            }
            
            setOperationLog(prev => [...prev, "Subject added successfully!"]);
            setTestResults(prev => ({ ...prev, directInsert: 'success' }));
            queryClient.invalidateQueries({ queryKey: ['user_subjects', user?.id] });
            toast.success("Subject added successfully for diagnostic test");        } catch (err: Error | unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Unexpected error: ${errorMsg}`);
            setOperationLog(prev => [...prev, `Unexpected error: ${errorMsg}`]);
            setTestResults(prev => ({ ...prev, directInsert: 'failed' }));
        }
    };
    
    const removeSubjectManually = async (subjectId: string) => {
        if (!user) {
            setError("No user logged in");
            return;
        }
        setError(null);
        setOperationLog(prev => [...prev, `Attempting to remove subject ${subjectId}...`]);

        try {
            // Attempt direct delete
            setOperationLog(prev => [...prev, "Deleting from user_subjects..."]);
            const { error: deleteError } = await supabase.from('user_subjects')
                .delete()
                .eq('user_id', user.id)
                .eq('subject_id', subjectId);
            
            if (deleteError) {
                setError(`Delete error: ${deleteError.message}`);
                setOperationLog(prev => [...prev, `Error deleting: ${deleteError.message}`]);
                setTestResults(prev => ({ ...prev, directDelete: 'failed' }));
                return;
            }
            
            setOperationLog(prev => [...prev, "Subject removed successfully!"]);
            setTestResults(prev => ({ ...prev, directDelete: 'success' }));
            queryClient.invalidateQueries({ queryKey: ['user_subjects', user?.id] });
            toast.success("Subject removed successfully for diagnostic test");        } catch (err: Error | unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Unexpected error: ${errorMsg}`);
            setOperationLog(prev => [...prev, `Unexpected error: ${errorMsg}`]);
            setTestResults(prev => ({ ...prev, directDelete: 'failed' }));
        }
    };
    
    // Try admin RPC function if available
    const tryAdminMethod = async () => {
        if (!user || !selectedSubject) {
            setError("No user or subject selected");
            return;
        }
        
        setError(null);
        setOperationLog(prev => [...prev, `Attempting to use admin RPC function...`]);
        
        try {
            // Get all current user subjects
            const currentSubjectIds = userSubjects?.map(us => us.subject_id) || [];
            
            // Add the selected subject if not already in the list
            if (!currentSubjectIds.includes(selectedSubject)) {
                currentSubjectIds.push(selectedSubject);
            }
            
            // Use the admin RPC function
            setOperationLog(prev => [...prev, `Calling update_user_subjects_by_admin with ${currentSubjectIds.length} subjects...`]);
            const { error } = await supabase.rpc('update_user_subjects_by_admin', {
                target_user_id: user.id,
                new_subject_ids: currentSubjectIds,
            });
            
            if (error) {
                setError(`RPC error: ${error.message}`);
                setOperationLog(prev => [...prev, `Error with RPC: ${error.message}`]);
                setTestResults(prev => ({ ...prev, adminRpc: 'failed' }));
                return;
            }
            
            setOperationLog(prev => [...prev, "Admin RPC method succeeded!"]);
            setTestResults(prev => ({ ...prev, adminRpc: 'success' }));
            queryClient.invalidateQueries({ queryKey: ['user_subjects', user?.id] });
            toast.success("Subject updated via admin method");        } catch (err: Error | unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Unexpected error: ${errorMsg}`);
            setOperationLog(prev => [...prev, `Unexpected error: ${errorMsg}`]);
            setTestResults(prev => ({ ...prev, adminRpc: 'failed' }));
        }
    };

    if (isLoadingAllSubjects || isLoadingUserSubjects || isLoadingRole) {
        return <Skeleton className="w-full h-40" />;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Subject Management Diagnostic</CardTitle>
                <CardDescription>
                    This panel will help diagnose issues with subject management
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}
                
                <div className="space-y-2">
                    <h4 className="font-medium">Current User</h4>
                    <p>User ID: {user?.id || 'Not logged in'}</p>
                    <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-medium">Currently Enrolled Subjects</h4>
                    {userSubjectIds.size > 0 ? (
                        <ul className="list-disc pl-5">
                            {allSubjects?.filter(s => userSubjectIds.has(s.id)).map(subject => (
                                <li key={subject.id} className="flex items-center justify-between">
                                    <span>{subject.name}</span>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => removeSubjectManually(subject.id)}
                                    >
                                        Remove (Test)
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No subjects assigned</p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-medium">Add Subject (Test)</h4>                    <select 
                        className="w-full p-2 border rounded" 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        value={selectedSubject || ''}
                        aria-label="Select a subject"
                    >
                        <option value="">Select a subject...</option>
                        {allSubjects?.filter(s => !userSubjectIds.has(s.id)).map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                    </select>
                    
                    <div className="flex space-x-2 mt-2">
                        <Button onClick={addSubjectManually} disabled={!selectedSubject}>
                            Test Direct Insert
                        </Button>
                        <Button onClick={tryAdminMethod} disabled={!selectedSubject} variant="outline">
                            Test Admin RPC
                        </Button>
                    </div>
                </div>

                <div className="mt-6 bg-gray-100 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Test Results:</h4>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <span className="w-40">Direct Insert:</span>
                            {testResults.directInsert === 'not_tested' ? (
                                <span className="text-gray-500">Not tested</span>
                            ) : testResults.directInsert === 'success' ? (
                                <span className="text-green-600 font-medium">Success ✅</span>
                            ) : (
                                <span className="text-red-600 font-medium">Failed ❌</span>
                            )}
                        </div>
                        <div className="flex items-center">
                            <span className="w-40">Direct Delete:</span>
                            {testResults.directDelete === 'not_tested' ? (
                                <span className="text-gray-500">Not tested</span>
                            ) : testResults.directDelete === 'success' ? (
                                <span className="text-green-600 font-medium">Success ✅</span>
                            ) : (
                                <span className="text-red-600 font-medium">Failed ❌</span>
                            )}
                        </div>
                        <div className="flex items-center">
                            <span className="w-40">Admin RPC:</span>
                            {testResults.adminRpc === 'not_tested' ? (
                                <span className="text-gray-500">Not tested</span>
                            ) : testResults.adminRpc === 'success' ? (
                                <span className="text-green-600 font-medium">Success ✅</span>
                            ) : (
                                <span className="text-red-600 font-medium">Failed ❌</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>Expected Results:</strong><br/>
                            If you are an admin user:<br/>
                            - Direct Insert: {isAdmin ? "Should succeed ✅" : "Should fail ❌"}<br/>
                            - Direct Delete: {isAdmin ? "Should succeed ✅" : "Should fail ❌"}<br/>
                            - Admin RPC: {isAdmin ? "Should succeed ✅" : "Should fail ❌"}<br/>
                            <br/>
                            If you are a regular user:<br/>
                            - Direct Insert: Should fail ❌<br/>
                            - Direct Delete: Should fail ❌<br/>
                            - Admin RPC: Should fail ❌<br/>
                        </p>
                    </div>
                </div>
                
                <div className="mt-4 border rounded p-4">
                    <h4 className="font-medium mb-2">Operation Log:</h4>
                    <div className="bg-gray-50 p-2 max-h-40 overflow-y-auto text-xs font-mono">
                        {operationLog.length === 0 ? (
                            <p className="text-muted-foreground">No operations performed yet</p>
                        ) : (
                            <ul className="space-y-1">
                                {operationLog.map((log, i) => (
                                    <li key={i} className="border-b pb-1">{log}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DiagnosticSubjectPanel;
