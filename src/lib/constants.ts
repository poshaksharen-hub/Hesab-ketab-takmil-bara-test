
import { User, Users } from 'lucide-react';
import type { OwnerId } from './types';

export const ALLOWED_USERS = [
  'ali@khanevadati.app',
  'fatemeh@khanevadati.app',
];

type UserDetail = {
  email: string;
  firstName: string;
  lastName: string;
};

// This is now the Single Source of Truth for static user identity details.
// The dynamic Firebase Auth UID is stored in the /users collection in Firestore.
export const USER_DETAILS: Record<'ali' | 'fatemeh', UserDetail> = {
  ali: {
    email: 'ali@khanevadati.app',
    firstName: 'علی',
    lastName: 'کاکایی',
  },
  fatemeh: {
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
