import { useEffect, useState } from 'react';
import { doc, getDoc, getDocs, collection, query, orderBy } from '@/firebase/firestore-compat';
import { useFirestore, useMemoFirebase } from '../firebase/provider';

export interface GameConfig {
  id: string;
  title: string;
  slug: string;
  coverUrl: string;
  backgroundUrl?: string;
  loadingBackgroundUrl?: string;
  cost: number;
  imageHint: string;
}

export function useGamesConfig() {
  const firestore = useFirestore();
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    let active = true;
    const q = query(collection(firestore, 'games'), orderBy('title', 'asc'));
    getDocs(q as any).then((snap: any) => {
      if (!active) return;
      const list: GameConfig[] = [];
      snap.forEach((d: any) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          slug: data.slug || d.id,
          coverUrl: data.coverUrl || '',
          backgroundUrl: data.backgroundUrl,
          loadingBackgroundUrl: data.loadingBackgroundUrl,
          cost: data.cost || 0,
          imageHint: data.imageHint || '',
        });
      });
      setGames(list);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [firestore]);

  return { games, loading };
}

export function useGameConfig(gameId: string) {
  const firestore = useFirestore();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId) return;
    let active = true;
    getDoc(doc(firestore, 'games', gameId) as any).then((snap: any) => {
      if (!active) return;
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          id: snap.id,
          title: data.title || '',
          slug: data.slug || snap.id,
          coverUrl: data.coverUrl || '',
          backgroundUrl: data.backgroundUrl,
          loadingBackgroundUrl: data.loadingBackgroundUrl,
          cost: data.cost || 0,
          imageHint: data.imageHint || '',
        });
      }
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [firestore, gameId]);

  return { config, loading };
}
