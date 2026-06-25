import { ref, set, onValue, remove, serverTimestamp, push, off } from 'firebase/database';
import { useDatabase } from '../firebase/provider';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
};

export { RTC_CONFIG };

export interface SignalingOffer {
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
  timestamp: number;
}

export interface SignalingAnswer {
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
  timestamp: number;
}

export interface SignalingCandidate {
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
  timestamp: number;
}

export class WebRTCSignaling {
  private database: any;
  private roomId: string;
  private uid: string;

  constructor(database: any, roomId: string, uid: string) {
    this.database = database;
    this.roomId = roomId;
    this.uid = uid;
  }

  private getBasePath() {
    return `webrtc/${this.roomId}`;
  }

  async sendOffer(to: string, sdp: RTCSessionDescriptionInit) {
    const offerRef = ref(this.database, `${this.getBasePath()}/offers/${to}/${this.uid}`);
    await set(offerRef, {
      from: this.uid,
      to,
      sdp,
      timestamp: Date.now(),
    });
  }

  async sendAnswer(to: string, sdp: RTCSessionDescriptionInit) {
    const answerRef = ref(this.database, `${this.getBasePath()}/answers/${to}/${this.uid}`);
    await set(answerRef, {
      from: this.uid,
      to,
      sdp,
      timestamp: Date.now(),
    });
  }

  async sendCandidate(to: string, candidate: RTCIceCandidateInit) {
    const candRef = ref(this.database, `${this.getBasePath()}/candidates/${to}/${this.uid}`);
    const newRef = push(candRef);
    await set(newRef, {
      from: this.uid,
      to,
      candidate,
      timestamp: Date.now(),
    });
  }

  async clearSignalingData() {
    const basePath = this.getBasePath();
    await remove(ref(this.database, `${basePath}/offers/${this.uid}`)).catch(() => {});
    await remove(ref(this.database, `${basePath}/answers/${this.uid}`)).catch(() => {});
    await remove(ref(this.database, `${basePath}/candidates/${this.uid}`)).catch(() => {});
  }

  async removeUserFromRoom() {
    const userRef = ref(this.database, `${this.getBasePath()}/users/${this.uid}`);
    await remove(userRef).catch(() => {});
  }

  listenForOffers(callback: (offer: SignalingOffer, from: string) => void) {
    const offerRef = ref(this.database, `${this.getBasePath()}/offers/${this.uid}`);
    onValue(offerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([from, offer]: [string, any]) => {
          if (from !== this.uid) {
            callback(offer as SignalingOffer, from);
          }
        });
      }
    });
    return () => off(offerRef);
  }

  listenForAnswers(callback: (answer: SignalingAnswer, from: string) => void) {
    const answerRef = ref(this.database, `${this.getBasePath()}/answers/${this.uid}`);
    onValue(answerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([from, answer]: [string, any]) => {
          if (from !== this.uid) {
            callback(answer as SignalingAnswer, from);
          }
        });
      }
    });
    return () => off(answerRef);
  }

  listenForCandidates(callback: (candidate: SignalingCandidate, from: string) => void) {
    const candRef = ref(this.database, `${this.getBasePath()}/candidates/${this.uid}`);
    onValue(candRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([from, candidates]: [string, any]) => {
          if (from !== this.uid && candidates) {
            Object.values(candidates).forEach((cand: any) => {
              callback(cand as SignalingCandidate, from);
            });
          }
        });
      }
    });
    return () => off(candRef);
  }

  listenForUsers(callback: (users: Record<string, boolean>) => void) {
    const usersRef = ref(this.database, `${this.getBasePath()}/users`);
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
    return () => off(usersRef);
  }

  async announcePresence() {
    const userRef = ref(this.database, `${this.getBasePath()}/users/${this.uid}`);
    await set(userRef, true);
  }
}
