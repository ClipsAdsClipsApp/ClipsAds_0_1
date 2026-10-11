import { useEffect, useState } from "react";
import {
  authEnabled,
  subscribeToFirebaseUser,
  type FirebaseUserInfo,
} from "@/lib/firebase/auth";

export type AppUser = FirebaseUserInfo;

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
};

export function useCurrentUserState(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    user: null,
    isPending: authEnabled,
  });

  useEffect(() => {
    if (!authEnabled) {
      setState({ user: null, isPending: false });
      return;
    }
    setState((current) => ({ ...current, isPending: true }));
    return subscribeToFirebaseUser((user) => setState({ user, isPending: false }));
  }, []);

  return state;
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
