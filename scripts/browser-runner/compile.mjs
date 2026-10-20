/** Each container builds one module. Release esbuild's background service before
 * Chromium starts so the compiler does not compete for the same memory budget. */
export async function compileAndRelease(compile, release) {
  try {
    return await compile();
  } finally {
    await release();
  }
}
