import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface VoiceActivityContextType {
  speakingVolumes: Record<string, number>;
  setVolumes: (volumes: Record<string, number>) => void;
}

const VoiceActivityContext = createContext<VoiceActivityContextType | null>(null);

export function VoiceActivityProvider({ children }: { children: ReactNode }) {
  const [speakingVolumes, setSpeakingVolumes] = useState<Record<string, number>>({});

  const setVolumes = (volumes: Record<string, number>) => {
    setSpeakingVolumes(volumes);
  };

  const value = useMemo(() => ({
    speakingVolumes,
    setVolumes,
  }), [speakingVolumes]);

  return (
    <VoiceActivityContext.Provider value={value}>
      {children}
    </VoiceActivityContext.Provider>
  );
}

export function useVoiceActivityContext(): VoiceActivityContextType {
  const context = useContext(VoiceActivityContext);
  if (!context) {
    throw new Error('useVoiceActivityContext must be used within a VoiceActivityProvider');
  }
  return context;
}
