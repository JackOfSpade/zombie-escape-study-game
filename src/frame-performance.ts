export interface FrameWork {
  simulationMs: number;
  renderMs: number;
  totalMs: number;
  steps: number;
}
/** Bounded local timing summaries. No per-frame history or gameplay state retained. */
export class FramePerformance {
  private run = "";
  private start = 0;
  private last = 0;
  private frames = 0;
  private slow = 0;
  private maxFrame = 0;
  private simulation = 0;
  private render = 0;
  private total = 0;
  private maxSimulation = 0;
  private maxRender = 0;
  private maxWork = 0;
  private steps = 0;
  reset() {
    this.run = "";
    this.frames =
      this.slow =
      this.maxFrame =
      this.simulation =
      this.render =
      this.total =
      this.maxSimulation =
      this.maxRender =
      this.maxWork =
      this.steps =
        0;
  }
  sample(run: string, time: number, work: FrameWork) {
    if (
      !Number.isFinite(time) ||
      Object.values(work).some((v) => !Number.isFinite(v) || v < 0)
    )
      return;
    if (this.run !== run || time < this.last) {
      this.reset();
      this.run = run;
      this.start = this.last = time;
    }
    const interval = time - this.last;
    this.last = time;
    this.frames++;
    if (interval > 1000 / 30) this.slow++;
    this.maxFrame = Math.max(this.maxFrame, interval);
    this.simulation += work.simulationMs;
    this.render += work.renderMs;
    this.total += work.totalMs;
    this.maxSimulation = Math.max(this.maxSimulation, work.simulationMs);
    this.maxRender = Math.max(this.maxRender, work.renderMs);
    this.maxWork = Math.max(this.maxWork, work.totalMs);
    this.steps += work.steps;
    const wallMs = time - this.start;
    if (wallMs < 2000) return;
    const round = (n: number) => Math.round(n * 100) / 100;
    const report = {
      frames: this.frames,
      wallMs: round(wallMs),
      fps: round(((this.frames - 1) * 1000) / wallMs),
      slowFrames: this.slow,
      maxFrameMs: round(this.maxFrame),
      avgSimulationMs: round(this.simulation / this.frames),
      maxSimulationMs: round(this.maxSimulation),
      avgRenderMs: round(this.render / this.frames),
      maxRenderMs: round(this.maxRender),
      avgWorkMs: round(this.total / this.frames),
      maxWorkMs: round(this.maxWork),
      steps: this.steps,
    };
    this.reset();
    return report;
  }
}
