import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import { OfflineProvider } from './context/OfflineContext';
import ProtectedRoute from './components/ProtectedRoute';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

const App = () => {
  // Register and enhance service worker for PWA
  useEffect(() => {

    
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
            
            // Set up periodic cache cleanup
            setInterval(() => {
              if (registration.active) {
                registration.active.postMessage('CLEAN_CACHES');
              }
            }, 86400000); // 24 hours in milliseconds
            
            // Request a background sync if supported
            if ('sync' in registration && 'register' in registration.sync) {
              // Register a sync when we go back online
              window.addEventListener('online', () => {
                registration.sync.register('sync-notes-queue')
                  .then(() => console.log('Background sync registered'))
                  .catch(err => console.error('Background sync registration failed:', err));
              });
              
              // Register an initial sync when the app loads
              if (navigator.onLine) {
                registration.sync.register('sync-notes-queue')
                  .then(() => console.log('Initial background sync registered'))
                  .catch(err => console.error('Initial background sync registration failed:', err));
              }
            } else {
              console.log('Background sync not supported in this browser');
            }
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OfflineProvider>
                <NotesProvider>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/notes" element={
                      <ProtectedRoute>
                        <Notes />
                      </ProtectedRoute>
                    } />
                    <Route path="/notes/:id" element={
                      <ProtectedRoute>
                        <NoteEditor />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </NotesProvider>
              </OfflineProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
