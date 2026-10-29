import { getHomepageImages } from "@/lib/server/settings";
import Home from "./home-client";

// The home page images are chosen in admin → Homepage. They are read here, on
// the server, so the page arrives with the right pictures instead of swapping
// them in after load. The page is cached; saving an image in admin refreshes it.
export const revalidate = 300;

export default async function HomePage() {
  // If the database is unreachable the page still shows its built-in images.
  const homepageImages = await getHomepageImages().catch(() => ({}));
  return <Home homepageImages={homepageImages} />;
}
