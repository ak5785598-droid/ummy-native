import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useFirestore, useUser, useDatabase } from '../../firebase/provider';
import { doc, collection, addDoc, serverTimestamp, getDoc } from '@/firebase/firestore-compat';
import { ref as databaseRef, set as databaseSet, push as databasePush } from 'firebase/database';

interface RoomAISystemsProps {
  roomId: string;
  messages: any[];
  participants: any[];
  isOwner: boolean;
  isModerator: boolean;
  canManageRoom: boolean;
  ownerId?: string;
  moderatorIds?: string[];
}

export function RoomAISystems({
  roomId,
  messages,
  participants,
  isOwner,
  isModerator,
  canManageRoom,
  ownerId,
  moderatorIds = []
}: RoomAISystemsProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const database = useDatabase();

  // Use refs — not state — to avoid re-triggering effects
  const lastProcessedMsgId = useRef<string | null>(null);
  const lastWelcomedMsgId = useRef<string | null>(null);
  const lastBotReplyTime = useRef<number>(0);
  const BOT_COOLDOWN = 10000;

  // Elected leader: owner > first mod > first participant (alphabetically)
  const isAIProcessor = useMemo(() => {
    if (!user?.uid || !participants || participants.length === 0) return true;
    const onlineUids = participants
      .filter(p => p.uid && p.seatIndex && p.seatIndex > 0)
      .map(p => p.uid as string);
    if (onlineUids.length === 0) return true;
    if (ownerId && onlineUids.includes(ownerId)) return user.uid === ownerId;
    const onlineMods = moderatorIds.filter(mid => onlineUids.includes(mid)).sort();
    if (onlineMods.length > 0) return user.uid === onlineMods[0];
    const sortedOnline = [...onlineUids].sort();
    return user.uid === sortedOnline[0];
  }, [user?.uid, participants, ownerId, moderatorIds]);

  const addBotMessage = useCallback(async (text: string) => {
    if (!database || !roomId) return;
    const msgRef = databasePush(databaseRef(database, `roomMessages/${roomId}`));
    await databaseSet(msgRef, {
      id: msgRef.key,
      type: 'text',
      content: text,
      senderId: 'SYSTEM_BOT',
      senderName: 'Ummy AI',
      senderAvatar: 'https://img.icons8.com/isometric/512/bot.png',
      timestamp: Date.now(),
    });
  }, [database, roomId]);

  const muteUser = useCallback(async (targetName: string) => {
    if (!firestore || !roomId) return;
    const p = participants.find(pp => pp.name === targetName);
    if (p) {
      const pref = doc(firestore, 'chatRooms', roomId, 'participants', p.uid);
      await (await import('../../lib/non-blocking-writes')).setDocumentNonBlocking(pref, { isMuted: true }, { merge: true });
    }
  }, [firestore, roomId, participants]);

  const kickUser = useCallback(async (targetName: string) => {
    if (!firestore || !roomId) return;
    const p = participants.find(pp => pp.name === targetName);
    if (p) {
      // Check kick immunity
      try {
        const snap = await (await import('@react-native-firebase/firestore')).default().collection('users').doc(p.uid).get();
        if (snap.exists && snap.data()?.avoidBeingKicked) return;
      } catch (e) {}
      const pref = doc(firestore, 'chatRooms', roomId, 'participants', p.uid);
      await (await import('../../lib/non-blocking-writes')).setDocumentNonBlocking(pref, { seatIndex: 0 }, { merge: true });
    }
  }, [firestore, roomId, participants]);

  const lockSeat = useCallback(async (targetName: string) => {
    if (!firestore || !roomId) return;
    const p = participants.find(pp => pp.name === targetName);
    if (p && p.seatIndex) {
      const pref = doc(firestore, 'chatRooms', roomId, 'participants', p.uid);
      await (await import('../../lib/non-blocking-writes')).setDocumentNonBlocking(pref, { seatIndex: 0 }, { merge: true });
    }
  }, [firestore, roomId, participants]);

  // ── AI WELCOME ──────────────────────────────────────────────────
  // Joiner's own device sends welcome — same as web logic
  useEffect(() => {
    if (!messages?.length || !user?.uid) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.id) return;
    if (lastMsg.type !== 'entrance') return;
    if (lastMsg.senderId !== user.uid) return;            // only MY entrance
    if (lastWelcomedMsgId.current === lastMsg.id) return; // already sent

    lastWelcomedMsgId.current = lastMsg.id;

    const t = setTimeout(() => {
      addBotMessage(
        `नमस्ते ${lastMsg.senderName} जी! 🙏 उम्मी चैट पर आपका तहे-दिल से स्वागत है। आपके आने से रूम की रौनक बढ़ गई है। मैं उम्मी एआई हूँ, मैं आपकी क्या सहायता कर सकती हूँ? ✨😊`
      );
    }, 2000);

    return () => clearTimeout(t);
  }, [messages, user?.uid]); // NO lastWelcomedMsg in deps — ref handles dedup

  // ── AI CHAT REPLY + MODERATION ──────────────────────────────────
  // Only elected leader (isAIProcessor) responds to ALL chat messages
  useEffect(() => {
    if (!messages?.length || !user?.uid || !isAIProcessor) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.id) return;
    if (lastMsg.senderId === 'SYSTEM_BOT') return;
    if (lastMsg.type === 'entrance') return;
    if (lastMsg.type === 'system') return;
    if (lastProcessedMsgId.current === lastMsg.id) return; // already processed

    lastProcessedMsgId.current = lastMsg.id;
    const content = (lastMsg.content || lastMsg.text || '').toLowerCase();

    // 1. Profanity Shield
    if (canManageRoom) {
      const profanityList = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'bastard', 'whore', 'slut', 'dick', 'pussy'];
      if (profanityList.some(w => content.includes(w))) {
        (async () => {
          await addBotMessage(`⚠️ @${lastMsg.senderName}, please keep the chat respectful!`);
          const pRef = doc(firestore, 'chatRooms', roomId, 'participants', lastMsg.senderId);
          const snap = await getDoc(pRef);
          if (snap.exists) {
            const data = snap.data();
            const strikes = (data.strikes || 0) + 1;
            await (await import('../../lib/non-blocking-writes')).setDocumentNonBlocking(pRef, { strikes }, { merge: true });
            if (strikes >= 3) {
              await kickUser(lastMsg.senderName);
              await addBotMessage(`🚫 @${lastMsg.senderName} has been kicked for repeated violations.`);
            }
          }
        })();
        return;
      }

      // Voice Commands
      const cmdMute = content.match(/\[CMD:MUTE:(\w+)\]/);
      if (cmdMute) muteUser(cmdMute[1]);
      const cmdKick = content.match(/\[CMD:KICK:(\w+)\]/);
      if (cmdKick) kickUser(cmdKick[1]);
      const cmdLock = content.match(/\[CMD:LOCK:(\w+)\]/);
      if (cmdLock) lockSeat(cmdLock[1]);
    }

    // 2. AI Conversational Reply (rate-limited)
    const now = Date.now();
    if (now - lastBotReplyTime.current < BOT_COOLDOWN) return;

    const triggerWords = ['ai', 'ummy', 'ummi', 'hello', 'hi', 'hlo', 'umm', 'आई', 'एआई', 'उम्मी'];
    const isTriggered =
      triggerWords.some(t => {
        const pattern = new RegExp(`(^|\\s)${t}($|\\s|[.,!?])`, 'i');
        return pattern.test(content) || content === t || content.startsWith(t + ' ') || content.endsWith(' ' + t);
      }) || content.endsWith('?');

    if (isTriggered) {
      lastBotReplyTime.current = now;
      (async () => {
        try {
          const res = await fetch('https://ummy-chat.vercel.app/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: lastMsg.content || lastMsg.text || '',
              userName: lastMsg.senderName || 'User',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.response) await addBotMessage(data.response);
          }
        } catch (err) {
          console.error('AI fetch error:', err);
        }
      })();
    }
  }, [messages, isAIProcessor, canManageRoom, user?.uid]); // NO lastProcessedMsgId — ref handles dedup

  return null;
}
