// The converted campus files (.lrz) are gzip streams. Some hosts serve them with Content-Encoding: gzip (the browser
// has already inflated them), most as plain bytes: inflate only when the gzip magic number is there.
export async function fetchz(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const b = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf;
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
