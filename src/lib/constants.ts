
export const ALLOWED_USERS = [
  'ali@khanevadati.app',
  'fatemeh@khanevadati.app',
];

type UserDetail = {
  id: string;
  firstName: string;
  lastName: string;
};

export const USER_DETAILS: Record<'ali' | 'fatemeh', UserDetail> = {
  ali: {
    id: 'gHZ9n7s2b9X8fJ2kP3s5t8YxVOE2',
    firstName: 'علی',
    lastName: 'کاکایی',
  },
  fatemeh: {
    id: 'iwXrEC4MPze90eK0BExOdqMdTZ43',
    firstName: 'فاطمه',
    lastName: 'صالح',
  },
};
