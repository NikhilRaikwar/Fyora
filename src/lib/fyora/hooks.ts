import { useQuery } from "@tanstack/react-query";
import { useFyoraAuth } from "./AuthProvider";
import { getMyCreatorFn } from "./server-functions";

export function useCurrentCreator() {
  const auth = useFyoraAuth();
  const query = useQuery({
    queryKey: ["creator", auth.identity?.issuer],
    queryFn: async () => {
      const identity = await auth.refreshIdentity();
      return getMyCreatorFn({ data: { didToken: identity.didToken } });
    },
    enabled: Boolean(auth.identity),
    retry: false,
  });
  return { ...auth, ...query, creator: query.data };
}
