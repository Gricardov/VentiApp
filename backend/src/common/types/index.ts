export interface UserLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface UserPreferences {
  interests: string[];
  tags: string[];
  preferredSchedule: string;
  maxDistance: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  avatar: string;
  location: UserLocation;
  preferences: UserPreferences;
}

export interface PushSubscriptionRecord {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface EventLocation {
  city: string;
  country: string;
  venue: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  location: EventLocation;
  date: string;
  time: string;
  duration: string;
  imageUrl: string;
  capacity: number;
  price: string;
  organizer: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  eventIds: string[];
  createdAt: string;
}

export interface OptionItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  matchPercentage: number;
  tags: string[];
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  enrolled: boolean;
  saved: boolean;
}

export interface LLMResponse {
  text?: string;
  options?: OptionItem[];
}
