import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFirestore, useUser } from '../../firebase/provider';
import { doc, collection, addDoc, serverTimestamp, getDoc } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';

interface RoomAISystemsProps {
  roomId: string;
  messages: any[];
  participants: any[];
  isOwner: boolean;
  isModerator: boolean;
  canManageRoom: boolean;
}

export function RoomAISystems({ roomId, messages, participants, isOwner, isModerator, canManageRoom }: RoomAISystemsProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);
  const [lastProcessedMsg, setLastProcessedMsg] = useState<string | null>(null);
  const lastBotReplyTime = useRef<number>(0);
  const BOT_COOLDOWN = 10000; // 10 seconds between bot replies

  const addBotMessage = useCallback(async (text: string) => {
    if (!firestore || !roomId) return;
    const msgRef = collection(firestore, 'chatRooms', roomId, 'messages');
    await addDoc(msgRef, {
      type: 'system',
      content: text,
      senderId: 'SYSTEM_BOT',
      senderName: 'Ummy AI',
      senderAvatar: 'https://img.icons8.com/isometric/512/bot.png',
      timestamp: serverTimestamp(),
    });
  }, [firestore, roomId]);

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

  // AI Conversational / Command System
  useEffect(() => {
    if (!messages || !user?.uid) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.senderId === 'SYSTEM_BOT' || lastMsg.id === lastProcessedMsg) return;
    setLastProcessedMsg(lastMsg.id);

    const content = (lastMsg.content || lastMsg.text || '').toLowerCase();

    // 1. AI Profanity Shield (Only runs if current user is owner/mod to enforce moderation)
    if (canManageRoom) {
      const profanityList = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'bastard', 'whore', 'slut', 'dick', 'pussy'];
      const hasProfanity = profanityList.some(word => content.includes(word));

      if (hasProfanity) {
        (async () => {
          await addBotMessage(`⚠️ @${lastMsg.senderName}, please keep the chat respectful!`);
          const pRef = doc(firestore, 'chatRooms', roomId, 'participants', lastMsg.senderId);
          const snap = await getDoc(pRef);
          if (snap.exists) {
            const data = snap.data();
            const strikeCount = (data.strikes || 0) + 1;
            await (await import('../../lib/non-blocking-writes')).setDocumentNonBlocking(pRef, { strikes: strikeCount }, { merge: true });
            if (strikeCount >= 3) {
              await kickUser(lastMsg.senderName);
              await addBotMessage(`🚫 @${lastMsg.senderName} has been kicked for repeated violations.`);
            }
          }
        })();
        return;
      }

      // AI Voice Commands
      const cmdMute = content.match(/\[CMD:MUTE:(\w+)\]/);
      if (cmdMute) muteUser(cmdMute[1]);
      const cmdKick = content.match(/\[CMD:KICK:(\w+)\]/);
      if (cmdKick) kickUser(cmdKick[1]);
      const cmdLock = content.match(/\[CMD:LOCK:(\w+)\]/);
      if (cmdLock) lockSeat(cmdLock[1]);
    }

    // 2. AI Conversational (rate limited — max 1 reply per 10s)
    if (lastMsg.senderId !== user?.uid && lastMsg.type !== 'system') {
      const now = Date.now();
      if (now - lastBotReplyTime.current < BOT_COOLDOWN) return;
      const lower = content.toLowerCase();
      if (lower.includes('ai') || lower.includes('ummy') || lower.includes('hello') || lower.includes('hi') || lower.includes('hlo') || content.endsWith('?')) {
        lastBotReplyTime.current = now;
        (async () => {
          const greetings = ['Hey there! 💖', 'Hello! How can I help?', 'Hi! Welcome to the room!'];
          const responses = ['That sounds interesting!', 'Tell me more!', 'Great question!', 'I love that!'];
          const reply = greetings.concat(responses)[Math.floor(Math.random() * (greetings.length + responses.length))];
          await addBotMessage(reply);
        })();
      }
    }
  }, [messages, canManageRoom, user?.uid]);

  // AI Welcome for new joiners
  useEffect(() => {
    if (!messages || !user?.uid) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.type === 'entrance' && lastMsg.senderId !== user?.uid && lastMsg.senderId !== 'SYSTEM_BOT') {
      const timeout = setTimeout(async () => {
        await addBotMessage(`🎉 Welcome to the room @${lastMsg.senderName}! Enjoy your stay!`);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [messages?.length]);

  return null;
}
