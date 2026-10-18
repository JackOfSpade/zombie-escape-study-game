import { readPacket } from "./browser-runner/packet.mjs";

/** Framing completes independently of Docker's stdin EOF; base64 preserves exact UTF-8 bytes. */
export const codePacket = (code) =>
  JSON.stringify({ code: Buffer.from(code, "utf8").toString("base64") }) + "\n";
export function pythonBootstrap(marker) {
  return `import sys,os,json,base64
packet=sys.stdin.buffer.readline(131073)
if len(packet)>131072 or not packet.endswith(b'\\n'): raise ValueError('Incomplete or oversized code packet')
code=base64.b64decode(json.loads(packet)['code'],validate=True)
if len(code)>65536: raise ValueError('Code too large')
open('/work/main.py','wb').write(code)
null=os.open('/dev/null',os.O_RDONLY)
os.dup2(null,0)
os.close(null)
sys.stderr.write(${JSON.stringify(marker + "\n")})
sys.stderr.flush()
os.execv(sys.executable,[sys.executable,'-I','-B','/work/main.py'])`;
}
export function nodeBootstrap(marker, language) {
  const extension = language === "typescript" ? "ts" : "mjs";
  return `const fs=require('node:fs'),cp=require('node:child_process');const readPacket=${readPacket.toString()};
(async()=>{const packet=JSON.parse(await readPacket(process.stdin)),code=Buffer.from(packet.code,'base64');if(code.length>65536)throw Error('Code too large');fs.writeFileSync('/work/main.${extension}',code);fs.writeSync(2,${JSON.stringify(marker + "\n")});const r=cp.spawnSync(process.execPath,['--max-old-space-size=64',${language === "typescript" ? "'--experimental-strip-types'," : ""}'/work/main.${extension}'],{stdio:['ignore','inherit','inherit']});process.exit(r.status??1);})().catch(error=>{console.error(error.message);process.exitCode=1;});`;
}
