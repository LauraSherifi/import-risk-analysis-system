import "./App.css";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🚢</div>
        <h2>Shipment Risk</h2>
        <p>Analysis System</p>

        <nav>
          <button className="active">Dashboard</button>
          <button>Dataset</button>
          <button>Cleaning</button>
          <button>Risk</button>
        </nav>
      </aside>

      <main className="main">
        <header>
          <h1>Shipment Dataset Dashboard</h1>
          <p>Basic frontend layout for shipment data preparation.</p>
        </header>

        <section className="cards">
          <div className="card">
            <span>Total Shipments</span>
            <strong>263,821</strong>
          </div>

          <div className="card">
            <span>Columns</span>
            <strong>8</strong>
          </div>

        </section>

        <section className="panel">
          <h3>Sample Shipment Records</h3>

          
        </section>
      </main>
    </div>
  );
}

export default App;