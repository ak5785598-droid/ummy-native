import firestore from '@react-native-firebase/firestore';

export interface RoomLevelBroadcastParams {
  roomId: string;
  roomNumber: string | number;
  userName?: string;
  levelNumber?: number | string;
  levelName?: string;
  rewardText?: string;
}

/**
 * Trigger a top global broadcast banner across all users when a room levels up or unlocks a level station reward
 */
export async function triggerRoomLevelBroadcast({
  roomId,
  roomNumber,
  userName = 'Room Host',
  levelNumber,
  levelName,
  rewardText,
}: RoomLevelBroadcastParams) {
  try {
    await firestore().collection('globalActivity').add({
      type: 'room_level',
      userName,
      roomNumber: roomNumber || roomId,
      levelNumber: levelNumber || '',
      levelName: levelName || `Level ${levelNumber}`,
      rewardText: rewardText || '',
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to trigger room level broadcast banner:', error);
  }
}
