import { useQuery } from "@tanstack/react-query";
import { useMagic } from "./MagicProvider";
import { getMyCreatorFn } from "./server-functions";

export function useCurrentCreator() {
  const magic = useMagic();
  const query = useQuery({
    queryKey: ["creator", magic.identity?.issuer],
    queryFn: async () => {
      const identity = await magic.refreshIdentity();
      return getMyCreatorFn({ data: { didToken: identity.didToken } });
    },
    enabled: Boolean(magic.identity),
    retry: false,
  });
  return { ...magic, ...query, creator: query.data };
}
