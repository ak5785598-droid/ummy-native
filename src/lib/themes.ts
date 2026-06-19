export interface RoomTheme {
  id: string;
  name: string;
  url: any;
  isOfficial?: boolean;
  seatColor?: string;
  accentColor?: string;
  category?: 'help' | 'entertainment' | 'general' | 'user_choice' | 'seasonal' | 'islamic';
  price?: number;
  durationDays?: number;
  animationId?: 'galaxy' | 'stars' | 'love' | 'rain';
}

export const ROOM_THEMES: RoomTheme[] = [
  { id: 'ummy_prime', name: 'Ummy Prime', url: require('../../assets/images/themes/ummy_prime.jpg'), isOfficial: true, seatColor: 'rgba(217, 70, 239, 0.2)', accentColor: '#d946ef', category: 'general' },
  // --- ORIGINAL 25 COLLECTION ---
  { id: 'neon_universe', name: 'Neon Universe', url: require('../../assets/images/themes/neon_night_scenic.jpg'), seatColor: 'rgba(147, 51, 234, 0.2)', accentColor: '#d946ef', category: 'entertainment' },
  { id: 'emoji_party', name: 'Emoji Party', url: require('../../assets/images/themes/ummy_emoji_party.jpg'), seatColor: 'rgba(251, 191, 36, 0.2)', accentColor: '#fbbf24', category: 'entertainment' },
  { id: 'hacker_room', name: 'Hacker Room', url: require('../../assets/images/themes/coding_hacker_v2.jpg'), seatColor: 'rgba(34, 197, 94, 0.15)', accentColor: '#22c55e', category: 'entertainment' },
  { id: 'arcade_room', name: 'Arcade Room', url: require('../../assets/images/themes/gaming_arcade_v2.jpg'), seatColor: 'rgba(59, 130, 246, 0.2)', accentColor: '#3b82f6', category: 'entertainment' },
  { id: 'heartbeat_room', name: 'Heartbeat Room', url: require('../../assets/images/themes/heartbeat_arcade_scenic.jpg'), seatColor: 'rgba(236, 72, 153, 0.2)', accentColor: '#ec4899', category: 'entertainment' },
  { id: 'gentle_lounge', name: 'Gentle Lounge', url: require('../../assets/images/themes/user_pink_bubbles.jpg'), seatColor: 'rgba(255, 255, 255, 0.1)', accentColor: '#f8fafc', category: 'entertainment' },
  { id: 'support_hub', name: 'Support Hub', url: require('../../assets/images/themes/official_hub_light.jpg'), isOfficial: true, seatColor: 'rgba(59, 130, 246, 0.1)', accentColor: '#3b82f6', category: 'help' },
  { id: 'knowledge_center', name: 'Knowledge Center', url: require('../../assets/images/themes/official_hub_dark.jpg'), isOfficial: true, seatColor: 'rgba(120, 113, 108, 0.1)', accentColor: '#78716c', category: 'help' },
  { id: 'summary_guide', name: 'Summary Guide', url: require('../../assets/images/themes/help_center_light.jpg'), isOfficial: true, seatColor: 'rgba(14, 165, 233, 0.1)', accentColor: '#0ea5e9', category: 'help' },
  { id: 'friendly_guide', name: 'Friendly Guide', url: require('../../assets/images/themes/friendly_guide_scenic.jpg'), isOfficial: true, seatColor: 'rgba(34, 197, 94, 0.1)', accentColor: '#22c55e', category: 'help' },
  { id: 'minimal_help', name: 'Minimal Help', url: require('../../assets/images/themes/minimal_help_v2.jpg'), isOfficial: true, seatColor: 'rgba(100, 116, 139, 0.1)', accentColor: '#64748b', category: 'help' },
  { id: 'celestial_love', name: 'Celestial Love', url: require('../../assets/images/themes/celestial_love.jpg'), seatColor: 'rgba(99, 102, 241, 0.25)', accentColor: '#818cf8', category: 'entertainment' },
  { id: 'moonlit_romance', name: 'Moonlit Romance', url: require('../../assets/images/themes/moonlit_romance.jpg'), seatColor: 'rgba(192, 132, 252, 0.25)', accentColor: '#c084fc', category: 'entertainment' },
  { id: 'midnight_proposal', name: 'Midnight Proposal', url: require('../../assets/images/themes/midnight_proposal.jpg'), seatColor: 'rgba(59, 130, 246, 0.25)', accentColor: '#60a5fa', category: 'entertainment', animationId: 'rain' },
  { id: 'dreamy_hearts', name: 'Dreamy Hearts', url: require('../../assets/images/themes/dreamy_hearts.jpg'), seatColor: 'rgba(232, 121, 249, 0.25)', accentColor: '#e879f9', category: 'entertainment', animationId: 'love' },
  { id: 'sunset_shore', name: 'Sunset Shore', url: require('../../assets/images/themes/sunset_shore.jpg'), seatColor: 'rgba(251, 146, 60, 0.25)', accentColor: '#fb923c', category: 'entertainment' },
  { id: 'ummy_love_vibes', name: 'Ummy Love Vibes', url: require('../../assets/images/themes/ummy_love_vibes.jpg'), isOfficial: true, seatColor: 'rgba(251, 146, 60, 0.25)', accentColor: '#fb923c', category: 'entertainment' },
  { id: 'ummy_emoji_party', name: 'Ummy Fun Emoji Party', url: require('../../assets/images/themes/ummy_emoji_party.jpg'), isOfficial: true, seatColor: 'rgba(236, 72, 153, 0.25)', accentColor: '#ec4899', category: 'entertainment' },
  { id: 'ummy_support_hub', name: 'Ummy Support Center', url: require('../../assets/images/themes/ummy_support_hub.jpg'), isOfficial: true, seatColor: 'rgba(139, 92, 246, 0.25)', accentColor: '#8b5cf6', category: 'help' },
  { id: 'ummy_golden_glow', name: 'Ummy Golden Glow', url: require('../../assets/images/themes/ummy_golden_glow.jpg'), isOfficial: true, seatColor: 'rgba(251, 191, 36, 0.25)', accentColor: '#fbbf24', category: 'general' },
  { id: 'ummy_neon_night', name: 'Ummy Neon Night', url: require('../../assets/images/themes/ummy_neon_night.jpg'), isOfficial: true, seatColor: 'rgba(168, 85, 247, 0.25)', accentColor: '#a855f7', category: 'general' },
  { id: 'ummy_galaxy', name: 'Ummy Galaxy', url: require('../../assets/images/themes/ummy_galaxy.jpg'), isOfficial: true, seatColor: 'rgba(99, 102, 241, 0.25)', accentColor: '#6366f1', category: 'general', animationId: 'galaxy' },
  { id: 'ummy_spring_garden', name: 'Ummy Spring Garden', url: require('../../assets/images/themes/ummy_spring_garden.jpg'), isOfficial: true, seatColor: 'rgba(74, 222, 128, 0.25)', accentColor: '#4ade80', category: 'general' },
  { id: 'ummy_help_desk', name: 'Ummy Help Desk', url: require('../../assets/images/themes/ummy_help_desk.jpg'), isOfficial: true, seatColor: 'rgba(20, 184, 166, 0.25)', accentColor: '#14b8a6', category: 'help' },
  { id: 'ummy_help_guide', name: 'Ummy Help Guide', url: require('../../assets/images/themes/ummy_help_guide.jpg'), isOfficial: true, seatColor: 'rgba(167, 139, 250, 0.25)', accentColor: '#a78bfa', category: 'help' },

  // --- PREMIUM SCENIC & SEASONAL COLLECTION ---
  { id: 'scenic_neon_night_v2_new', name: 'Neon Night Scenic', url: require('../../assets/images/themes/neon_night_scenic.jpg'), seatColor: 'rgba(124, 58, 237, 0.2)', accentColor: '#8b5cf6', category: 'general' },
  { id: 'celestial_love_v2_new', name: 'Celestial Love V2', url: require('../../assets/images/themes/celestial_love_v2.jpg'), seatColor: 'rgba(99, 102, 241, 0.2)', accentColor: '#6366f1', category: 'general' },
  { id: 'ummy_galaxy_v2_new', name: 'Ummy Galaxy V2', url: require('../../assets/images/themes/ummy_galaxy_v2.jpg'), seatColor: 'rgba(217, 70, 239, 0.2)', accentColor: '#d946ef', category: 'general', animationId: 'galaxy' },
  { id: 'halloween_2025_v2_new', name: 'Halloween 2025 V2', url: require('../../assets/images/themes/halloween_2025_v2.jpg'), seatColor: 'rgba(249, 115, 22, 0.2)', accentColor: '#f97316', category: 'general' },
  { id: 'friendly_guide_scenic_new', name: 'Friendly Guide Scenic', url: require('../../assets/images/themes/friendly_guide_scenic.jpg'), seatColor: 'rgba(34, 197, 94, 0.2)', accentColor: '#22c55e', category: 'help' },
  { id: 'birthday_special_scenic_v3', name: 'Birthday Party', url: require('../../assets/images/themes/user_pink_bubbles.jpg'), seatColor: 'rgba(236, 72, 153, 0.2)', accentColor: '#ec4899', category: 'entertainment' },
  { id: 'holiday_village_premium', name: 'Holiday Village Alpine', url: require('../../assets/images/themes/user_winter_village.jpg'), seatColor: 'rgba(239, 68, 68, 0.2)', accentColor: '#ef4444', category: 'seasonal' },
  { id: 'beach_luxury_scenic_premium', name: 'Beach Luxury Lounge', url: require('../../assets/images/themes/user_beach_sunset.jpg'), seatColor: 'rgba(14, 165, 233, 0.2)', accentColor: '#0ea5e9', category: 'entertainment' },
  { id: 'eid_special_scenic_v3', name: 'Eid Special Night', url: require('../../assets/images/themes/user_ramadan_lantern.jpg'), seatColor: 'rgba(30, 58, 138, 0.2)', accentColor: '#1e3a8a', category: 'entertainment' },
  { id: 'christmas_cozy_scenic_new', name: 'Christmas Cozy Scenic', url: require('../../assets/images/themes/user_winter_snow.jpg'), seatColor: 'rgba(239, 68, 68, 0.2)', accentColor: '#ef4444', category: 'entertainment' },
  { id: 'holi_scenic_new', name: 'Holi Festival Scenic', url: require('../../assets/images/themes/user_holi_festival.jpg'), seatColor: 'rgba(217, 70, 239, 0.2)', accentColor: '#d946ef', category: 'entertainment' },
  { id: 'coding_hacker_v2_new', name: 'Hacker Room V2', url: require('../../assets/images/themes/coding_hacker_v2.jpg'), seatColor: 'rgba(34, 197, 94, 0.2)', accentColor: '#22c55e', category: 'entertainment' },
  { id: 'gaming_arcade_v2_new', name: 'Gaming Arcade V2', url: require('../../assets/images/themes/gaming_arcade_v2.jpg'), seatColor: 'rgba(59, 130, 246, 0.2)', accentColor: '#3b82f6', category: 'entertainment' },
  { id: 'dreamy_hearts_v2_new', name: 'Dreamy Hearts V2', url: require('../../assets/images/themes/dreamy_hearts_v2.jpg'), seatColor: 'rgba(232, 121, 249, 0.2)', accentColor: '#ec4899', category: 'entertainment', animationId: 'love' },

  // --- NEW USER-PROVIDED 9:16 COLLECTION ---
  { id: 'user_desert_tent', name: 'Desert Sunset Tent', url: require('../../assets/images/themes/user_desert_tent.jpg'), seatColor: 'rgba(251, 146, 60, 0.2)', accentColor: '#fb923c', category: 'user_choice' },
  { id: 'user_sakura_bridge', name: 'Cherry Blossom Bridge', url: require('../../assets/images/themes/user_sakura_bridge.jpg'), seatColor: 'rgba(167, 139, 250, 0.2)', accentColor: '#a78bfa', category: 'user_choice' },
  { id: 'user_shiva_divine', name: 'Divine Shiva Meditation', url: require('../../assets/images/themes/user_shiva_divine.jpg'), seatColor: 'rgba(255, 170, 0, 0.15)', accentColor: '#ffaa00', category: 'user_choice', animationId: 'stars' },
  { id: 'user_holi_group', name: 'Holi Colors Celebration', url: require('../../assets/images/themes/user_holi_group.jpg'), seatColor: 'rgba(217, 70, 239, 0.2)', accentColor: '#d946ef', category: 'user_choice' },
  { id: 'user_starry_campfire', name: 'Starry Night Campfire', url: require('../../assets/images/themes/user_starry_campfire.jpg'), seatColor: 'rgba(147, 51, 234, 0.2)', accentColor: '#8b5cf6', category: 'user_choice', animationId: 'stars' },
  { id: 'user_crescent_moon', name: 'Crescent Moon Night', url: require('../../assets/images/themes/user_crescent_moon.jpg'), seatColor: 'rgba(30, 58, 138, 0.2)', accentColor: '#1e3a8a', category: 'user_choice', animationId: 'stars' },
  { id: 'user_krishna_divine', name: 'Divine Krishna Glow', url: require('../../assets/images/themes/user_krishna_divine.jpg'), seatColor: 'rgba(251, 191, 36, 0.2)', accentColor: '#fbbf24', category: 'user_choice' },
  { id: 'user_beach_dinner_2', name: 'Beach Candlelight Dinner', url: require('../../assets/images/themes/user_beach_dinner_2.jpg'), seatColor: 'rgba(251, 146, 60, 0.2)', accentColor: '#fb923c', category: 'user_choice' },
  { id: 'user_shiva_meditation_2', name: 'Shiva Mountain Glow', url: require('../../assets/images/themes/user_shiva_meditation_2.jpg'), seatColor: 'rgba(255, 170, 0, 0.15)', accentColor: '#ffaa00', category: 'user_choice' },
  { id: 'user_starry_night', name: 'Clear Starry Night', url: require('../../assets/images/themes/user_starry_night.jpg'), seatColor: 'rgba(30, 58, 138, 0.2)', accentColor: '#1e3a8a', category: 'user_choice', animationId: 'stars' },
  { id: 'user_buddha_gold', name: 'Golden Buddha Spirit', url: require('../../assets/images/themes/user_buddha_gold.jpg'), seatColor: 'rgba(251, 191, 36, 0.2)', accentColor: '#fbbf24', category: 'user_choice' },
  { id: 'user_golden_temple', name: 'Golden Temple Divine', url: require('../../assets/images/themes/user_golden_temple.jpg'), seatColor: 'rgba(59, 130, 246, 0.2)', accentColor: '#60a5fa', category: 'user_choice' },
  { id: 'user_shiva_cave', name: 'Shiva Cave Waterfall', url: require('../../assets/images/themes/user_shiva_cave.jpg'), seatColor: 'rgba(34, 197, 94, 0.15)', accentColor: '#22c55e', category: 'user_choice', animationId: 'rain' },
  { id: 'user_shiva_cosmic', name: 'Cosmic Shiva Spirit', url: require('../../assets/images/themes/user_shiva_cosmic.jpg'), seatColor: 'rgba(168, 85, 247, 0.2)', accentColor: '#a855f7', category: 'user_choice', animationId: 'stars' },
  { id: 'user_desert_prayer', name: 'Desert Night Prayer', url: require('../../assets/images/themes/user_desert_prayer.jpg'), seatColor: 'rgba(251, 146, 60, 0.2)', accentColor: '#fb923c', category: 'user_choice' },
  { id: 'user_evening_prayer', name: 'Evening Prayer Sunset', url: require('../../assets/images/themes/user_evening_prayer.jpg'), seatColor: 'rgba(251, 146, 60, 0.2)', accentColor: '#fb923c', category: 'user_choice' },
  { id: 'user_diwali_diyas', name: 'Diwali Golden Diyas', url: require('../../assets/images/themes/user_diwali_diyas.jpg'), seatColor: 'rgba(251, 191, 36, 0.2)', accentColor: '#fbbf24', category: 'user_choice' },
  { id: 'user_shiva_glow', name: 'Golden Shiva Glow', url: require('../../assets/images/themes/user_shiva_glow.jpg'), seatColor: 'rgba(251, 146, 60, 0.2)', accentColor: '#fb923c', category: 'user_choice', animationId: 'stars' },
  { id: 'user_divine_ascension', name: 'Divine Spirit Ascension', url: require('../../assets/images/themes/user_divine_ascension.jpg'), seatColor: 'rgba(255, 255, 255, 0.2)', accentColor: '#ffffff', category: 'user_choice' },
  { id: 'user_mosque_night', name: 'Mosque Night Spirit', url: require('../../assets/images/themes/user_mosque_night.jpg'), seatColor: 'rgba(30, 58, 138, 0.2)', accentColor: '#1e3a8a', category: 'islamic', animationId: 'stars' },
  { id: 'user_shiva_dark_art', name: 'Shiva Dark Meditation', url: require('../../assets/images/themes/user_shiva_dark_art.jpg'), seatColor: 'rgba(255, 255, 255, 0.1)', accentColor: '#ffffff', category: 'user_choice', animationId: 'stars' }
];
