import { useNavigate } from "react-router-dom";
import { useQueue } from "../context/QueueContext";
import ThemeToggle from "../components/ThemeToggle";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  BellRing,
  Clock3,
  Hospital,
  ShieldCheck,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const { queueData } = useQueue();

  const { estimatedTime, nowServing, waitingPatients, queuePaused } = queueData;
  const currentToken = `A-${String(nowServing).padStart(3, "0")}`;
  const estimatedQueueWait = waitingPatients * estimatedTime;

  const handleHome = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  const handleFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  const tickerItems = [
    { icon: <Ticket size={19} />, text: "Digital Tokens" },
    { icon: <Activity size={19} />, text: "Live Queue Tracking" },
    { icon: <BellRing size={19} />, text: "Instant Notifications" },
    { icon: <Clock3 size={19} />, text: "Less Waiting Time" },
    { icon: <Hospital size={19} />, text: "Better Hospital Experience" },
  ];

  return (
    <main className="home-page">
      <nav className="navbar">
        <button className="logo" onClick={handleHome} aria-label="CareQueue home">
          <span className="logo-mark"><Hospital size={23} strokeWidth={2.4} /></span>
          <span>CareQueue</span>
        </button>

        <div className="nav-links">
          <button type="button" className="nav-link-button active" onClick={handleHome}>Home</button>
          <button type="button" className="nav-link-button" onClick={handleAbout}>About</button>
          <button type="button" className="nav-link-button" onClick={handleFeatures}>Features</button>
          <ThemeToggle />
          <button type="button" className="nav-login" onClick={() => navigate("/login")}>
            <Users size={15} /> Patient Login
          </button>
          <button type="button" className="nav-admin" onClick={() => navigate("/admin-login")}>
            <ShieldCheck size={15} /> Admin Login
          </button>
        </div>
      </nav>

      <section className="hero" id="about">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="hero-tag"><Activity size={15} /> SMART HOSPITAL QUEUE MANAGEMENT</div>
          <h1>
            Skip the waiting room.
            <br />
            <span>Manage your queue digitally.</span>
            <i className="typing-caret" />
          </h1>
          <p className="hero-description">
            Get your digital token, track your queue position, and know your
            estimated waiting time without standing in a long queue.
          </p>
          <div className="hero-buttons">
            <button type="button" className="primary-btn" onClick={() => navigate("/login")}>
              Get Your Token <ArrowRight size={17} />
            </button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/queue-status")}>
              <Activity size={17} /> Track Queue
            </button>
          </div>
          <div className="hero-benefits">
            <span><Zap size={17} /> Faster Visits</span>
            <span><Users size={17} /> Real-time Updates</span>
            <span><ShieldCheck size={17} /> Less Waiting</span>
          </div>
        </div>

        <div className="queue-visual">
          <div className="queue-orbit orbit-one" />
          <div className="queue-orbit orbit-two" />
          <div className="queue-card">
            <div className="queue-header">
              <span><Users size={14} /> LIVE QUEUE</span>
              <span className={`cq-live-status ${queuePaused ? "is-paused" : ""}`}>
                <span className="cq-live-status__dot" aria-hidden="true" />
                <span className="cq-live-status__label">{queuePaused ? "Paused" : "Live"}</span>
              </span>
            </div>
            <div className="token-number" key={currentToken}>{currentToken}</div>
            <p>Now Serving</p>
            <div className="queue-info">
              <div><strong>{waitingPatients}</strong><span>Waiting</span></div>
              <div><strong>{estimatedTime} min</strong><span>Treatment Time</span></div>
            </div>
            <div className="wait-time">
              <span>Estimated Queue Wait</span>
              <strong>{estimatedQueueWait} min</strong>
            </div>
          </div>
        </div>

        <button className="scroll-cue" onClick={handleFeatures} type="button">
          <span className="scroll-mouse" />
          Scroll to explore <ArrowDown size={15} />
        </button>
      </section>

      <div className="ticker-shell" aria-label="CareQueue benefits">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div className="ticker-item" key={`${item.text}-${index}`}>
              {item.icon}<span>{item.text}</span><b>•</b>
            </div>
          ))}
        </div>
      </div>

      <section className="features" id="features">
        <div className="section-eyebrow"><span /> FEATURES <span /></div>
        <h2>Everything you need for a smoother visit</h2>
        <p className="section-description">A simpler, smarter way to manage your hospital visit.</p>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon"><Ticket size={27} /></div>
            <div className="feature-copy">
              <h3>Digital Token</h3>
              <p>Get your queue token digitally without standing at the hospital counter.</p>
            </div>
            <span className="feature-arrow"><ArrowRight size={17} /></span>
          </article>
          <article className="feature-card">
            <div className="feature-icon"><Activity size={27} /></div>
            <div className="feature-copy">
              <h3>Live Queue Tracking</h3>
              <p>Monitor your queue position and estimated waiting time in real time.</p>
            </div>
            <span className="feature-arrow"><ArrowRight size={17} /></span>
          </article>
          <article className="feature-card">
            <div className="feature-icon"><BellRing size={27} /></div>
            <div className="feature-copy">
              <h3>Queue Notifications</h3>
              <p>Stay informed when your token is getting closer to being called.</p>
            </div>
            <span className="feature-arrow"><ArrowRight size={17} /></span>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
