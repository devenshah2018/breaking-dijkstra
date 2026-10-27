import Icon from "./Icons";
export default function Methodology() {
  return (
    <section className="methodology" aria-label="Paper and methodology">
      <div className="section-heading">
        <div>
          <span className="eyebrow">UNDERSTAND THE GUARANTEE</span>
          <h2>The paper, precisely.</h2>
          <p>A theoretical breakthrough deserves careful representation.</p>
        </div>
      </div>
      <div className="paper-card surface">
        <div className="paper-icon">
          <Icon name="book" size={26} />
        </div>
        <div>
          <span className="eyebrow">
            SOURCE PAPER · VERSION 2 · 30 JULY 2025
          </span>
          <h3>
            Breaking the Sorting Barrier for Directed
            <br className="desktop-break" /> Single-Source Shortest Paths
          </h3>
          <p>Ran Duan · Jiayi Mao · Xiao Mao · Xinkai Shu · Longhui Yin</p>
          <a
            className="text-link"
            href="https://arxiv.org/html/2504.17033v2"
            target="_blank"
            rel="noreferrer"
          >
            Read the source paper <Icon name="external" size={14} />
          </a>
        </div>
      </div>
      <div className="method-grid">
        <article className="surface">
          <span className="eyebrow">01 / WHAT IS PROVED</span>
          <h3>A better bound on sparse graphs.</h3>
          <p>
            Theorem 1.1 gives a deterministic O(m log<sup>2/3</sup> n) algorithm
            for directed single-source shortest paths with non-negative real
            edge weights in the comparison-addition model.
          </p>
          <p>
            Compared with O(m + n log n) Dijkstra using an advanced heap, this
            breaks the sorting barrier on sparse graphs. It is an asymptotic
            result; it does not imply a speedup at every graph size or density.
          </p>
        </article>
        <article className="surface">
          <span className="eyebrow">02 / WHAT RUNS HERE</span>
          <h3>The recursive procedure, made visible.</h3>
          <p>
            Algorithms 1–3 guide pivot discovery, the bounded binary-heap base
            case, recursive Pull, interval routing, and deferred BatchPrepend.
            Equal labels are reused as required by Remark 3.4.
          </p>
          <p>
            Section 2’s ordering uses distance, then hop count, then the
            reversed vertex sequence. The source parameters use k = ⌊log
            <sup>1/3</sup>₂ n⌋, t = ⌊log<sup>2/3</sup>₂ n⌋, L = ⌈log₂ n / t⌉,
            with a minimum of 1 for tiny graphs.
          </p>
        </article>
      </div>
      <div className="surface fidelity-table">
        <h3>Implementation fidelity</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Implementation</th>
                <th>Consequence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>FindPivots · Algorithm 1</td>
                <td>
                  Up to k relaxation rounds; tight path forest; valid empty
                  pivot set
                </td>
                <td>Witnesses below B′ are certified on return.</td>
              </tr>
              <tr>
                <td>BaseCase · Algorithm 2</td>
                <td>Indexed binary heap; at most k + 1 vertices</td>
                <td>The boundary vertex is deferred.</td>
              </tr>
              <tr>
                <td>BMSSP · Algorithm 3</td>
                <td>Recursive bounds, equality reuse, interval routing</td>
                <td>Completion is distinct from discovery.</td>
              </tr>
              <tr>
                <td>Queue · Lemma 3.3</td>
                <td>
                  <span className="scope-label">Simplified</span> Full sort on
                  Pull; equivalent key operations
                </td>
                <td>The paper’s amortized queue bound is not implemented.</td>
              </tr>
              <tr>
                <td>Constant-degree reduction · §2</td>
                <td>
                  <span className="scope-label">Omitted</span> Original vertices
                  remain visible
                </td>
                <td>
                  Arbitrary-degree inputs are supported; the time analysis does
                  not transfer.
                </td>
              </tr>
              <tr>
                <td>Arithmetic model</td>
                <td>JavaScript IEEE-754 doubles; no epsilon in relaxation</td>
                <td>
                  Not exact real arithmetic. Non-finite weights and overflowing
                  path sums are rejected.
                </td>
              </tr>
              <tr>
                <td>Dijkstra baseline</td>
                <td>Indexed binary heap with decrease-key</td>
                <td>O((m + n) log n) kernel; not the Fibonacci-heap bound.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="method-grid">
        <article className="surface">
          <span className="eyebrow">03 / HOW WE CHECK</span>
          <h3>Agreement is checked independently.</h3>
          <p>
            Every comparison verifies both final distance arrays against
            Bellman–Ford and validates the parent paths. Automated regression
            tests cover sub-nanounit improvements, zero-weight cycles, equal
            paths, disconnected inputs, dense graphs, invalid data, overflow,
            and trace completion.
          </p>
          <p>
            Agreement on tests provides evidence. It is not a formal proof over
            all real-weighted graphs.
          </p>
        </article>
        <article className="surface">
          <span className="eyebrow">04 / HOW TO READ THE UI</span>
          <h3>A trace is not a stopwatch.</h3>
          <p>
            Each playback tick advances one recorded event in each trace.
            Dijkstra events and recursive BMSSP events represent different
            amounts of work. Event counts cannot establish which implementation
            is faster.
          </p>
          <p>
            A displayed path is tentative until its target is finalized. Vertex
            labels are formatted for readability; exports retain the full
            numeric values. Benchmarks run separately with tracing disabled.
          </p>
        </article>
      </div>
    </section>
  );
}
