import { getServerSession } from "next-auth";

export async function getAuthSession() {
  return getServerSession();
}
