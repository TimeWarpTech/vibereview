import { createHash } from "node:crypto";

export function slugForGame(game: { game_name: string; game_url: string }): string {
  const namePart = game.game_name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "game";
  const hash = createHash("sha1").update(game.game_url).digest("hex").slice(0, 8);
  return `${namePart}-${hash}`;
}
