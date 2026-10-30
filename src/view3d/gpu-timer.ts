interface DisjointTimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/** A fixed query ring measures GPU work without synchronizing the CPU with it.
 * Busy queries are skipped, results are polled on later frames, and disjoint
 * results are discarded. No per-frame objects or query handles are allocated. */
export class GpuTimer {
  private readonly extension: DisjointTimerExtension | null;
  private readonly queries: WebGLQuery[] = [];
  private head = 0;
  private tail = 0;
  private pending = 0;
  private active = false;
  private disposed = false;
  private latest?: number;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.extension = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!this.extension) return;
    for (let i = 0; i < 4; i++) {
      const query = gl.createQuery();
      if (!query) {
        for (const allocated of this.queries) gl.deleteQuery(allocated);
        this.queries.length = 0;
        return;
      }
      this.queries.push(query);
    }
  }

  get milliseconds() {
    return this.latest;
  }

  begin() {
    if (this.disposed || !this.extension || !this.queries.length || this.active)
      return;
    const gl = this.gl;
    if (gl.getParameter(this.extension.GPU_DISJOINT_EXT)) {
      this.pending = 0;
      this.head = this.tail;
      this.latest = undefined;
    } else {
      while (this.pending) {
        const query = this.queries[this.head];
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
        const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT);
        if (Number.isFinite(nanoseconds) && nanoseconds >= 0)
          this.latest = nanoseconds / 1e6;
        this.head = (this.head + 1) % this.queries.length;
        this.pending--;
      }
    }
    if (this.pending === this.queries.length) return;
    gl.beginQuery(this.extension.TIME_ELAPSED_EXT, this.queries[this.tail]);
    this.active = true;
  }

  end() {
    if (!this.active || !this.extension) return;
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
    this.active = false;
    this.tail = (this.tail + 1) % this.queries.length;
    this.pending++;
  }

  dispose() {
    if (this.disposed) return;
    this.end();
    for (const query of this.queries) this.gl.deleteQuery(query);
    this.queries.length = 0;
    this.disposed = true;
    this.latest = undefined;
  }
}
