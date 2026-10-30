import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export type FloorFinish = "carpet" | "carpetAlt" | "lino" | "concrete" | "roof";

/** Tiny, deterministic repeating surfaces; generated once for the view lifetime. */
export function floorTexture(finish: FloorFinish) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const c = canvas.getContext("2d")!;
  const carpet = finish === "carpet" || finish === "carpetAlt";
  const colors =
    finish === "carpet"
      ? ["#738090", "#687583"]
      : finish === "carpetAlt"
        ? ["#807587", "#756b7b"]
        : finish === "lino"
          ? ["#a5a69b", "#999b91"]
          : ["#777b7a", "#717675"];
  c.fillStyle = colors[0];
  c.fillRect(0, 0, 64, 64);
  c.fillStyle = colors[1];
  c.fillRect(0, 0, 32, 32);
  c.fillRect(32, 32, 32, 32);
  // Integer hashing avoids global randomness and makes reloads identical.
  for (let i = 0; i < 400; i++) {
    const n = Math.imul(i + 13, 15485863) >>> 0;
    c.fillStyle = i % 2 ? "rgba(240,245,240,.055)" : "rgba(10,15,20,.055)";
    c.fillRect(n % 64, (n >>> 8) % 64, carpet ? 1 : 2, carpet ? 4 : 1);
  }
  c.fillStyle = carpet ? "rgba(15,20,25,.09)" : "rgba(15,20,25,.2)";
  c.fillRect(0, 0, 64, 1);
  c.fillRect(0, 0, 1, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // One texture tile spans one world metre (UVs are assigned in world units).
  texture.anisotropy = 4;
  return texture;
}
