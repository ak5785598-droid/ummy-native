import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Heart, Send, ArrowLeft } from 'lucide-react-native';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '../../firebase/provider';
import { collection, query, orderBy, doc, serverTimestamp, increment, runTransaction } from '@/firebase/firestore-compat';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '../../lib/non-blocking-writes';
import { MomentComment, Moment } from '../../lib/types';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';

interface MomentCommentsSheetProps {
  momentId: string | null;
  visible: boolean;
  onClose: () => void;
}

export function MomentCommentsSheet({ momentId, visible, onClose }: MomentCommentsSheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const momentRef = useMemo(() => {
    if (!firestore || !momentId) return null;
    return doc(firestore, 'moments', momentId);
  }, [firestore, momentId]);

  const { data: moment } = useDoc<Moment>(momentRef);

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !momentId) return null;
    return query(collection(firestore, 'moments', momentId, 'comments'), orderBy('createdAt', 'asc'));
  }, [firestore, momentId]);

  const { data: comments } = useCollection<MomentComment>(commentsQuery);

  const threadedComments = useMemo(() => {
    if (!comments) return [];
    const topLevel = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);
    return topLevel.map(tc => ({
      ...tc,
      replies: replies.filter(r => r.parentId === tc.id),
    }));
  }, [comments]);

  const handleSend = async () => {
    if (!text.trim() || !firestore || !user?.uid || !momentId) return;
    setSending(true);

    try {
      await addDocumentNonBlocking(
        collection(firestore, 'moments', momentId, 'comments'),
        {
          text: text.trim(),
          userId: user.uid,
          username: user.displayName || 'User',
          avatarUrl: user.photoURL || '',
          parentId: replyTo?.id || null,
          likesCount: 0,
          createdAt: serverTimestamp(),
        }
      );

      if (momentRef) {
        updateDocumentNonBlocking(momentRef, {
          commentsCount: increment(1),
        });
      }

      setText('');
      setReplyTo(null);
    } catch (e) {
      console.error('[Comments] Send error:', e);
    }
    setSending(false);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!firestore || !user?.uid || !momentId) return;
    const likeRef = doc(firestore, 'moments', momentId, 'comments', commentId, 'likes', user.uid);
    const commentRef = doc(firestore, 'moments', momentId, 'comments', commentId);

    try {
      await runTransaction(firestore, async (tx: any) => {
        const likeSnap = await tx.get(likeRef);
        const commentSnap = await tx.get(commentRef);
        const currentLikes = commentSnap.data()?.likesCount || 0;

        if (likeSnap.exists) {
          tx.delete(likeRef);
          tx.update(commentRef, { likesCount: currentLikes - 1 });
        } else {
          tx.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          tx.update(commentRef, { likesCount: currentLikes + 1 });
        }
      });
    } catch (e) {
      console.error('[Comments] Like error:', e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Text className="text-lg font-bold text-slate-800">
            Comments {moment?.commentsCount ? `(${moment.commentsCount})` : ''}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 py-2"
            showsVerticalScrollIndicator={false}
          >
            {threadedComments.length > 0 ? (
              threadedComments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  onReply={(id, username) => setReplyTo({ id, username })}
                  onLike={handleLikeComment}
                />
              ))
            ) : (
              <View className="py-10 items-center">
                <Text className="text-slate-400 text-sm">No comments yet</Text>
              </View>
            )}
            <View className="h-20" />
          </ScrollView>

          {replyTo && (
            <View className="flex-row items-center bg-blue-50 px-4 py-2 border-t border-blue-100">
              <Text className="text-xs text-blue-600 flex-1">
                Replying to @{replyTo.username}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <X size={14} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center px-4 py-3 border-t border-slate-100 bg-white">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
              placeholderTextColor="#94a3b8"
              className="flex-1 bg-slate-50 rounded-full px-4 py-2.5 text-sm text-slate-800 max-h-20"
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              className="ml-2 p-2"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#06b6d4" />
              ) : (
                <Send size={20} color={text.trim() ? '#06b6d4' : '#cbd5e1'} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function CommentRow({
  comment,
  depth,
  onReply,
  onLike,
}: {
  comment: MomentComment & { replies?: MomentComment[] };
  depth: number;
  onReply: (id: string, username: string) => void;
  onLike: (id: string) => void;
}) {
  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate?.() || new Date(ts.seconds * 1000);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={{ paddingLeft: depth * 16 }}>
      <View className="flex-row items-start mb-3">
        <Image cachePolicy="memory-disk" source={{ uri: toCDN(comment.avatarUrl) || 'https://picsum.photos/100' }}
          className="w-8 h-8 rounded-full mr-2"
        />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-bold text-slate-700">{comment.username}</Text>
            <Text className="text-[10px] text-slate-400">{formatTime(comment.createdAt)}</Text>
          </View>
          <Text className="text-sm text-slate-800 mt-0.5">{comment.text}</Text>
          <View className="flex-row items-center gap-3 mt-1">
            <TouchableOpacity onPress={() => onLike(comment.id)}>
              <Heart size={12} color="#94a3b8" />
            </TouchableOpacity>
            {comment.likesCount ? (
              <Text className="text-[10px] text-slate-400">{comment.likesCount}</Text>
            ) : null}
            <TouchableOpacity onPress={() => onReply(comment.id, comment.username)}>
              <Text className="text-[10px] font-bold text-slate-400">Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {comment.replies?.map((reply: any) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
          onLike={onLike}
        />
      ))}
    </View>
  );
}
