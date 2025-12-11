
import { User, Users } from 'lucide-react';
import type { OwnerId } from './types';

export const ALLOWED_USERS = [
  'ali@khanevadati.app',
  'fatemeh@khanevadati.app',
];

type UserDetail = {
  id: string; // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;
};

export const USER_DETAILS: Record<'ali' | 'fatemeh', UserDetail> = {
  ali: {
    id: 'gHZ9n7s2b9X8fJ2kP3s5t8YxVOE2',
    email: 'ali@khanevadati.app',
    firstName: 'علی',
    lastName: 'کاکایی',
  },
  fatemeh: {
    id: 'rK7p9W3qZ5c1xV8fB6n4mY2wI9O1',
    email: 'fatemeh@khanevadati.app',
    firstName: 'فاطمه',
    lastName: 'صالح',
  },
};

type OwnerDetails = {
    name: string;
    Icon: React.ElementType;
}

export const OWNER_DETAILS: Record<OwnerId, OwnerDetails> = {
    ali: {
        name: USER_DETAILS.ali.firstName,
        Icon: User,
    },
    fatemeh: {
        name: USER_DETAILS.fatemeh.firstName,
        Icon: User,
    },
    shared: {
        name: "مشترک",
        Icon: Users,
    }
}
